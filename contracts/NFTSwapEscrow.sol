// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NFTSwapEscrow (Deposit model — Option B)
 * @notice Users transfer NFTs INTO the contract (no setApprovalForAll).
 *         When both sides deposited, swap executes atomically in the same tx.
 *         If counterparty never deposits, withdraw after WITHDRAW_TIMEOUT.
 */
interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

contract NFTSwapEscrow {
    struct NftItem {
        address collection;
        uint256 tokenId;
    }

    struct SwapOrder {
        address maker;
        address taker;
        NftItem[] makerItems;
        NftItem[] takerItems;
        bool makerDeposited;
        bool takerDeposited;
        uint256 makerDepositAt;
        uint256 takerDepositAt;
        bool executed;
        bool makerRefunded;
        bool takerRefunded;
    }

    /// @dev 10 minutes — depositor can reclaim if counterparty never deposits
    uint256 public constant WITHDRAW_TIMEOUT = 10 minutes;

    address public owner;
    mapping(bytes32 => SwapOrder) public orders;
    mapping(address => bool) public whitelistedCollections;

    event OrderCreated(bytes32 indexed orderId, address indexed maker, address indexed taker);
    event Deposited(bytes32 indexed orderId, address indexed party);
    event Executed(bytes32 indexed orderId);
    event Withdrawn(bytes32 indexed orderId, address indexed party);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setCollectionWhitelist(address collection, bool allowed) external onlyOwner {
        whitelistedCollections[collection] = allowed;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero");
        owner = newOwner;
    }

    /**
     * @notice Create swap after both parties agreed off-chain (room UI).
     * @param taker Counterparty wallet — must match who will deposit side B.
     */
    function createOrder(
        address taker,
        NftItem[] calldata makerItems,
        NftItem[] calldata takerItems
    ) external returns (bytes32 orderId) {
        require(taker != address(0) && taker != msg.sender, "bad taker");
        require(makerItems.length > 0 && takerItems.length > 0, "empty");
        _validateWhitelist(makerItems);
        _validateWhitelist(takerItems);

        orderId = keccak256(
            abi.encodePacked(msg.sender, taker, block.timestamp, makerItems.length, takerItems.length)
        );
        SwapOrder storage o = orders[orderId];
        require(o.maker == address(0), "exists");
        o.maker = msg.sender;
        o.taker = taker;
        for (uint256 i = 0; i < makerItems.length; i++) {
            o.makerItems.push(makerItems[i]);
        }
        for (uint256 i = 0; i < takerItems.length; i++) {
            o.takerItems.push(takerItems[i]);
        }
        emit OrderCreated(orderId, msg.sender, taker);
    }

    /**
     * @notice Deposit your NFTs (safeTransferFrom — no approve-all needed).
     *         When the second party deposits, swap executes automatically.
     */
    function deposit(bytes32 orderId) external {
        SwapOrder storage o = orders[orderId];
        require(o.maker != address(0), "no order");
        require(!o.executed, "executed");
        require(msg.sender == o.maker || msg.sender == o.taker, "not party");

        if (msg.sender == o.maker) {
            require(!o.makerDeposited, "deposited");
            _pull(msg.sender, o.makerItems);
            o.makerDeposited = true;
            o.makerDepositAt = block.timestamp;
        } else {
            require(!o.takerDeposited, "deposited");
            _pull(msg.sender, o.takerItems);
            o.takerDeposited = true;
            o.takerDepositAt = block.timestamp;
        }

        emit Deposited(orderId, msg.sender);

        if (o.makerDeposited && o.takerDeposited) {
            _execute(orderId);
        }
    }

    /** @notice Manual execute if auto-execute was skipped (both already deposited). */
    function execute(bytes32 orderId) external {
        SwapOrder storage o = orders[orderId];
        require(o.makerDeposited && o.takerDeposited, "not ready");
        require(!o.executed, "executed");
        _execute(orderId);
    }

    /**
     * @notice Reclaim your NFTs if counterparty never deposited (after timeout),
     *         or refund both sides if both deposited but swap never executed.
     */
    function withdraw(bytes32 orderId) external {
        SwapOrder storage o = orders[orderId];
        require(o.maker != address(0), "no order");
        require(!o.executed, "executed");

        if (o.makerDeposited && o.takerDeposited) {
            uint256 later = o.makerDepositAt > o.takerDepositAt ? o.makerDepositAt : o.takerDepositAt;
            require(block.timestamp >= later + WITHDRAW_TIMEOUT, "timeout");
            _refundSide(orderId, true);
            _refundSide(orderId, false);
            return;
        }

        if (msg.sender == o.maker && o.makerDeposited && !o.makerRefunded) {
            require(!o.takerDeposited, "taker active");
            require(block.timestamp >= o.makerDepositAt + WITHDRAW_TIMEOUT, "timeout");
            _refundSide(orderId, true);
            emit Withdrawn(orderId, o.maker);
            return;
        }

        if (msg.sender == o.taker && o.takerDeposited && !o.takerRefunded) {
            require(!o.makerDeposited, "maker active");
            require(block.timestamp >= o.takerDepositAt + WITHDRAW_TIMEOUT, "timeout");
            _refundSide(orderId, false);
            emit Withdrawn(orderId, o.taker);
        }
    }

    function _execute(bytes32 orderId) internal {
        SwapOrder storage o = orders[orderId];
        require(!o.executed, "done");
        _push(o.taker, o.makerItems);
        _push(o.maker, o.takerItems);
        o.executed = true;
        emit Executed(orderId);
    }

    function _refundSide(bytes32 orderId, bool isMaker) internal {
        SwapOrder storage o = orders[orderId];
        if (isMaker) {
            require(o.makerDeposited && !o.makerRefunded, "refunded");
            _push(o.maker, o.makerItems);
            o.makerRefunded = true;
        } else {
            require(o.takerDeposited && !o.takerRefunded, "refunded");
            _push(o.taker, o.takerItems);
            o.takerRefunded = true;
        }
    }

    function _pull(address from, NftItem[] storage items) internal {
        for (uint256 i = 0; i < items.length; i++) {
            NftItem memory item = items[i];
            require(IERC721(item.collection).ownerOf(item.tokenId) == from, "not owner");
            IERC721(item.collection).safeTransferFrom(from, address(this), item.tokenId);
        }
    }

    function _push(address to, NftItem[] storage items) internal {
        for (uint256 i = 0; i < items.length; i++) {
            NftItem memory item = items[i];
            IERC721(item.collection).safeTransferFrom(address(this), to, item.tokenId);
        }
    }

    function _validateWhitelist(NftItem[] calldata items) internal view {
        for (uint256 i = 0; i < items.length; i++) {
            require(whitelistedCollections[items[i].collection], "not whitelisted");
        }
    }
}

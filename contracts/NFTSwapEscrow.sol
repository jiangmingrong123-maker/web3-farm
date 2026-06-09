// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NFTSwapEscrow
 * @notice Atomic ERC-721 swap: both sides deposit, both confirm, then execute in one tx.
 *         Only whitelisted collection contracts are accepted (anti-scam).
 *
 * Deploy on Ethereum mainnet, then set NEXT_PUBLIC_SWAP_CONTRACT in the frontend.
 */
interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function getApproved(uint256 tokenId) external view returns (address);
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
        bool makerConfirmed;
        bool takerConfirmed;
        bool executed;
        bool cancelled;
    }

    mapping(bytes32 => SwapOrder) public orders;
    mapping(address => bool) public whitelistedCollections;

    event OrderCreated(bytes32 indexed orderId, address indexed maker);
    event OrderAccepted(bytes32 indexed orderId, address indexed taker);
    event SideConfirmed(bytes32 indexed orderId, address indexed party);
    event OrderExecuted(bytes32 indexed orderId);
    event OrderCancelled(bytes32 indexed orderId);

    function setCollectionWhitelist(address collection, bool allowed) external {
        // TODO: restrict to owner / multisig in production
        whitelistedCollections[collection] = allowed;
    }

    function createOrder(NftItem[] calldata makerItems) external returns (bytes32 orderId) {
        _validateItems(msg.sender, makerItems);
        orderId = keccak256(abi.encodePacked(msg.sender, block.timestamp, makerItems.length));
        SwapOrder storage o = orders[orderId];
        o.maker = msg.sender;
        for (uint256 i = 0; i < makerItems.length; i++) {
            o.makerItems.push(makerItems[i]);
        }
        emit OrderCreated(orderId, msg.sender);
    }

    function acceptOrder(bytes32 orderId, NftItem[] calldata takerItems) external {
        SwapOrder storage o = orders[orderId];
        require(o.maker != address(0) && !o.executed && !o.cancelled, "invalid order");
        require(o.taker == address(0), "already accepted");
        _validateItems(msg.sender, takerItems);
        o.taker = msg.sender;
        for (uint256 i = 0; i < takerItems.length; i++) {
            o.takerItems.push(takerItems[i]);
        }
        emit OrderAccepted(orderId, msg.sender);
    }

    function confirm(bytes32 orderId) external {
        SwapOrder storage o = orders[orderId];
        require(o.taker != address(0), "no taker");
        if (msg.sender == o.maker) o.makerConfirmed = true;
        else if (msg.sender == o.taker) o.takerConfirmed = true;
        else revert("not participant");
        emit SideConfirmed(orderId, msg.sender);
        if (o.makerConfirmed && o.takerConfirmed) {
            _execute(orderId);
        }
    }

    function cancel(bytes32 orderId) external {
        SwapOrder storage o = orders[orderId];
        require(msg.sender == o.maker && o.taker == address(0), "cannot cancel");
        o.cancelled = true;
        emit OrderCancelled(orderId);
    }

    function _execute(bytes32 orderId) internal {
        SwapOrder storage o = orders[orderId];
        require(!o.executed, "done");
        for (uint256 i = 0; i < o.makerItems.length; i++) {
            NftItem memory item = o.makerItems[i];
            IERC721(item.collection).safeTransferFrom(o.maker, o.taker, item.tokenId);
        }
        for (uint256 i = 0; i < o.takerItems.length; i++) {
            NftItem memory item = o.takerItems[i];
            IERC721(item.collection).safeTransferFrom(o.taker, o.maker, item.tokenId);
        }
        o.executed = true;
        emit OrderExecuted(orderId);
    }

    function _validateItems(address owner, NftItem[] calldata items) internal view {
        require(items.length > 0, "empty");
        for (uint256 i = 0; i < items.length; i++) {
            require(whitelistedCollections[items[i].collection], "not whitelisted");
            require(IERC721(items[i].collection).ownerOf(items[i].tokenId) == owner, "not owner");
            require(
                IERC721(items[i].collection).isApprovedForAll(owner, address(this)) ||
                IERC721(items[i].collection).getApproved(items[i].tokenId) == address(this),
                "not approved"
            );
        }
    }
}

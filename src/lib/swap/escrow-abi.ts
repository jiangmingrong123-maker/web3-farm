export const swapEscrowAbi = [
  {
    type: "function",
    name: "WITHDRAW_TIMEOUT",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "createOrder",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taker", type: "address" },
      {
        name: "makerItems",
        type: "tuple[]",
        components: [
          { name: "collection", type: "address" },
          { name: "tokenId", type: "uint256" },
        ],
      },
      {
        name: "takerItems",
        type: "tuple[]",
        components: [
          { name: "collection", type: "address" },
          { name: "tokenId", type: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "orderId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "orders",
    stateMutability: "view",
    inputs: [{ name: "orderId", type: "bytes32" }],
    outputs: [
      { name: "maker", type: "address" },
      { name: "taker", type: "address" },
      { name: "makerDeposited", type: "bool" },
      { name: "takerDeposited", type: "bool" },
      { name: "makerDepositAt", type: "uint256" },
      { name: "takerDepositAt", type: "uint256" },
      { name: "executed", type: "bool" },
      { name: "makerRefunded", type: "bool" },
      { name: "takerRefunded", type: "bool" },
    ],
  },
] as const;

export interface NftItemInput {
  collection: `0x${string}`;
  tokenId: bigint;
}

import { SWAP_TIMEOUT_MS } from "./constants";

/** Must match contract WITHDRAW_TIMEOUT */
export const WITHDRAW_TIMEOUT_SEC = SWAP_TIMEOUT_MS / 1000;

export const swapEscrowAbi = [
  {
    type: "function",
    name: "createOrder",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "makerItems",
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
    name: "acceptOrder",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderId", type: "bytes32" },
      {
        name: "takerItems",
        type: "tuple[]",
        components: [
          { name: "collection", type: "address" },
          { name: "tokenId", type: "uint256" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "confirm",
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
      { name: "makerConfirmed", type: "bool" },
      { name: "takerConfirmed", type: "bool" },
      { name: "executed", type: "bool" },
      { name: "cancelled", type: "bool" },
    ],
  },
] as const;

export interface NftItemInput {
  collection: `0x${string}`;
  tokenId: bigint;
}

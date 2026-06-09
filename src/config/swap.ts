import { COLLECTIONS } from "./collections";

/** Slots per side in a swap room. */
export const SWAP_SLOTS_PER_SIDE = 4;

/** Only these contract addresses may enter a swap (anti-scam). */
export const SWAP_WHITELIST_CONTRACTS = COLLECTIONS.filter((c) => c.enabled).map(
  (c) => c.contractAddress.toLowerCase() as `0x${string}`,
);

export function isWhitelistedContract(address: string): boolean {
  return SWAP_WHITELIST_CONTRACTS.includes(address.toLowerCase() as `0x${string}`);
}

/** Set after deploying NFTSwapEscrow on Ethereum mainnet. */
export const SWAP_ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_SWAP_CONTRACT ??
  "") as `0x${string}`;

export const SWAP_ESCROW_ENABLED =
  SWAP_ESCROW_ADDRESS.length === 42 && SWAP_ESCROW_ADDRESS.startsWith("0x");

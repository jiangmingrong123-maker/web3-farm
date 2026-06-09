/** Must match contracts/NFTSwapEscrow.sol WITHDRAW_TIMEOUT */
export const SWAP_TIMEOUT_MS = 10 * 60 * 1000;

export const WHITELIST_CONTRACTS = [
  "0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a", // Nobody
] as const;

export function isWhitelistedContractAddress(addr: string): boolean {
  return WHITELIST_CONTRACTS.includes(
    addr.toLowerCase() as (typeof WHITELIST_CONTRACTS)[number],
  );
}

import { apiRoot } from "@/lib/api-origin";

/** Same-origin image proxy — browser never hits IPFS directly. */
export function nftProxyImageUrl(contract: string, tokenId: string): string {
  const c = contract.toLowerCase();
  return `${apiRoot()}/nft/image?contract=${encodeURIComponent(c)}&tokenId=${encodeURIComponent(tokenId)}`;
}

import { NOBODY_CONTRACT } from "@/config/td/stars";
import { nftProxyImageUrl } from "@/lib/nft/proxy-image";

const NOBODY_IMAGE_CID = "QmWAVSATUtHMZMtrcGcAjkdWJjVLFWipMrNWMvTECYNPiy";

const IPFS_GATEWAYS = [
  "https://w3s.link/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

/** Ordered fallbacks — try next on <img onError> */
export function nobodyAvatarUrls(tokenId: string): string[] {
  const ipfs = `${NOBODY_IMAGE_CID}/${tokenId}.png`;
  const urls = IPFS_GATEWAYS.map((g) => `${g}${ipfs}`);
  urls.push(nftProxyImageUrl(NOBODY_CONTRACT, tokenId));
  return urls;
}

export function nobodyAvatarUrl(tokenId: string): string {
  return nobodyAvatarUrls(tokenId)[0]!;
}

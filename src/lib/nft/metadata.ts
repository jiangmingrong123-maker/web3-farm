const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
];

/** ipfs:// or https → fetchable URL (first gateway). */
export function resolveUri(uri: string): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    const cid = uri.replace("ipfs://", "");
    return `${IPFS_GATEWAYS[0]}${cid}`;
  }
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
  return null;
}

function gatewayUrls(cidPath: string): string[] {
  return IPFS_GATEWAYS.map((g) => `${g}${cidPath}`);
}

async function fetchJson(url: string): Promise<{ image?: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return (await res.json()) as { image?: string };
  } catch {
    return null;
  }
}

/** Resolve tokenURI to an image URL (tries multiple IPFS gateways). */
export async function resolveNftImage(tokenUri: string): Promise<string | null> {
  if (!tokenUri) return null;

  if (tokenUri.startsWith("ipfs://")) {
    const cidPath = tokenUri.replace("ipfs://", "");
    for (const jsonUrl of gatewayUrls(cidPath)) {
      const data = await fetchJson(jsonUrl);
      if (!data?.image) continue;
      const img = resolveUri(data.image);
      if (img) return img;
    }
    return null;
  }

  const jsonUrl = resolveUri(tokenUri);
  if (!jsonUrl) return null;
  const data = await fetchJson(jsonUrl);
  if (!data?.image) return null;
  return resolveUri(data.image);
}

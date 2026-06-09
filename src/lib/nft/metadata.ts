/** Resolve tokenURI to an image URL (ipfs / https). */
export async function resolveNftImage(tokenUri: string): Promise<string | null> {
  const jsonUrl = resolveUri(tokenUri);
  if (!jsonUrl) return null;

  try {
    const res = await fetch(jsonUrl);
    if (!res.ok) return null;
    const data = (await res.json()) as { image?: string };
    if (!data.image) return null;
    return resolveUri(data.image);
  } catch {
    return null;
  }
}

function resolveUri(uri: string): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    const cid = uri.replace("ipfs://", "");
    return `https://ipfs.io/ipfs/${cid}`;
  }
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
  return null;
}

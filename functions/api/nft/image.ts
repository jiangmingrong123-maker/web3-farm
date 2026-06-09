/**
 * GET /api/nft/image?contract=0x...&tokenId=8122
 * Proxies NFT image bytes via Cloudflare (avoids blocked IPFS in browser).
 */

const WHITELIST: Record<string, { imageCid: string }> = {
  "0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a": {
    imageCid: "QmWAVSATUtHMZMtrcGcAjkdWJjVLFWipMrNWMvTECYNPiy",
  },
};

const GATEWAYS = [
  "https://cloudflare-ipfs.com/ipfs/",
  "https://w3s.link/ipfs/",
  "https://dweb.link/ipfs/",
  "https://ipfs.io/ipfs/",
];

function ipfsPath(cid: string, path: string): string[] {
  const full = `${cid}/${path}`;
  return GATEWAYS.map((g) => `${g}${full}`);
}

export async function onRequestGet(context: { request: Request }) {
  const url = new URL(context.request.url);
  const contract = url.searchParams.get("contract")?.toLowerCase();
  const tokenId = url.searchParams.get("tokenId")?.trim();

  if (!contract || !tokenId || !/^\d+$/.test(tokenId)) {
    return new Response("Bad request", { status: 400 });
  }

  const cfg = WHITELIST[contract];
  if (!cfg) {
    return new Response("Not whitelisted", { status: 403 });
  }

  const candidates = ipfsPath(cfg.imageCid, `${tokenId}.png`);

  for (const imgUrl of candidates) {
    try {
      const res = await fetch(imgUrl, {
        headers: { Accept: "image/*" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") ?? "image/png";
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength < 100) continue;
      return new Response(bytes, {
        headers: {
          "Content-Type": type,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      /* try next gateway */
    }
  }

  return new Response("Image not found", { status: 404 });
}

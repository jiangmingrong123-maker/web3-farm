/**
 * GET /api/nft/image?contract=0x...&tokenId=8122
 * Proxies NFT image bytes (metadata-first + multi-gateway + Alchemy).
 */

interface Env {
  ALCHEMY_API_KEY?: string;
}

const NOBODY = {
  contract: "0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a",
  metadataCid: "QmTbNM7t5yta1fcZNsGJpE6EbUAHwas1eC1Xea127zaC9u",
  imageCid: "QmWAVSATUtHMZMtrcGcAjkdWJjVLFWipMrNWMvTECYNPiy",
};

const GATEWAYS = [
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://w3s.link/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://4everland.io/ipfs/",
];

function isImageBytes(buf: ArrayBuffer): boolean {
  const u = new Uint8Array(buf);
  if (u.length < 12) return false;
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return true;
  if (u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return true;
  if (u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46) return true;
  if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46) return true;
  return false;
}

function ipfsToUrls(uri: string): string[] {
  if (uri.startsWith("http://") || uri.startsWith("https://")) return [uri];
  if (!uri.startsWith("ipfs://")) return [];
  const path = uri.replace("ipfs://", "");
  return GATEWAYS.map((g) => `${g}${path}`);
}

async function fetchImageBytes(url: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { Accept: "image/*,*/*", "User-Agent": "web3-farm-image-proxy/1.0" },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    if (type.includes("text/html") || type.includes("text/plain")) return null;
    const bytes = await res.arrayBuffer();
    if (!isImageBytes(bytes)) return null;
    return { bytes, type: type.split(";")[0] || "image/png" };
  } catch {
    return null;
  }
}

async function fetchFirstImage(urls: string[]): Promise<Response | null> {
  const tasks = urls.map(async (url) => {
    const got = await fetchImageBytes(url);
    if (!got) throw new Error("miss");
    return new Response(got.bytes, {
      headers: {
        "Content-Type": got.type,
        "Cache-Control": "public, max-age=86400",
      },
    });
  });

  try {
    return await Promise.any(tasks);
  } catch {
    for (const url of urls) {
      const got = await fetchImageBytes(url);
      if (got) {
        return new Response(got.bytes, {
          headers: {
            "Content-Type": got.type,
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }
    return null;
  }
}

async function nobodyImageUri(tokenId: string): Promise<string> {
  const jsonUrls = GATEWAYS.map(
    (g) => `${g}${NOBODY.metadataCid}/${tokenId}`,
  );
  for (const url of jsonUrls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { image?: string };
      if (data.image?.startsWith("ipfs://") || data.image?.startsWith("http")) {
        return data.image;
      }
    } catch {
      /* next */
    }
  }
  return `ipfs://${NOBODY.imageCid}/${tokenId}.png`;
}

async function tryAlchemy(
  contract: string,
  tokenId: string,
  apiKey: string,
): Promise<Response | null> {
  try {
    const metaRes = await fetch(
      `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTMetadata?contractAddress=${contract}&tokenId=${tokenId}&refreshCache=true`,
    );
    if (!metaRes.ok) return null;
    const data = (await metaRes.json()) as {
      image?: { pngUrl?: string; cachedUrl?: string; originalUrl?: string };
      media?: { gateway?: string; raw?: string }[];
    };

    const candidates = [
      data.image?.pngUrl,
      data.image?.cachedUrl,
      data.image?.originalUrl,
      data.media?.[0]?.gateway,
      data.media?.[0]?.raw,
    ].filter((u): u is string => !!u);

    const urls: string[] = [];
    for (const c of candidates) {
      urls.push(...ipfsToUrls(c.startsWith("ipfs://") ? c : c));
    }
    return await fetchFirstImage(urls);
  } catch {
    return null;
  }
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const url = new URL(context.request.url);
  const contract = url.searchParams.get("contract")?.toLowerCase();
  const tokenId = url.searchParams.get("tokenId")?.trim();

  if (!contract || !tokenId || !/^\d+$/.test(tokenId)) {
    return new Response("Bad request", { status: 400 });
  }

  if (contract !== NOBODY.contract) {
    return new Response("Not whitelisted", { status: 403 });
  }

  const apiKey = context.env.ALCHEMY_API_KEY?.trim() || "demo";

  const alchemyResp = await tryAlchemy(contract, tokenId, apiKey);
  if (alchemyResp) return alchemyResp;

  const imageUri = await nobodyImageUri(tokenId);
  const ipfsResp = await fetchFirstImage(ipfsToUrls(imageUri));
  if (ipfsResp) return ipfsResp;

  return new Response(
    "Image not found — IPFS 网关暂时不可用。请在 Cloudflare 环境变量添加 ALCHEMY_API_KEY（alchemy.com 免费注册）后重新部署。",
    { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}

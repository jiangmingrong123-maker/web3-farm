/**
 * GET /api/nft/image?contract=0x...&tokenId=8122
 * Proxies NFT image bytes (market CDN → Alchemy → metadata/IPFS → SVG fallback).
 */

interface Env {
  ALCHEMY_API_KEY?: string;
  RESERVOIR_API_KEY?: string;
}

const NOBODY = {
  contract: "0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a",
  metadataCid: "QmTbNM7t5yta1fcZNsGJpE6EbUAHwas1eC1Xea127zaC9u",
  imageCid: "QmWAVSATUtHMZMtrcGcAjkdWJjVLFWipMrNWMvTECYNPiy",
};

const FETCH_MS = 8_000;

const GATEWAYS = [
  "https://dweb.link/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://w3s.link/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://4everland.io/ipfs/",
  "https://ipfs.filebase.io/ipfs/",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isImageBytes(buf: ArrayBuffer): boolean {
  const u = new Uint8Array(buf);
  if (u.length < 12) return false;
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return true;
  if (u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return true;
  if (u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46) return true;
  if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46) return true;
  return false;
}

function isCdnUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("nft-cdn.alchemy.com") ||
    u.includes("res.cloudinary.com") ||
    u.includes("img.reservoir.tools") ||
    u.includes("seadn.io")
  );
}

function ipfsToUrls(uri: string): string[] {
  if (uri.startsWith("http://") || uri.startsWith("https://")) return [uri];
  if (!uri.startsWith("ipfs://")) return [];
  const path = uri.replace("ipfs://", "");
  return GATEWAYS.map((g) => `${g}${path}`);
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_MS),
  });
}

async function fetchImageBytes(
  url: string,
): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  try {
    const res = await fetchWithTimeout(url, {
      redirect: "follow",
      headers: { Accept: "image/*,*/*", "User-Agent": "web3-farm-image-proxy/2.0" },
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

function imageResponse(bytes: ArrayBuffer, type: string): Response {
  return new Response(bytes, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

async function fetchFirstImage(urls: string[]): Promise<Response | null> {
  const unique = [...new Set(urls.filter(Boolean))];
  const cdn = unique.filter(isCdnUrl);
  const rest = unique.filter((u) => !isCdnUrl(u));

  for (const batch of [cdn, rest]) {
    if (!batch.length) continue;
    const tasks = batch.map(async (url) => {
      const got = await fetchImageBytes(url);
      if (!got) throw new Error("miss");
      return imageResponse(got.bytes, got.type);
    });
    try {
      return await Promise.any(tasks);
    } catch {
      for (const url of batch) {
        const got = await fetchImageBytes(url);
        if (got) return imageResponse(got.bytes, got.type);
      }
    }
  }
  return null;
}

async function nobodyMetadata(
  tokenId: string,
): Promise<{ image?: string; name?: string; attributes?: { trait_type: string; value: string }[] } | null> {
  const jsonUrls = GATEWAYS.map((g) => `${g}${NOBODY.metadataCid}/${tokenId}`);
  for (const url of jsonUrls) {
    try {
      const res = await fetchWithTimeout(url, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      return (await res.json()) as {
        image?: string;
        name?: string;
        attributes?: { trait_type: string; value: string }[];
      };
    } catch {
      /* next */
    }
  }
  return null;
}

async function nobodyImageUri(tokenId: string): Promise<string> {
  const meta = await nobodyMetadata(tokenId);
  if (meta?.image?.startsWith("ipfs://") || meta?.image?.startsWith("http")) {
    return meta.image;
  }
  return `ipfs://${NOBODY.imageCid}/${tokenId}.png`;
}

async function tryReservoir(
  contract: string,
  tokenId: string,
  apiKey?: string,
): Promise<Response | null> {
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers["x-api-key"] = apiKey;

    const res = await fetchWithTimeout(
      `https://api.reservoir.tools/tokens/v7?tokens=${contract}:${tokenId}`,
      { headers },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      tokens?: {
        token?: { image?: string; imageSmall?: string; imageLarge?: string };
        media?: { image?: string; imageSmall?: string; imageLarge?: string };
      }[];
    };

    const token = data.tokens?.[0];
    const urls = [
      token?.token?.imageLarge,
      token?.token?.image,
      token?.token?.imageSmall,
      token?.media?.imageLarge,
      token?.media?.image,
      token?.media?.imageSmall,
    ].filter((u): u is string => !!u);

    return await fetchFirstImage(urls);
  } catch {
    return null;
  }
}

async function tryAlchemy(
  contract: string,
  tokenId: string,
  apiKey: string,
): Promise<Response | null> {
  const hasKey = apiKey !== "demo";

  try {
    if (hasKey) {
      await fetch(
        `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/refreshNftMetadata`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contractAddress: contract, tokenId }),
        },
      ).catch(() => null);
      await sleep(1500);
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const metaRes = await fetchWithTimeout(
        `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTMetadata?contractAddress=${contract}&tokenId=${tokenId}&refreshCache=true&tokenUriTimeoutInMs=12000`,
      );
      if (!metaRes.ok) break;

      const data = (await metaRes.json()) as {
        image?: {
          pngUrl?: string;
          thumbnailUrl?: string;
          cachedUrl?: string;
          originalUrl?: string;
        };
        media?: { gateway?: string; raw?: string }[];
        raw?: { metadata?: { image?: string } };
      };

      const candidates = [
        data.image?.pngUrl,
        data.image?.thumbnailUrl,
        data.image?.cachedUrl,
        data.image?.originalUrl,
        data.media?.[0]?.gateway,
        data.media?.[0]?.raw,
        data.raw?.metadata?.image,
      ].filter((u): u is string => !!u);

      const expanded: string[] = [];
      for (const c of candidates) {
        if (c.startsWith("http")) expanded.push(c);
        else expanded.push(...ipfsToUrls(c));
      }

      const resp = await fetchFirstImage(expanded);
      if (resp) return resp;

      if (hasKey && attempt < 2) await sleep(2000);
    }
  } catch {
    /* fall through */
  }
  return null;
}

async function tryOnChainProxy(
  contract: string,
  tokenId: string,
): Promise<Response | null> {
  const url = `https://onchainproxy.io/eth/${contract}/${tokenId}/image?raw=1`;
  const got = await fetchImageBytes(url);
  if (!got) return null;
  return imageResponse(got.bytes, got.type);
}

function svgFallback(
  tokenId: string,
  meta: { name?: string; attributes?: { trait_type: string; value: string }[] } | null,
): Response {
  const name = meta?.name ?? `Nobody #${tokenId}`;
  const traits = (meta?.attributes ?? [])
    .slice(0, 6)
    .map((a) => `${a.trait_type}: ${a.value}`)
    .join(" · ");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0a0a0a"/>
  <rect x="24" y="24" width="464" height="464" rx="16" fill="#141414" stroke="#c9a227" stroke-width="2"/>
  <text x="256" y="200" fill="#c9a227" font-family="system-ui,sans-serif" font-size="28" text-anchor="middle" font-weight="600">${escapeXml(name)}</text>
  <text x="256" y="250" fill="#888" font-family="system-ui,sans-serif" font-size="14" text-anchor="middle">IPFS 图片暂不可用</text>
  <text x="256" y="290" fill="#666" font-family="system-ui,sans-serif" font-size="12" text-anchor="middle">${escapeXml(traits || "metadata loaded")}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Image-Source": "svg-fallback",
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const url = new URL(context.request.url);
  const contract = url.searchParams.get("contract")?.toLowerCase();
  const tokenId = url.searchParams.get("tokenId")?.trim();
  const debug = url.searchParams.get("debug") === "1";

  if (!contract || !tokenId || !/^\d+$/.test(tokenId)) {
    return new Response("Bad request", { status: 400 });
  }

  if (contract !== NOBODY.contract) {
    return new Response("Not whitelisted", { status: 403 });
  }

  const alchemyKey = context.env.ALCHEMY_API_KEY?.trim() || "demo";
  const reservoirKey = context.env.RESERVOIR_API_KEY?.trim();
  const hasAlchemy = alchemyKey !== "demo";

  const reservoirResp = await tryReservoir(contract, tokenId, reservoirKey);
  if (reservoirResp) {
    reservoirResp.headers.set("X-Image-Source", "reservoir");
    return reservoirResp;
  }

  const alchemyResp = await tryAlchemy(contract, tokenId, alchemyKey);
  if (alchemyResp) {
    alchemyResp.headers.set("X-Image-Source", "alchemy");
    return alchemyResp;
  }

  const imageUri = await nobodyImageUri(tokenId);
  const ipfsResp = await fetchFirstImage(ipfsToUrls(imageUri));
  if (ipfsResp) {
    ipfsResp.headers.set("X-Image-Source", "ipfs");
    return ipfsResp;
  }

  const proxyResp = await tryOnChainProxy(contract, tokenId);
  if (proxyResp) {
    proxyResp.headers.set("X-Image-Source", "onchainproxy");
    return proxyResp;
  }

  const meta = await nobodyMetadata(tokenId);
  if (!debug) {
    return svgFallback(tokenId, meta);
  }

  const msg = hasAlchemy
    ? "Image not found — ALCHEMY_API_KEY 已配置，但 Nobody 图片 IPFS 源全球不可用；已尝试 Reservoir/Alchemy/IPFS。可选：添加 RESERVOIR_API_KEY（reservoir.tools 免费）后重新部署。"
    : "Image not found — 请确认 Cloudflare 已添加 ALCHEMY_API_KEY 并重新部署；Nobody PNG 在 IPFS 上经常 504。";

  return new Response(msg, {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Alchemy-Configured": hasAlchemy ? "1" : "0",
      "X-Reservoir-Configured": reservoirKey ? "1" : "0",
    },
  });
}

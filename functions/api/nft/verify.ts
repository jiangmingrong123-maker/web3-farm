/**
 * Server-side NFT ownership verify (no browser CORS / RPC issues).
 * POST /api/nft/verify  { contract, tokenId, wallet }
 */

const WHITELIST = ["0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a"];
const RPC_URL = "https://ethereum.publicnode.com";
const NOBODY_NAME = "Nobody";
const NOBODY_SLUG = "nobody";

type VerifyError =
  | "NOT_WHITELISTED"
  | "INVALID_TOKEN_ID"
  | "NOT_OWNER"
  | "RPC_ERROR"
  | "NOT_FOUND";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function encodeOwnerOf(tokenId: bigint): string {
  const selector = "6352211e";
  const hex = tokenId.toString(16).padStart(64, "0");
  return `0x${selector}${hex}`;
}

function encodeTokenUri(tokenId: bigint): string {
  const selector = "c87b56dd";
  const hex = tokenId.toString(16).padStart(64, "0");
  return `0x${selector}${hex}`;
}

function decodeAddress(hex: string): string | null {
  const clean = hex.replace(/^0x/, "");
  if (clean.length < 40) return null;
  return `0x${clean.slice(-40)}`;
}

function decodeString(hex: string): string | null {
  try {
    const clean = hex.replace(/^0x/, "");
    if (clean.length < 128) return null;
    const offset = parseInt(clean.slice(0, 64), 16) * 2;
    const len = parseInt(clean.slice(offset, offset + 64), 16);
    const data = clean.slice(offset + 64, offset + 64 + len * 2);
    let out = "";
    for (let i = 0; i < data.length; i += 2) {
      out += String.fromCharCode(parseInt(data.slice(i, i + 2), 16));
    }
    return out || null;
  } catch {
    return null;
  }
}

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
];

function ipfsToHttp(uri: string): string | null {
  if (uri.startsWith("ipfs://")) {
    return `${IPFS_GATEWAYS[0]}${uri.replace("ipfs://", "")}`;
  }
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return null;
}

async function resolveNftImage(tokenUri: string): Promise<string | null> {
  const cidPath = tokenUri.startsWith("ipfs://") ? tokenUri.replace("ipfs://", "") : null;
  const jsonUrls = cidPath
    ? IPFS_GATEWAYS.map((g) => `${g}${cidPath}`)
    : [ipfsToHttp(tokenUri)].filter(Boolean);

  for (const jsonUrl of jsonUrls) {
    if (!jsonUrl) continue;
    try {
      const res = await fetch(jsonUrl);
      if (!res.ok) continue;
      const data = (await res.json()) as { image?: string };
      if (!data.image) continue;
      const img = ipfsToHttp(data.image);
      if (img) return img;
    } catch {
      /* try next gateway */
    }
  }
  return null;
}

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  if (!res.ok) throw new Error("RPC_HTTP");
  const body = (await res.json()) as { result?: string; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  if (!body.result || body.result === "0x") throw new Error("EMPTY_RESULT");
  return body.result;
}

export async function onRequestPost(context: { request: Request }) {
  let body: { contract?: string; tokenId?: string; wallet?: string };
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "INVALID_TOKEN_ID" satisfies VerifyError }, 400);
  }

  const contract = body.contract?.toLowerCase();
  const wallet = body.wallet?.toLowerCase();
  const tokenIdInput = body.tokenId?.trim();

  if (!contract || !wallet || !tokenIdInput) {
    return json({ ok: false, error: "INVALID_TOKEN_ID" satisfies VerifyError }, 400);
  }

  if (!WHITELIST.includes(contract)) {
    return json({ ok: false, error: "NOT_WHITELISTED" satisfies VerifyError });
  }

  let tokenId: bigint;
  try {
    tokenId = BigInt(tokenIdInput);
    if (tokenId < BigInt(0)) throw new Error("neg");
  } catch {
    return json({ ok: false, error: "INVALID_TOKEN_ID" satisfies VerifyError });
  }

  try {
    const ownerHex = await ethCall(contract, encodeOwnerOf(tokenId));
    const owner = decodeAddress(ownerHex);
    if (!owner) {
      return json({ ok: false, error: "NOT_FOUND" satisfies VerifyError });
    }

    if (owner.toLowerCase() !== wallet) {
      return json({ ok: false, error: "NOT_OWNER" satisfies VerifyError });
    }

    let tokenUri: string | null = null;
    try {
      const uriHex = await ethCall(contract, encodeTokenUri(tokenId));
      tokenUri = decodeString(uriHex);
    } catch {
      tokenUri = null;
    }

    const imageUrl = tokenUri ? await resolveNftImage(tokenUri) : null;

    return json({
      ok: true,
      nft: {
        contract,
        tokenId: tokenId.toString(),
        owner,
        collectionName: NOBODY_NAME,
        collectionSlug: NOBODY_SLUG,
        chainId: 1,
        tokenUri,
        imageUrl,
        verified: true,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("revert") ||
      msg.includes("ERC721") ||
      msg.includes("nonexistent") ||
      msg.includes("EMPTY_RESULT")
    ) {
      return json({ ok: false, error: "NOT_FOUND" satisfies VerifyError });
    }
    return json({ ok: false, error: "RPC_ERROR" satisfies VerifyError });
  }
}

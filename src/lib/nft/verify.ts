import { isWhitelistedContract } from "@/config/swap";
import type { Address } from "viem";
import { apiRoot } from "@/lib/api-origin";
import { nftProxyImageUrl } from "./proxy-image";

export interface VerifiedNft {
  contract: `0x${string}`;
  tokenId: bigint;
  owner: Address;
  collectionName: string;
  collectionSlug: string;
  chainId: number;
  tokenUri: string | null;
  imageUrl: string | null;
  /** On-chain proof — never trust user-uploaded images. */
  verified: true;
}

export type VerifyNftError =
  | "NOT_WHITELISTED"
  | "INVALID_TOKEN_ID"
  | "NOT_OWNER"
  | "RPC_ERROR"
  | "NOT_FOUND";

function verifyApiUrl(): string {
  return `${apiRoot()}/nft/verify`;
}

type ApiVerifyResponse =
  | {
      ok: true;
      nft: Omit<VerifiedNft, "tokenId" | "verified"> & {
        tokenId: string;
        verified: true;
      };
    }
  | { ok: false; error: VerifyNftError };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function verifyViaApiOnce(
  contractAddress: string,
  tokenIdInput: string,
  walletAddress: Address,
): Promise<
  | { ok: true; nft: VerifiedNft }
  | { ok: false; error: VerifyNftError }
  | null
> {
  try {
    const res = await fetch(verifyApiUrl(), {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        contract: contractAddress,
        tokenId: tokenIdInput,
        wallet: walletAddress,
      }),
    });
    let data: ApiVerifyResponse;
    try {
      data = (await res.json()) as ApiVerifyResponse;
    } catch {
      return { ok: false, error: "RPC_ERROR" };
    }
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.ok ? "RPC_ERROR" : data.error };
    }
    const imageUrl =
      data.nft.imageUrl ??
      nftProxyImageUrl(data.nft.contract, data.nft.tokenId);
    return {
      ok: true,
      nft: {
        ...data.nft,
        contract: data.nft.contract as `0x${string}`,
        tokenId: BigInt(data.nft.tokenId),
        owner: data.nft.owner as Address,
        imageUrl,
        verified: true,
      },
    };
  } catch {
    return null;
  }
}

async function verifyViaApi(
  contractAddress: string,
  tokenIdInput: string,
  walletAddress: Address,
): Promise<{ ok: true; nft: VerifiedNft } | { ok: false; error: VerifyNftError }> {
  const retries = 3;
  for (let i = 0; i < retries; i++) {
    const result = await verifyViaApiOnce(
      contractAddress,
      tokenIdInput,
      walletAddress,
    );
    if (result?.ok) return result;
    if (result && !result.ok && result.error !== "RPC_ERROR") return result;
    if (i < retries - 1) await sleep(800 * (i + 1));
  }
  return { ok: false, error: "RPC_ERROR" };
}

export async function verifyNftOwnership(
  contractAddress: string,
  tokenIdInput: string,
  walletAddress: Address,
): Promise<{ ok: true; nft: VerifiedNft } | { ok: false; error: VerifyNftError }> {
  const normalized = contractAddress.toLowerCase();

  if (!isWhitelistedContract(normalized)) {
    return { ok: false, error: "NOT_WHITELISTED" };
  }

  let tokenId: bigint;
  try {
    tokenId = BigInt(tokenIdInput);
    if (tokenId < BigInt(0)) return { ok: false, error: "INVALID_TOKEN_ID" };
  } catch {
    return { ok: false, error: "INVALID_TOKEN_ID" };
  }

  return verifyViaApi(normalized, tokenIdInput, walletAddress);
}

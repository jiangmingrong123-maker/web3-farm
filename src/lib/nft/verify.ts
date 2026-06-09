import { getCollectionByContract } from "@/config/collections";
import { isWhitelistedContract } from "@/config/swap";
import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";
import { erc721Abi } from "./abi";

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

/** Browser-friendly mainnet RPC (default viem URL often fails CORS in the client). */
const MAINNET_RPC =
  process.env.NEXT_PUBLIC_ETH_RPC_URL ?? "https://ethereum.publicnode.com";

const client = createPublicClient({
  chain: mainnet,
  transport: http(MAINNET_RPC, { timeout: 30_000 }),
});

type ApiVerifyResponse =
  | {
      ok: true;
      nft: Omit<VerifiedNft, "tokenId" | "verified"> & {
        tokenId: string;
        verified: true;
      };
    }
  | { ok: false; error: VerifyNftError };

async function verifyViaApi(
  contractAddress: string,
  tokenIdInput: string,
  walletAddress: Address,
): Promise<{ ok: true; nft: VerifiedNft } | { ok: false; error: VerifyNftError } | null> {
  try {
    const res = await fetch("/api/nft/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contract: contractAddress,
        tokenId: tokenIdInput,
        wallet: walletAddress,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ApiVerifyResponse;
    if (!data.ok) return { ok: false, error: data.error };
    return {
      ok: true,
      nft: {
        ...data.nft,
        contract: data.nft.contract as `0x${string}`,
        tokenId: BigInt(data.nft.tokenId),
        owner: data.nft.owner as Address,
        verified: true,
      },
    };
  } catch {
    return null;
  }
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

  const apiResult = await verifyViaApi(normalized, tokenIdInput, walletAddress);
  if (apiResult) return apiResult;

  const collection = getCollectionByContract(normalized);
  const contract = normalized as `0x${string}`;

  try {
    const owner = await client.readContract({
      address: contract,
      abi: erc721Abi,
      functionName: "ownerOf",
      args: [tokenId],
    });

    if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
      return { ok: false, error: "NOT_OWNER" };
    }

    let tokenUri: string | null = null;
    try {
      tokenUri = await client.readContract({
        address: contract,
        abi: erc721Abi,
        functionName: "tokenURI",
        args: [tokenId],
      });
    } catch {
      tokenUri = null;
    }

    return {
      ok: true,
      nft: {
        contract,
        tokenId,
        owner,
        collectionName: collection?.name ?? "Unknown",
        collectionSlug: collection?.slug ?? "unknown",
        chainId: collection?.chainId ?? 1,
        tokenUri,
        imageUrl: null,
        verified: true,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("revert") ||
      msg.includes("ERC721") ||
      msg.includes("nonexistent")
    ) {
      return { ok: false, error: "NOT_FOUND" };
    }
    return { ok: false, error: "RPC_ERROR" };
  }
}

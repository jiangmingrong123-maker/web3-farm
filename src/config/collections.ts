import type { RarityStrategyId } from "@/lib/rarity/types";

export interface CollectionConfig {
  slug: string;
  name: string;
  chainId: number;
  contractAddress: `0x${string}`;
  standard: "erc721" | "erc1155";
  rarityStrategy: RarityStrategyId;
  traitRarityTableId: string;
  enabled: boolean;
  maxBindingsPerWallet: number;
}

/** Ethereum Nobody — first registered collection. */
export const NOBODY_COLLECTION: CollectionConfig = {
  slug: "nobody",
  name: "Nobody",
  chainId: 1,
  contractAddress: "0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a",
  standard: "erc721",
  rarityStrategy: "nobody_v1",
  traitRarityTableId: "nobody_stats_v1",
  enabled: true,
  maxBindingsPerWallet: 5,
};

export const COLLECTIONS: CollectionConfig[] = [NOBODY_COLLECTION];

export function getCollection(slug: string): CollectionConfig | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}

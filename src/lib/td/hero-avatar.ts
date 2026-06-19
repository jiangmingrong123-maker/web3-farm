import { NOBODY_6037_TOKEN_ID } from "@/lib/samples/nobody-6037";
import type { BoundNft, FarmState } from "@/lib/farm-storage";
import { loadFarmState } from "@/lib/farm-storage";

export type HeroAvatar =
  | { kind: "nobody"; tokenId: string; name: string; imageUrl?: string }
  | { kind: "generic"; name: string };

export function pickHeroFromBindings(
  boundSlots: Record<number, BoundNft | null>,
): HeroAvatar | null {
  const bound = Object.values(boundSlots)
    .filter((b): b is BoundNft => !!b)
    .find((b) => b.collectionSlug === "nobody");
  if (!bound) return null;
  return {
    kind: "nobody",
    tokenId: bound.tokenId,
    name: bound.name,
    imageUrl: bound.imageUrl || undefined,
  };
}

export async function resolveHeroAvatar(
  wallet: string | undefined,
  demoMode: boolean,
  fetchFarm: (w: string) => Promise<FarmState | null>,
): Promise<HeroAvatar> {
  if (demoMode) {
    return {
      kind: "nobody",
      tokenId: NOBODY_6037_TOKEN_ID,
      name: `Nobody #${NOBODY_6037_TOKEN_ID}`,
    };
  }
  if (!wallet) return { kind: "generic", name: "路人" };

  const remote = await fetchFarm(wallet);
  const state = remote ?? loadFarmState(wallet);
  const hero = pickHeroFromBindings(state.boundSlots);
  return hero ?? { kind: "generic", name: "路人" };
}

import { BUFF_DURATION_MS, shopItem } from "@/config/td/shop";
import { getEquipItem } from "@/config/td/equipment-catalog";
import type { HeroSave } from "@/config/td/rpg";
import type { TdProfile } from "@/lib/td-api";
import { autoEquipIfBetter } from "@/lib/td/rpg-storage";

export function applyShopPurchase(
  profile: TdProfile,
  hero: HeroSave,
  itemId: string,
): { profile: TdProfile; hero: HeroSave } | null {
  const item = shopItem(itemId);
  if (!item || profile.gold < item.price) return null;

  const nextProfile: TdProfile = { ...profile, gold: profile.gold - item.price };
  let nextHero = hero;

  if (item.kind === "passive" || item.kind === "active") {
    const now = Date.now();
    return {
      profile: {
        ...nextProfile,
        buffs: {
          ...profile.buffs,
          [itemId]: {
            purchasedAt: now,
            expiresAt: now + BUFF_DURATION_MS,
            usesLeft: item.kind === "active" ? 1 : undefined,
          },
        },
      },
      hero: nextHero,
    };
  }

  if (item.kind === "gear" && item.gearId) {
    const gear = getEquipItem(item.gearId);
    if (!gear) return null;
    nextHero = structuredClone(hero);
    if (!nextHero.inventory.includes(item.gearId)) {
      nextHero.inventory.push(item.gearId);
    }
    nextHero = autoEquipIfBetter(nextHero, item.gearId);
    return { profile: nextProfile, hero: nextHero };
  }

  if (item.kind === "material" && item.materialId) {
    const qty = item.materialQty ?? 1;
    nextHero = structuredClone(hero);
    const materials = { ...nextHero.materials };
    materials[item.materialId] = (materials[item.materialId] ?? 0) + qty;
    nextHero = { ...nextHero, materials };
    return { profile: nextProfile, hero: nextHero };
  }

  return null;
}

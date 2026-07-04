import {
  getEquipItem,
  STARTER_EQUIP_IDS,
  type EquipItemDef,
} from "@/config/td/equipment-catalog";
import { maxEquipLevelForHero } from "@/config/td/hero-levels";
import { EQUIP_SLOTS, type EquipSlot, type HeroSave } from "@/config/td/rpg";

export function canHeroWearItem(save: HeroSave, itemId: string): boolean {
  const item = getEquipItem(itemId);
  if (!item) return false;
  return item.level <= maxEquipLevelForHero(save.level);
}

/** 卸下单件超等级装备，换回初始装并放回背包 */
export function sanitizeEquipped(save: HeroSave): HeroSave {
  const next = structuredClone(save);
  let changed = false;
  for (const slot of EQUIP_SLOTS) {
    const id = next.equipped[slot];
    if (!id || canHeroWearItem(next, id)) continue;
    if (!next.inventory.includes(id)) next.inventory.push(id);
    next.equipped[slot] = STARTER_EQUIP_IDS[slot];
    changed = true;
  }
  return changed ? next : save;
}

export function wearableInventoryForSlot(save: HeroSave, slot: EquipSlot): string[] {
  const ids = new Set<string>();
  for (const id of save.inventory) {
    const item = getEquipItem(id);
    if (item?.slot === slot && canHeroWearItem(save, id)) ids.add(id);
  }
  return Array.from(ids).sort((a, b) => {
    const ia = getEquipItem(a);
    const ib = getEquipItem(b);
    return (ib?.level ?? 0) - (ia?.level ?? 0);
  });
}

export function rarityLabel(item: EquipItemDef, locale: string): string {
  if (locale !== "zh") {
    const map: Record<EquipItemDef["rarity"], string> = {
      普通: "Common",
      高级: "Fine",
      稀有: "Rare",
      传说: "Legend",
      特制: "Unique",
    };
    return map[item.rarity];
  }
  return item.rarity;
}

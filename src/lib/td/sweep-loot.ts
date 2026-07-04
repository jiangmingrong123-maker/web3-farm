import {
  equipItemName,
  getEquipItem,
  STARTER_EQUIP_IDS,
  type EquipItemDef,
  type EquipRarity,
} from "@/config/td/equipment-catalog";
import { equipRecycleGold } from "@/config/td/economy";
import { syncHeroLevel, type HeroSave } from "@/config/td/rpg";
import { autoEquipIfBetter } from "@/lib/td/rpg-storage";

export type SweepLogEntry = {
  type: "exp" | "loot" | "equip" | "recycle" | "bag" | "levelup" | "summary" | "quest";
  text: string;
};

function isStarterItem(itemId: string): boolean {
  return Object.values(STARTER_EQUIP_IDS).includes(itemId);
}

export function shouldAutoRecycle(
  item: EquipItemDef,
  recycleRarities: EquipRarity[],
): boolean {
  if (isStarterItem(item.id)) return false;
  return recycleRarities.includes(item.rarity);
}

/** @deprecated use shouldAutoRecycle */
export function isCommonRecyclable(item: EquipItemDef): boolean {
  return item.rarity === "普通" && !isStarterItem(item.id);
}

export function applySweepLoot(
  save: HeroSave,
  itemId: string,
  locale: string,
  autoEquip: boolean,
  recycleRarities: EquipRarity[],
): { save: HeroSave; gold: number; log: SweepLogEntry | null } {
  const item = getEquipItem(itemId);
  if (!item) return { save, gold: 0, log: null };
  const zh = locale === "zh";
  const name = equipItemName(item, locale);

  if (shouldAutoRecycle(item, recycleRarities)) {
    const gold = equipRecycleGold(item.level, item.rarity);
    return {
      save,
      gold,
      log: {
        type: "recycle",
        text: zh
          ? `回收「${name}」(${item.rarity}) → +${gold} 金币`
          : `Recycled ${name} (${item.rarity}) → +${gold} gold`,
      },
    };
  }

  let next = structuredClone(save);
  if (!next.inventory.includes(itemId)) {
    next.inventory.push(itemId);
  }

  if (autoEquip) {
    const before = next.equipped[item.slot];
    next = autoEquipIfBetter(next, itemId);
    const after = next.equipped[item.slot];
    if (after === itemId && before !== itemId) {
      return {
        save: syncHeroLevel(next),
        gold: 0,
        log: {
          type: "equip",
          text: zh ? `自动穿戴「${name}」` : `Auto-equipped ${name}`,
        },
      };
    }
  }

  return {
    save: syncHeroLevel(next),
    gold: 0,
    log: {
      type: "bag",
      text: zh ? `入包「${name}」` : `Stashed ${name}`,
    },
  };
}

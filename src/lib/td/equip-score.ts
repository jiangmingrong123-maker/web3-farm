import {
  getEquipItem,
  itemStats,
  type EquipItemDef,
} from "@/config/td/equipment-catalog";
import { maxEquipLevelForHero } from "@/config/td/hero-levels";
import { EQUIP_SLOTS, heroCombatStats, type EquipSlot, type HeroSave } from "@/config/td/rpg";

export type EquipStatBonus = ReturnType<typeof itemStats>;

/**
 * 单件装备综合评分（不含特技）。
 * 攻/防/血/暴/速加权，便于跨部位比较与排行榜。
 */
export function scoreEquipStats(stats: EquipStatBonus): number {
  return Math.round(
    stats.str * 3 +
      stats.agi * 3 +
      stats.mag * 3 +
      stats.atk +
      stats.def +
      stats.hp * 0.1 +
      stats.mp * 0.08 +
      stats.magDmg * 0.15 +
      stats.dodge * 2,
  );
}

export function scoreEquipItem(item: EquipItemDef): number {
  return scoreEquipStats(itemStats(item));
}

export function scoreEquipItemId(itemId: string): number {
  const item = getEquipItem(itemId);
  if (!item) return 0;
  return scoreEquipItem(item);
}

/** 身上某槽位当前穿戴评分（超等级不计） */
export function scoreEquippedSlot(save: HeroSave, slot: EquipSlot): number {
  const id = save.equipped[slot];
  const item = getEquipItem(id);
  if (!item || item.level > maxEquipLevelForHero(save.level)) return 0;
  return scoreEquipItem(item);
}

/** 全身装备总评 */
export function totalEquippedGearScore(save: HeroSave): number {
  let sum = 0;
  for (const slot of EQUIP_SLOTS) {
    sum += scoreEquippedSlot(save, slot);
  }
  return sum;
}

/** 主角综合战力（属性 + 装备，与主界面一致） */
export function heroCombatPowerScore(save: HeroSave): number {
  const c = heroCombatStats(save);
  return Math.round(c.atk + c.def + c.maxHp / 10 + c.magDmg * 0.15);
}

export function scoreDelta(current: number, next: number): number {
  return next - current;
}

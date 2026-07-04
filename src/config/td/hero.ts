/** 主角养成 · 装备始终穿戴 */

export type EquipSlot = "weapon" | "armor" | "charm";

export const EQUIP_LABELS: Record<EquipSlot, { zh: string; en: string }> = {
  weapon: { zh: "剧本笔", en: "Script pen" },
  armor: { zh: "礼服", en: "Gown" },
  charm: { zh: "应援牌", en: "Fan sign" },
};

export const HERO_BASE = {
  hp: 48,
  atk: 10,
  def: 4,
  spd: 12,
};

/** 主角等级加成 */
export function heroLevelBonus(level: number) {
  const lv = Math.max(1, level);
  return {
    hp: 6 * (lv - 1),
    atk: 2 * (lv - 1),
    def: 1 * (lv - 1),
  };
}

/** 装备等级加成 */
export function equipBonus(slot: EquipSlot, level: number) {
  const lv = Math.max(1, level);
  if (slot === "weapon") return { atk: 3 * lv, def: 0, hp: 0 };
  if (slot === "armor") return { atk: 0, def: 2 * lv, hp: 4 * lv };
  return { atk: 0, def: lv, hp: 2 * lv, spd: lv };
}

export type UpgradeTarget =
  | "hero"
  | "weapon"
  | "armor"
  | "charm"
  | "sidekick";

export function upgradeGoldCost(target: UpgradeTarget, currentLevel: number): number {
  const lv = Math.max(0, currentLevel);
  const base =
    target === "hero" ? 20
    : target === "sidekick" ? 25
    : 15;
  return Math.floor(base * 1.55 ** lv);
}

export const MAX_HERO_LEVEL = 50;
export const MAX_EQUIP_LEVEL = 30;
export const MAX_SIDEKICK_LEVEL = 20;

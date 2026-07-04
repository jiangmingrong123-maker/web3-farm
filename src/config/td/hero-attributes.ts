/** 主角三维：力量 / 敏捷 / 魔力 → 战斗衍生 */

import type { EquipBonus } from "@/config/td/rpg";

export type StatKey = "str" | "agi" | "mag";

export type HeroStats3 = Record<StatKey, number>;

/** 每升 1 级获得的潜力点（手动分配） */
export const STAT_POINTS_PER_LEVEL = 5;

/** 1 力量 = 15 气血 */
export const HP_PER_STR = 15;
/** 1 力量 = 2 力量型攻击 */
export const STR_ATK_PER_STR = 2;

/** 1 敏捷 = 2 防御 */
export const DEF_PER_AGI = 2;
/** 1 敏捷 = 2 敏捷型攻击 */
export const AGI_ATK_PER_AGI = 2;
/** 1 敏捷 = 1.2% 闪避 */
export const DODGE_PER_AGI = 1.2;

/** 1 魔力 = 10 魔量上限 */
export const MP_PER_MAG = 10;
/** 1 魔力 = 4 魔法型攻击 */
export const MAG_DMG_PER_MAG = 4;

/** 每级额外气血 */
export const HP_PER_LEVEL = 5;
/** 每级额外力量/敏捷攻击 */
export const STR_ATK_PER_LEVEL = 1;
export const AGI_ATK_PER_LEVEL = 1;
/** 每级额外魔量 */
export const MP_PER_LEVEL = 3;

export const STAT_LABELS_ZH: Record<StatKey, string> = {
  str: "力量",
  agi: "敏捷",
  mag: "魔力",
};

export const STAT_LABELS_EN: Record<StatKey, string> = {
  str: "STR",
  agi: "AGI",
  mag: "MAG",
};

export const STAT_HINTS_ZH: Record<StatKey, string> = {
  str: `1 力量 = ${HP_PER_STR} 气血、${STR_ATK_PER_STR} 力攻`,
  agi: `1 敏捷 = ${DEF_PER_AGI} 防御、${AGI_ATK_PER_AGI} 敏攻`,
  mag: `1 魔力 = ${MP_PER_MAG} 魔量、${MAG_DMG_PER_MAG} 法伤`,
};

export const STAT_HINTS_EN: Record<StatKey, string> = {
  str: `1 STR = ${HP_PER_STR} HP, ${STR_ATK_PER_STR} power ATK`,
  agi: `1 AGI = ${DEF_PER_AGI} DEF, ${AGI_ATK_PER_AGI} speed ATK`,
  mag: `1 MAG = ${MP_PER_MAG} MP, ${MAG_DMG_PER_MAG} spell ATK`,
};

export function statLabel(key: StatKey, locale: string): string {
  return locale === "zh" ? STAT_LABELS_ZH[key] : STAT_LABELS_EN[key];
}

export function statHint(key: StatKey, locale: string): string {
  return locale === "zh" ? STAT_HINTS_ZH[key] : STAT_HINTS_EN[key];
}

export type DerivedCombatStats = {
  maxHp: number;
  strAtk: number;
  agiAtk: number;
  def: number;
  dodge: number;
  magDmg: number;
  maxMp: number;
};

/** 三维 + 等级 + 装备 → 战斗数值（装备可加三维与战斗属性） */
export function deriveCombatStats(
  stats: HeroStats3,
  level: number,
  equip: EquipBonus,
): DerivedCombatStats {
  const str = stats.str + equip.str;
  const agi = stats.agi + equip.agi;
  const mag = stats.mag + equip.mag;

  const maxHp = Math.floor(str * HP_PER_STR + level * HP_PER_LEVEL + equip.hp);
  const strAtk = Math.floor(str * STR_ATK_PER_STR + level * STR_ATK_PER_LEVEL + equip.atk);
  const agiAtk = Math.floor(agi * AGI_ATK_PER_AGI + level * AGI_ATK_PER_LEVEL);
  const def = Math.floor(agi * DEF_PER_AGI + equip.def);
  const dodge =
    Math.round(agi * DODGE_PER_AGI * 10) / 10 + Math.round(equip.dodge * 10) / 10;
  const maxMp = Math.floor(mag * MP_PER_MAG + level * MP_PER_LEVEL + equip.mp);
  const magDmg = Math.floor(mag * MAG_DMG_PER_MAG + equip.magDmg);
  return { maxHp, strAtk, agiAtk, def, dodge, magDmg, maxMp };
}

/** 单主角 RPG · 装备栏 · 怪物区域 */

import {
  getEquipItem,
  itemStats,
  STARTER_EQUIP_IDS,
} from "@/config/td/equipment-catalog";
import {
  deriveCombatStats,
  STAT_POINTS_PER_LEVEL,
  type DerivedCombatStats,
  type HeroStats3,
  type StatKey,
} from "@/config/td/hero-attributes";
import { levelFromExp, maxEquipLevelForHero, MAX_HERO_LEVEL_BATCH1 } from "@/config/td/hero-levels";
import {
  DEFAULT_PROTAGONIST,
  defaultStatsForProtagonist,
  primaryPhysAtk,
  type ProtagonistId,
} from "@/config/td/protagonists";
import { RUN_MAX_ZONE, SCENES_PER_MAP } from "@/config/td/zones";

export type EquipSlot =
  | "weapon"
  | "hat"
  | "clothes"
  | "pants"
  | "ring"
  | "bracelet";

export type CompanionKind = "群" | "粉" | "编" | "导";

export const COMPANION_KINDS: CompanionKind[] = ["群", "粉", "编", "导"];

export const EQUIP_SLOTS: EquipSlot[] = [
  "weapon",
  "hat",
  "clothes",
  "pants",
  "ring",
  "bracelet",
];

export const EQUIP_NAMES: Record<EquipSlot, string> = {
  weapon: "武器",
  hat: "帽子",
  clothes: "衣服",
  pants: "裤子",
  ring: "戒指",
  bracelet: "手环",
};

export const EQUIP_NAMES_EN: Record<EquipSlot, string> = {
  weapon: "Weapon",
  hat: "Hat",
  clothes: "Armor",
  pants: "Pants",
  ring: "Ring",
  bracelet: "Bracelet",
};

export const COMPANION_UNLOCK_GOLD: Record<CompanionKind, number> = {
  群: 0,
  粉: 0,
  编: 80,
  导: 120,
};

export const MAX_HERO_LEVEL = MAX_HERO_LEVEL_BATCH1;
export const MAX_COMPANION_LEVEL = 5;

export function companionLevelCost(level: number): number {
  return 10 + level * 6;
}

export interface EquipBonus {
  str: number;
  agi: number;
  mag: number;
  atk: number;
  def: number;
  dodge: number;
  hp: number;
  mp: number;
  magDmg: number;
}

export interface HeroSave {
  protagonistId: ProtagonistId;
  level: number;
  exp: number;
  /** 已分配三维 */
  stats: HeroStats3;
  /** 未分配潜力点 */
  statPoints: number;
  /** 当前地图 1–20 */
  worldMap: number;
  /** 下一场场景 1–5（5 为 BOSS） */
  worldScene: number;
  equipped: Record<EquipSlot, string>;
  inventory: string[];
  /** 强化石、洗练符等特殊材料 */
  materials: Record<string, number>;
  companionLevel: Record<CompanionKind, number>;
  companionUnlocked: Record<CompanionKind, boolean>;
  /** 累计击杀数（怪物名 → 数量） */
  questKills: Record<string, number>;
  /** 已领取奖励的任务 id */
  questsClaimed: string[];
}

export interface HeroStats {
  hp: number;
  maxHp: number;
  /** 主要物理攻击（按主角流派） */
  atk: number;
  strAtk: number;
  agiAtk: number;
  def: number;
  dodge: number;
  magDmg: number;
  maxMp: number;
  mp: number;
  stats: HeroStats3;
}

function buildHeroStats(stats: HeroStats3, level: number, eq: EquipBonus, protagonistId: ProtagonistId): HeroStats {
  const d = deriveCombatStats(stats, level, eq);
  const atk = primaryPhysAtk(protagonistId, d);
  return {
    hp: d.maxHp,
    maxHp: d.maxHp,
    atk,
    strAtk: d.strAtk,
    agiAtk: d.agiAtk,
    def: d.def,
    dodge: d.dodge,
    magDmg: d.magDmg,
    maxMp: d.maxMp,
    mp: d.maxMp,
    stats,
  };
}

/** 导出衍生数值（战力估算等） */
export function heroDerivedStats(save: HeroSave): DerivedCombatStats {
  return deriveCombatStats(save.stats, save.level, sumEquippedBonus(save));
}

export function defaultEquipped(): Record<EquipSlot, string> {
  return { ...STARTER_EQUIP_IDS };
}

export function defaultHeroSave(): HeroSave {
  const id = DEFAULT_PROTAGONIST;
  return {
    protagonistId: id,
    level: 1,
    exp: 0,
    stats: defaultStatsForProtagonist(id),
    statPoints: 0,
    worldMap: 1,
    worldScene: 1,
    equipped: defaultEquipped(),
    inventory: [],
    materials: {},
    companionLevel: { 群: 1, 粉: 1, 编: 1, 导: 1 },
    companionUnlocked: { 群: false, 粉: false, 编: false, 导: false },
    questKills: {},
    questsClaimed: [],
  };
}

export function sumEquippedBonus(save: HeroSave): EquipBonus {
  const sum: EquipBonus = {
    str: 0,
    agi: 0,
    mag: 0,
    atk: 0,
    def: 0,
    dodge: 0,
    hp: 0,
    mp: 0,
    magDmg: 0,
  };
  for (const slot of EQUIP_SLOTS) {
    const item = getEquipItem(save.equipped[slot]);
    if (!item) continue;
    if (item.level > maxEquipLevelForHero(save.level)) continue;
    const b = itemStats(item);
    sum.str += b.str;
    sum.agi += b.agi;
    sum.mag += b.mag;
    sum.atk += b.atk;
    sum.def += b.def;
    sum.dodge += b.dodge;
    sum.hp += b.hp;
    sum.mp += b.mp;
    sum.magDmg += b.magDmg;
  }
  return sum;
}

/** 主角战斗属性（三维 + 等级 + 装备） */
export function heroCombatStats(save: HeroSave): HeroStats {
  const eq = sumEquippedBonus(save);
  return buildHeroStats(save.stats, save.level, eq, save.protagonistId);
}

export function companionAtk(kind: CompanionKind, level: number): number {
  const base = { 群: 4, 粉: 3, 编: 2, 导: 5 }[kind];
  return Math.floor(base + level * 1.5);
}

/** 同步等级；升级时发放潜力点 */
export function syncHeroLevel(save: HeroSave): HeroSave {
  const level = levelFromExp(save.exp);
  if (level <= save.level) {
    if (level === save.level) return save;
    return { ...save, level };
  }
  const gained = level - save.level;
  return {
    ...save,
    level,
    statPoints: save.statPoints + gained * STAT_POINTS_PER_LEVEL,
  };
}

/** 切换主角：重置三维并返还已分配潜力点 */
export function resetStatsForProtagonist(save: HeroSave, id: ProtagonistId): HeroSave {
  const oldStart = defaultStatsForProtagonist(save.protagonistId);
  const spent =
    Math.max(0, save.stats.str - oldStart.str) +
    Math.max(0, save.stats.agi - oldStart.agi) +
    Math.max(0, save.stats.mag - oldStart.mag);
  return {
    ...save,
    protagonistId: id,
    stats: defaultStatsForProtagonist(id),
    statPoints: save.statPoints + spent,
  };
}

export function allocateStatPoint(save: HeroSave, key: StatKey): HeroSave | null {
  if (save.statPoints <= 0) return null;
  return {
    ...save,
    statPoints: save.statPoints - 1,
    stats: { ...save.stats, [key]: save.stats[key] + 1 },
  };
}

/** 批量分配潜力点（确认后一次性消耗） */
export function allocateStatPointsBatch(
  save: HeroSave,
  deltas: Record<StatKey, number>,
): HeroSave | null {
  const total = deltas.str + deltas.agi + deltas.mag;
  if (total <= 0 || total > save.statPoints) return null;
  if (deltas.str < 0 || deltas.agi < 0 || deltas.mag < 0) return null;
  return {
    ...save,
    statPoints: save.statPoints - total,
    stats: {
      str: save.stats.str + deltas.str,
      agi: save.stats.agi + deltas.agi,
      mag: save.stats.mag + deltas.mag,
    },
  };
}

/** 场景胜利后推进地图进度 */
export function advanceWorldProgress(
  save: HeroSave,
  mapId: number,
  scene: number,
): HeroSave {
  if (scene >= SCENES_PER_MAP) {
    if (mapId >= RUN_MAX_ZONE) {
      return { ...save, worldMap: RUN_MAX_ZONE, worldScene: SCENES_PER_MAP };
    }
    return { ...save, worldMap: mapId + 1, worldScene: 1 };
  }
  return { ...save, worldMap: mapId, worldScene: scene + 1 };
}

export interface ZoneEnemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  isBoss?: boolean;
  isMiniBoss?: boolean;
}

export type { StatKey, HeroStats3 };

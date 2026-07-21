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
import {
  PET_CATALOG,
  PET_SUMMON_ORDER,
  defaultBattleParty,
  emptyNeidan,
  getPetDef,
  petAtkFromDef,
  type NeidanSlot,
  type PetId,
} from "@/config/td/pet-catalog";

export type EquipSlot =
  | "weapon"
  | "hat"
  | "clothes"
  | "pants"
  | "ring"
  | "bracelet";

/** 宠物 ID（与 pet-catalog 同步） */
export type CompanionKind = PetId;

export const COMPANION_KINDS: CompanionKind[] = [...PET_SUMMON_ORDER];

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

export const COMPANION_UNLOCK_GOLD: Record<CompanionKind, number> = Object.fromEntries(
  PET_CATALOG.map((p) => [p.id, p.summonGold]),
) as Record<CompanionKind, number>;

/** 达到等级自动解锁（免费宠物，无需金币召唤） */
export const COMPANION_AUTO_UNLOCK_LEVEL: Partial<Record<CompanionKind, number>> =
  Object.fromEntries(
    PET_CATALOG.filter((p) => p.summonGold === 0).map((p) => [p.id, p.summonLevel]),
  ) as Partial<Record<CompanionKind, number>>;

export const MAX_HERO_LEVEL = MAX_HERO_LEVEL_BATCH1;
/** @deprecated 用伙伴独立等级上限 = 主角等级；保留常量给旧 UI */
export const MAX_COMPANION_LEVEL = MAX_HERO_LEVEL_BATCH1;

export function companionLevelCost(level: number): number {
  return 8 + level * 5;
}

function emptyCompanionRecord<T>(value: T): Record<CompanionKind, T> {
  return Object.fromEntries(COMPANION_KINDS.map((k) => [k, value])) as Record<
    CompanionKind,
    T
  >;
}

function emptyNeidanMap(): Record<CompanionKind, Record<NeidanSlot, number>> {
  return Object.fromEntries(COMPANION_KINDS.map((k) => [k, emptyNeidan()])) as Record<
    CompanionKind,
    Record<NeidanSlot, number>
  >;
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
  /** 伙伴独立等级（上限 = 主角等级） */
  companionLevel: Record<CompanionKind, number>;
  companionUnlocked: Record<CompanionKind, boolean>;
  /** 手动上阵 4 格；null = 空位 */
  battleParty: (CompanionKind | null)[];
  /** 修炼等级 0–20 */
  companionCultivate: Record<CompanionKind, number>;
  /** 内丹六格等级 */
  companionNeidan: Record<CompanionKind, Record<NeidanSlot, number>>;
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
    companionLevel: emptyCompanionRecord(1),
    companionUnlocked: emptyCompanionRecord(false),
    battleParty: defaultBattleParty(),
    companionCultivate: emptyCompanionRecord(0),
    companionNeidan: emptyNeidanMap(),
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
  const def = getPetDef(kind);
  if (def) return petAtkFromDef(def, level);
  return Math.floor(4 + level * 2);
}

/** 补齐存档里缺失的宠物字段（扩表后兼容旧档） */
export function ensureCompanionMaps(save: HeroSave): HeroSave {
  const companionLevel = { ...emptyCompanionRecord(1), ...save.companionLevel };
  const companionUnlocked = {
    ...emptyCompanionRecord(false),
    ...save.companionUnlocked,
  };
  const companionCultivate = {
    ...emptyCompanionRecord(0),
    ...save.companionCultivate,
  };
  const companionNeidan = { ...emptyNeidanMap() };
  for (const k of COMPANION_KINDS) {
    companionNeidan[k] = {
      ...emptyNeidan(),
      ...(save.companionNeidan?.[k] ?? {}),
    };
  }
  let battleParty = Array.isArray(save.battleParty)
    ? [...save.battleParty]
    : defaultBattleParty();
  while (battleParty.length < 4) battleParty.push(null);
  battleParty = battleParty.slice(0, 4).map((id) => {
    if (!id || !COMPANION_KINDS.includes(id)) return null;
    return id;
  });
  return {
    ...save,
    companionLevel,
    companionUnlocked,
    companionCultivate,
    companionNeidan,
    battleParty,
  };
}

/** 等级达标时自动解锁免费助手，并自动填满空上阵位 */
export function syncCompanionUnlocks(save: HeroSave): HeroSave {
  let next = ensureCompanionMaps(save);
  for (const [kind, minLv] of Object.entries(COMPANION_AUTO_UNLOCK_LEVEL) as [
    CompanionKind,
    number,
  ][]) {
    if (next.level < minLv || next.companionUnlocked[kind]) continue;
    next = {
      ...next,
      companionUnlocked: { ...next.companionUnlocked, [kind]: true },
      companionLevel: {
        ...next.companionLevel,
        [kind]: Math.max(1, next.companionLevel[kind] ?? 1),
      },
    };
  }
  // 独立等级不超过主角
  const cappedLevels = { ...next.companionLevel };
  for (const k of COMPANION_KINDS) {
    cappedLevels[k] = Math.min(
      Math.max(1, cappedLevels[k] ?? 1),
      Math.max(1, next.level),
    );
  }
  next = { ...next, companionLevel: cappedLevels };

  // 空阵容时自动塞已解锁宠物（首次）
  const hasAny = next.battleParty.some((x) => x != null);
  if (!hasAny) {
    const party = defaultBattleParty();
    let i = 0;
    for (const k of PET_SUMMON_ORDER) {
      if (i >= 4) break;
      if (!next.companionUnlocked[k]) continue;
      party[i++] = k;
    }
    next = { ...next, battleParty: party };
  }
  return next;
}

/** 同步等级；升级时发放潜力点 */
export function syncHeroLevel(save: HeroSave): HeroSave {
  const level = levelFromExp(save.exp);
  if (level <= save.level) {
    const synced = level === save.level ? save : { ...save, level };
    return syncCompanionUnlocks(synced);
  }
  const gained = level - save.level;
  return syncCompanionUnlocks({
    ...save,
    level,
    statPoints: save.statPoints + gained * STAT_POINTS_PER_LEVEL,
  });
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

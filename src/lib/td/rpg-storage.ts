import {
  defaultHeroSave,
  resetStatsForProtagonist,
  syncHeroLevel,
  allocateStatPoint,
  allocateStatPointsBatch,
  advanceWorldProgress,
  COMPANION_KINDS,
  COMPANION_UNLOCK_GOLD,
  companionLevelCost,
  defaultEquipped,
  type CompanionKind,
  type EquipSlot,
  type HeroSave,
} from "@/config/td/rpg";
import type { StatKey } from "@/config/td/hero-attributes";
import { STAT_POINTS_PER_LEVEL } from "@/config/td/hero-attributes";
import {
  getEquipItem,
  resolveEquipItemId,
  STARTER_EQUIP_IDS,
} from "@/config/td/equipment-catalog";
import { expForLevel, levelFromExp } from "@/config/td/hero-levels";
import { equipRecycleGold } from "@/config/td/economy";
import { canHeroWearItem, sanitizeEquipped } from "@/lib/td/equip-rules";
import { applyMonsterKills } from "@/lib/td/quest-progress";
import { scoreEquipItemId } from "@/lib/td/equip-score";
import {
  defaultStatsForProtagonist,
  DEFAULT_PROTAGONIST,
  type ProtagonistId,
} from "@/config/td/protagonists";
import { RUN_MAX_ZONE, SCENES_PER_MAP } from "@/config/td/zones";

const VALID_PROTAGONISTS: ProtagonistId[] = [
  "goku",
  "vegeta",
  "android18",
  "tien",
  "launch",
];

const KEY = "td_rpg_save";

/** 存档版本：4 = 任务杀怪计数 */
export const HERO_SAVE_VERSION = 4;

export function itemPower(itemId: string): number {
  return scoreEquipItemId(itemId);
}

export function autoEquipIfBetter(save: HeroSave, itemId: string): HeroSave {
  const item = getEquipItem(itemId);
  if (!item || !canHeroWearItem(save, itemId)) return save;
  const currentId = save.equipped[item.slot];
  const currentPower = itemPower(currentId);
  const newPower = itemPower(itemId);
  if (newPower <= currentPower) return save;
  return {
    ...save,
    equipped: { ...save.equipped, [item.slot]: itemId },
  };
}

function migrateEquipId(id: string): string {
  return resolveEquipItemId(id);
}

function migrateSave(parsed: Record<string, unknown>): HeroSave {
  const version = typeof parsed.saveVersion === "number" ? parsed.saveVersion : 0;
  if (version < 2) {
    return defaultHeroSave();
  }

  const base = defaultHeroSave();

  const protagonistId =
    typeof parsed.protagonistId === "string"
      ? (parsed.protagonistId as ProtagonistId)
      : base.protagonistId;

  let exp = typeof parsed.exp === "number" ? parsed.exp : base.exp;
  let level = typeof parsed.level === "number" ? parsed.level : base.level;
  if (exp === 0 && level > 1) {
    exp = expForLevel(level);
  }
  level = levelFromExp(exp);

  let equipped = base.equipped;
  if (parsed.equipped && typeof parsed.equipped === "object") {
    const raw = parsed.equipped as HeroSave["equipped"];
    equipped = { ...defaultEquipped() };
    for (const slot of Object.keys(equipped) as (keyof HeroSave["equipped"])[]) {
      if (raw[slot]) equipped[slot] = migrateEquipId(raw[slot]);
    }
  } else if (parsed.equipTier && typeof parsed.equipTier === "object") {
    equipped = { ...defaultEquipped() };
  }

  let inventory: string[] = [];
  if (Array.isArray(parsed.inventory)) {
    inventory = parsed.inventory
      .filter((id): id is string => typeof id === "string")
      .map(migrateEquipId)
      .filter((id, i, arr) => arr.indexOf(id) === i);
  }

  const materials: Record<string, number> = {};
  if (parsed.materials && typeof parsed.materials === "object") {
    for (const [k, v] of Object.entries(parsed.materials as Record<string, unknown>)) {
      if (typeof v === "number" && v > 0) materials[k] = v;
    }
  }

  let stats = defaultStatsForProtagonist(protagonistId);
  if (parsed.stats && typeof parsed.stats === "object") {
    const s = parsed.stats as Record<string, number>;
    const legacyStr = typeof s.str === "number" ? s.str : typeof s.vit === "number" ? s.vit : stats.str;
    stats = {
      str: legacyStr,
      agi: typeof s.agi === "number" ? s.agi : stats.agi,
      mag: typeof s.mag === "number" ? s.mag : stats.mag,
    };
  }

  let statPoints = 0;
  const start = defaultStatsForProtagonist(protagonistId);
  const spent =
    Math.max(0, stats.str - start.str) +
    Math.max(0, stats.agi - start.agi) +
    Math.max(0, stats.mag - start.mag);
  const earned = Math.max(0, (level - 1) * STAT_POINTS_PER_LEVEL);
  const maxPoints = Math.max(0, earned - spent);
  if (typeof parsed.statPoints === "number") {
    statPoints = Math.min(Math.max(0, parsed.statPoints), maxPoints);
  } else {
    statPoints = maxPoints;
  }

  let worldMap = 1;
  if (typeof parsed.worldMap === "number") {
    worldMap = Math.min(Math.max(1, parsed.worldMap), RUN_MAX_ZONE);
  }
  let worldScene = 1;
  if (typeof parsed.worldScene === "number") {
    worldScene = Math.min(Math.max(1, parsed.worldScene), SCENES_PER_MAP);
  }

  const questKills: Record<string, number> = {};
  if (parsed.questKills && typeof parsed.questKills === "object") {
    for (const [k, v] of Object.entries(parsed.questKills as Record<string, unknown>)) {
      if (typeof v === "number" && v > 0) questKills[k] = v;
    }
  }
  let questsClaimed: string[] = [];
  if (Array.isArray(parsed.questsClaimed)) {
    questsClaimed = parsed.questsClaimed.filter((id): id is string => typeof id === "string");
  }

  return sanitizeEquipped(
    syncHeroLevel({
      protagonistId: VALID_PROTAGONISTS.includes(protagonistId)
        ? protagonistId
        : DEFAULT_PROTAGONIST,
      level,
      exp,
      stats,
      statPoints,
      worldMap,
      worldScene,
      equipped,
      inventory,
      materials,
      companionLevel: {
        ...base.companionLevel,
        ...(parsed.companionLevel as HeroSave["companionLevel"] | undefined),
      },
    companionUnlocked: {
      ...base.companionUnlocked,
      ...(parsed.companionUnlocked as HeroSave["companionUnlocked"] | undefined),
    },
    questKills,
    questsClaimed,
    }),
  );
}

export function loadHeroSave(wallet: string): HeroSave {
  if (typeof window === "undefined") return defaultHeroSave();
  try {
    const raw = localStorage.getItem(`${KEY}:${wallet.toLowerCase()}`);
    if (!raw) return defaultHeroSave();
    return sanitizeEquipped(migrateSave(JSON.parse(raw) as Record<string, unknown>));
  } catch {
    return defaultHeroSave();
  }
}

/** 重置主角为 Lv.1 测试档（清空装备背包与地图进度） */
export function resetHeroSave(wallet: string): HeroSave {
  const fresh = defaultHeroSave();
  saveHeroSave(wallet, fresh);
  return fresh;
}

export function saveHeroSave(wallet: string, save: HeroSave) {
  if (typeof window === "undefined") return;
  const synced = syncHeroLevel(save);
  localStorage.setItem(
    `${KEY}:${wallet.toLowerCase()}`,
    JSON.stringify({ ...synced, saveVersion: HERO_SAVE_VERSION }),
  );
}

export type UpgradeKind =
  | { type: "companion"; kind: CompanionKind }
  | { type: "unlock"; kind: CompanionKind }
  | { type: "equip"; slot: EquipSlot; itemId: string }
  | { type: "protagonist"; id: ProtagonistId }
  | { type: "stat"; key: StatKey }
  | { type: "statBatch"; deltas: Record<StatKey, number> }
  | { type: "discard"; itemId: string };

export function upgradeCost(save: HeroSave, kind: UpgradeKind): number | null {
  if (kind.type === "protagonist") return null;
  if (kind.type === "stat" || kind.type === "statBatch") return null;
  if (kind.type === "discard") return 0;
  if (kind.type === "companion") {
    if (!save.companionUnlocked[kind.kind]) return null;
    const lv = save.companionLevel[kind.kind];
    if (lv >= 5) return null;
    return companionLevelCost(lv);
  }
  if (kind.type === "unlock") {
    if (save.companionUnlocked[kind.kind]) return null;
    return COMPANION_UNLOCK_GOLD[kind.kind];
  }
  if (kind.type === "equip") {
    if (!save.inventory.includes(kind.itemId)) return null;
    if (save.equipped[kind.slot] === kind.itemId) return null;
    const item = getEquipItem(kind.itemId);
    if (!item || item.slot !== kind.slot) return null;
    if (!canHeroWearItem(save, kind.itemId)) return null;
    return 0;
  }
  return null;
}

export function applyUpgrade(save: HeroSave, kind: UpgradeKind): HeroSave | null {
  if (kind.type === "stat") {
    return allocateStatPoint(save, kind.key);
  }
  if (kind.type === "statBatch") {
    return allocateStatPointsBatch(save, kind.deltas);
  }
  if (kind.type === "protagonist") {
    if (save.protagonistId === kind.id) return null;
    return resetStatsForProtagonist(save, kind.id);
  }
  if (kind.type === "equip") {
    const item = getEquipItem(kind.itemId);
    if (!item || item.slot !== kind.slot) return null;
    if (!save.inventory.includes(kind.itemId)) return null;
    if (!canHeroWearItem(save, kind.itemId)) return null;
    return { ...save, equipped: { ...save.equipped, [kind.slot]: kind.itemId } };
  }
  if (kind.type === "discard") {
    if (!save.inventory.includes(kind.itemId)) return null;
    if (Object.values(STARTER_EQUIP_IDS).includes(kind.itemId)) return null;
    for (const slot of Object.keys(save.equipped) as EquipSlot[]) {
      if (save.equipped[slot] === kind.itemId) return null;
    }
    const item = getEquipItem(kind.itemId);
    if (!item) return null;
    return {
      ...save,
      inventory: save.inventory.filter((id) => id !== kind.itemId),
    };
  }
  if (upgradeCost(save, kind) == null) return null;
  const next = structuredClone(save);
  if (kind.type === "companion") {
    next.companionLevel[kind.kind] += 1;
  } else if (kind.type === "unlock") {
    next.companionUnlocked[kind.kind] = true;
    next.companionLevel[kind.kind] = 1;
  }
  return next;
}

export function discardInventoryGold(itemId: string): number {
  const item = getEquipItem(itemId);
  if (!item) return 0;
  return equipRecycleGold(item.level, item.rarity);
}

export function applyRunRewards(
  save: HeroSave,
  exp: number,
  lootIds: string[],
  sceneWon?: boolean,
  mapId?: number,
  scene?: number,
  monsterKills?: Record<string, number>,
  locale = "zh",
): { save: HeroSave; questLogs: { text: string; exp: number }[] } {
  let next = structuredClone(save);
  let questLogs: { text: string; exp: number }[] = [];
  next.exp += exp;
  for (const id of lootIds) {
    if (!next.inventory.includes(id)) next.inventory.push(id);
    next = autoEquipIfBetter(next, id);
  }
  if (sceneWon && mapId != null && scene != null) {
    next = advanceWorldProgress(next, mapId, scene);
  }
  if (monsterKills && Object.keys(monsterKills).length > 0) {
    const r = applyMonsterKills(next, monsterKills, locale);
    next = r.save;
    questLogs = r.logs;
  }
  return { save: syncHeroLevel(next), questLogs };
}

export function selectProtagonist(save: HeroSave, id: ProtagonistId): HeroSave {
  return resetStatsForProtagonist(save, id);
}

export function activeCompanions(save: HeroSave): CompanionKind[] {
  return COMPANION_KINDS.filter((k) => save.companionUnlocked[k]);
}

export function inventoryForSlot(save: HeroSave, slot: EquipSlot): string[] {
  const ids = new Set<string>();
  const equipped = save.equipped[slot];
  if (equipped && equipped !== STARTER_EQUIP_IDS[slot]) ids.add(equipped);
  for (const id of save.inventory) {
    const item = getEquipItem(id);
    if (item?.slot === slot) ids.add(id);
  }
  return Array.from(ids);
}

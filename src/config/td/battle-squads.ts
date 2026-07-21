/**
 * 战斗编队 & 怪物数量 · 可调参数
 * 修改本文件即可调整「带多少助手 / 多少怪物 / 自动推进」规则
 */

import {
  getPetDef,
  petName as catalogPetName,
  PET_SUMMON_ORDER,
} from "@/config/td/pet-catalog";
import type { CompanionKind } from "@/config/td/rpg";
import { RUN_MAX_ZONE, SCENES_PER_MAP } from "@/config/td/zones";

/** 全局战斗调参 */
export const BATTLE_TUNING = {
  autoSkipBelowRounds: 8,
  targetFightRounds: 10,
  maxAutoSkipScenes: 50,
  maxEnemyCount: 10,
  autoSkipExpRatio: 1,
};

/** 主角等级 → 可上场宠物数量（不含主角） */
export const PARTY_ALLY_SLOTS: { minLevel: number; allies: number }[] = [
  { minLevel: 1, allies: 0 },
  { minLevel: 5, allies: 1 },
  { minLevel: 12, allies: 2 },
  { minLevel: 25, allies: 3 },
  { minLevel: 45, allies: 4 },
];

/** 宠物登场等级（来自召唤表） */
export function allyDeployLevel(kind: CompanionKind): number {
  return getPetDef(kind)?.summonLevel ?? 99;
}

export const ALLY_DEPLOY_LEVEL: Record<CompanionKind, number> = Object.fromEntries(
  PET_SUMMON_ORDER.map((id) => [id, allyDeployLevel(id)]),
) as Record<CompanionKind, number>;

export function allyName(kind: CompanionKind, locale: string): string {
  const def = getPetDef(kind);
  if (def) return catalogPetName(def, locale);
  return kind;
}

/** 地图进度 → 普通关 / BOSS 关怪物数量 */
export const ENEMY_COUNT_TIERS: {
  minMap: number;
  normalMobs: number;
  bossMinions: number;
  priorBossMini: number;
}[] = [
  { minMap: 1, normalMobs: 2, bossMinions: 1, priorBossMini: 0 },
  { minMap: 6, normalMobs: 3, bossMinions: 2, priorBossMini: 0 },
  { minMap: 8, normalMobs: 4, bossMinions: 3, priorBossMini: 1 },
  { minMap: 12, normalMobs: 5, bossMinions: 4, priorBossMini: 2 },
  { minMap: 16, normalMobs: 6, bossMinions: 5, priorBossMini: 3 },
  { minMap: 19, normalMobs: 7, bossMinions: 6, priorBossMini: 4 },
];

export function maxAllySlots(heroLevel: number): number {
  let n = 0;
  for (const row of PARTY_ALLY_SLOTS) {
    if (heroLevel >= row.minLevel) n = row.allies;
  }
  return n;
}

export function enemyCountTier(mapId: number) {
  let tier = ENEMY_COUNT_TIERS[0]!;
  for (const row of ENEMY_COUNT_TIERS) {
    if (mapId >= row.minMap) tier = row;
  }
  return tier;
}

export function nextWorldScene(
  mapId: number,
  scene: number,
): { mapId: number; scene: number } {
  if (scene >= SCENES_PER_MAP) {
    if (mapId >= RUN_MAX_ZONE) {
      return { mapId: RUN_MAX_ZONE, scene: SCENES_PER_MAP };
    }
    return { mapId: mapId + 1, scene: 1 };
  }
  return { mapId, scene: scene + 1 };
}

/**
 * 战斗编队 & 怪物数量 · 可调参数
 * 修改本文件即可调整「带多少助手 / 多少怪物 / 自动推进」规则
 */

import type { CompanionKind } from "@/config/td/rpg";
import { RUN_MAX_ZONE, SCENES_PER_MAP } from "@/config/td/zones";

/** 全局战斗调参 */
export const BATTLE_TUNING = {
  /** 估计回合数低于此值 → 自动碾压跳过 */
  autoSkipBelowRounds: 8,
  /** 理想战斗长度（找不到时选最接近且 ≥ autoSkipBelowRounds 的关） */
  targetFightRounds: 10,
  /** 单次最多自动跳过多少场（防跳太远） */
  maxAutoSkipScenes: 50,
  /** 敌方单位上限（含 BOSS / 小 BOSS） */
  maxEnemyCount: 10,
  /** 碾压跳关仍获得经验比例 */
  autoSkipExpRatio: 1,
};

/** 主角等级 → 可上场助手数量（不含主角） */
export const PARTY_ALLY_SLOTS: { minLevel: number; allies: number }[] = [
  { minLevel: 1, allies: 0 },
  { minLevel: 5, allies: 1 },
  { minLevel: 12, allies: 2 },
  { minLevel: 25, allies: 3 },
  { minLevel: 45, allies: 4 },
];

/** 助手登场等级（未达等级不算战力、不上场） */
export const ALLY_DEPLOY_LEVEL: Record<CompanionKind, number> = {
  群: 5,
  粉: 12,
  编: 25,
  导: 40,
};

/** 助手显示名 */
export const ALLY_NAMES_ZH: Record<CompanionKind, string> = {
  群: "群攻助手",
  粉: "粉阵助手",
  编: "编策助手",
  导: "导演助手",
};

export const ALLY_NAMES_EN: Record<CompanionKind, string> = {
  群: "Swarm ally",
  粉: "Fan ally",
  编: "Script ally",
  导: "Director ally",
};

/** 地图进度 → 普通关 / BOSS 关怪物数量（不含小 BOSS 追加） */
export const ENEMY_COUNT_TIERS: {
  minMap: number;
  normalMobs: number;
  bossMinions: number;
  /** BOSS 关额外带入前几图 BOSS 当小 BOSS 的数量 */
  priorBossMini: number;
}[] = [
  { minMap: 1, normalMobs: 2, bossMinions: 2, priorBossMini: 0 },
  { minMap: 4, normalMobs: 3, bossMinions: 2, priorBossMini: 0 },
  { minMap: 8, normalMobs: 4, bossMinions: 3, priorBossMini: 1 },
  { minMap: 12, normalMobs: 5, bossMinions: 4, priorBossMini: 2 },
  { minMap: 16, normalMobs: 6, bossMinions: 5, priorBossMini: 3 },
  { minMap: 19, normalMobs: 7, bossMinions: 6, priorBossMini: 4 },
];

export function allyName(kind: CompanionKind, locale: string): string {
  return locale === "zh" ? ALLY_NAMES_ZH[kind] : ALLY_NAMES_EN[kind];
}

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

/** 下一场景坐标（用于自动推进） */
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

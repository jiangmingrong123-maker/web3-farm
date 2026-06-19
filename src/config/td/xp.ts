import type { EnemyKind } from "@/config/td/units";

/** 击杀经验 — 五杰升级用 */
export const ENEMY_XP: Record<EnemyKind, number> = {
  黑: 1,
  水: 2,
  混: 3,
  Boss: 12,
};

/** 小人物合成最高等级 */
export const CREW_MAX_LEVEL = 5;
export const STAR_MAX_LEVEL = 5;

/** 五杰累计经验 → 等级阈值 */
export const STAR_XP_THRESHOLDS = [0, 3, 8, 15, 25, 40] as const;

export function starLevelFromKills(kills: number): number {
  let lv = 1;
  for (let i = 2; i <= STAR_MAX_LEVEL; i++) {
    if (kills >= STAR_XP_THRESHOLDS[i]!) lv = i;
  }
  return lv;
}

export function starKillsToNextLevel(kills: number, level: number): number | null {
  if (level >= STAR_MAX_LEVEL) return null;
  return Math.max(0, STAR_XP_THRESHOLDS[level + 1]! - kills);
}

export function starXpProgress(
  kills: number,
  level: number,
): { pct: number; need: number | null; nextAt: number | null } {
  if (level >= STAR_MAX_LEVEL) {
    return { pct: 100, need: null, nextAt: null };
  }
  const floor = STAR_XP_THRESHOLDS[level]!;
  const ceiling = STAR_XP_THRESHOLDS[level + 1]!;
  const span = ceiling - floor;
  const into = Math.max(0, kills - floor);
  return {
    pct: Math.min(100, (into / span) * 100),
    need: ceiling - kills,
    nextAt: ceiling,
  };
}

/** 小人物每级相对提升（合成升级） */
export const CREW_LEVEL_DAMAGE_BONUS = 0.2;
export const CREW_LEVEL_RANGE_BONUS = 0.15;
export const CREW_LEVEL_SPEED_MUL = 0.92;

/** 五杰每级相对提升（打怪升级） */
export const STAR_LEVEL_DAMAGE_BONUS = 0.18;
export const STAR_LEVEL_RANGE_BONUS = 0.12;
export const STAR_LEVEL_SPEED_MUL = 0.92;

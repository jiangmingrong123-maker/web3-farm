/** 主角 1–100 级 · 总经验阈值：floor(EXP_LEVEL_MULT * (lv-1)^EXP_LEVEL_POW)
 *  100 体力快速过图≈22–26 级；1000 积分全换体力（≈700）+ 扫图 ≈ 100 级上限 */
export const MAX_HERO_LEVEL_BATCH1 = 100;

/** 达到 Lv.n 所需的累计总经验（非每级增量） */
export const EXP_LEVEL_MULT = 68;
export const EXP_LEVEL_POW = 1.62;

const EXP_TABLE: number[] = [0, 0];
for (let lv = 2; lv <= MAX_HERO_LEVEL_BATCH1; lv++) {
  EXP_TABLE.push(Math.floor(EXP_LEVEL_MULT * (lv - 1) ** EXP_LEVEL_POW));
}

export function expForLevel(level: number): number {
  const lv = Math.max(1, Math.min(level, MAX_HERO_LEVEL_BATCH1));
  return EXP_TABLE[lv] ?? EXP_TABLE[MAX_HERO_LEVEL_BATCH1] ?? 0;
}

export function levelFromExp(exp: number): number {
  let lv = 1;
  for (let i = 2; i <= MAX_HERO_LEVEL_BATCH1; i++) {
    if (exp >= (EXP_TABLE[i] ?? Infinity)) lv = i;
    else break;
  }
  return lv;
}

export function expToNextLevel(level: number, exp: number): number {
  if (level >= MAX_HERO_LEVEL_BATCH1) return 0;
  return Math.max(0, expForLevel(level + 1) - exp);
}

export function expLevelProgress(
  level: number,
  exp: number,
): { into: number; span: number; pct: number; isMax: boolean } {
  if (level >= MAX_HERO_LEVEL_BATCH1) {
    return { into: 0, span: 1, pct: 100, isMax: true };
  }
  const floor = expForLevel(level);
  const ceiling = expForLevel(level + 1);
  const span = Math.max(1, ceiling - floor);
  const into = Math.max(0, exp - floor);
  return {
    into,
    span,
    pct: Math.min(100, Math.round((into / span) * 100)),
    isMax: false,
  };
}

export function maxEquipLevelForHero(heroLevel: number): number {
  return Math.min(100, Math.max(1, heroLevel));
}

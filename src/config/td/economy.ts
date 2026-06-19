/** Stage clear gold — no points from TD */
export function stageClearGold(stage: number): number {
  const raw = 30 + (stage - 1) * 15;
  return Math.min(raw, 120);
}

export const FAIL_CONSOLATION_GOLD = 3;
export const STAMINA_MAX = 30;
export const STAMINA_PER_RUN = 5;
export const REFILL_BASE_POINTS = 10;

export function refillPointsCost(refillIndexToday: number): number {
  return REFILL_BASE_POINTS * 2 ** refillIndexToday;
}

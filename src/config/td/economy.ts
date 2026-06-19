/** Stage clear gold — no points from TD */
export function stageClearGold(stage: number): number {
  const raw = 30 + (stage - 1) * 15;
  return Math.min(raw, 120);
}

export const FAIL_CONSOLATION_GOLD = 3;
/** 开局默认体力；每次积分补充也加这么多 */
export const STAMINA_MAX = 30;
export const STAMINA_REFILL_AMOUNT = 30;
export const STAMINA_PER_RUN = 5;
export const REFILL_BASE_POINTS = 10;

/** 积分换金币：首次 100 分 → 100 金，之后成本翻倍 */
export const GOLD_EXCHANGE_BASE_POINTS = 100;
export const GOLD_EXCHANGE_REWARD = 100;

/** 进行中局超过此时长未结算，自动视为放弃（无金币） */
export const RUN_STALE_MS = 2 * 60 * 60 * 1000;

export function refillPointsCost(refillIndexToday: number): number {
  return REFILL_BASE_POINTS * 2 ** refillIndexToday;
}

export function goldExchangeCost(exchangeIndexToday: number): number {
  return GOLD_EXCHANGE_BASE_POINTS * 2 ** exchangeIndexToday;
}

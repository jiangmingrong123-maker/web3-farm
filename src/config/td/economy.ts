import type { EquipRarity } from "@/config/td/equipment-catalog";

/** Stage clear gold — no points from TD */
export function stageClearGold(stage: number): number {
  const raw = 30 + (stage - 1) * 15;
  return Math.min(raw, 120);
}

export const FAIL_CONSOLATION_GOLD = 3;

/** 体力自然回复上限（每日）；积分购买可超出 */
export const STAMINA_MAX = 100;
/** 积分购买：每次 +100 体力（可超过 STAMINA_MAX） */
export const STAMINA_REFILL_AMOUNT = 100;
/** 每场战斗 / 扫图 1 遍消耗 */
export const STAMINA_PER_RUN = 1;

/** 扫图功能首次解锁消耗积分 */
export const MAP_SWEEP_UNLOCK_POINTS = 100;
/** 扫图「十连」次数 */
export const MAP_SWEEP_RUNS_BATCH = 10;
/** 扫图每遍消耗体力（1 遍 = 1 体力） */
export const STAMINA_PER_SWEEP_RUN = STAMINA_PER_RUN;
/** 扫图 · 仅 BOSS 关经验比例 */
export const MAP_SWEEP_BOSS_EXP_RATIO = 0.38;
/** 扫图 · 全图 5 场合计经验比例 */
export const MAP_SWEEP_FULL_EXP_RATIO = 0.24;

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

/** 普通（白板）装备扫图自动回收金币 */
export function commonEquipRecycleGold(level: number): number {
  return Math.max(3, Math.floor(level * 2.5));
}

const RARITY_RECYCLE_MULT: Record<EquipRarity, number> = {
  普通: 1,
  高级: 1.6,
  稀有: 3.2,
  传说: 6.5,
  特制: 12,
};

/** 按品级折算的装备回收金币（扫图/挂机自动卖） */
export function equipRecycleGold(level: number, rarity: EquipRarity): number {
  return Math.max(5, Math.floor(commonEquipRecycleGold(level) * RARITY_RECYCLE_MULT[rarity]));
}

/** 每日 0 点：不足 100 补到 100；已超过 100 的不动 */
export function applyDailyStaminaReset(current: number): number {
  return current >= STAMINA_MAX ? current : STAMINA_MAX;
}

/** 积分购买：+100，可超出自然回复上限 */
export function applyStaminaRefill(current: number): number {
  return current + STAMINA_REFILL_AMOUNT;
}

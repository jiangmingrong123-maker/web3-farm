/** Exhibition hall display slots (Season 0). */
export const HALL_SLOT_COUNT = 12;

/** Slots 1–2 are free; slot 3+ costs double each step (100, 200, 400…). */
export const INITIAL_UNLOCKED_SLOTS = 2;

export const SLOT_UNLOCK_COSTS: Record<number, number> = {
  1: 0,
  2: 0,
  3: 100,
  4: 200,
  5: 400,
  6: 800,
  7: 1600,
  8: 3200,
  9: 6400,
  10: 12800,
  11: 25600,
  12: 51200,
};

/** Max points earned per calendar day (accrual rate cap). */
export const DAILY_POINTS_CAP = 1000;

/** Base daily rate with wallet only (no NFT bound). */
export const SEASON0_DAILY_BASE = 10;

/** Points per bound NFT per day (before daily cap). */
export const POINTS_PER_BOUND_NFT = 100;

/** Stop accruing unclaimed points after this many hours without a claim. */
export const MAX_ACCRUAL_HOURS = 72;

/** Minimum hours between claims. */
export const CLAIM_COOLDOWN_HOURS = 24;

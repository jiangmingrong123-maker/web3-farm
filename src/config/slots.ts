/** Exhibition hall display slots (Season 0). */
export const HALL_SLOT_COUNT = 12;

/** Points required to unlock each slot (slot 1 is free). */
export const SLOT_UNLOCK_COSTS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 300,
  4: 600,
  5: 1000,
  6: 1500,
  7: 2200,
  8: 3000,
  9: 4000,
  10: 5500,
  11: 7500,
  12: 10000,
};

/** Season 0 trial: flat daily claim before NFT binding. */
export const SEASON0_DAILY_BASE = 10;

/** Claim cooldown in hours. */
export const CLAIM_COOLDOWN_HOURS = 24;

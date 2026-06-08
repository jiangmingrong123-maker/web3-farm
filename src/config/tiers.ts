/** Platform tier codes — order matters for display (high → low). */
export const TIER_ORDER = [
  "SPECIAL",
  "TOP",
  "FULL",
  "RICH",
  "BASIC",
  "MINIMUM",
] as const;

export type TierCode = (typeof TIER_ORDER)[number];

/**
 * Tier multipliers — ratio 50 : 20 : 10 : 2 : 1.5 : 1
 * Daily points = basePointsPerDay × multiplier (base TBD in production).
 */
export const TIER_MULTIPLIERS: Record<TierCode, number> = {
  SPECIAL: 50,
  TOP: 20,
  FULL: 10,
  RICH: 2,
  BASIC: 1.5,
  MINIMUM: 1,
};

/** Default daily base points for dev preview only — set null in prod until finalized. */
export const DEFAULT_BASE_POINTS_PER_DAY: number | null = 10;

/** TOP tier: average trait rarity must be at or below this percent. */
export const TOP_TIER_MAX_AVG_PERCENT = 5;

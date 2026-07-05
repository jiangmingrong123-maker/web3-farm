/** Keep in sync with functions/lib/quant/billing.ts */
export const QUANT_SIM_UNLOCK_POINTS = 100;

export const QUANT_LIVE_UNLOCK_POINTS = 10_000;
export const QUANT_LIVE_HOURLY_POINTS = 20;
export const QUANT_LIVE_DAILY_POINTS = 480;
export const QUANT_LIVE_ENABLED = false;

export type QuantBillingInfo = {
  simUnlocked: boolean;
  simUnlockedAt: number | null;
  liveUnlocked: boolean;
};

export type QuantPricing = {
  simUnlock: number;
  liveUnlock: number;
  liveHourly: number;
  liveDaily: number;
  liveEnabled: boolean;
};

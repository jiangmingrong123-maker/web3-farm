import { deductFarmPoints, loadFarmPoints, type FarmKv } from "../farm-points";

/** 本机/云端模拟开通费（一次性，共用） */
export const QUANT_SIM_UNLOCK_POINTS = 100;
/** 云端运行：每满 1 小时扣 2 分（约 48 分/天） */
export const QUANT_CLOUD_HOURLY_POINTS = 2;
export const QUANT_CLOUD_DAILY_POINTS = 48;

/** 实盘方案（暂未开放） */
export const QUANT_LIVE_UNLOCK_POINTS = 10_000;
export const QUANT_LIVE_HOURLY_POINTS = 20;
export const QUANT_LIVE_DAILY_POINTS = 480;

export const HOUR_MS = 60 * 60 * 1000;

export type QuantBillingState = {
  simUnlocked: boolean;
  simUnlockedAt: number | null;
  lastCloudHourlyAt: number | null;
  liveUnlocked: boolean;
  liveUnlockedAt: number | null;
  lastLiveHourlyAt: number | null;
};

export function defaultQuantBilling(): QuantBillingState {
  return {
    simUnlocked: false,
    simUnlockedAt: null,
    lastCloudHourlyAt: null,
    liveUnlocked: false,
    liveUnlockedAt: null,
    lastLiveHourlyAt: null,
  };
}

function billingKey(wallet: string) {
  return `quant:billing:${wallet.toLowerCase()}`;
}

const memoryBilling = new Map<string, QuantBillingState>();

export async function loadQuantBilling(
  kv: FarmKv | undefined,
  wallet: string,
): Promise<QuantBillingState> {
  if (kv) {
    const raw = await kv.get(billingKey(wallet));
    if (!raw) return defaultQuantBilling();
    try {
      return { ...defaultQuantBilling(), ...(JSON.parse(raw) as Partial<QuantBillingState>) };
    } catch {
      return defaultQuantBilling();
    }
  }
  return memoryBilling.get(wallet.toLowerCase()) ?? defaultQuantBilling();
}

export async function saveQuantBilling(
  kv: FarmKv | undefined,
  wallet: string,
  state: QuantBillingState,
): Promise<void> {
  if (kv) {
    await kv.put(billingKey(wallet), JSON.stringify(state));
    return;
  }
  memoryBilling.set(wallet.toLowerCase(), state);
}

export function quantPricingPublic() {
  return {
    simUnlock: QUANT_SIM_UNLOCK_POINTS,
    cloudHourly: QUANT_CLOUD_HOURLY_POINTS,
    cloudDaily: QUANT_CLOUD_DAILY_POINTS,
    liveUnlock: QUANT_LIVE_UNLOCK_POINTS,
    liveHourly: QUANT_LIVE_HOURLY_POINTS,
    liveDaily: QUANT_LIVE_DAILY_POINTS,
    liveEnabled: false,
  };
}

/** 开通模拟：100 积分仅扣一次；已开通则 pointsSpent=0 */
export async function ensureSimUnlocked(
  kv: FarmKv | undefined,
  wallet: string,
): Promise<
  | { ok: true; billing: QuantBillingState; farmPoints: number; pointsSpent: number }
  | { ok: false; error: "INSUFFICIENT_POINTS"; need: number; have: number }
> {
  const billing = await loadQuantBilling(kv, wallet);
  if (billing.simUnlocked) {
    const farmPoints = await loadFarmPoints(kv, wallet);
    return { ok: true, billing, farmPoints, pointsSpent: 0 };
  }

  const deducted = await deductFarmPoints(kv, wallet, QUANT_SIM_UNLOCK_POINTS);
  if (!deducted.ok) {
    return {
      ok: false,
      error: "INSUFFICIENT_POINTS",
      need: deducted.need,
      have: deducted.have,
    };
  }

  const next: QuantBillingState = {
    ...billing,
    simUnlocked: true,
    simUnlockedAt: Date.now(),
  };
  await saveQuantBilling(kv, wallet, next);
  return {
    ok: true,
    billing: next,
    farmPoints: deducted.remaining,
    pointsSpent: QUANT_SIM_UNLOCK_POINTS,
  };
}

export type HourlyBillingResult =
  | { ok: true; billing: QuantBillingState; farmPoints: number; pointsSpent: number; hoursCharged: number }
  | { ok: false; error: "INSUFFICIENT_POINTS"; billing: QuantBillingState; farmPoints: number; hoursOwed: number };

/** 云端运行中：每满 1 小时扣 2 积分（与开通费无关） */
export async function processCloudHourlyBilling(
  kv: FarmKv | undefined,
  wallet: string,
  cloudRunning: boolean,
  cloudStartedAt: number | null,
  now = Date.now(),
): Promise<HourlyBillingResult & { shouldStop: boolean }> {
  let billing = await loadQuantBilling(kv, wallet);
  let farmPoints = await loadFarmPoints(kv, wallet);

  if (!cloudRunning || !billing.simUnlocked) {
    return { ok: true, billing, farmPoints, pointsSpent: 0, hoursCharged: 0, shouldStop: false };
  }

  const anchor = billing.lastCloudHourlyAt ?? cloudStartedAt ?? now;
  const elapsed = now - anchor;
  if (elapsed < HOUR_MS) {
    return { ok: true, billing, farmPoints, pointsSpent: 0, hoursCharged: 0, shouldStop: false };
  }

  const hours = Math.floor(elapsed / HOUR_MS);
  const cost = hours * QUANT_CLOUD_HOURLY_POINTS;

  if (farmPoints < cost) {
    return {
      ok: false,
      error: "INSUFFICIENT_POINTS",
      billing,
      farmPoints,
      hoursOwed: hours,
      shouldStop: true,
    };
  }

  const deducted = await deductFarmPoints(kv, wallet, cost);
  if (!deducted.ok) {
    return {
      ok: false,
      error: "INSUFFICIENT_POINTS",
      billing,
      farmPoints,
      hoursOwed: hours,
      shouldStop: true,
    };
  }

  billing = {
    ...billing,
    lastCloudHourlyAt: anchor + hours * HOUR_MS,
  };
  await saveQuantBilling(kv, wallet, billing);

  return {
    ok: true,
    billing,
    farmPoints: deducted.remaining,
    pointsSpent: cost,
    hoursCharged: hours,
    shouldStop: false,
  };
}

export function beginCloudHourlyAnchor(billing: QuantBillingState, now = Date.now()): QuantBillingState {
  if (billing.lastCloudHourlyAt != null) return billing;
  return { ...billing, lastCloudHourlyAt: now };
}

import { deductFarmPoints, loadFarmPoints, type FarmKv } from "../farm-points";

/** 本机/云端模拟：一次性开通，开通后不再扣费 */
export const QUANT_SIM_UNLOCK_POINTS = 100;

/** 实盘方案（暂未开放） */
export const QUANT_LIVE_UNLOCK_POINTS = 10_000;
export const QUANT_LIVE_HOURLY_POINTS = 20;
export const QUANT_LIVE_DAILY_POINTS = 480;

export type QuantBillingState = {
  simUnlocked: boolean;
  simUnlockedAt: number | null;
  liveUnlocked: boolean;
  liveUnlockedAt: number | null;
};

export function defaultQuantBilling(): QuantBillingState {
  return {
    simUnlocked: false,
    simUnlockedAt: null,
    liveUnlocked: false,
    liveUnlockedAt: null,
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
      const parsed = JSON.parse(raw) as Partial<QuantBillingState> & {
        lastCloudHourlyAt?: number | null;
      };
      return {
        simUnlocked: !!parsed.simUnlocked,
        simUnlockedAt: parsed.simUnlockedAt ?? null,
        liveUnlocked: !!parsed.liveUnlocked,
        liveUnlockedAt: parsed.liveUnlockedAt ?? null,
      };
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
    liveUnlock: QUANT_LIVE_UNLOCK_POINTS,
    liveHourly: QUANT_LIVE_HOURLY_POINTS,
    liveDaily: QUANT_LIVE_DAILY_POINTS,
    liveEnabled: false,
  };
}

/** 开通模拟（一次性 100 积分，本机/云端共用；已开通不再扣费） */
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

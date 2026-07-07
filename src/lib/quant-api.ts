import { buildFarmSignMessage } from "./farm-sign";
import { apiRoot } from "./api-origin";
import type { QuantBillingInfo, QuantPricing } from "@/config/quant/billing";

const API = `${apiRoot()}/quant`;

export type CloudPaperState = {
  cash: number;
  positions: { marketId: string; qty: number; avgPrice: number }[];
  logs: { time: number; text: string }[];
  strategyId: "ma_cross" | "rsi_revert" | "grid";
  marketId: string;
  params: Record<string, number>;
  running: boolean;
  cloud: true;
  lastTickAt: number | null;
  lastSignal: "buy" | "sell" | "hold";
  lastPrice: number | null;
  lastError: string | null;
  startedAt: number | null;
  tickCount: number;
};

export type QuantSignFn = (message: string) => Promise<`0x${string}`>;

export type QuantApiError = {
  ok: false;
  error: string;
  need?: number;
  have?: number;
  reason?: string;
};

function isSignRejected(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message
    : typeof err === "object" && err && "shortMessage" in err
      ? String((err as { shortMessage?: string }).shortMessage)
      : String(err);
  return /reject|denied|cancel|declined|user refused|用户拒绝|取消|拒签|拒绝/i.test(msg);
}

function mapSignError(err: unknown): QuantApiError {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === "NOT_CONNECTED") return { ok: false, error: "NOT_CONNECTED" };
  if (msg === "WRONG_NETWORK") return { ok: false, error: "WRONG_NETWORK" };
  if (msg === "NO_SIGNER") return { ok: false, error: "NO_SIGNER" };
  if (isSignRejected(err)) return { ok: false, error: "SIGN_REJECTED" };
  return { ok: false, error: "NETWORK" };
}

async function signedPost<T>(
  wallet: string,
  subpath: string,
  action: string,
  body: Record<string, unknown>,
  sign: QuantSignFn,
  data?: string,
): Promise<T | QuantApiError> {
  try {
    const timestamp = Date.now();
    const message = buildFarmSignMessage(action, wallet, timestamp, data);
    const signature = await sign(message);
    const res = await fetch(`${API}/${wallet.toLowerCase()}/${subpath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, timestamp, signature }),
    });
    const json = (await res.json()) as T & QuantApiError;
    if (!res.ok) return json;
    return json;
  } catch (e) {
    return mapSignError(e);
  }
}

export async function fetchCloudPaperApi(wallet: string): Promise<{
  state: CloudPaperState | null;
  equity: number | null;
  kv: boolean;
  billing: QuantBillingInfo | null;
  farmPoints: number;
  pricing: QuantPricing | null;
} | null> {
  try {
    const res = await fetch(`${API}/${wallet.toLowerCase()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      state?: CloudPaperState | null;
      equity?: number | null;
      kv?: boolean;
      billing?: QuantBillingInfo;
      farmPoints?: number;
      pricing?: QuantPricing;
    };
    if (!data.ok) return null;
    return {
      state: data.state ?? null,
      equity: data.equity ?? null,
      kv: !!data.kv,
      billing: data.billing ?? null,
      farmPoints: data.farmPoints ?? 0,
      pricing: data.pricing ?? null,
    };
  } catch {
    return null;
  }
}

export async function unlockSimQuantApi(
  wallet: string,
  sign: QuantSignFn,
): Promise<
  | { ok: true; billing: QuantBillingInfo; farmPoints: number; pointsSpent: number }
  | QuantApiError
> {
  const res = await signedPost<{
    ok?: boolean;
    billing?: QuantBillingInfo;
    farmPoints?: number;
    pointsSpent?: number;
    error?: string;
    need?: number;
    have?: number;
  }>(wallet, "unlock-sim", "quant_unlock_sim", {}, sign);
  if (!res.ok || !res.billing) {
    return {
      ok: false,
      error: res.error ?? "FAILED",
      need: res.need,
      have: res.have,
    };
  }
  return {
    ok: true,
    billing: res.billing,
    farmPoints: res.farmPoints ?? 0,
    pointsSpent: res.pointsSpent ?? 0,
  };
}

export async function startCloudPaperApi(
  wallet: string,
  config: {
    marketId: string;
    strategyId: CloudPaperState["strategyId"];
    params: Record<string, number>;
  },
  sign: QuantSignFn,
): Promise<
  | { ok: true; state: CloudPaperState; farmPoints: number; pointsSpent: number; billing: QuantBillingInfo }
  | QuantApiError
> {
  const dataStr = JSON.stringify(config);
  const res = await signedPost<{
    ok?: boolean;
    state?: CloudPaperState;
    farmPoints?: number;
    pointsSpent?: number;
    billing?: QuantBillingInfo;
    error?: string;
    need?: number;
    have?: number;
    reason?: string;
  }>(wallet, "start", "quant_start", config, sign, dataStr);
  if (!res.ok || !res.state || !res.billing) {
    return {
      ok: false,
      error: res.error ?? "FAILED",
      need: res.need,
      have: res.have,
      reason: res.reason,
    };
  }
  return {
    ok: true,
    state: res.state,
    farmPoints: res.farmPoints ?? 0,
    pointsSpent: res.pointsSpent ?? 0,
    billing: res.billing,
  };
}

export async function stopCloudPaperApi(
  wallet: string,
  sign: QuantSignFn,
): Promise<CloudPaperState | null> {
  const res = await signedPost<{ ok?: boolean; state?: CloudPaperState }>(
    wallet,
    "stop",
    "quant_stop",
    {},
    sign,
  );
  if ("error" in res || !res.ok || !res.state) return null;
  return res.state;
}

export async function resetCloudPaperApi(
  wallet: string,
  sign: QuantSignFn,
): Promise<CloudPaperState | null> {
  const res = await signedPost<{ ok?: boolean; state?: CloudPaperState }>(
    wallet,
    "reset",
    "quant_reset",
    {},
    sign,
  );
  if ("error" in res || !res.ok || !res.state) return null;
  return res.state;
}

export async function liquidateCloudPaperApi(
  wallet: string,
  sign: QuantSignFn,
): Promise<CloudPaperState | null> {
  const res = await signedPost<{ ok?: boolean; state?: CloudPaperState }>(
    wallet,
    "liquidate",
    "quant_liquidate",
    {},
    sign,
  );
  if ("error" in res || !res.ok || !res.state) return null;
  return res.state;
}

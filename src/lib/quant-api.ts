import { buildFarmSignMessage } from "./farm-sign";
import { apiRoot } from "./api-origin";

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

async function signedPost<T>(
  wallet: string,
  subpath: string,
  action: string,
  body: Record<string, unknown>,
  sign: QuantSignFn,
  data?: string,
): Promise<T | null> {
  try {
    const timestamp = Date.now();
    const message = buildFarmSignMessage(action, wallet, timestamp, data);
    const signature = await sign(message);
    const res = await fetch(`${API}/${wallet.toLowerCase()}/${subpath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, timestamp, signature }),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchCloudPaperApi(wallet: string): Promise<{
  state: CloudPaperState | null;
  equity: number | null;
  kv: boolean;
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
    };
    if (!data.ok) return null;
    return {
      state: data.state ?? null,
      equity: data.equity ?? null,
      kv: !!data.kv,
    };
  } catch {
    return null;
  }
}

export async function startCloudPaperApi(
  wallet: string,
  config: {
    marketId: string;
    strategyId: CloudPaperState["strategyId"];
    params: Record<string, number>;
  },
  sign: QuantSignFn,
): Promise<{ state: CloudPaperState; equity: number } | null> {
  const data = JSON.stringify(config);
  const res = await signedPost<{
    ok?: boolean;
    state?: CloudPaperState;
    equity?: number;
  }>(wallet, "start", "quant_start", config, sign, data);
  if (!res?.ok || !res.state) return null;
  return { state: res.state, equity: res.equity ?? 0 };
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
  return res?.ok && res.state ? res.state : null;
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
  return res?.ok && res.state ? res.state : null;
}

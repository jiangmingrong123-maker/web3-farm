import { getPool } from "./markets";
import { fetchPoolKlinesCached, fetchPoolPrice } from "./klines";
import { latestSignal } from "./signal";
import {
  processCloudHourlyBilling,
  QUANT_CLOUD_HOURLY_POINTS,
} from "./billing";
import {
  type CloudPaperState,
  paperBuy,
  paperEquity,
  paperSell,
} from "./paper";

export type QuantKv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete?(key: string): Promise<void>;
  list?(opts: {
    prefix: string;
    cursor?: string;
  }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
};

/** 旧版：全体活跃钱包挤在一个 key（并发 start 会互相覆盖） */
const ACTIVE_KEY_LEGACY = "quant:active_wallets";
/** 新版：每人一个 key，避免多人同时开跑丢名单 */
const ACTIVE_PREFIX = "quant:active:";
const stateKey = (wallet: string) => `quant:paper:${wallet}`;
const activeKey = (wallet: string) => `${ACTIVE_PREFIX}${wallet.toLowerCase()}`;

const memoryStates = new Map<string, CloudPaperState>();
const memoryActive = new Set<string>();

export async function loadPaper(kv: QuantKv | undefined, wallet: string): Promise<CloudPaperState | null> {
  if (kv) {
    const raw = await kv.get(stateKey(wallet));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CloudPaperState;
    } catch {
      return null;
    }
  }
  return memoryStates.get(wallet) ?? null;
}

export async function savePaper(kv: QuantKv | undefined, wallet: string, state: CloudPaperState): Promise<void> {
  if (kv) {
    await kv.put(stateKey(wallet), JSON.stringify(state));
    return;
  }
  memoryStates.set(wallet, state);
}

async function loadActiveFromPrefix(kv: QuantKv): Promise<string[]> {
  if (!kv.list) return [];
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix: ACTIVE_PREFIX, cursor });
    for (const k of page.keys) {
      const w = k.name.slice(ACTIVE_PREFIX.length).toLowerCase();
      if (!/^0x[a-f0-9]{40}$/.test(w)) continue;
      const flag = await kv.get(k.name);
      if (flag === "1") out.push(w);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

async function loadActiveLegacy(kv: QuantKv): Promise<string[]> {
  const raw = await kv.get(ACTIVE_KEY_LEGACY);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as string[]).map((w) => w.toLowerCase());
  } catch {
    return [];
  }
}

async function loadActive(kv: QuantKv | undefined): Promise<string[]> {
  if (!kv) return [...memoryActive];
  const fromPrefix = await loadActiveFromPrefix(kv);
  const fromLegacy = await loadActiveLegacy(kv);
  return [...new Set([...fromPrefix, ...fromLegacy])];
}

export async function addActiveWallet(kv: QuantKv | undefined, wallet: string): Promise<void> {
  const w = wallet.toLowerCase();
  if (kv) {
    await kv.put(activeKey(w), "1");
    return;
  }
  memoryActive.add(w);
}

export async function removeActiveWallet(kv: QuantKv | undefined, wallet: string): Promise<void> {
  const w = wallet.toLowerCase();
  if (kv) {
    if (kv.delete) await kv.delete(activeKey(w));
    else await kv.put(activeKey(w), "");
    // 顺带从旧名单里摘掉，避免 cron 重复处理已停止的钱包
    const legacy = await loadActiveLegacy(kv);
    if (legacy.includes(w)) {
      const next = legacy.filter((x) => x !== w);
      await kv.put(ACTIVE_KEY_LEGACY, JSON.stringify(next));
    }
    return;
  }
  memoryActive.delete(w);
}

export async function tickPaperState(
  state: CloudPaperState,
  kv?: QuantKv,
): Promise<CloudPaperState> {
  const pool = getPool(state.marketId);
  const klines = await fetchPoolKlinesCached(kv, pool, 80);
  const price = await fetchPoolPrice(pool);
  const signal = latestSignal(state.strategyId, klines, state.params);

  let next: CloudPaperState = {
    ...state,
    lastTickAt: Date.now(),
    lastSignal: signal,
    lastPrice: price,
    lastError: null,
    tickCount: state.tickCount + 1,
  };

  if (state.running) {
    if (signal === "buy") next = paperBuy(next, price);
    else if (signal === "sell") next = paperSell(next, price);
  }

  return next;
}

export async function tickWallet(kv: QuantKv | undefined, wallet: string): Promise<CloudPaperState | null> {
  const state = await loadPaper(kv, wallet);
  if (!state?.running) return state;

  const hourly = await processCloudHourlyBilling(kv, wallet, true, state.startedAt);
  if (hourly.shouldStop) {
    const stopped: CloudPaperState = {
      ...state,
      running: false,
      lastError: hourly.ok
        ? null
        : `积分不足，云端已停止（需 ${hourly.hoursOwed * QUANT_CLOUD_HOURLY_POINTS} 积分）`,
      logs: [
        {
          time: Date.now(),
          text: hourly.ok ? "Cloud stopped" : "Cloud stopped · insufficient hall points",
        },
        ...state.logs.slice(0, 49),
      ],
    };
    await savePaper(kv, wallet, stopped);
    await removeActiveWallet(kv, wallet);
    return stopped;
  }

  try {
    const next = await tickPaperState(state, kv);
    await savePaper(kv, wallet, next);
    return next;
  } catch (e) {
    const err = e instanceof Error ? e.message : "tick failed";
    const failed: CloudPaperState = {
      ...state,
      lastTickAt: Date.now(),
      lastError: err,
      tickCount: state.tickCount + 1,
    };
    await savePaper(kv, wallet, failed);
    return failed;
  }
}

export async function tickAllRunning(kv: QuantKv | undefined): Promise<{ ticked: number; errors: number }> {
  const wallets = await loadActive(kv);
  let ticked = 0;
  let errors = 0;
  for (const wallet of wallets) {
    const before = await loadPaper(kv, wallet);
    if (!before?.running) continue;
    const after = await tickWallet(kv, wallet);
    if (after?.lastError) errors += 1;
    else ticked += 1;
  }
  return { ticked, errors };
}

export function snapshotEquity(state: CloudPaperState): number {
  return paperEquity(state, state.lastPrice ?? 1);
}

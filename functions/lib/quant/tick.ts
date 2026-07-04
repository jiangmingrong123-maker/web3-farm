import { getPool } from "./markets";
import { fetchPoolKlines, fetchPoolPrice } from "./klines";
import { latestSignal } from "./signal";
import {
  type CloudPaperState,
  paperBuy,
  paperEquity,
  paperSell,
} from "./paper";

export type QuantKv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

const ACTIVE_KEY = "quant:active_wallets";
const stateKey = (wallet: string) => `quant:paper:${wallet}`;

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

async function loadActive(kv: QuantKv | undefined): Promise<string[]> {
  if (kv) {
    const raw = await kv.get(ACTIVE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }
  return [...memoryActive];
}

async function saveActive(kv: QuantKv | undefined, wallets: string[]): Promise<void> {
  const unique = [...new Set(wallets.map((w) => w.toLowerCase()))];
  if (kv) {
    await kv.put(ACTIVE_KEY, JSON.stringify(unique));
    return;
  }
  memoryActive.clear();
  unique.forEach((w) => memoryActive.add(w));
}

export async function addActiveWallet(kv: QuantKv | undefined, wallet: string): Promise<void> {
  const list = await loadActive(kv);
  const w = wallet.toLowerCase();
  if (!list.includes(w)) list.push(w);
  await saveActive(kv, list);
}

export async function removeActiveWallet(kv: QuantKv | undefined, wallet: string): Promise<void> {
  const w = wallet.toLowerCase();
  const list = (await loadActive(kv)).filter((x) => x !== w);
  await saveActive(kv, list);
}

export async function tickPaperState(state: CloudPaperState): Promise<CloudPaperState> {
  const pool = getPool(state.marketId);
  const klines = await fetchPoolKlines(pool, 80);
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
  try {
    const next = await tickPaperState(state);
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

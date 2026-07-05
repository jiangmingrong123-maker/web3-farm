import type { DexPool } from "./markets";

export type Kline = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const UA = "web3-farm-quant/1.0";
export const MIN_KLINE_BARS = 14;

const DEXSCREENER_CHAIN: Record<DexPool["chain"], string> = {
  ethereum: "ethereum",
  bsc: "bsc",
};

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/** GeckoTerminal：指定链上 DEX 池 OHLCV（eth / bsc） */
async function fetchGeckoKlines(pool: DexPool, limit: number): Promise<Kline[]> {
  const url = `https://api.geckoterminal.com/api/v2/networks/${pool.geckoNetwork}/pools/${pool.poolAddress}/ohlcv/hour?aggregate=1&limit=${limit}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { attributes?: { ohlcv_list?: [number, number, number, number, number, number][] } };
    };
    const list = json.data?.attributes?.ohlcv_list ?? [];
    return list
      .map((row) => ({
        time: row[0]! * 1000,
        open: row[1]!,
        high: row[2]!,
        low: row[3]!,
        close: row[4]!,
        volume: row[5]!,
      }))
      .sort((a, b) => a.time - b.time);
  }
  return [];
}

async function fetchDexScreenerPrice(pool: DexPool): Promise<number | null> {
  const chain = DEXSCREENER_CHAIN[pool.chain];
  const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pool.poolAddress}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const json = (await res.json()) as { pair?: { priceUsd?: string } };
    const p = parseFloat(json.pair?.priceUsd ?? "0");
    return p > 0 ? p : null;
  } catch {
    return null;
  }
}

export async function fetchPoolKlines(pool: DexPool, limit = 80): Promise<Kline[]> {
  const gecko = await fetchGeckoKlines(pool, limit);
  if (gecko.length >= MIN_KLINE_BARS) return gecko;
  if (gecko.length > 0) return gecko;

  const chainLabel = pool.chain === "bsc" ? "BSC" : "Ethereum";
  throw new Error(`链上K线不可用(${pool.baseSymbol}·${chainLabel})，请稍后重试`);
}

export async function fetchPoolPrice(pool: DexPool): Promise<number> {
  const spot = await fetchDexScreenerPrice(pool);
  if (spot != null) return spot;

  const gecko = await fetchGeckoKlines(pool, 3);
  const last = gecko[gecko.length - 1]?.close;
  if (last && last > 0) return last;

  const chainLabel = pool.chain === "bsc" ? "BSC" : "Ethereum";
  throw new Error(`链上现价不可用(${pool.baseSymbol}·${chainLabel})`);
}

export function klineCacheKey(poolId: string) {
  return `quant:klines:v4:${poolId}`;
}

export const KLINE_CACHE_MS = 4 * 60 * 1000;

export async function fetchPoolKlinesCached(
  kv: { get(k: string): Promise<string | null>; put(k: string, v: string): Promise<void> } | undefined,
  pool: DexPool,
  limit = 80,
): Promise<Kline[]> {
  const key = klineCacheKey(pool.id);
  if (kv) {
    try {
      const raw = await kv.get(key);
      if (raw) {
        const hit = JSON.parse(raw) as { at: number; data: Kline[] };
        if (Date.now() - hit.at < KLINE_CACHE_MS && hit.data.length >= MIN_KLINE_BARS) {
          return hit.data;
        }
      }
    } catch {
      /* fetch fresh */
    }
  }

  const data = await fetchPoolKlines(pool, limit);
  if (kv && data.length > 0) {
    await kv.put(key, JSON.stringify({ at: Date.now(), data }));
  }
  return data;
}

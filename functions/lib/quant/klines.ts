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

const CG_IDS: Record<string, string> = {
  WETH: "weth",
  WBTC: "wrapped-bitcoin",
  LINK: "chainlink",
  UNI: "uniswap",
  FLOKI: "floki",
  TOKEN: "tokenfi",
};

const BINANCE_VISION = "https://data-api.binance.vision";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchGeckoKlines(pool: DexPool, limit: number): Promise<Kline[]> {
  const url = `https://api.geckoterminal.com/api/v2/networks/${pool.geckoNetwork}/pools/${pool.poolAddress}/ohlcv/hour?aggregate=1&limit=${limit}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429) {
      await sleep(1500 * (attempt + 1));
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

async function fetchCoinGeckoKlines(coinId: string, limit: number): Promise<Kline[]> {
  const days = Math.min(30, Math.max(2, Math.ceil(limit / 20)));
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) return [];
    const json = (await res.json()) as { prices?: [number, number][] };
    const prices = json.prices ?? [];
    if (prices.length < 2) return [];

    const out: Kline[] = [];
    for (let i = 1; i < prices.length; i++) {
      const [t0, p0] = prices[i - 1]!;
      const [t1, p1] = prices[i]!;
      out.push({
        time: t1,
        open: p0,
        high: Math.max(p0, p1),
        low: Math.min(p0, p1),
        close: p1,
        volume: 0,
      });
    }
    return out.slice(-limit);
  }
  return [];
}

/** Cloudflare 上 api.binance.com 403；data-api.binance.vision 通常可用 */
async function fetchBinanceVisionKlines(symbol: string, limit: number): Promise<Kline[]> {
  const url = `${BINANCE_VISION}/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const rows = (await res.json()) as [number, string, string, string, string, string][];
  return rows.map((row) => ({
    time: row[0]!,
    open: parseFloat(row[1]!),
    high: parseFloat(row[2]!),
    low: parseFloat(row[3]!),
    close: parseFloat(row[4]!),
    volume: parseFloat(row[5]!),
  }));
}

async function fetchBinanceVisionPrice(symbol: string): Promise<number | null> {
  const url = `${BINANCE_VISION}/api/v3/ticker/price?symbol=${symbol}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const json = (await res.json()) as { price?: string };
  const p = parseFloat(json.price ?? "0");
  return p > 0 ? p : null;
}

export async function fetchPoolKlines(pool: DexPool, limit = 80): Promise<Kline[]> {
  // 云端优先 Binance 公开数据域（Gecko/CG 在 Cloudflare 上常首包就失败）
  if (pool.binanceSymbol) {
    const bv = await fetchBinanceVisionKlines(pool.binanceSymbol, limit);
    if (bv.length >= MIN_KLINE_BARS) return bv;
  }

  const gecko = await fetchGeckoKlines(pool, limit);
  if (gecko.length >= MIN_KLINE_BARS) return gecko;

  const cgId = CG_IDS[pool.baseSymbol];
  if (cgId) {
    const cg = await fetchCoinGeckoKlines(cgId, limit);
    if (cg.length >= MIN_KLINE_BARS) return cg;
  }

  if (gecko.length > 0) return gecko;

  throw new Error(`K线拉取失败(${pool.baseSymbol})，请停止云端后重试`);
}

export async function fetchPoolPrice(pool: DexPool): Promise<number> {
  const chain = pool.chain === "bsc" ? "bsc" : "ethereum";
  const dexUrl = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pool.poolAddress}`;
  try {
    const res = await fetch(dexUrl, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const json = (await res.json()) as { pair?: { priceUsd?: string } };
      const p = parseFloat(json.pair?.priceUsd ?? "0");
      if (p > 0) return p;
    }
  } catch {
    /* fallback */
  }

  if (pool.binanceSymbol) {
    const bp = await fetchBinanceVisionPrice(pool.binanceSymbol);
    if (bp != null) return bp;
  }

  const gecko = await fetchGeckoKlines(pool, 3);
  const last = gecko[gecko.length - 1]?.close;
  if (last && last > 0) return last;

  const cgId = CG_IDS[pool.baseSymbol];
  if (cgId) {
    const cg = await fetchCoinGeckoKlines(cgId, 3);
    const p = cg[cg.length - 1]?.close;
    if (p && p > 0) return p;
  }

  throw new Error(`现价暂不可用(${pool.baseSymbol})`);
}

export function klineCacheKey(poolId: string) {
  return `quant:klines:v3:${poolId}`;
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

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

/** Cloudflare 上 api.binance.com 常被 403，优先用公开数据域 */
const BINANCE_BASES = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
];

async function fetchBinanceKlines(symbol: string, limit: number): Promise<Kline[]> {
  let lastStatus = 0;
  for (const base of BINANCE_BASES) {
    const url = `${base}/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    lastStatus = res.status;
    if (res.status === 403 || res.status === 451) continue;
    if (!res.ok) throw new Error(`Binance kline ${res.status}`);
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
  throw new Error(`Binance kline ${lastStatus || 403}`);
}

async function fetchBinancePrice(symbol: string): Promise<number> {
  let lastStatus = 0;
  for (const base of BINANCE_BASES) {
    const url = `${base}/api/v3/ticker/price?symbol=${symbol}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    lastStatus = res.status;
    if (res.status === 403 || res.status === 451) continue;
    if (!res.ok) throw new Error(`Binance price ${res.status}`);
    const json = (await res.json()) as { price?: string };
    const p = parseFloat(json.price ?? "0");
    if (!p) throw new Error("No Binance price");
    return p;
  }
  throw new Error(`Binance price ${lastStatus || 403}`);
}

async function fetchGeckoKlines(pool: DexPool, limit: number): Promise<Kline[]> {
  const url = `https://api.geckoterminal.com/api/v2/networks/${pool.geckoNetwork}/pools/${pool.poolAddress}/ohlcv/hour?aggregate=1&limit=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
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

export async function fetchPoolKlines(pool: DexPool, limit = 80): Promise<Kline[]> {
  const gecko = await fetchGeckoKlines(pool, limit);
  if (gecko.length >= 30) return gecko;

  if (pool.binanceSymbol) {
    try {
      return await fetchBinanceKlines(pool.binanceSymbol, limit);
    } catch (e) {
      if (gecko.length > 0) return gecko;
      throw e;
    }
  }

  if (gecko.length > 0) return gecko;
  throw new Error(`Kline unavailable for ${pool.baseSymbol}`);
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
    /* fallback below */
  }

  if (pool.binanceSymbol) {
    try {
      return await fetchBinancePrice(pool.binanceSymbol);
    } catch {
      /* gecko last close */
    }
  }

  const gecko = await fetchGeckoKlines(pool, 2);
  const last = gecko[gecko.length - 1]?.close;
  if (last && last > 0) return last;

  throw new Error(`Price unavailable for ${pool.baseSymbol}`);
}

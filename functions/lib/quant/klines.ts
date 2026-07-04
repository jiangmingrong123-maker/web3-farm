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
/** 云端算信号最少 K 线根数（RSI 14 / 均线慢线等） */
const MIN_BARS = 14;

/** 服务端禁止 Binance（Cloudflare IP 普遍 403） */
const CG_IDS: Record<string, string> = {
  WETH: "weth",
  WBTC: "wrapped-bitcoin",
  LINK: "chainlink",
  UNI: "uniswap",
  FLOKI: "floki",
  TOKEN: "tokenfi",
};

async function fetchGeckoKlines(pool: DexPool, limit: number): Promise<Kline[]> {
  const url = `https://api.geckoterminal.com/api/v2/networks/${pool.geckoNetwork}/pools/${pool.poolAddress}/ohlcv/hour?aggregate=1&limit=${limit}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
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

/** CoinGecko 小时线（云端 Binance 不可用时的备用） */
async function fetchCoinGeckoKlines(coinId: string, limit: number): Promise<Kline[]> {
  const days = Math.min(30, Math.max(2, Math.ceil(limit / 20)));
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const json = (await res.json()) as { prices?: [number, number][] };
  const prices = json.prices ?? [];
  if (prices.length < 2) return [];

  const out: Kline[] = [];
  for (let i = 1; i < prices.length; i++) {
    const [t0, p0] = prices[i - 1]!;
    const [t1, p1] = prices[i]!;
    const hi = Math.max(p0, p1);
    const lo = Math.min(p0, p1);
    out.push({
      time: t1,
      open: p0,
      high: hi,
      low: lo,
      close: p1,
      volume: 0,
    });
  }
  return out.slice(-limit);
}

export async function fetchPoolKlines(pool: DexPool, limit = 80): Promise<Kline[]> {
  const gecko = await fetchGeckoKlines(pool, limit);
  if (gecko.length >= MIN_BARS) return gecko;

  const cgId = CG_IDS[pool.baseSymbol];
  if (cgId) {
    const cg = await fetchCoinGeckoKlines(cgId, limit);
    if (cg.length >= MIN_BARS) return cg;
  }

  if (gecko.length > 0) return gecko;

  throw new Error(`链上 K 线暂不可用(${pool.baseSymbol})，请换 WETH 或稍后重试`);
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

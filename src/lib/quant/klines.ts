import type { MarketInterval } from "@/config/quant/markets";
import type { DexPool } from "@/config/quant/markets";

export type Kline = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const CACHE_MS = 90_000;
const cache = new Map<string, { at: number; data: Kline[] }>();

const GECKO_TF: Record<MarketInterval, string> = {
  "1h": "hour",
  "4h": "hour",
  "1d": "day",
};

const BINANCE_INTERVAL: Record<MarketInterval, string> = {
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

const DEXSCREENER_CHAIN: Record<DexPool["chain"], string> = {
  ethereum: "ethereum",
  bsc: "bsc",
};

const UA = "web3-farm-quant/1.0";

const BINANCE_BASES = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
];

async function fetchBinanceKlines(
  symbol: string,
  interval: MarketInterval,
  limit: number,
): Promise<Kline[]> {
  let lastStatus = 0;
  for (const base of BINANCE_BASES) {
    const url = `${base}/api/v3/klines?symbol=${symbol}&interval=${BINANCE_INTERVAL[interval]}&limit=${limit}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    lastStatus = res.status;
    if (res.status === 403 || res.status === 451) continue;
    if (!res.ok) throw new Error(`Binance kline fetch failed: ${res.status}`);
    const rows = (await res.json()) as [
      number,
      string,
      string,
      string,
      string,
      string,
    ][];
    return rows.map((row) => ({
      time: row[0]!,
      open: parseFloat(row[1]!),
      high: parseFloat(row[2]!),
      low: parseFloat(row[3]!),
      close: parseFloat(row[4]!),
      volume: parseFloat(row[5]!),
    }));
  }
  throw new Error(`Binance kline fetch failed: ${lastStatus || 403}`);
}

async function fetchBinancePrice(symbol: string): Promise<number> {
  let lastStatus = 0;
  for (const base of BINANCE_BASES) {
    const url = `${base}/api/v3/ticker/price?symbol=${symbol}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    lastStatus = res.status;
    if (res.status === 403 || res.status === 451) continue;
    if (!res.ok) throw new Error(`Binance price fetch failed: ${res.status}`);
    const json = (await res.json()) as { price?: string };
    const p = parseFloat(json.price ?? "0");
    if (!p) throw new Error("No Binance price");
    return p;
  }
  throw new Error(`Binance price fetch failed: ${lastStatus || 403}`);
}

function resample4h(hourly: Kline[]): Kline[] {
  const out: Kline[] = [];
  for (let i = 3; i < hourly.length; i += 4) {
    const chunk = hourly.slice(i - 3, i + 1);
    if (chunk.length < 4) continue;
    out.push({
      time: chunk[0]!.time,
      open: chunk[0]!.open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1]!.close,
      volume: chunk.reduce((s, c) => s + c.volume, 0),
    });
  }
  return out;
}

/** 从 GeckoTerminal 拉取链上 DEX 池 OHLCV（Ethereum / BSC 等） */
export async function fetchPoolKlines(
  pool: DexPool,
  interval: MarketInterval,
  limit = 200,
): Promise<Kline[]> {
  const key = `${pool.chain}:${pool.poolAddress}:${interval}:${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const tf = GECKO_TF[interval];
  const fetchLimit = interval === "4h" ? Math.min(limit * 4, 400) : limit;
  const geckoUrl = `https://api.geckoterminal.com/api/v2/networks/${pool.geckoNetwork}/pools/${pool.poolAddress}/ohlcv/${tf}?aggregate=1&limit=${fetchLimit}`;

  const geckoRes = await fetch(geckoUrl, { headers: { "User-Agent": UA } });
  if (geckoRes.ok) {
    const json = (await geckoRes.json()) as {
      data?: { attributes?: { ohlcv_list?: [number, number, number, number, number, number][] } };
    };
    const list = json.data?.attributes?.ohlcv_list ?? [];
    let data: Kline[] = list
      .map((row) => ({
        time: row[0]! * 1000,
        open: row[1]!,
        high: row[2]!,
        low: row[3]!,
        close: row[4]!,
        volume: row[5]!,
      }))
      .sort((a, b) => a.time - b.time);
    if (interval === "4h") data = resample4h(data);
    if (data.length > limit) data = data.slice(-limit);
    if (data.length >= 30) {
      cache.set(key, { at: Date.now(), data });
      return data;
    }
  }

  if (pool.binanceSymbol) {
    try {
      const data = await fetchBinanceKlines(pool.binanceSymbol, interval, limit);
      cache.set(key, { at: Date.now(), data });
      return data;
    } catch (e) {
      if (geckoRes.status === 429) {
        throw new Error("K 线请求过于频繁，请稍后重试");
      }
      throw e;
    }
  }

  if (!geckoRes.ok) {
    if (geckoRes.status === 429) {
      throw new Error("K 线请求过于频繁，请稍后重试");
    }
    throw new Error(`K 线暂无数据 (${geckoRes.status})，请换其他币种或稍后重试`);
  }

  throw new Error(`K 线数据不足，请换其他币种或稍后重试`);
}

/** 兼容旧调用：symbol 传 poolAddress */
export async function fetchKlines(
  poolAddress: string,
  interval: MarketInterval,
  limit = 200,
): Promise<Kline[]> {
  return fetchPoolKlines(
    {
      id: poolAddress,
      label: poolAddress,
      chain: "ethereum",
      geckoNetwork: "eth",
      dex: "uniswap_v3",
      poolAddress,
      baseSymbol: "",
      quoteSymbol: "",
    },
    interval,
    limit,
  );
}

/** 链上池当前价（DexScreener）或 Binance 现货 */
export async function fetchPoolPrice(pool: DexPool): Promise<number> {
  if (pool.priceFromBinance && pool.binanceSymbol) {
    return fetchBinancePrice(pool.binanceSymbol);
  }
  const chain = DEXSCREENER_CHAIN[pool.chain];
  const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pool.poolAddress}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    if (pool.binanceSymbol) return fetchBinancePrice(pool.binanceSymbol);
    throw new Error(`Price fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as { pair?: { priceUsd?: string } };
  const p = parseFloat(json.pair?.priceUsd ?? "0");
  if (!p) {
    if (pool.binanceSymbol) return fetchBinancePrice(pool.binanceSymbol);
    throw new Error("No on-chain price");
  }
  return p;
}

export async function fetchLastPrice(poolAddress: string): Promise<number> {
  const url = `https://api.dexscreener.com/latest/dex/pairs/ethereum/${poolAddress}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`);
  const json = (await res.json()) as { pair?: { priceUsd?: string } };
  return parseFloat(json.pair?.priceUsd ?? "0");
}

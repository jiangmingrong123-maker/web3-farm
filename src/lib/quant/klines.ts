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

const DEXSCREENER_CHAIN: Record<DexPool["chain"], string> = {
  ethereum: "ethereum",
  bsc: "bsc",
};

const UA = "web3-farm-quant/1.0";

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

function chainLabel(pool: DexPool): string {
  return pool.chain === "bsc" ? "BSC" : "Ethereum";
}

/** 从 GeckoTerminal 拉取链上 DEX 池 OHLCV（Ethereum / BSC） */
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

  if (geckoRes.status === 429) {
    throw new Error("链上 K 线请求过于频繁，请稍后重试");
  }
  if (!geckoRes.ok) {
    throw new Error(`链上 K 线暂无数据 (${chainLabel(pool)} · ${geckoRes.status})`);
  }
  throw new Error(`链上 K 线数据不足 (${pool.baseSymbol}·${chainLabel(pool)})`);
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

/** 链上 DEX 池现价（DexScreener）；备用同池最新 K 线收盘价 */
export async function fetchPoolPrice(pool: DexPool): Promise<number> {
  const chain = DEXSCREENER_CHAIN[pool.chain];
  const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pool.poolAddress}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.ok) {
    const json = (await res.json()) as { pair?: { priceUsd?: string } };
    const p = parseFloat(json.pair?.priceUsd ?? "0");
    if (p > 0) return p;
  }

  const klines = await fetchPoolKlines(pool, "1h", 3).catch(() => null);
  const last = klines?.[klines.length - 1]?.close;
  if (last && last > 0) return last;

  throw new Error(`链上现价不可用 (${pool.baseSymbol}·${chainLabel(pool)})`);
}

export async function fetchLastPrice(poolAddress: string): Promise<number> {
  const url = `https://api.dexscreener.com/latest/dex/pairs/ethereum/${poolAddress}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`);
  const json = (await res.json()) as { pair?: { priceUsd?: string } };
  return parseFloat(json.pair?.priceUsd ?? "0");
}

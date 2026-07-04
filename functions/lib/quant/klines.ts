import type { DexPool } from "./markets";

export type Kline = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

async function fetchBinanceKlines(symbol: string, limit: number): Promise<Kline[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
  const res = await fetch(url);
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

async function fetchBinancePrice(symbol: string): Promise<number> {
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance price ${res.status}`);
  const json = (await res.json()) as { price?: string };
  const p = parseFloat(json.price ?? "0");
  if (!p) throw new Error("No Binance price");
  return p;
}

export async function fetchPoolKlines(pool: DexPool, limit = 80): Promise<Kline[]> {
  if (pool.priceFromBinance && pool.binanceSymbol) {
    return fetchBinanceKlines(pool.binanceSymbol, limit);
  }

  const url = `https://api.geckoterminal.com/api/v2/networks/${pool.geckoNetwork}/pools/${pool.poolAddress}/ohlcv/hour?aggregate=1&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (pool.binanceSymbol && (res.status === 404 || res.status === 429)) {
      return fetchBinanceKlines(pool.binanceSymbol, limit);
    }
    throw new Error(`Kline ${res.status}`);
  }

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

export async function fetchPoolPrice(pool: DexPool): Promise<number> {
  if (pool.priceFromBinance && pool.binanceSymbol) {
    return fetchBinancePrice(pool.binanceSymbol);
  }
  const chain = pool.chain === "bsc" ? "bsc" : "ethereum";
  const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pool.poolAddress}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (pool.binanceSymbol) return fetchBinancePrice(pool.binanceSymbol);
    throw new Error(`Price ${res.status}`);
  }
  const json = (await res.json()) as { pair?: { priceUsd?: string } };
  const p = parseFloat(json.pair?.priceUsd ?? "0");
  if (!p) {
    if (pool.binanceSymbol) return fetchBinancePrice(pool.binanceSymbol);
    throw new Error("No price");
  }
  return p;
}

import type { StrategyId } from "@/config/quant/strategies";
import { rsi, sma } from "@/lib/quant/indicators";
import type { Kline } from "@/lib/quant/klines";

export type TradeAction = "buy" | "sell";

export type BacktestTrade = {
  time: number;
  action: TradeAction;
  price: number;
  equity: number;
};

export type BacktestResult = {
  trades: BacktestTrade[];
  equityCurve: { time: number; equity: number }[];
  totalReturnPct: number;
  maxDrawdownPct: number;
  winRatePct: number;
  tradeCount: number;
  finalEquity: number;
};

type Params = Record<string, number>;

function runMaCross(
  klines: Kline[],
  params: Params,
  initialCash: number,
): BacktestResult {
  const closes = klines.map((k) => k.close);
  const fast = sma(closes, params.fast ?? 7);
  const slow = sma(closes, params.slow ?? 25);

  let cash = initialCash;
  let position = 0;
  let entryPrice = 0;
  let wins = 0;
  let closed = 0;
  const trades: BacktestTrade[] = [];
  const equityCurve: { time: number; equity: number }[] = [];
  let peak = initialCash;
  let maxDd = 0;

  for (let i = 1; i < klines.length; i++) {
    const f0 = fast[i - 1];
    const s0 = slow[i - 1];
    const f1 = fast[i];
    const s1 = slow[i];
    const price = klines[i]!.close;
    const time = klines[i]!.time;

    if (f0 != null && s0 != null && f1 != null && s1 != null) {
      if (position === 0 && f0 <= s0 && f1 > s1) {
        position = cash / price;
        entryPrice = price;
        cash = 0;
        trades.push({ time, action: "buy", price, equity: position * price });
      } else if (position > 0 && f0 >= s0 && f1 < s1) {
        cash = position * price;
        if (price > entryPrice) wins += 1;
        closed += 1;
        position = 0;
        trades.push({ time, action: "sell", price, equity: cash });
      }
    }

    const equity = cash + position * price;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, ((peak - equity) / peak) * 100);
    equityCurve.push({ time, equity });
  }

  const finalEquity = cash + position * klines[klines.length - 1]!.close;
  return {
    trades,
    equityCurve,
    totalReturnPct: ((finalEquity - initialCash) / initialCash) * 100,
    maxDrawdownPct: maxDd,
    winRatePct: closed > 0 ? (wins / closed) * 100 : 0,
    tradeCount: trades.length,
    finalEquity,
  };
}

function runRsiRevert(
  klines: Kline[],
  params: Params,
  initialCash: number,
): BacktestResult {
  const closes = klines.map((k) => k.close);
  const period = params.period ?? 14;
  const low = params.low ?? 30;
  const high = params.high ?? 70;
  const values = rsi(closes, period);

  let cash = initialCash;
  let position = 0;
  let entryPrice = 0;
  let wins = 0;
  let closed = 0;
  const trades: BacktestTrade[] = [];
  const equityCurve: { time: number; equity: number }[] = [];
  let peak = initialCash;
  let maxDd = 0;

  for (let i = 0; i < klines.length; i++) {
    const r = values[i];
    const price = klines[i]!.close;
    const time = klines[i]!.time;

    if (r != null) {
      if (position === 0 && r < low) {
        position = cash / price;
        entryPrice = price;
        cash = 0;
        trades.push({ time, action: "buy", price, equity: position * price });
      } else if (position > 0 && r > high) {
        cash = position * price;
        if (price > entryPrice) wins += 1;
        closed += 1;
        position = 0;
        trades.push({ time, action: "sell", price, equity: cash });
      }
    }

    const equity = cash + position * price;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, ((peak - equity) / peak) * 100);
    equityCurve.push({ time, equity });
  }

  const finalEquity = cash + position * klines[klines.length - 1]!.close;
  return {
    trades,
    equityCurve,
    totalReturnPct: ((finalEquity - initialCash) / initialCash) * 100,
    maxDrawdownPct: maxDd,
    winRatePct: closed > 0 ? (wins / closed) * 100 : 0,
    tradeCount: trades.length,
    finalEquity,
  };
}

function runGrid(klines: Kline[], params: Params, initialCash: number): BacktestResult {
  const grids = params.grids ?? 10;
  const rangePct = (params.rangePct ?? 8) / 100;
  const closes = klines.map((k) => k.close);
  const mid = closes[0]!;
  const low = mid * (1 - rangePct);
  const high = mid * (1 + rangePct);
  const step = (high - low) / grids;

  let cash = initialCash * 0.5;
  let coin = (initialCash * 0.5) / mid;
  const gridHeld = new Array(grids).fill(false);
  const trades: BacktestTrade[] = [];
  const equityCurve: { time: number; equity: number }[] = [];
  let peak = initialCash;
  let maxDd = 0;
  let wins = 0;
  let closed = 0;

  for (let i = 0; i < klines.length; i++) {
    const price = klines[i]!.close;
    const time = klines[i]!.time;

    for (let g = 0; g < grids; g++) {
      const level = low + step * g;
      if (!gridHeld[g] && price <= level && cash >= level * 0.1) {
        const spend = Math.min(cash, (initialCash / grids) * 0.15);
        const qty = spend / price;
        cash -= spend;
        coin += qty;
        gridHeld[g] = true;
        trades.push({ time, action: "buy", price, equity: cash + coin * price });
      } else if (gridHeld[g] && price >= level + step && coin > 0) {
        const qty = Math.min(coin, (initialCash / grids / level) * 0.15);
        const rev = qty * price;
        coin -= qty;
        cash += rev;
        gridHeld[g] = false;
        if (price > level) wins += 1;
        closed += 1;
        trades.push({ time, action: "sell", price, equity: cash + coin * price });
      }
    }

    const equity = cash + coin * price;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, ((peak - equity) / peak) * 100);
    equityCurve.push({ time, equity });
  }

  const finalEquity = cash + coin * klines[klines.length - 1]!.close;
  return {
    trades,
    equityCurve,
    totalReturnPct: ((finalEquity - initialCash) / initialCash) * 100,
    maxDrawdownPct: maxDd,
    winRatePct: closed > 0 ? (wins / closed) * 100 : 0,
    tradeCount: trades.length,
    finalEquity,
  };
}

export function runBacktest(
  strategyId: StrategyId,
  klines: Kline[],
  params: Params,
  initialCash = 10_000,
): BacktestResult {
  if (klines.length < 30) {
    return {
      trades: [],
      equityCurve: [],
      totalReturnPct: 0,
      maxDrawdownPct: 0,
      winRatePct: 0,
      tradeCount: 0,
      finalEquity: initialCash,
    };
  }
  switch (strategyId) {
    case "ma_cross":
      return runMaCross(klines, params, initialCash);
    case "rsi_revert":
      return runRsiRevert(klines, params, initialCash);
    case "grid":
      return runGrid(klines, params, initialCash);
    default:
      return runMaCross(klines, params, initialCash);
  }
}

/** 最新一根 K 线的信号（用于信号面板） */
export function latestSignal(
  strategyId: StrategyId,
  klines: Kline[],
  params: Params,
): "buy" | "sell" | "hold" {
  if (klines.length < 30) return "hold";
  const closes = klines.map((k) => k.close);
  const i = klines.length - 1;

  if (strategyId === "ma_cross") {
    const fast = sma(closes, params.fast ?? 7);
    const slow = sma(closes, params.slow ?? 25);
    const f0 = fast[i - 1];
    const s0 = slow[i - 1];
    const f1 = fast[i];
    const s1 = slow[i];
    if (f0 != null && s0 != null && f1 != null && s1 != null) {
      if (f0 <= s0 && f1 > s1) return "buy";
      if (f0 >= s0 && f1 < s1) return "sell";
    }
    return "hold";
  }

  if (strategyId === "rsi_revert") {
    const values = rsi(closes, params.period ?? 14);
    const r = values[i];
    if (r != null) {
      if (r < (params.low ?? 30)) return "buy";
      if (r > (params.high ?? 70)) return "sell";
    }
    return "hold";
  }

  const mid = closes[0]!;
  const rangePct = (params.rangePct ?? 8) / 100;
  const price = closes[i]!;
  if (price < mid * (1 - rangePct * 0.5)) return "buy";
  if (price > mid * (1 + rangePct * 0.5)) return "sell";
  return "hold";
}

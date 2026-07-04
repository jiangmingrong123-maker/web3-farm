import type { StrategyId } from "./markets";
import { rsi, sma } from "./indicators";
import type { Kline } from "./klines";

type Params = Record<string, number>;

export function latestSignal(
  strategyId: StrategyId,
  klines: Kline[],
  params: Params,
): "buy" | "sell" | "hold" {
  if (klines.length < 14) return "hold";
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

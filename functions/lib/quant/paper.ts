import type { StrategyId } from "./markets";

export type PaperPosition = {
  marketId: string;
  qty: number;
  avgPrice: number;
};

export type CloudPaperState = {
  cash: number;
  positions: PaperPosition[];
  logs: { time: number; text: string }[];
  strategyId: StrategyId;
  marketId: string;
  params: Record<string, number>;
  running: boolean;
  cloud: true;
  lastTickAt: number | null;
  lastSignal: "buy" | "sell" | "hold";
  lastPrice: number | null;
  lastError: string | null;
  startedAt: number | null;
  tickCount: number;
};

export function defaultCloudPaperState(): CloudPaperState {
  return {
    cash: 10_000,
    positions: [],
    logs: [],
    strategyId: "ma_cross",
    marketId: "weth-usdc",
    params: { fast: 7, slow: 25 },
    running: false,
    cloud: true,
    lastTickAt: null,
    lastSignal: "hold",
    lastPrice: null,
    lastError: null,
    startedAt: null,
    tickCount: 0,
  };
}

export function paperEquity(state: CloudPaperState, price: number): number {
  const pos = state.positions.find((p) => p.marketId === state.marketId);
  return state.cash + (pos ? pos.qty * price : 0);
}

export function paperBuy(state: CloudPaperState, price: number, pct = 0.25): CloudPaperState {
  const spend = state.cash * pct;
  if (spend < 10) return state;
  const qty = spend / price;
  const next: CloudPaperState = {
    ...state,
    cash: state.cash - spend,
    positions: [...state.positions],
  };
  const idx = next.positions.findIndex((p) => p.marketId === state.marketId);
  if (idx >= 0) {
    const cur = next.positions[idx]!;
    const totalQty = cur.qty + qty;
    const avg = (cur.avgPrice * cur.qty + price * qty) / totalQty;
    next.positions[idx] = { marketId: state.marketId, qty: totalQty, avgPrice: avg };
  } else {
    next.positions.push({ marketId: state.marketId, qty, avgPrice: price });
  }
  next.logs = [
    { time: Date.now(), text: `BUY ${qty.toFixed(6)} @ ${price.toFixed(6)}` },
    ...next.logs.slice(0, 49),
  ];
  return next;
}

export function paperSell(state: CloudPaperState, price: number, pct = 1): CloudPaperState {
  const idx = state.positions.findIndex((p) => p.marketId === state.marketId);
  if (idx < 0) return state;
  const cur = state.positions[idx]!;
  const sellQty = cur.qty * pct;
  if (sellQty <= 0) return state;
  const proceeds = sellQty * price;
  const next: CloudPaperState = {
    ...state,
    cash: state.cash + proceeds,
    positions: [...state.positions],
  };
  const remain = cur.qty - sellQty;
  if (remain <= 1e-12) next.positions.splice(idx, 1);
  else next.positions[idx] = { ...cur, qty: remain };
  next.logs = [
    { time: Date.now(), text: `SELL ${sellQty.toFixed(6)} @ ${price.toFixed(6)}` },
    ...next.logs.slice(0, 49),
  ];
  return next;
}

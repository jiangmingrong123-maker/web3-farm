import type { StrategyId } from "@/config/quant/strategies";

const KEY = "web3farm_quant_paper";

export type PaperPosition = {
  marketId: string;
  qty: number;
  avgPrice: number;
};

export type PaperState = {
  cash: number;
  positions: PaperPosition[];
  logs: { time: number; text: string }[];
  strategyId: StrategyId;
  marketId: string;
  running: boolean;
};

export function defaultPaperState(): PaperState {
  return {
    cash: 10_000,
    positions: [],
    logs: [],
    strategyId: "ma_cross",
    marketId: "weth-usdc",
    running: false,
  };
}

export function loadPaperState(): PaperState {
  if (typeof window === "undefined") return defaultPaperState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPaperState();
    return { ...defaultPaperState(), ...JSON.parse(raw) };
  } catch {
    return defaultPaperState();
  }
}

export function savePaperState(state: PaperState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetPaperState(): PaperState {
  const s = defaultPaperState();
  savePaperState(s);
  return s;
}

export function paperEquity(state: PaperState, price: number): number {
  const pos = state.positions.find((p) => p.marketId === state.marketId);
  const coinVal = pos ? pos.qty * price : 0;
  return state.cash + coinVal;
}

export function paperBuy(state: PaperState, price: number, pct = 0.25): PaperState {
  const spend = state.cash * pct;
  if (spend < 10) return state;
  const qty = spend / price;
  const next = { ...state, cash: state.cash - spend, positions: [...state.positions] };
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
    { time: Date.now(), text: `BUY ${qty.toFixed(6)} @ ${price.toFixed(2)}` },
    ...next.logs.slice(0, 49),
  ];
  return next;
}

export function paperSell(state: PaperState, price: number, pct = 1): PaperState {
  const idx = state.positions.findIndex((p) => p.marketId === state.marketId);
  if (idx < 0) return state;
  const cur = state.positions[idx]!;
  const qty = cur.qty * pct;
  if (qty <= 0) return state;
  const rev = qty * price;
  const next = { ...state, cash: state.cash + rev, positions: [...state.positions] };
  const remain = cur.qty - qty;
  if (remain < 1e-8) next.positions.splice(idx, 1);
  else next.positions[idx] = { ...cur, qty: remain };
  next.logs = [
    { time: Date.now(), text: `SELL ${qty.toFixed(6)} @ ${price.toFixed(2)}` },
    ...next.logs.slice(0, 49),
  ];
  return next;
}

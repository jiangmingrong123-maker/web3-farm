"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { QuantCard } from "@/components/quant/QuantDock";
import { StrategyParams } from "@/components/quant/StrategyPanel";
import { QUANT_POOLS } from "@/config/quant/markets";
import type { StrategyId } from "@/config/quant/strategies";
import { latestSignal } from "@/lib/quant/backtest";
import { formatUsdEquityLabel } from "@/lib/quant/format-price";
import { fetchPoolKlines, fetchPoolPrice } from "@/lib/quant/klines";
import {
  loadPaperState,
  paperBuy,
  paperEquity,
  paperSell,
  resetPaperState,
  savePaperState,
  type PaperState,
} from "@/lib/quant/paper-store";

type Props = {
  locale: string;
  strategyId: StrategyId;
  params: Record<string, number>;
  onParams: (key: string, v: number) => void;
};

export function PaperPanel({ locale, strategyId, params, onParams }: Props) {
  const t = useTranslations("quant");
  const [state, setState] = useState<PaperState | null>(null);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setState(loadPaperState());
  }, []);

  const pool = QUANT_POOLS.find((p) => p.id === state?.marketId) ?? QUANT_POOLS[0]!;

  const refreshPrice = useCallback(async () => {
    if (!state) return;
    try {
      const p = await fetchPoolPrice(pool);
      setPrice(p);
    } catch {
      /* ignore */
    }
  }, [state, pool]);

  useEffect(() => {
    void refreshPrice();
    const id = window.setInterval(() => void refreshPrice(), 30_000);
    return () => clearInterval(id);
  }, [refreshPrice]);

  const persist = useCallback((next: PaperState) => {
    setState(next);
    savePaperState(next);
  }, []);

  const runTick = useCallback(async () => {
    if (!state || !state.running) return;
    setLoading(true);
    try {
      const klines = await fetchPoolKlines(pool, "1h", 80);
      const sig = latestSignal(state.strategyId, klines, params);
      const p = await fetchPoolPrice(pool);
      setPrice(p);
      let next = state;
      if (sig === "buy") next = paperBuy(next, p);
      else if (sig === "sell") next = paperSell(next, p);
      persist(next);
    } finally {
      setLoading(false);
    }
  }, [state, pool, params, persist]);

  useEffect(() => {
    if (!state?.running) return;
    void runTick();
    const id = window.setInterval(() => void runTick(), 60_000);
    return () => clearInterval(id);
  }, [state?.running, runTick]);

  if (!state) return null;

  const equity = paperEquity(state, price || 1);
  const pos = state.positions.find((p) => p.marketId === state.marketId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/45">{t("paperHint")}</p>

      <QuantCard title={t("paperAccount")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={t("paperCash")} value={formatUsdEquityLabel(state.cash, locale)} />
          <Stat label={t("paperEquity")} value={formatUsdEquityLabel(equity, locale)} />
          <Stat
            label={t("paperPosition")}
            value={pos ? `${pos.qty.toFixed(4)} ${pool.baseSymbol}` : "—"}
          />
          <Stat label={t("pool")} value={pool.label} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={state.marketId}
            onChange={(e) => persist({ ...state, marketId: e.target.value })}
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-white"
          >
            {QUANT_POOLS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              persist({
                ...state,
                running: !state.running,
                strategyId,
              })
            }
            className={`rounded-lg px-4 py-2 text-xs font-semibold ${
              state.running
                ? "border border-red-500/50 text-red-300"
                : "bg-gold text-ink"
            }`}
          >
            {state.running ? t("paperStop") : t("paperStart")}
          </button>
          <button
            type="button"
            onClick={() => persist(resetPaperState())}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/50"
          >
            {t("paperReset")}
          </button>
          {loading && <span className="self-center text-xs text-white/35">{t("running")}</span>}
        </div>
      </QuantCard>

      <StrategyParams locale={locale} strategyId={strategyId} params={params} onChange={onParams} />

      {state.logs.length > 0 && (
        <QuantCard title={t("paperLog")}>
          <ul className="max-h-36 space-y-1 overflow-y-auto font-mono text-[10px] text-white/55">
            {state.logs.map((l, i) => (
              <li key={`${l.time}-${i}`}>
                {new Date(l.time).toLocaleTimeString(locale)} · {l.text}
              </li>
            ))}
          </ul>
        </QuantCard>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-center">
      <p className="text-[9px] text-white/40">{label}</p>
      <p className="text-xs font-semibold text-white/85">{value}</p>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { EquityChart } from "@/components/quant/EquityChart";
import { QuantCard } from "@/components/quant/QuantDock";
import { StrategyParams } from "@/components/quant/StrategyPanel";
import {
  QUANT_INTERVALS,
  QUANT_POOLS,
  type MarketInterval,
} from "@/config/quant/markets";
import { poolOptionLabel } from "@/components/quant/ChainPicker";
import { getStrategy, type StrategyId } from "@/config/quant/strategies";
import { formatUsdPrice } from "@/lib/quant/format-price";
import { runBacktest, type BacktestResult } from "@/lib/quant/backtest";
import { fetchPoolKlines } from "@/lib/quant/klines";

type Props = {
  locale: string;
  strategyId: StrategyId;
  params: Record<string, number>;
  onParams: (key: string, v: number) => void;
};

export function BacktestPanel({ locale, strategyId, params, onParams }: Props) {
  const t = useTranslations("quant");
  const zh = locale === "zh";
  const [poolId, setPoolId] = useState("weth-usdc");
  const [interval, setInterval] = useState<MarketInterval>("1d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const pool = QUANT_POOLS.find((m) => m.id === poolId) ?? QUANT_POOLS[0]!;

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const klines = await fetchPoolKlines(pool, interval, 200);
      const res = runBacktest(strategyId, klines, params);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("fetchError"));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [pool, interval, strategyId, params, t]);

  const strat = getStrategy(strategyId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/45">{t("backtestHint")}</p>

      <QuantCard title={t("backtestConfig")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-white/50">
            {t("pool")}
            <select
              value={poolId}
              onChange={(e) => setPoolId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            >
              {QUANT_POOLS.map((p) => (
                <option key={p.id} value={p.id}>
                  {poolOptionLabel(p, locale)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-white/50">
            {t("interval")}
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value as MarketInterval)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            >
              {QUANT_INTERVALS.map((iv) => (
                <option key={iv.id} value={iv.id}>
                  {zh ? iv.labelZh : iv.labelEn}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={loading}
              onClick={() => void run()}
              className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-bold text-ink disabled:opacity-50"
            >
              {loading ? t("running") : t("runBacktest")}
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-white/35">
          {t("strategyLabel")}: {zh ? strat.nameZh : strat.nameEn}
        </p>
      </QuantCard>

      <StrategyParams
        locale={locale}
        strategyId={strategyId}
        params={params}
        onChange={onParams}
      />

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <>
          <QuantCard title={t("equityCurve")}>
            <EquityChart data={result.equityCurve} height={140} />
          </QuantCard>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label={t("totalReturn")} value={`${result.totalReturnPct.toFixed(2)}%`} positive={result.totalReturnPct >= 0} />
            <Metric label={t("maxDrawdown")} value={`${result.maxDrawdownPct.toFixed(2)}%`} positive={false} />
            <Metric label={t("winRate")} value={`${result.winRatePct.toFixed(1)}%`} positive={result.winRatePct >= 50} />
            <Metric label={t("tradeCount")} value={String(result.tradeCount)} />
          </div>

          {result.trades.length > 0 && (
            <QuantCard title={t("recentTrades")}>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                {result.trades.slice(-12).reverse().map((tr, i) => (
                  <li
                    key={`${tr.time}-${i}`}
                    className={tr.action === "buy" ? "text-emerald-400" : "text-red-400"}
                  >
                    {new Date(tr.time).toLocaleDateString(locale)} · {tr.action.toUpperCase()} @{" "}
                    {formatUsdPrice(tr.price, locale)} · ${tr.equity.toFixed(0)}
                  </li>
                ))}
              </ul>
            </QuantCard>
          )}
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  const color =
    positive === undefined
      ? "text-white/85"
      : positive
        ? "text-emerald-400"
        : "text-red-400";
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-center">
      <p className="text-[10px] text-white/40">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}

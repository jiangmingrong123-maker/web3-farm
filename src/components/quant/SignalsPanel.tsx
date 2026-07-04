"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { QuantCard } from "@/components/quant/QuantDock";
import { StrategyParams } from "@/components/quant/StrategyPanel";
import { poolOptionLabel } from "@/components/quant/ChainPicker";
import {
  QUANT_INTERVALS,
  QUANT_POOLS,
  type MarketInterval,
} from "@/config/quant/markets";
import { getStrategy, type StrategyId } from "@/config/quant/strategies";
import { latestSignal } from "@/lib/quant/backtest";
import { fetchPoolKlines, fetchPoolPrice } from "@/lib/quant/klines";
import { formatUsdPriceLabel } from "@/lib/quant/format-price";
import { loadConnectorConfig, notifyUserWebhook } from "@/lib/quant/user-connectors";

type Props = {
  locale: string;
  strategyId: StrategyId;
  params: Record<string, number>;
  onParams: (key: string, v: number) => void;
};

export function SignalsPanel({ locale, strategyId, params, onParams }: Props) {
  const t = useTranslations("quant");
  const zh = locale === "zh";
  const [poolId, setPoolId] = useState("weth-usdc");
  const [interval, setInterval] = useState<MarketInterval>("1h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signal, setSignal] = useState<"buy" | "sell" | "hold">("hold");
  const [price, setPrice] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  const pool = QUANT_POOLS.find((p) => p.id === poolId) ?? QUANT_POOLS[0]!;
  const strat = getStrategy(strategyId);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [klines, p] = await Promise.all([
        fetchPoolKlines(pool, interval, 120),
        fetchPoolPrice(pool),
      ]);
      const sig = latestSignal(strategyId, klines, params);
      setSignal(sig);
      setPrice(p);
      setUpdatedAt(Date.now());

      const cfg = loadConnectorConfig();
      if (cfg.aiWebhookEnabled && cfg.aiWebhookUrl.trim()) {
        const result = await notifyUserWebhook(cfg.aiWebhookUrl, {
          signal: sig,
          poolId: pool.id,
          poolLabel: pool.label,
          priceUsd: p,
          strategyId,
          params,
          at: Date.now(),
        });
        setWebhookStatus(result.ok ? t("webhookSent") : t("webhookFailed"));
      } else {
        setWebhookStatus(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("fetchError"));
    } finally {
      setLoading(false);
    }
  }, [pool, interval, strategyId, params, t]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const signalClass =
    signal === "buy"
      ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
      : signal === "sell"
        ? "border-red-500/50 bg-red-950/40 text-red-300"
        : "border-white/15 bg-black/30 text-white/60";

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/45">{t("signalsHint")}</p>

      <QuantCard title={t("liveSignal")} action={
        <button
          type="button"
          disabled={loading}
          onClick={() => void refresh()}
          className="rounded border border-white/15 px-2 py-1 text-[10px] text-white/60 hover:border-white/30"
        >
          {loading ? "…" : t("refresh")}
        </button>
      }>
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>

        <p className="mt-2 text-[11px] text-white/35">
          {t("strategyLabel")}: {zh ? strat.nameZh : strat.nameEn}
        </p>

        {error && (
          <p className="mt-2 text-sm text-red-300">{error}</p>
        )}

        <div className={`mt-4 rounded-xl border px-4 py-6 text-center ${signalClass}`}>
          <p className="text-[10px] uppercase tracking-wider opacity-70">{t("currentSignal")}</p>
          <p className="mt-1 text-2xl font-bold">{t(`signal_${signal}`)}</p>
          {price != null && (
            <p className="mt-2 text-sm opacity-80">
              {pool.baseSymbol} ≈ {formatUsdPriceLabel(price, locale)}
            </p>
          )}
          {updatedAt && (
            <p className="mt-1 text-[10px] opacity-50">
              {new Date(updatedAt).toLocaleTimeString(locale)}
            </p>
          )}
          {webhookStatus && (
            <p className="mt-2 text-[10px] text-cyan-400/80">{webhookStatus}</p>
          )}
        </div>
      </QuantCard>

      <StrategyParams locale={locale} strategyId={strategyId} params={params} onChange={onParams} />
    </div>
  );
}

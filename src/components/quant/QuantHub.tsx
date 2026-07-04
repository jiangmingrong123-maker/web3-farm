"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BacktestPanel } from "@/components/quant/BacktestPanel";
import { ConnectorsPanel } from "@/components/quant/ConnectorsPanel";
import { LiveTradePanel } from "@/components/quant/LiveTradePanel";
import { QuantDisclaimer } from "@/components/quant/QuantDisclaimer";
import { QuantQuickPanel } from "@/components/quant/QuantQuickPanel";
import { QuantTerms } from "@/components/quant/QuantTerms";
import { SignalsPanel } from "@/components/quant/SignalsPanel";
import { StrategyPanel } from "@/components/quant/StrategyPanel";
import { QUANT_POOLS, poolsForChain, type QuantChain } from "@/config/quant/markets";
import { defaultParams, type StrategyId } from "@/config/quant/strategies";
import { loadPaperState } from "@/lib/quant/paper-store";

type Props = { locale: string };
type QuantMode = "paper" | "live";

function defaultParamsForStrategy(strategyId: StrategyId): Record<string, number> {
  return defaultParams(strategyId);
}

export function QuantHub({ locale }: Props) {
  const t = useTranslations("quant");
  const [mode, setMode] = useState<QuantMode>("paper");
  const [chain, setChain] = useState<QuantChain>("ethereum");
  const [poolId, setPoolId] = useState("weth-usdc");
  const [strategyId, setStrategyId] = useState<StrategyId>("ma_cross");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advTab, setAdvTab] = useState<"backtest" | "signals" | "templates" | "connectors">(
    "backtest",
  );
  const [params, setParams] = useState<Record<string, number>>(() => defaultParamsForStrategy("ma_cross"));

  useEffect(() => {
    const saved = loadPaperState();
    if (saved.marketId) {
      setPoolId(saved.marketId);
      const savedPool = QUANT_POOLS.find((p) => p.id === saved.marketId);
      if (savedPool) setChain(savedPool.chain);
    }
    if (saved.strategyId) setStrategyId(saved.strategyId);
  }, []);

  const onSelectStrategy = useCallback((id: StrategyId) => {
    setStrategyId(id);
    setParams(defaultParamsForStrategy(id));
  }, []);

  const onParamsChange = useCallback((next: Record<string, number>) => {
    setParams(next);
  }, []);

  const onParam = useCallback((key: string, v: number) => {
    setParams((prev) => ({ ...prev, [key]: v }));
  }, []);

  const onChainChange = useCallback((next: QuantChain) => {
    setChain(next);
    const first = poolsForChain(next)[0];
    if (first) setPoolId(first.id);
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header className="text-center">
        <p className="mb-1 text-xs tracking-[0.2em] text-gold/80">{t("badge")}</p>
        <h1 className="font-display text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-white/45">{t("quickTagline")}</p>
      </header>

      <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
        <button
          type="button"
          data-quant-mode="paper"
          onClick={() => setMode("paper")}
          className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition ${
            mode === "paper"
              ? "bg-emerald-600/80 text-white"
              : "text-white/45 hover:text-white/70"
          }`}
        >
          {t("modePaper")}
        </button>
        <button
          type="button"
          data-quant-mode="live"
          onClick={() => setMode("live")}
          className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition ${
            mode === "live"
              ? "bg-gold/90 text-ink"
              : "text-white/45 hover:text-white/70"
          }`}
        >
          {t("modeLive")}
        </button>
      </div>

      {mode === "paper" ? (
        <QuantQuickPanel
          locale={locale}
          chain={chain}
          poolId={poolId}
          strategyId={strategyId}
          params={params}
          onChainChange={onChainChange}
          onPoolChange={setPoolId}
          onStrategyChange={onSelectStrategy}
          onParamsChange={onParamsChange}
          onOpenLive={() => setMode("live")}
        />
      ) : (
        <LiveTradePanel
          locale={locale}
          chain={chain}
          poolId={poolId}
          strategyId={strategyId}
          params={params}
          onBackPaper={() => setMode("paper")}
        />
      )}

      <div className="rounded-xl border border-white/10 bg-black/20">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-medium text-white/55"
        >
          {t("advancedToggle")}
          <span>{advancedOpen ? "−" : "+"}</span>
        </button>
        {advancedOpen && (
          <div className="space-y-3 border-t border-white/10 p-3">
            <QuantDisclaimer />
            <nav className="flex flex-wrap gap-1">
              {(
                [
                  ["backtest", t("tab_backtest")],
                  ["signals", t("tab_signals")],
                  ["templates", t("tab_strategies")],
                  ["connectors", t("tab_connectors")],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAdvTab(id)}
                  className={`rounded-md px-2 py-1 text-[10px] ${
                    advTab === id ? "bg-white/10 text-white/80" : "text-white/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
            {advTab === "backtest" && (
              <BacktestPanel
                locale={locale}
                strategyId={strategyId}
                params={params}
                onParams={onParam}
              />
            )}
            {advTab === "signals" && (
              <SignalsPanel
                locale={locale}
                strategyId={strategyId}
                params={params}
                onParams={onParam}
              />
            )}
            {advTab === "templates" && (
              <StrategyPanel locale={locale} selected={strategyId} onSelect={onSelectStrategy} />
            )}
            {advTab === "connectors" && <ConnectorsPanel />}
            <QuantTerms />
          </div>
        )}
      </div>
    </div>
  );
}

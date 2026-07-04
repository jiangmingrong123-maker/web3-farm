"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { QUANT_POOLS, poolsForChain, type QuantChain } from "@/config/quant/markets";
import { ChainPicker } from "@/components/quant/ChainPicker";
import { StrategyParamsQuick } from "@/components/quant/StrategyParamsQuick";
import { StrategyQuickCards } from "@/components/quant/StrategyQuickCards";
import {
  getStrategy,
  type StrategyId,
} from "@/config/quant/strategies";
import { formatUsdPrice, formatUsdPriceLabel } from "@/lib/quant/format-price";
import { latestSignal } from "@/lib/quant/backtest";
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
  chain: QuantChain;
  poolId: string;
  strategyId: StrategyId;
  params: Record<string, number>;
  onChainChange: (chain: QuantChain) => void;
  onPoolChange: (poolId: string) => void;
  onStrategyChange: (id: StrategyId) => void;
  onParamsChange: (params: Record<string, number>) => void;
  onOpenLive: () => void;
};

export function QuantQuickPanel({
  locale,
  chain,
  poolId,
  strategyId,
  params,
  onChainChange,
  onPoolChange,
  onStrategyChange,
  onParamsChange,
  onOpenLive,
}: Props) {
  const t = useTranslations("quant");
  const zh = locale === "zh";
  const [state, setState] = useState<PaperState | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [signal, setSignal] = useState<"buy" | "sell" | "hold">("hold");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chainPools = useMemo(() => poolsForChain(chain), [chain]);
  const pool = chainPools.find((p) => p.id === poolId) ?? chainPools[0]!;
  const strat = getStrategy(strategyId);

  useEffect(() => {
    const saved = loadPaperState();
    setState(saved);
  }, []);

  const persist = useCallback((next: PaperState) => {
    setState(next);
    savePaperState(next);
  }, []);

  const runningRef = useRef(false);
  useEffect(() => {
    runningRef.current = state?.running ?? false;
  }, [state?.running]);

  const tick = useCallback(async (): Promise<PaperState | null> => {
    const cur = loadPaperState();
    const activePool =
      QUANT_POOLS.find((p) => p.id === (cur.marketId || poolId)) ?? pool;
    setLoading(true);
    setError(null);
    try {
      const klines = await fetchPoolKlines(activePool, "1h", 80);
      const p = await fetchPoolPrice(activePool);
      const sig = latestSignal(cur.strategyId ?? strategyId, klines, params);
      setPrice(p);
      setSignal(sig);
      if (!cur.running) return cur;
      let next = cur;
      if (sig === "buy") next = paperBuy(cur, p);
      else if (sig === "sell") next = paperSell(cur, p);
      if (next !== cur) persist(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("fetchError"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [pool, poolId, strategyId, params, persist, t]);

  useEffect(() => {
    void tick();
    const id = window.setInterval(() => void tick(), 45_000);
    return () => clearInterval(id);
  }, [tick]);

  const startSim = useCallback(async () => {
    const base = state ?? loadPaperState();
    const next: PaperState = {
      ...base,
      marketId: poolId,
      strategyId,
      running: true,
      logs: [
        {
          time: Date.now(),
          text: zh
            ? `开始模拟 · ${pool.baseSymbol} · ${strat.nameZh}`
            : `Paper start · ${pool.baseSymbol} · ${strat.nameEn}`,
        },
        ...base.logs.slice(0, 48),
      ],
    };
    persist(next);
    runningRef.current = true;
    await tick();
  }, [state, poolId, strategyId, pool, strat, zh, persist, tick]);

  const stopSim = useCallback(() => {
    if (!state) return;
    runningRef.current = false;
    persist({ ...state, running: false });
  }, [state, persist]);

  const equity = state ? paperEquity(state, price ?? 1) : 10_000;
  const pnl = equity - 10_000;
  const pos = state?.positions.find((p) => p.marketId === poolId);

  const signalLabel = t(`signal_${signal}`);
  const signalClass =
    signal === "buy"
      ? "text-emerald-400"
      : signal === "sell"
        ? "text-red-400"
        : "text-white/50";

  const steps = useMemo(
    () => [
      { n: 1, text: t("quickStep1") },
      { n: 2, text: t("quickStep2") },
      { n: 3, text: t("quickStep3") },
      { n: 4, text: t("quickStep4") },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-3 py-2.5 text-xs leading-relaxed text-cyan-100/75">
        {t("paperPreviewIntro")}
      </div>

      <ol className="flex gap-2 text-[10px] text-white/40">
        {steps.map((s) => (
          <li key={s.n} className="flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
            <span className="text-gold">{s.n}.</span> {s.text}
          </li>
        ))}
      </ol>

      {/* 选链 + 选币 */}
      <section className="space-y-2">
        <p className="text-xs font-medium text-white/55">{t("quickPickChain")}</p>
        <ChainPicker
          locale={locale}
          chain={chain}
          onChange={(next) => {
            onChainChange(next);
          }}
        />
      </section>

      <section>
        <p className="mb-2 text-xs font-medium text-white/55">{t("quickPickCoin")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {chainPools.map((p) => {
            const active = poolId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPoolChange(p.id)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-gold/60 bg-gold/15 ring-1 ring-gold/40"
                    : "border-white/10 bg-black/25 hover:border-white/25"
                }`}
              >
                <p className="text-sm font-bold text-white/90">{p.baseSymbol}</p>
                <p className="mt-0.5 text-[10px] text-white/40">{p.quoteSymbol}</p>
                {p.priceFromBinance && (
                  <p className="mt-0.5 text-[9px] text-cyan-400/70">{t("dataBinance")}</p>
                )}
              </button>
            );
          })}
        </div>
        {chain === "bsc" && (
          <p className="mt-2 text-[10px] text-white/35">{t("bscMoreSoon")}</p>
        )}
      </section>

      {/* 选策略 */}
      <section>
        <p className="mb-2 text-xs font-medium text-white/55">{t("quickPickStrategy")}</p>
        <StrategyQuickCards
          locale={locale}
          strategyId={strategyId}
          onSelect={onStrategyChange}
        />
      </section>

      <section>
        <p className="mb-2 text-xs font-medium text-white/55">{t("quickPickParams")}</p>
        <StrategyParamsQuick
          locale={locale}
          strategyId={strategyId}
          params={params}
          onChange={onParamsChange}
        />
      </section>

      {/* 现价 + 信号 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat
          label={t("quickPrice")}
          value={price != null ? formatUsdPriceLabel(price, locale) : "—"}
        />
        <MiniStat label={t("quickSignal")} value={signalLabel} valueClass={signalClass} />
        <MiniStat label={t("paperEquity")} value={`$${equity.toFixed(0)}`} />
        <MiniStat
          label={t("quickPnl")}
          value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(0)}`}
          valueClass={pnl >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </div>

      {pos && (
        <p className="text-center text-[11px] text-white/45">
          {t("quickHolding", {
            qty: pos.qty.toFixed(4),
            symbol: pool.baseSymbol,
            avg: formatUsdPrice(pos.avgPrice, locale),
          })}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {/* 主按钮 */}
      <div className="flex flex-col gap-2 sm:flex-row">
        {!state?.running ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void startSim()}
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-4 text-base font-bold text-white shadow-lg disabled:opacity-50"
          >
            {loading ? t("running") : t("quickStart")}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopSim}
            className="flex-1 rounded-xl border border-red-500/50 bg-red-950/40 py-4 text-base font-bold text-red-300"
          >
            {t("quickStop")}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const r = resetPaperState();
            persist({ ...r, marketId: poolId, strategyId });
          }}
          className="rounded-xl border border-white/15 px-4 py-4 text-sm text-white/45 sm:py-2"
        >
          {t("paperReset")}
        </button>
      </div>

      {state?.running && (
        <p className="text-center text-[11px] text-emerald-400/80">{t("quickRunningHint")}</p>
      )}

      <p className="text-center text-[10px] text-white/30">{t("paperPreviewNote")}</p>

      <button
        type="button"
        onClick={onOpenLive}
        className="w-full rounded-xl border border-gold/40 bg-gold/10 py-3 text-sm font-semibold text-gold hover:bg-gold/15"
      >
        {t("goLiveEntry")}
      </button>

      {state && state.logs.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="mb-2 text-xs font-medium text-white/50">{t("paperLog")}</p>
          <ul className="max-h-32 space-y-1 overflow-y-auto font-mono text-[10px] text-white/55">
            {state.logs.slice(0, 12).map((l, i) => (
              <li key={`${l.time}-${i}`}>
                {new Date(l.time).toLocaleTimeString(locale)} · {l.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueClass = "text-white/85",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-center">
      <p className="text-[9px] text-white/40">{label}</p>
      <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

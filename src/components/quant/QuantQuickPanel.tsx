"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { QUANT_POOLS, poolsForChain, type QuantChain } from "@/config/quant/markets";
import { ChainPicker } from "@/components/quant/ChainPicker";
import { StrategyParamsQuick } from "@/components/quant/StrategyParamsQuick";
import { StrategyQuickCards } from "@/components/quant/StrategyQuickCards";
import { getStrategy, type StrategyId } from "@/config/quant/strategies";
import { formatUsdPrice, formatUsdPriceLabel } from "@/lib/quant/format-price";
import { latestSignal } from "@/lib/quant/backtest";
import { fetchPoolKlines, fetchPoolPrice } from "@/lib/quant/klines";
import {
  fetchCloudPaperApi,
  resetCloudPaperApi,
  startCloudPaperApi,
  stopCloudPaperApi,
  type CloudPaperState,
} from "@/lib/quant-api";
import {
  loadPaperState,
  paperBuy,
  paperEquity,
  paperSell,
  resetPaperState,
  savePaperState,
  type PaperState,
} from "@/lib/quant/paper-store";
import { useFarmSign } from "@/lib/web3/use-farm-sign";

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
  onCloudSync?: (marketId: string, strategyId: StrategyId, params: Record<string, number>) => void;
};

type PaperMode = "local" | "cloud";

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
  onCloudSync,
}: Props) {
  const t = useTranslations("quant");
  const zh = locale === "zh";
  const { address, isConnected } = useAccount();
  const farmSign = useFarmSign();

  const [paperMode, setPaperMode] = useState<PaperMode>("cloud");
  const [state, setState] = useState<PaperState | null>(null);
  const [cloudState, setCloudState] = useState<CloudPaperState | null>(null);
  const [cloudEquity, setCloudEquity] = useState<number>(10_000);
  const [cloudKv, setCloudKv] = useState(true);
  const [price, setPrice] = useState<number | null>(null);
  const [signal, setSignal] = useState<"buy" | "sell" | "hold">("hold");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chainPools = useMemo(() => poolsForChain(chain), [chain]);
  const pool = chainPools.find((p) => p.id === poolId) ?? chainPools[0]!;
  const strat = getStrategy(strategyId);

  useEffect(() => {
    setState(loadPaperState());
  }, []);

  const persist = useCallback((next: PaperState) => {
    setState(next);
    savePaperState(next);
  }, []);

  const refreshCloud = useCallback(async () => {
    if (!address) return;
    const data = await fetchCloudPaperApi(address);
    if (!data) return;
    setCloudKv(data.kv);
    setCloudState(data.state);
    if (data.equity != null) setCloudEquity(data.equity);

    // 云端配置以 KV 为准；刷新页面时覆盖 localStorage 里残留的本机选项（如 FLOKI）
    if (paperMode === "cloud" && data.state?.marketId) {
      onCloudSync?.(data.state.marketId, data.state.strategyId, data.state.params);
    }

    if (data.state?.lastPrice != null) setPrice(data.state.lastPrice);
    if (data.state?.lastSignal) setSignal(data.state.lastSignal);
  }, [address, onCloudSync, paperMode]);

  useEffect(() => {
    void refreshCloud();
    if (!address) return;
    const id = window.setInterval(() => void refreshCloud(), 20_000);
    return () => clearInterval(id);
  }, [address, refreshCloud]);

  const runningRef = useRef(false);
  useEffect(() => {
    runningRef.current = state?.running ?? false;
  }, [state?.running]);

  const previewTick = useCallback(async () => {
    setError(null);
    try {
      const klines = await fetchPoolKlines(pool, "1h", 80);
      const p = await fetchPoolPrice(pool);
      const sig = latestSignal(strategyId, klines, params);
      if (paperMode === "local" || !cloudState?.running) {
        setPrice(p);
        setSignal(sig);
      }
      return { p, sig };
    } catch (e) {
      if (paperMode === "local") {
        setError(e instanceof Error ? e.message : t("fetchError"));
      }
      return null;
    }
  }, [pool, strategyId, params, paperMode, cloudState?.running, t]);

  const localTick = useCallback(async (): Promise<PaperState | null> => {
    const cur = loadPaperState();
    setLoading(true);
    setError(null);
    try {
      const hit = await previewTick();
      if (!hit || !cur.running) return cur;
      let next = cur;
      if (hit.sig === "buy") next = paperBuy(cur, hit.p);
      else if (hit.sig === "sell") next = paperSell(cur, hit.p);
      if (next !== cur) persist(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("fetchError"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [previewTick, persist, t]);

  useEffect(() => {
    void previewTick();
    const ms = paperMode === "local" ? 45_000 : 60_000;
    const id = window.setInterval(() => {
      if (paperMode === "local") void localTick();
      else void previewTick();
    }, ms);
    return () => clearInterval(id);
  }, [paperMode, previewTick, localTick]);

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
            ? `本机模拟 · ${pool.baseSymbol} · ${strat.nameZh}`
            : `Local paper · ${pool.baseSymbol} · ${strat.nameEn}`,
        },
        ...base.logs.slice(0, 48),
      ],
    };
    persist(next);
    runningRef.current = true;
    await localTick();
  }, [state, poolId, strategyId, pool, strat, zh, persist, localTick]);

  const stopSim = useCallback(() => {
    if (!state) return;
    runningRef.current = false;
    persist({ ...state, running: false });
  }, [state, persist]);

  const startCloud = useCallback(async () => {
    if (!address || !isConnected) {
      setError(t("cloudNeedWallet"));
      return;
    }
    if (!cloudKv) {
      setError(t("cloudKvMissing"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await startCloudPaperApi(
        address,
        { marketId: poolId, strategyId, params },
        farmSign,
      );
      if (!res) {
        setError(t("cloudActionFailed"));
        return;
      }
      setCloudState(res.state);
      setCloudEquity(res.equity);
      onCloudSync?.(res.state.marketId, res.state.strategyId, res.state.params);
      if (res.state.lastPrice != null) setPrice(res.state.lastPrice);
      if (res.state.lastSignal) setSignal(res.state.lastSignal);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("cloudActionFailed"));
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, cloudKv, poolId, strategyId, params, farmSign, t, onCloudSync]);

  const stopCloud = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const next = await stopCloudPaperApi(address, farmSign);
      if (next) setCloudState(next);
      else setError(t("cloudActionFailed"));
    } catch {
      setError(t("cloudActionFailed"));
    } finally {
      setLoading(false);
    }
  }, [address, farmSign, t]);

  const resetCloud = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const next = await resetCloudPaperApi(address, farmSign);
      if (next) {
        setCloudState(next);
        setCloudEquity(10_000);
      } else setError(t("cloudActionFailed"));
    } catch {
      setError(t("cloudActionFailed"));
    } finally {
      setLoading(false);
    }
  }, [address, farmSign, t]);

  const cloudRunning = cloudState?.running ?? false;
  const activePoolId =
    paperMode === "cloud" && cloudState?.marketId ? cloudState.marketId : poolId;
  const activePool =
    QUANT_POOLS.find((p) => p.id === activePoolId) ?? pool;
  const cloudPool = activePool;
  const activeStrategyId =
    paperMode === "cloud" && cloudState?.strategyId ? cloudState.strategyId : strategyId;
  const activeParams =
    paperMode === "cloud" && cloudState?.params ? cloudState.params : params;
  const cloudStrat = getStrategy(activeStrategyId);
  const configLocked = paperMode === "cloud" && cloudRunning;
  const displayPrice =
    paperMode === "cloud" && cloudState?.lastPrice != null
      ? cloudState.lastPrice
      : price;
  const displaySignal =
    paperMode === "cloud" && cloudState?.lastSignal
      ? cloudState.lastSignal
      : signal;

  const equity =
    paperMode === "cloud"
      ? cloudEquity
      : state
        ? paperEquity(state, price ?? 1)
        : 10_000;
  const pnl = equity - 10_000;
  const pos =
    paperMode === "cloud"
      ? cloudState?.positions.find((p) => p.marketId === activePoolId)
      : state?.positions.find((p) => p.marketId === poolId);
  const posPool = activePool;

  const signalLabel = t(`signal_${displaySignal}`);
  const signalClass =
    displaySignal === "buy"
      ? "text-emerald-400"
      : displaySignal === "sell"
        ? "text-red-400"
        : "text-white/50";

  const logs =
    paperMode === "cloud" ? (cloudState?.logs ?? []) : (state?.logs ?? []);

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
      <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
        <button
          type="button"
          onClick={() => setPaperMode("cloud")}
          className={`flex-1 rounded-lg py-2 text-[11px] font-semibold transition ${
            paperMode === "cloud"
              ? "bg-cyan-700/80 text-white"
              : "text-white/45 hover:text-white/70"
          }`}
        >
          {t("paperModeCloud")}
          <span className="mt-0.5 block text-[9px] font-normal opacity-70">
            {t("paperModeCloudHint")}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setPaperMode("local")}
          className={`flex-1 rounded-lg py-2 text-[11px] font-semibold transition ${
            paperMode === "local"
              ? "bg-emerald-700/80 text-white"
              : "text-white/45 hover:text-white/70"
          }`}
        >
          {t("paperModeLocal")}
          <span className="mt-0.5 block text-[9px] font-normal opacity-70">
            {t("paperModeLocalHint")}
          </span>
        </button>
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-3 py-2.5 text-xs leading-relaxed text-cyan-100/75">
        {paperMode === "cloud" ? t("cloudIntro") : t("paperPreviewIntro")}
      </div>

      {paperMode === "local" && (
        <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-white/45">
          {t("autoTradeHow")}
        </p>
      )}

      {paperMode === "cloud" && cloudRunning && (
        <div className="rounded-lg border border-cyan-500/35 bg-cyan-950/35 px-3 py-2 text-[11px] leading-relaxed text-cyan-100/85">
          <p>
            {t("cloudRunningAs", {
              pair: `${cloudPool.baseSymbol}/${cloudPool.quoteSymbol}`,
              strategy: zh ? cloudStrat.nameZh : cloudStrat.nameEn,
            })}
          </p>
          <p className="mt-1 text-[10px] text-white/40">{t("cloudUiNote")}</p>
        </div>
      )}

      {paperMode === "cloud" && !isConnected && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-[11px] text-amber-200/85">
          {t("cloudNeedWallet")}
        </p>
      )}

      {paperMode === "cloud" && isConnected && !cloudKv && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/25 px-3 py-2 text-[11px] text-red-200/85">
          {t("cloudKvMissing")}
        </p>
      )}

      <ol className="flex gap-2 text-[10px] text-white/40">
        {steps.map((s) => (
          <li key={s.n} className="flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
            <span className="text-gold">{s.n}.</span> {s.text}
          </li>
        ))}
      </ol>

      <section className="space-y-2">
        <p className="text-xs font-medium text-white/55">{t("quickPickChain")}</p>
        <ChainPicker
          locale={locale}
          chain={chain}
          onChange={configLocked ? () => {} : onChainChange}
        />
      </section>

      <section>
        <p className="mb-2 text-xs font-medium text-white/55">{t("quickPickCoin")}</p>
        <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${configLocked ? "opacity-60" : ""}`}>
          {chainPools.map((p) => {
            const active = activePoolId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={configLocked}
                onClick={() => onPoolChange(p.id)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-gold/60 bg-gold/15 ring-1 ring-gold/40"
                    : "border-white/10 bg-black/25 hover:border-white/25"
                }`}
              >
                <p className="text-sm font-bold text-white/90">{p.baseSymbol}</p>
                <p className="mt-0.5 text-[10px] text-white/40">{p.quoteSymbol}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className={configLocked ? "opacity-60 pointer-events-none" : ""}>
        <p className="mb-2 text-xs font-medium text-white/55">{t("quickPickStrategy")}</p>
        <StrategyQuickCards locale={locale} strategyId={activeStrategyId} onSelect={onStrategyChange} />
      </section>

      <section className={configLocked ? "opacity-60 pointer-events-none" : ""}>
        <p className="mb-2 text-xs font-medium text-white/55">{t("quickPickParams")}</p>
        <StrategyParamsQuick
          locale={locale}
          strategyId={activeStrategyId}
          params={activeParams}
          onChange={onParamsChange}
        />
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat
          label={t("quickPrice")}
          value={displayPrice != null ? formatUsdPriceLabel(displayPrice, locale) : "—"}
        />
        <MiniStat label={t("quickSignal")} value={signalLabel} valueClass={signalClass} />
        <MiniStat label={t("paperEquity")} value={`$${equity.toFixed(0)}`} />
        <MiniStat
          label={t("quickPnl")}
          value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(0)}`}
          valueClass={pnl >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </div>

      {paperMode === "cloud" && cloudState?.lastTickAt && (
        <p className="text-center text-[10px] text-white/35">
          {t("cloudLastTick")}: {new Date(cloudState.lastTickAt).toLocaleString(locale)}
          {cloudState.tickCount > 0 && (
            <> · {t("cloudTickCount")}: {cloudState.tickCount}</>
          )}
        </p>
      )}

      {pos && (
        <p className="text-center text-[11px] text-white/45">
          {t("quickHolding", {
            qty: pos.qty.toFixed(4),
            symbol: posPool.baseSymbol,
            avg: formatUsdPrice(pos.avgPrice, locale),
          })}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {cloudState?.lastError && paperMode === "cloud" && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-[10px] text-amber-200/80">
          {cloudState.lastError}
          <span className="mt-1 block text-[9px] text-white/35">
            {zh
              ? "若为旧报错：停止云端 → 重新开始；部署更新后约 3 分钟再试"
              : "Stale error? Stop cloud → start again after deploy (~3 min)"}
          </span>
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {paperMode === "cloud" ? (
          !cloudRunning ? (
            <button
              type="button"
              disabled={loading || !isConnected}
              onClick={() => void startCloud()}
              className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 py-4 text-base font-bold text-white shadow-lg disabled:opacity-50"
            >
              {loading ? t("running") : t("cloudStart")}
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => void stopCloud()}
              className="flex-1 rounded-xl border border-red-500/50 bg-red-950/40 py-4 text-base font-bold text-red-300"
            >
              {t("cloudStop")}
            </button>
          )
        ) : !state?.running ? (
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
          disabled={loading}
          onClick={() => {
            if (paperMode === "cloud") void resetCloud();
            else {
              const r = resetPaperState();
              persist({ ...r, marketId: poolId, strategyId });
            }
          }}
          className="rounded-xl border border-white/15 px-4 py-4 text-sm text-white/45 sm:py-2"
        >
          {t("paperReset")}
        </button>
      </div>

      {paperMode === "cloud" && cloudRunning && (
        <p className="text-center text-[11px] text-cyan-400/80">{t("cloudRunningHint")}</p>
      )}
      {paperMode === "local" && state?.running && (
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

      {logs.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="mb-2 text-xs font-medium text-white/50">{t("paperLog")}</p>
          <ul className="max-h-32 space-y-1 overflow-y-auto font-mono text-[10px] text-white/55">
            {logs.slice(0, 12).map((l, i) => (
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

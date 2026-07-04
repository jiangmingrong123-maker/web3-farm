"use client";

import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import type { StrategyId } from "@/config/quant/strategies";
import { getStrategy } from "@/config/quant/strategies";
import type { QuantChain } from "@/config/quant/markets";
import { poolsForChain } from "@/config/quant/markets";

type Props = {
  locale: string;
  chain: QuantChain;
  poolId: string;
  strategyId: StrategyId;
  onBackPaper: () => void;
};

export function LiveTradePanel({ locale, chain, poolId, strategyId, onBackPaper }: Props) {
  const t = useTranslations("quant");
  const zh = locale === "zh";
  const { isConnected, address } = useAccount();
  const pool = poolsForChain(chain).find((p) => p.id === poolId) ?? poolsForChain(chain)[0]!;
  const strat = getStrategy(strategyId);

  const steps = [t("liveStep1"), t("liveStep2"), t("liveStep3")];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-950/40 to-black/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-200">
            {t("liveBadge")}
          </span>
          <span className="text-xs text-white/45">{t("liveSubtitle")}</span>
        </div>
        <h2 className="text-lg font-bold text-white/95">{t("liveTitle")}</h2>
        <p className="mt-2 text-xs leading-relaxed text-white/55">{t("liveIntro")}</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/25 p-3">
        <p className="mb-2 text-xs font-medium text-white/55">{t("livePreviewConfig")}</p>
        <ul className="space-y-1 text-[11px] text-white/50">
          <li>
            {t("liveChain")}: {zh ? (chain === "bsc" ? "BNB 链" : "以太坊") : chain.toUpperCase()}
          </li>
          <li>
            {t("livePair")}: {pool.baseSymbol}/{pool.quoteSymbol}
          </li>
          <li>
            {t("liveStrategy")}: {zh ? strat.nameZh : strat.nameEn}
          </li>
        </ul>
      </div>

      <ol className="space-y-2">
        {steps.map((text, i) => (
          <li
            key={text}
            className="flex gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/55"
          >
            <span className="shrink-0 font-bold text-gold">{i + 1}.</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-white/10 bg-black/25 p-3">
        <p className="text-xs font-medium text-white/60">{t("liveWallet")}</p>
        {isConnected && address ? (
          <p className="mt-1 font-mono text-[11px] text-emerald-300/90">
            {address.slice(0, 6)}…{address.slice(-4)}
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-white/45">{t("liveWalletHint")}</p>
        )}
      </div>

      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl border border-gold/30 bg-gold/10 py-4 text-sm font-bold text-gold/70"
      >
        {t("liveCtaSoon")}
      </button>

      <p className="text-center text-[10px] leading-relaxed text-white/35">{t("liveDisclaimer")}</p>

      <button
        type="button"
        onClick={onBackPaper}
        className="w-full text-center text-[11px] text-cyan-400/80 underline-offset-2 hover:underline"
      >
        {t("liveBackPaper")}
      </button>
    </div>
  );
}

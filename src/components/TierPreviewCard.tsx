"use client";

import { useTranslations } from "next-intl";
import type { RarityEvaluationResult } from "@/lib/rarity/types";
import { computeDailyPoints, formatPoints } from "@/lib/points";

interface TierPreviewCardProps {
  locale: string;
  tokenId: string;
  result: RarityEvaluationResult;
}

export function TierPreviewCard({ locale, tokenId, result }: TierPreviewCardProps) {
  const t = useTranslations("tier");
  const daily = computeDailyPoints(result.multiplier);

  return (
    <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-white/45">#{tokenId}</span>
        <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold">
          {result.tier}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-white/40">{t("multiplier")}</dt>
          <dd className="font-mono text-lg text-gold">{result.multiplier}×</dd>
        </div>
        <div>
          <dt className="text-white/40">{t("dailyPoints")}</dt>
          <dd className="font-mono text-lg">
            {formatPoints(daily, locale)}
            {daily != null && (
              <span className="ml-1 text-xs text-white/35">{t("perDay")}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-white/40">{t("traitCount")}</dt>
          <dd>
            {result.details.standardTraitCount}/8
          </dd>
        </div>
        <div>
          <dt className="text-white/40">{t("avgRarity")}</dt>
          <dd>
            {result.avgPercent != null
              ? `${result.avgPercent.toFixed(1)}%`
              : "—"}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-white/40">
        {t(result.tier)}
      </p>
    </div>
  );
}

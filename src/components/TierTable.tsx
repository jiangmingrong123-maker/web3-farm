"use client";

import { useTranslations } from "next-intl";
import { TIER_MULTIPLIERS, TIER_ORDER } from "@/config/tiers";
import { computeDailyPoints, formatPoints } from "@/lib/points";

interface TierTableProps {
  locale: string;
  highlightTier?: string;
}

export function TierTable({ locale, highlightTier }: TierTableProps) {
  const t = useTranslations("tier");

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface/80">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/45">
            <th className="px-4 py-3 font-medium">{t("multiplier")}</th>
            <th className="px-4 py-3 font-medium">Tier</th>
            <th className="px-4 py-3 font-medium">{t("dailyPoints")}</th>
          </tr>
        </thead>
        <tbody>
          {TIER_ORDER.map((tier) => {
            const mult = TIER_MULTIPLIERS[tier];
            const daily = computeDailyPoints(mult);
            const active = highlightTier === tier;

            return (
              <tr
                key={tier}
                className={`border-b border-white/5 ${active ? "bg-gold/10" : ""}`}
              >
                <td className="px-4 py-3 font-mono text-gold">{mult}×</td>
                <td className="px-4 py-3">{t(tier)}</td>
                <td className="px-4 py-3 font-mono text-white/80">
                  {formatPoints(daily, locale)}
                  {daily != null && (
                    <span className="ml-1 text-xs text-white/35">{t("perDay")}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";

const FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5"] as const;

export function QuantToolFeatures() {
  const t = useTranslations("quant");

  return (
    <section className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 px-4 py-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
        {t("featuresTitle")}
      </h2>
      <ul className="space-y-1.5 text-[11px] leading-relaxed text-white/55">
        {FEATURE_KEYS.map((key) => (
          <li key={key} className="flex gap-2">
            <span className="shrink-0 text-emerald-400">✓</span>
            <span>{t(`feature_${key}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

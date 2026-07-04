"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function QuantEntryCard() {
  const t = useTranslations("home");

  return (
    <Link
      href="/quant"
      className="group relative block overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-surface to-ink p-6 transition hover:border-cyan-400/50 hover:shadow-[0_0_32px_rgba(34,211,238,0.12)] sm:p-8"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/15 blur-2xl transition group-hover:bg-cyan-500/25" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs tracking-[0.2em] text-cyan-400">{t("quantBadge")}</p>
          <h2 className="text-xl font-bold sm:text-2xl">{t("quantTitle")}</h2>
          <p className="mt-2 text-sm text-white/55">{t("quantDesc")}</p>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-500/15 px-6 py-3 text-sm font-bold text-cyan-200 transition group-hover:brightness-110">
          {t("quantCta")} →
        </span>
      </div>
    </Link>
  );
}

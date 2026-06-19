"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function TdEntryCard() {
  const t = useTranslations("home");

  return (
    <Link
      href="/td"
      className="group relative block overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/15 via-surface to-ink p-6 transition hover:border-violet-400/50 hover:shadow-[0_0_32px_rgba(139,92,246,0.15)] sm:p-8"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/20 blur-2xl transition group-hover:bg-violet-500/30" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs tracking-[0.2em] text-violet-300/90">{t("tdEntryBadge")}</p>
          <h2 className="text-xl font-bold sm:text-2xl">{t("tdEntryTitle")}</h2>
          <p className="mt-2 text-sm text-white/55">{t("tdEntryDesc")}</p>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-violet-500 px-6 py-3 text-sm font-bold text-white transition group-hover:brightness-110">
          {t("tdEntryCta")} →
        </span>
      </div>
    </Link>
  );
}

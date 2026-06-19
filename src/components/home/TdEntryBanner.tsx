"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Compact TD entry for hall page — visible without opening nav menu. */
export function TdEntryBanner() {
  const t = useTranslations("home");

  return (
    <Link
      href="/td"
      className="group flex items-center justify-between gap-3 rounded-xl border-2 border-violet-400/50 bg-gradient-to-r from-violet-500/25 to-violet-600/15 px-4 py-4 transition hover:border-violet-400/70 hover:from-violet-500/35"
    >
      <div className="min-w-0 text-left">
        <p className="text-[10px] tracking-[0.15em] text-violet-200/90">{t("tdEntryBadge")}</p>
        <p className="truncate text-base font-bold text-white sm:text-lg">{t("tdEntryTitle")}</p>
        <p className="mt-0.5 truncate text-[11px] text-white/50">{t("tdEntryDesc")}</p>
      </div>
      <span className="shrink-0 rounded-full bg-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition group-hover:brightness-110">
        {t("tdEntryCta")} →
      </span>
    </Link>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SwapEntryCard() {
  const t = useTranslations("swap");

  return (
    <Link
      href="/swap"
      className="group block rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-surface to-ink p-6 transition hover:border-emerald-500/45 sm:p-7"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs tracking-[0.2em] text-emerald-400/80">{t("badge")}</p>
          <h2 className="text-lg font-bold">{t("title")}</h2>
          <p className="mt-1 text-sm text-white/50">{t("subtitle")}</p>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-500/40 px-5 py-2.5 text-sm font-semibold text-emerald-300 transition group-hover:bg-emerald-500/10">
          {t("createRoom")} →
        </span>
      </div>
    </Link>
  );
}

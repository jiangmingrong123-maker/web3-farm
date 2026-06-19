"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function FarmEntryCard() {
  const t = useTranslations("home");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-br from-gold/15 via-surface to-ink p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/20 blur-2xl" />
      <div className="relative flex flex-col gap-4">
        <div>
          <p className="mb-1 text-xs tracking-[0.2em] text-gold">{t("entryBadge")}</p>
          <h2 className="text-xl font-bold sm:text-2xl">{t("entryTitle")}</h2>
          <p className="mt-2 text-sm text-white/55">{t("entryDesc")}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/td"
            className="inline-flex w-full flex-col items-center justify-center rounded-full bg-violet-500 px-6 py-3.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            <span>{t("tdEntryCta")} →</span>
            <span className="mt-0.5 text-[10px] font-normal text-white/80">{t("tdEntryTitle")}</span>
          </Link>
          <Link
            href="/farm"
            className="inline-flex w-full items-center justify-center rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-ink transition hover:brightness-110"
          >
            {t("entryCta")} →
          </Link>
        </div>
      </div>
    </div>
  );
}

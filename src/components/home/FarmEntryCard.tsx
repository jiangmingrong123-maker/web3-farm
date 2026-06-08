"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function FarmEntryCard() {
  const t = useTranslations("home");

  return (
    <Link
      href="/farm"
      className="group relative block overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-br from-gold/15 via-surface to-ink p-6 transition hover:border-gold/55 hover:shadow-[0_0_32px_rgba(212,175,55,0.15)] sm:p-8"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/20 blur-2xl transition group-hover:bg-gold/30" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs tracking-[0.2em] text-gold">{t("entryBadge")}</p>
          <h2 className="text-xl font-bold sm:text-2xl">{t("entryTitle")}</h2>
          <p className="mt-2 text-sm text-white/55">{t("entryDesc")}</p>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-bold text-ink transition group-hover:brightness-110">
          {t("entryCta")} →
        </span>
      </div>
    </Link>
  );
}

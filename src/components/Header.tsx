"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { WalletButton } from "./WalletButton";

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const locale = useLocale();
  const otherLocale = locale === "zh" ? "en" : "zh";

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-display text-lg font-bold tracking-wide text-gold">
          Web3 Farm
        </Link>

        <nav className="hidden gap-6 text-sm text-white/60 sm:flex">
          <Link
            href="/"
            className={pathname === "/" ? "text-white" : "hover:text-white/90"}
          >
            {t("farm")}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={pathname}
            locale={otherLocale}
            className="rounded-full border border-white/12 px-3 py-1.5 text-xs uppercase tracking-wider text-white/70 hover:border-white/25"
          >
            {otherLocale}
          </Link>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

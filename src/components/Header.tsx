"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { WalletButton } from "./WalletButton";

const NAV_LINKS = [
  { href: "/", key: "home" as const },
  { href: "/farm", key: "farm" as const },
  { href: "/td", key: "td" as const },
  { href: "/quant", key: "quant" as const },
  { href: "/swap", key: "swap" as const },
];

function navClass(active: boolean) {
  return active ? "text-white" : "text-white/70 hover:text-white/90";
}

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const locale = useLocale();
  const otherLocale = locale === "zh" ? "en" : "zh";
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-display text-lg font-bold tracking-wide text-gold">
          Web3 Farm
        </Link>

        <nav className="hidden gap-6 text-sm text-white/60 sm:flex">
          {NAV_LINKS.map(({ href, key }) => (
            <Link key={href} href={href} className={navClass(isActive(href))}>
              {t(key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={t("menu")}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 text-white/80 sm:hidden"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
          <Link
            href={pathname}
            locale={otherLocale}
            className="hidden rounded-full border border-white/12 px-3 py-1.5 text-xs uppercase tracking-wider text-white/70 hover:border-white/25 sm:inline-block"
          >
            {otherLocale}
          </Link>
          <WalletButton />
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-white/8 bg-ink/95 px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${navClass(isActive(href))} ${
                  isActive(href) ? "bg-white/8" : "hover:bg-white/5"
                }`}
              >
                {t(key)}
              </Link>
            ))}
            <Link
              href={pathname}
              locale={otherLocale}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-white/60 hover:bg-white/5"
            >
              {locale === "zh" ? "English" : "中文"}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

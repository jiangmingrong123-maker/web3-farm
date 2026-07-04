"use client";

import { useTranslations } from "next-intl";

export function QuantDisclaimer() {
  const t = useTranslations("quant");

  return (
    <aside className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-3 text-[11px] leading-relaxed text-amber-100/75">
      <p className="font-semibold text-amber-200/90">{t("disclaimerTitle")}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4">
        <li>{t("disclaimer1")}</li>
        <li>{t("disclaimer2")}</li>
        <li>{t("disclaimer3")}</li>
        <li>{t("disclaimer4")}</li>
        <li>{t("disclaimer5")}</li>
      </ul>
    </aside>
  );
}

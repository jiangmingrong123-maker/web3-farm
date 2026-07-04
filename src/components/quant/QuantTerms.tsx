"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const TERM_KEYS = ["term1", "term2", "term3", "term4", "term5", "term6"] as const;

export function QuantTerms() {
  const t = useTranslations("quant");
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 text-xs text-white/45">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left font-medium text-white/60"
      >
        {t("termsTitle")}
        <span className="text-white/35">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ol className="list-decimal space-y-1.5 border-t border-white/10 px-3 py-3 pl-6 leading-relaxed">
          {TERM_KEYS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ol>
      )}
    </section>
  );
}

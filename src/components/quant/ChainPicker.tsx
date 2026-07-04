"use client";

import type { QuantChain } from "@/config/quant/markets";
import { QUANT_CHAINS } from "@/config/quant/markets";

type Props = {
  locale: string;
  chain: QuantChain;
  onChange: (chain: QuantChain) => void;
};

export function ChainPicker({ locale, chain, onChange }: Props) {
  const zh = locale === "zh";

  return (
    <div className="flex gap-2">
      {QUANT_CHAINS.map((c) => {
        const active = chain === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              active
                ? "border-gold/50 bg-gold/15 text-gold"
                : "border-white/10 bg-black/25 text-white/45 hover:border-white/25"
            }`}
          >
            {zh ? c.labelZh : c.labelEn}
          </button>
        );
      })}
    </div>
  );
}

export function poolOptionLabel(
  p: { label: string; chain: QuantChain; dex: string },
  locale: string,
): string {
  const chainDef = QUANT_CHAINS.find((c) => c.id === p.chain);
  const chainLabel = locale === "zh" ? chainDef?.labelZh : chainDef?.labelEn;
  return `${p.label} · ${chainLabel ?? p.chain}`;
}

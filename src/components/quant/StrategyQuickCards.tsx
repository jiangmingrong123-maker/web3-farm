"use client";

import { QUANT_STRATEGIES, type StrategyId } from "@/config/quant/strategies";

type Props = {
  locale: string;
  strategyId: StrategyId;
  onSelect: (id: StrategyId) => void;
};

export function StrategyQuickCards({ locale, strategyId, onSelect }: Props) {
  const zh = locale === "zh";

  return (
    <div className="space-y-2">
      {QUANT_STRATEGIES.map((s) => {
        const active = strategyId === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`block w-full rounded-xl border p-3 text-left transition ${
              active
                ? "border-emerald-500/50 bg-emerald-950/35 ring-1 ring-emerald-500/30"
                : "border-white/10 bg-black/25 hover:border-white/20"
            }`}
          >
            <p className="text-sm font-semibold text-white/90">{zh ? s.nameZh : s.nameEn}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
              {zh ? s.introZh : s.introEn}
            </p>
            <p className="mt-2 text-[10px] text-cyan-400/75">{zh ? s.suitableZh : s.suitableEn}</p>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { QUANT_STRATEGIES, getStrategy, type StrategyId } from "@/config/quant/strategies";

type Props = {
  locale: string;
  strategyId: StrategyId;
  onSelect: (id: StrategyId) => void;
};

export function StrategyQuickCards({ locale, strategyId, onSelect }: Props) {
  const zh = locale === "zh";
  const [introOpen, setIntroOpen] = useState(false);
  const selected = getStrategy(strategyId);

  useEffect(() => {
    setIntroOpen(false);
  }, [strategyId]);

  const handlePick = (id: StrategyId) => {
    if (id === strategyId) {
      setIntroOpen((v) => !v);
      return;
    }
    onSelect(id);
  };

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        {QUANT_STRATEGIES.map((s) => {
          const active = strategyId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => handlePick(s.id)}
              className={`rounded-lg border px-1.5 py-2 text-center transition ${
                active
                  ? "border-emerald-500/50 bg-emerald-950/35 ring-1 ring-emerald-500/30"
                  : "border-white/10 bg-black/25 hover:border-white/20"
              }`}
            >
              <p className="text-[11px] font-semibold leading-tight text-white/90">
                {zh ? s.nameZh : s.nameEn}
              </p>
            </button>
          );
        })}
      </div>

      {introOpen && (
        <div className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
          <p className="text-[10px] leading-relaxed text-white/55">
            {zh ? selected.introZh : selected.introEn}
          </p>
          <p className="mt-1 text-[9px] text-cyan-400/75">
            {zh ? selected.suitableZh : selected.suitableEn}
          </p>
        </div>
      )}

    </div>
  );
}

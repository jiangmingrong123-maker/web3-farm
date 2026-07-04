"use client";

import { useTranslations } from "next-intl";
import { QUANT_STRATEGIES, type StrategyId } from "@/config/quant/strategies";
import { QuantCard } from "@/components/quant/QuantDock";

type Props = {
  locale: string;
  selected: StrategyId;
  onSelect: (id: StrategyId) => void;
};

export function StrategyPanel({ locale, selected, onSelect }: Props) {
  const t = useTranslations("quant");
  const zh = locale === "zh";

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/45">{t("strategiesHint")}</p>
      <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/40">
        {t("strategiesNoAdvice")}
      </p>
      {QUANT_STRATEGIES.map((s) => {
        const active = selected === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`block w-full rounded-xl border p-4 text-left transition ${
              active
                ? "border-gold/50 bg-gold/10"
                : "border-white/10 bg-black/25 hover:border-white/25"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-white/90">{zh ? s.nameZh : s.nameEn}</p>
              {active && (
                <span className="shrink-0 rounded border border-gold/40 px-1.5 py-0.5 text-[10px] text-gold">
                  {t("selected")}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-white/45">
              {zh ? s.descZh : s.descEn}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.params.map((p) => (
                <span
                  key={p.key}
                  className="rounded border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-white/50"
                >
                  {zh ? p.labelZh : p.labelEn}: {p.default}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function StrategyParams({
  locale,
  strategyId,
  params,
  onChange,
}: {
  locale: string;
  strategyId: StrategyId;
  params: Record<string, number>;
  onChange: (key: string, v: number) => void;
}) {
  const t = useTranslations("quant");
  const zh = locale === "zh";
  const def = QUANT_STRATEGIES.find((s) => s.id === strategyId);
  if (!def) return null;

  return (
    <QuantCard title={t("paramsTitle")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {def.params.map((p) => (
          <label key={p.key} className="block text-xs text-white/50">
            {zh ? p.labelZh : p.labelEn}
            <input
              type="number"
              min={p.min}
              max={p.max}
              value={params[p.key] ?? p.default}
              onChange={(e) => onChange(p.key, Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </label>
        ))}
      </div>
    </QuantCard>
  );
}

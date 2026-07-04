"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  formatParamsSummary,
  getStrategy,
  matchPreset,
  type StrategyId,
} from "@/config/quant/strategies";

type Props = {
  locale: string;
  strategyId: StrategyId;
  params: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
};

export function StrategyParamsQuick({ locale, strategyId, params, onChange }: Props) {
  const t = useTranslations("quant");
  const zh = locale === "zh";
  const strat = getStrategy(strategyId);
  const [tuneOpen, setTuneOpen] = useState(false);
  const activePreset = matchPreset(strategyId, params);

  useEffect(() => {
    setTuneOpen(false);
  }, [strategyId]);

  const applyPreset = (presetId: string) => {
    const preset = strat.presets.find((p) => p.id === presetId);
    if (preset) onChange({ ...preset.values });
  };

  const onParam = (key: string, raw: string) => {
    const def = strat.params.find((p) => p.key === key);
    if (!def) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(def.max, Math.max(def.min, n));
    onChange({ ...params, [key]: clamped });
  };

  const activeHint =
    activePreset != null
      ? (zh
          ? strat.presets.find((p) => p.id === activePreset)?.hintZh
          : strat.presets.find((p) => p.id === activePreset)?.hintEn)
      : null;

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        {strat.presets.map((preset) => {
          const active = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`rounded-lg border px-1.5 py-2 text-center transition ${
                active
                  ? "border-cyan-500/50 bg-cyan-950/35 ring-1 ring-cyan-500/30"
                  : "border-white/10 bg-black/25 hover:border-white/20"
              }`}
            >
              <p className="text-[11px] font-semibold text-white/90">
                {zh ? preset.nameZh : preset.nameEn}
              </p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setTuneOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-left"
      >
        <span className="text-[10px] text-white/45">
          {formatParamsSummary(strategyId, params, zh)}
        </span>
        <span className="shrink-0 text-[9px] text-cyan-400/70">
          {tuneOpen ? t("paramsTuneHide") : t("paramsTune")}
        </span>
      </button>

      {activeHint && !tuneOpen && (
        <p className="text-center text-[9px] text-white/30">{activeHint}</p>
      )}

      {tuneOpen && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
          {strat.params.map((p) => (
            <label key={p.key} className="block text-[10px] text-white/45">
              {zh ? p.labelZh : p.labelEn}
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  value={params[p.key] ?? p.default}
                  onChange={(e) => onParam(p.key, e.target.value)}
                  className="h-1 flex-1 accent-cyan-500"
                />
                <input
                  type="number"
                  min={p.min}
                  max={p.max}
                  value={params[p.key] ?? p.default}
                  onChange={(e) => onParam(p.key, e.target.value)}
                  className="w-14 rounded border border-white/15 bg-black/40 px-1.5 py-0.5 text-right text-[11px] text-white"
                />
              </div>
            </label>
          ))}
          {!activePreset && (
            <p className="text-[9px] text-amber-400/70">{t("paramsCustom")}</p>
          )}
        </div>
      )}
    </div>
  );
}

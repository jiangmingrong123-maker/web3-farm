"use client";

import { useTranslations } from "next-intl";
import { STAMINA_PER_RUN } from "@/config/td/economy";

type Props = {
  startDisabled: boolean;
  fastClearDisabled: boolean;
  fastClearCost: number;
  onStart: () => void;
  onFastClear: () => void;
  powerWall?: {
    map: number;
    scene: number;
    rounds: number;
  } | null;
};

export function TdHubActionPanel({
  startDisabled,
  fastClearDisabled,
  fastClearCost,
  onStart,
  onFastClear,
  powerWall,
}: Props) {
  const t = useTranslations("td");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={startDisabled}
          onClick={onStart}
          className="rounded-lg bg-gold px-4 py-3.5 text-sm font-semibold text-ink disabled:opacity-40"
        >
          {t("startRun", { cost: STAMINA_PER_RUN })}
        </button>
        <button
          type="button"
          disabled={fastClearDisabled}
          onClick={onFastClear}
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3.5 text-sm text-emerald-200 disabled:opacity-40"
        >
          {fastClearCost > 0
            ? t("fastClear", { cost: fastClearCost })
            : t("fastClearUnavailable")}
        </button>
      </div>

      <div className="space-y-2 rounded-lg border border-white/8 bg-black/20 px-3 py-2.5">
        {powerWall && (
          <p className="text-xs leading-relaxed text-amber-200/95">
            {t("powerWallHint", {
              map: powerWall.map,
              scene: powerWall.scene,
              rounds: powerWall.rounds,
            })}
          </p>
        )}
        <p className="text-[10px] leading-relaxed text-white/45">{t("rulesHint")}</p>
      </div>
    </div>
  );
}

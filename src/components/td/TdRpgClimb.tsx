"use client";

import { useTranslations } from "next-intl";
import type { ClimbRunState } from "@/lib/td/rpg-combat";

type Props = {
  climb: ClimbRunState;
  settling?: boolean;
  autoRunning?: boolean;
  onFinish: () => void;
};

export function TdRpgClimb({ climb, settling, autoRunning, onFinish }: Props) {
  const t = useTranslations("td");
  const progress = climb.done
    ? climb.floor
    : climb.activeFloor ?? climb.floor;
  const pct = Math.round((progress / climb.maxFloor) * 100);

  const summaryLine = climb.log.find((l) => l.startsWith("✓") || l.startsWith("✗"));
  const detailStart = climb.log.findIndex((l) => l.startsWith("▶"));
  const detailLog = detailStart >= 0 ? climb.log.slice(detailStart) : [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
        {autoRunning && !climb.done && (
          <p className="mb-2 text-sm text-gold animate-pulse">
            {t("climbRunning", { floor: climb.activeFloor ?? climb.floor + 1 })}
          </p>
        )}
        {climb.done && summaryLine && (
          <p className="mb-2 text-base font-semibold text-gold">{summaryLine}</p>
        )}
        <div className="mb-1 flex justify-between text-xs text-white/50">
          <span>{t("towerFloor")}</span>
          <span>
            {progress}/{climb.maxFloor}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {!climb.done && (
          <div className="mt-3 max-h-32 overflow-y-auto font-mono text-xs text-white/55">
            {climb.log.slice(-8).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}
      </div>

      {climb.done && detailLog.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-black/40 p-4">
          <h2 className="mb-2 text-sm font-semibold text-white/80">
            {t("combatLogTitle")}
          </h2>
          <div className="max-h-[45vh] overflow-y-auto font-mono text-xs leading-relaxed text-white/75">
            {detailLog.map((line, i) => (
              <p key={i} className="whitespace-pre-wrap border-b border-white/5 py-1">
                {line}
              </p>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {settling && <p className="text-sm text-gold">{t("settling")}</p>}
        {climb.done && !settling && (
          <button
            type="button"
            onClick={onFinish}
            className="rounded-lg border border-white/20 px-6 py-2.5 text-sm"
          >
            {t("backToHub")}
          </button>
        )}
      </div>
    </div>
  );
}

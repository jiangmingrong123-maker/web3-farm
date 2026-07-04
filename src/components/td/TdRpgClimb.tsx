"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { hubWorldSummary } from "@/config/td/zones";
import type { ClimbRunState } from "@/lib/td/rpg-combat";

type Props = {
  climb: ClimbRunState;
  settling?: boolean;
  autoRunning?: boolean;
  locale: string;
  onFinish: () => void;
};

export function TdRpgClimb({ climb, settling, autoRunning, locale, onFinish }: Props) {
  const t = useTranslations("td");
  const w = hubWorldSummary(climb.mapId, climb.scene, locale);
  const logEndRef = useRef<HTMLDivElement>(null);

  const summaryLine = climb.log.find((l) => l.startsWith("✓") || l.startsWith("✗"));

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [climb.log.length]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-white/85">
            {w.name} · {w.sceneProgress}
            {w.bossNext && (
              <span className="ml-1 text-amber-400">{t("bossSceneTag")}</span>
            )}
          </p>
          {autoRunning && (
            <span className="text-xs text-gold animate-pulse">{t("combatPlaying")}</span>
          )}
          {climb.done && summaryLine && !autoRunning && (
            <span className="text-xs font-semibold text-gold">{summaryLine}</span>
          )}
        </div>

        <div className="mt-2 max-h-[55vh] min-h-[200px] overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-white/80">
          {climb.log.length === 0 && autoRunning && (
            <p className="text-white/45">{t("combatLogLoading")}</p>
          )}
          {climb.log.map((line, i) => (
            <p
              key={i}
              className={`whitespace-pre-wrap border-b border-white/5 py-1 ${
                line.startsWith("✓")
                  ? "text-gold"
                  : line.startsWith("✗")
                    ? "text-red-300"
                    : line.startsWith("—")
                      ? "text-white/55"
                      : ""
              }`}
            >
              {line}
            </p>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {settling && <p className="text-sm text-gold">{t("settling")}</p>}
        {climb.done && !settling && !autoRunning && (
          <button
            type="button"
            onClick={onFinish}
            className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-ink"
          >
            {t("backToHub")}
          </button>
        )}
      </div>
    </div>
  );
}

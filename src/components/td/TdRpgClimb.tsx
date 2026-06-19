"use client";

import { useTranslations } from "next-intl";
import type { ClimbRunState } from "@/lib/td/rpg-combat";

type Props = {
  climb: ClimbRunState;
  settling?: boolean;
  onNextFloor: () => void;
  onFinish: () => void;
};

export function TdRpgClimb({ climb, settling, onNextFloor, onFinish }: Props) {
  const t = useTranslations("td");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <span>{t("towerFloor")}: {climb.floor}/{climb.maxFloor}</span>
      </div>

      <section className="rounded-xl border border-white/10 bg-black/40 p-4">
        <h2 className="mb-2 text-sm font-semibold text-white/80">{t("combatLogTitle")}</h2>
        <div className="max-h-[55vh] overflow-y-auto font-mono text-xs leading-relaxed text-white/75">
          {climb.log.length === 0 ? (
            <p className="text-white/35">{t("climbLogEmpty")}</p>
          ) : (
            climb.log.map((line, i) => (
              <p key={i} className="whitespace-pre-wrap border-b border-white/5 py-1">
                {line}
              </p>
            ))
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        {settling && (
          <p className="text-sm text-gold">{t("settling")}</p>
        )}
        {!climb.done && !settling && (
          <button
            type="button"
            onClick={onNextFloor}
            className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-ink"
          >
            {climb.floor === 0 ? t("climbStart") : t("climbNext", { floor: climb.floor + 1 })}
          </button>
        )}
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

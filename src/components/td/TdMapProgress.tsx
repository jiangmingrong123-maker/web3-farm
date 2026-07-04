"use client";

import { useTranslations } from "next-intl";
import { hubWorldSummary, RUN_MAX_ZONE } from "@/config/td/zones";
import type { HeroSave } from "@/config/td/rpg";
import { SCENES_PER_MAP } from "@/config/td/zones";

type Props = {
  save: HeroSave;
  locale: string;
};

export function TdMapProgress({ save, locale }: Props) {
  const t = useTranslations("td");
  const w = hubWorldSummary(save.worldMap, save.worldScene, locale);

  return (
    <section className="rounded-xl border border-white/10 bg-surface px-3 py-2.5">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {t("mapProgressTitle")}
        </h3>
        <span className="text-[10px] text-white/50">
          {t("mapIndex", { cur: save.worldMap, max: RUN_MAX_ZONE })}
        </span>
      </div>
      <p className="mb-2 text-sm font-medium text-gold">{w.name}</p>

      <div className="mb-1 flex justify-between text-[10px] text-white/50">
        <span>{t("sceneProgress")}</span>
        <span>
          {w.sceneProgress}
          {w.bossNext && (
            <span className="ml-1 text-amber-400">{t("bossSceneTag")}</span>
          )}
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: SCENES_PER_MAP }, (_, i) => {
          const n = i + 1;
          const done = n < save.worldScene;
          const current = n === save.worldScene;
          const isBoss = n === SCENES_PER_MAP;
          return (
            <div
              key={n}
              className={`flex h-8 flex-1 items-center justify-center rounded border text-[10px] font-medium ${
                done
                  ? "border-gold/40 bg-gold/15 text-gold"
                  : current
                    ? isBoss
                      ? "border-amber-500/60 bg-amber-500/20 text-amber-200 animate-pulse"
                      : "border-gold/50 bg-gold/10 text-gold"
                    : "border-white/10 bg-black/25 text-white/35"
              }`}
            >
              {isBoss ? "BOSS" : n}
            </div>
          );
        })}
      </div>
    </section>
  );
}

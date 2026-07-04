"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  MAP_SWEEP_RUNS_BATCH,
  MAP_SWEEP_UNLOCK_POINTS,
  STAMINA_PER_SWEEP_RUN,
} from "@/config/td/economy";
import type { HeroSave } from "@/config/td/rpg";
import {
  chapterName,
  getZone,
  MAP_CHAPTERS,
  mapChapterForMap,
  mapStageLabel,
  mapsInChapter,
  zoneName,
} from "@/config/td/zones";
import {
  bestSweepMapId,
  listClearedMapIds,
  type MapSweepMode,
} from "@/lib/td/map-sweep";

type Props = {
  save: HeroSave;
  locale: string;
  mapSweepUnlocked: boolean;
  stamina: number;
  farmPoints: number;
  activeRun: boolean;
  loading?: boolean;
  embedded?: boolean;
  onUnlock: () => void;
  onSweep: (mapId: number, mode: MapSweepMode, runs: number) => void;
};

export function TdMapSweep({
  save,
  locale,
  mapSweepUnlocked,
  stamina,
  farmPoints,
  activeRun,
  loading,
  embedded,
  onUnlock,
  onSweep,
}: Props) {
  const t = useTranslations("td");
  const cleared = listClearedMapIds(save);
  const defaultMap = bestSweepMapId(save) ?? cleared[cleared.length - 1] ?? 1;
  const defaultChapter =
    mapChapterForMap(defaultMap)?.id ?? MAP_CHAPTERS[0]!.id;

  const [chapterId, setChapterId] = useState(defaultChapter);
  const [pick, setPick] = useState(defaultMap);
  const [mode, setMode] = useState<MapSweepMode>("boss");

  useEffect(() => {
    const latest = bestSweepMapId(save);
    if (latest == null) return;
    setPick(latest);
    const ch = mapChapterForMap(latest);
    if (ch) setChapterId(ch.id);
  }, [save.worldMap]);

  const chaptersWithCleared = useMemo(
    () =>
      MAP_CHAPTERS.map((ch) => ({
        chapter: ch,
        clearedIds: mapsInChapter(ch).filter((id) => cleared.includes(id)),
      })).filter((row) => row.clearedIds.length > 0),
    [cleared],
  );

  const activeChapter =
    chaptersWithCleared.find((r) => r.chapter.id === chapterId)?.chapter ??
    chaptersWithCleared[0]?.chapter;

  const stageIds = activeChapter
    ? mapsInChapter(activeChapter).filter((id) => cleared.includes(id))
    : [];

  const effectivePick = cleared.includes(pick)
    ? pick
    : defaultMap;
  const sweepTarget = effectivePick;

  const cost1 = STAMINA_PER_SWEEP_RUN;
  const cost10 = STAMINA_PER_SWEEP_RUN * MAP_SWEEP_RUNS_BATCH;
  const shell = embedded
    ? "space-y-3"
    : "rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3";

  if (!mapSweepUnlocked) {
    return (
      <section className={shell}>
        {!embedded && (
          <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-300/80">
            {t("mapSweepTitle")}
          </h3>
        )}
        <p className="text-[11px] text-white/45">{t("mapSweepUnlockHint")}</p>
        <button
          type="button"
          disabled={loading || farmPoints < MAP_SWEEP_UNLOCK_POINTS}
          onClick={onUnlock}
          className="mt-3 rounded-lg border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-sm text-violet-100 disabled:opacity-40"
        >
          {t("mapSweepUnlock", { cost: MAP_SWEEP_UNLOCK_POINTS })}
        </button>
      </section>
    );
  }

  if (cleared.length === 0) {
    return (
      <section className={shell}>
        {!embedded && (
          <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-300/80">
            {t("mapSweepTitle")}
          </h3>
        )}
        <p className="text-[11px] text-white/45">{t("mapSweepNoMaps")}</p>
      </section>
    );
  }

  const targetZone = getZone(sweepTarget);
  const targetLabel = targetZone ? zoneName(targetZone, locale) : `#${sweepTarget}`;

  return (
    <section className={shell}>
      {!embedded && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-300/80">
            {t("mapSweepTitle")}
          </h3>
          <p className="text-[11px] text-white/45">{t("mapSweepHint")}</p>
        </>
      )}

      <p className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-[11px] text-violet-100/90">
        {t("mapSweepAutoTarget", { map: sweepTarget, name: targetLabel })}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("boss")}
          className={`rounded-lg border px-3 py-1.5 text-xs ${
            mode === "boss"
              ? "border-violet-400/60 bg-violet-500/20 text-violet-100"
              : "border-white/15 text-white/60"
          }`}
        >
          {t("mapSweepModeBoss")}
        </button>
        <button
          type="button"
          onClick={() => setMode("full")}
          className={`rounded-lg border px-3 py-1.5 text-xs ${
            mode === "full"
              ? "border-violet-400/60 bg-violet-500/20 text-violet-100"
              : "border-white/15 text-white/60"
          }`}
        >
          {t("mapSweepModeFull")}
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-white/35">
        {mode === "boss" ? t("mapSweepModeBossHint") : t("mapSweepModeFullHint")}
      </p>

      {chaptersWithCleared.length > 1 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/35">
            {t("mapSweepChapterPick")}
          </p>
          <div className="flex flex-wrap gap-2">
            {chaptersWithCleared.map(({ chapter: ch }) => {
              const active = ch.id === activeChapter?.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    setChapterId(ch.id);
                    const ids = mapsInChapter(ch).filter((id) => cleared.includes(id));
                    if (ids.length > 0) setPick(ids[ids.length - 1]!);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    active
                      ? "border-violet-400/60 bg-violet-500/20 text-violet-100"
                      : "border-white/15 text-white/60 hover:border-white/30"
                  }`}
                >
                  {chapterName(ch, locale)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeChapter && stageIds.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/35">
            {t("mapSweepStagePick", { chapter: chapterName(activeChapter, locale) })}
          </p>
          <div className="flex flex-wrap gap-2">
            {stageIds.map((id) => {
              const zone = getZone(id);
              const label = zone ? mapStageLabel(zone, locale) : `#${id}`;
              const active = id === effectivePick;
              const isLatest = id === sweepTarget;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPick(id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    active
                      ? "border-violet-400/60 bg-violet-500/20 text-violet-100"
                      : "border-white/15 text-white/60 hover:border-white/30"
                  }`}
                >
                  {id}. {label}
                  {isLatest && (
                    <span className="ml-1 text-[9px] text-violet-300/80">
                      {t("mapSweepLatestTag")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading || activeRun || stamina < cost1}
          onClick={() => onSweep(sweepTarget, mode, 1)}
          className="rounded-lg border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-sm text-violet-100 disabled:opacity-40"
        >
          {mode === "boss"
            ? t("mapSweepOnceBoss", { map: sweepTarget, cost: cost1 })
            : t("mapSweepOnceFull", { map: sweepTarget, cost: cost1 })}
        </button>
        <button
          type="button"
          disabled={loading || activeRun || stamina < cost10}
          onClick={() => onSweep(sweepTarget, mode, MAP_SWEEP_RUNS_BATCH)}
          className="rounded-lg border border-violet-400/50 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-100 disabled:opacity-40"
        >
          {mode === "boss"
            ? t("mapSweepTenBoss", {
                map: sweepTarget,
                runs: MAP_SWEEP_RUNS_BATCH,
                cost: cost10,
              })
            : t("mapSweepTenFull", {
                map: sweepTarget,
                runs: MAP_SWEEP_RUNS_BATCH,
                cost: cost10,
              })}
        </button>
      </div>
    </section>
  );
}

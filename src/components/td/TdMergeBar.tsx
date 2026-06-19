"use client";

import { useTranslations } from "next-intl";
import type { PlacedTower } from "@/lib/td/engine";
import { canSelectMergeSource } from "@/lib/td/engine";
import { canMergeCrew, towerDef } from "@/lib/td/towers";

type Props = {
  inspectedTower: PlacedTower | null;
  mergeSourceId: string | null;
  allTowers: PlacedTower[];
  paused?: boolean;
  onMergeSelect: (id: string) => void;
  onMergeCancel: () => void;
  onMergeWith: (sourceId: string, targetId: string) => void;
};

export function TdMergeBar({
  inspectedTower,
  mergeSourceId,
  allTowers,
  paused,
  onMergeSelect,
  onMergeCancel,
  onMergeWith,
}: Props) {
  const t = useTranslations("td");

  const source = mergeSourceId
    ? allTowers.find((tw) => tw.id === mergeSourceId)
    : inspectedTower;

  if (!source || paused) return null;

  const def = towerDef(source.kind);
  if (!def.isCrew || !canSelectMergeSource(source)) return null;

  const partners = allTowers.filter(
    (tw) => tw.id !== source.id && canMergeCrew(source, tw),
  );
  if (partners.length === 0 && !mergeSourceId) return null;

  const isActive = mergeSourceId === source.id;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-500/35 bg-ink/95 px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md sm:hidden">
      <div className="mx-auto max-w-lg">
        {!isActive ? (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {source.kind} Lv.{source.level}
              </p>
              <p className="text-[11px] text-white/45">{t("mergeBarHint")}</p>
            </div>
            <button
              type="button"
              onClick={() => onMergeSelect(source.id)}
              className="shrink-0 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-ink"
            >
              {t("mergeSelect")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-amber-200">{t("mergeBarActive")}</p>
              <button
                type="button"
                onClick={onMergeCancel}
                className="shrink-0 rounded border border-white/20 px-3 py-1 text-[11px] text-white/70"
              >
                {t("mergeCancel")}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {partners.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onMergeWith(source.id, p.id)}
                  className="rounded-full border border-amber-400/50 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 active:bg-amber-500/30"
                >
                  {t("mergeWith", { kind: p.kind, level: p.level })}
                </button>
              ))}
            </div>
            <p className="text-center text-[10px] text-white/35">{t("mergeBarTapGrid")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

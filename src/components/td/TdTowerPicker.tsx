"use client";

import { useTranslations } from "next-intl";
import { STAR_DEFS, type StarId } from "@/config/td/stars";
import { CREW_MAX_LEVEL, STAR_MAX_LEVEL, starKillsToNextLevel, starXpProgress } from "@/config/td/xp";
import { crewTrait } from "@/config/td/traits";
import { NftAvatar } from "@/components/td/TdSprites";
import type { PlacedTower } from "@/lib/td/engine";
import {
  CREW_KINDS,
  canMergeCrew,
  isCrewKind,
  towerCombatStats,
  towerDef,
  type TowerKind,
} from "@/lib/td/towers";

type Props = {
  selected: TowerKind;
  disabled?: boolean;
  onSelect: (kind: TowerKind) => void;
  inspectedTower?: PlacedTower | null;
  mergeSourceId?: string | null;
  allTowers?: PlacedTower[];
  onMergeSelect?: (id: string) => void;
  onMergeCancel?: () => void;
};

export function TdTowerPicker({
  selected,
  disabled,
  onSelect,
  inspectedTower = null,
  mergeSourceId = null,
  allTowers = [],
  onMergeSelect,
  onMergeCancel,
}: Props) {
  const t = useTranslations("td");

  const showingPlaced = inspectedTower != null;
  const kind = showingPlaced ? inspectedTower.kind : selected;
  const level = showingPlaced ? inspectedTower.level : 1;
  const def = towerDef(kind);
  const stats = towerCombatStats(kind, level);

  const trait = isCrewKind(kind) ? crewTrait(kind) : null;
  const starXp = def.isStar && showingPlaced
    ? starXpProgress(inspectedTower.kills, inspectedTower.level)
    : null;
  const needKills = def.isStar && showingPlaced
    ? starKillsToNextLevel(inspectedTower.kills, inspectedTower.level)
    : null;
  const maxLv = def.isStar ? STAR_MAX_LEVEL : CREW_MAX_LEVEL;
  const canMerge = showingPlaced && def.isCrew && inspectedTower.level < CREW_MAX_LEVEL;
  const mergePartners = canMerge
    ? allTowers.filter(
        (tw) => tw.id !== inspectedTower.id && canMergeCrew(inspectedTower, tw),
      )
    : [];

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/40">
          {t("crewLabel")}
        </p>
        <div className="flex flex-wrap gap-2">
          {CREW_KINDS.map((k) => {
            const d = towerDef(k);
            const active = !showingPlaced && selected === k;
            return (
              <button
                key={k}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(k)}
                title={d.description}
                className={`rounded-lg px-3 py-2 text-sm disabled:opacity-40 ${
                  active ? "bg-cyan-600 text-white" : "border border-white/15"
                }`}
              >
                {k} · {d.cost}
              </button>
            );
          })}
        </div>
        {!showingPlaced && isCrewKind(selected) && (
          <p className="mt-1 text-[10px] text-white/35">{t("mergeHint")}</p>
        )}
      </div>

      <p className="text-[10px] uppercase tracking-wider text-gold/60">{t("starsLabel")}</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STAR_DEFS) as StarId[]).map((id) => {
          const star = STAR_DEFS[id];
          const d = towerDef(id);
          const active = !showingPlaced && selected === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(id)}
              title={d.description}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 disabled:opacity-40 ${
                active
                  ? "border-gold bg-gold/15 ring-1 ring-gold/50"
                  : "border-white/15 hover:border-gold/30"
              }`}
            >
              <NftAvatar
                tokenId={star.tokenId}
                alt={star.name}
                fallback={star.title.slice(0, 1)}
                className="h-9 w-9 rounded-md object-cover object-top"
              />
              <span className="text-left text-xs">
                <span className="block font-medium text-gold">{star.title}</span>
                <span className="text-white/45">{d.cost} 人气</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-white/10 bg-surface/80 px-3 py-2 text-xs text-white/60">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-white/90">
            {def.label}
            {def.starName && (
              <span className="ml-1 font-normal text-white/45">{def.starName}</span>
            )}
          </span>
          {showingPlaced && (
            <span className="rounded border border-gold/30 bg-gold/10 px-1.5 py-0.5 text-[10px] text-gold">
              Lv.{level}/{maxLv}
            </span>
          )}
          <span className="text-white/25">|</span>
          <span>{t("statAtk", { v: stats.damage.toFixed(1) })}</span>
          <span className="text-white/25">·</span>
          <span>{t("statSpeed", { v: stats.attackSpeed.toFixed(2) })}</span>
        </div>

        {trait && showingPlaced && (
          <p className="mt-1 text-[10px] text-violet-300/80">
            {t("trait")}「{trait.name}」· {trait.description}
          </p>
        )}

        {def.isStar && !showingPlaced && (
          <p className="mt-1 text-[10px] text-gold/70">{t("starXpHint")}</p>
        )}

        {starXp && (
          <div className="mt-1.5">
            <div className="mb-0.5 flex justify-between text-[10px] text-white/40">
              <span>{t("starXp")}</span>
              <span>
                {needKills != null ? t("starXpNeed", { need: needKills }) : t("starXpMax")}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-black/40">
              <div className="h-full bg-gold" style={{ width: `${starXp.pct}%` }} />
            </div>
          </div>
        )}

        {canMerge && onMergeSelect && onMergeCancel && (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
            {mergeSourceId === inspectedTower.id ? (
              <>
                <span className="text-[10px] text-amber-300">{t("mergeSourceActive")}</span>
                <button
                  type="button"
                  onClick={onMergeCancel}
                  className="rounded border border-white/20 px-2 py-0.5 text-[10px] hover:border-white/40"
                >
                  {t("mergeCancel")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onMergeSelect(inspectedTower.id)}
                className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200 hover:bg-amber-500/20"
              >
                {t("mergeSelect")}
              </button>
            )}
            {mergePartners.length > 0 && (
              <span className="text-[10px] text-white/35">
                {t("mergePartners", { count: mergePartners.length })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

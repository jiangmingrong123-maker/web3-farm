"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  HP_PER_STR,
  STR_ATK_PER_STR,
  AGI_ATK_PER_AGI,
  statHint,
  statLabel,
  type StatKey,
} from "@/config/td/hero-attributes";
import { heroCombatStats, type HeroSave } from "@/config/td/rpg";
import { getProtagonist, protagonistName } from "@/config/td/protagonists";
import type { UpgradeKind } from "@/lib/td/rpg-storage";
import { recommendStatDeltas } from "@/lib/td/stat-recommend";

const STAT_KEYS: StatKey[] = ["str", "agi", "mag"];

const EMPTY_DRAFT: Record<StatKey, number> = { str: 0, agi: 0, mag: 0 };

type Props = {
  save: HeroSave;
  locale: string;
  onUpgrade: (kind: UpgradeKind) => void;
};

export function TdStatAllocator({ save, locale, onUpgrade }: Props) {
  const t = useTranslations("td");
  const p = getProtagonist(save.protagonistId);
  const [draft, setDraft] = useState<Record<StatKey, number>>(EMPTY_DRAFT);

  useEffect(() => {
    setDraft(EMPTY_DRAFT);
  }, [save.statPoints, save.stats.str, save.stats.agi, save.stats.mag]);

  const draftTotal = draft.str + draft.agi + draft.mag;
  const remaining = save.statPoints - draftTotal;

  const previewSave = useMemo(
    (): HeroSave => ({
      ...save,
      stats: {
        str: save.stats.str + draft.str,
        agi: save.stats.agi + draft.agi,
        mag: save.stats.mag + draft.mag,
      },
    }),
    [save, draft],
  );
  const combat = heroCombatStats(previewSave);

  const bump = (key: StatKey, delta: 1 | -1) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: prev[key] + delta };
      if (next[key] < 0) return prev;
      const total = next.str + next.agi + next.mag;
      if (total > save.statPoints) return prev;
      return next;
    });
  };

  const cancelDraft = () => setDraft(EMPTY_DRAFT);

  const confirmDraft = () => {
    if (draftTotal <= 0) return;
    onUpgrade({ type: "statBatch", deltas: { ...draft } });
    setDraft(EMPTY_DRAFT);
  };

  const applyRecommend = () => {
    if (save.statPoints <= 0) return;
    setDraft(recommendStatDeltas(save.protagonistId, save.statPoints));
  };

  return (
    <section className="rounded-xl border border-white/10 bg-surface p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
          {t("statAllocTitle")}
        </h3>
        <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs text-gold">
          {draftTotal > 0
            ? t("statPointsDraft", { left: remaining, used: draftTotal })
            : t("statPointsLeft", { n: save.statPoints })}
        </span>
      </div>
      <p className="mb-3 text-[11px] text-white/40">
        {t("statAllocHint", {
          name: protagonistName(save.protagonistId, locale),
          focus: locale === "zh" ? p.focusZh : p.focusEn,
        })}
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={save.statPoints <= 0}
          onClick={applyRecommend}
          className="rounded border border-sky-500/40 bg-sky-950/40 px-3 py-1.5 text-[11px] text-sky-300 disabled:opacity-40"
        >
          {t("statAllocRecommend")}
        </button>
        {draftTotal > 0 && (
          <>
            <button
              type="button"
              onClick={cancelDraft}
              className="rounded border border-white/20 px-3 py-1.5 text-[11px] text-white/70"
            >
              {t("statAllocCancel")}
            </button>
            <button
              type="button"
              onClick={confirmDraft}
              className="rounded border border-gold/50 bg-gold/20 px-3 py-1.5 text-[11px] font-medium text-gold"
            >
              {t("statAllocConfirm")}
            </button>
          </>
        )}
      </div>

      <div className="space-y-2">
        {STAT_KEYS.map((key) => {
          const added = draft[key];
          const display = save.stats[key] + added;
          return (
            <div
              key={key}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                added > 0 ? "border-gold/40 bg-gold/5" : "border-white/10 bg-black/25"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/90">
                  {statLabel(key, locale)}{" "}
                  <span className="text-gold">{display}</span>
                  {added > 0 && (
                    <span className="ml-1 text-xs text-gold/70">
                      ({save.stats[key]} +{added})
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-white/40">{statHint(key, locale)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={added <= 0}
                  onClick={() => bump(key, -1)}
                  className="rounded border border-white/20 bg-black/30 px-2.5 py-1 text-xs text-white/70 disabled:opacity-30"
                >
                  −
                </button>
                <button
                  type="button"
                  disabled={remaining <= 0}
                  onClick={() => bump(key, 1)}
                  className="rounded border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs text-gold disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-white/50">
        <div className="rounded border border-white/10 py-1.5">
          <p>{t("statHpShort")}</p>
          <p className="text-sm font-semibold text-white/85">{combat.maxHp}</p>
          <p className="text-[9px] text-white/35">
            {previewSave.stats.str}×{HP_PER_STR}
          </p>
        </div>
        <div className="rounded border border-white/10 py-1.5">
          <p>
            {t("statStrAtkShort")}/{t("statAgiAtkShort")}
          </p>
          <p className="text-sm font-semibold text-white/85">
            {combat.strAtk} / {combat.agiAtk}
          </p>
          <p className="text-[9px] text-white/35">
            {previewSave.stats.str}×{STR_ATK_PER_STR} · {previewSave.stats.agi}×
            {AGI_ATK_PER_AGI}
          </p>
        </div>
        <div className="rounded border border-white/10 py-1.5">
          <p>
            {t("statDefShort")}/{t("statMagDmg")}
          </p>
          <p className="text-sm font-semibold text-white/85">
            {combat.def} / {combat.magDmg}
          </p>
          <p className="text-[9px] text-white/35">
            {t("statMp")} {combat.maxMp}
          </p>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CREW_KINDS, towerDef } from "@/lib/td/towers";
import type { TowerKind } from "@/lib/td/towers";
import type { TextBattleState } from "@/lib/td/text-combat";
import { canMergeCrew } from "@/lib/td/towers";

type Props = {
  battle: TextBattleState;
  buffs: string[];
  locale: string;
  onRecruit: (kind: TowerKind) => void;
  onMerge: (fromId: string, toId: string) => void;
  onFightWave: () => void;
  onFinish: () => void;
};

export function TdTextBattle({
  battle,
  buffs,
  locale,
  onRecruit,
  onMerge,
  onFightWave,
  onFinish,
}: Props) {
  const t = useTranslations("td");
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const inSetup = battle.phase === "setup" && !battle.battleStarted;
  const canFight =
    battle.roster.length > 0 &&
    battle.hearts > 0 &&
    battle.wave < battle.maxWaves &&
    (battle.phase === "setup" || battle.phase === "between");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <span>{t("wave")}: {battle.wave}/{battle.maxWaves}</span>
        <span>{t("hearts")}: {"❤".repeat(battle.hearts)}{"🖤".repeat(3 - battle.hearts)}</span>
        <span>{t("popularity")}: {Math.floor(battle.popularity)}</span>
      </div>

      {buffs.length > 0 && (
        <p className="text-xs text-gold/70">
          {t("activeBuffs")}: {buffs.join(", ")}
        </p>
      )}

      {inSetup && (
        <section className="rounded-xl border border-white/10 bg-surface/80 p-4">
          <h2 className="mb-2 text-sm font-semibold text-white/80">{t("rosterTitle")}</h2>
          <p className="mb-3 text-xs text-white/45">{t("rosterHint")}</p>
          <div className="flex flex-wrap gap-2">
            {CREW_KINDS.map((k) => {
              const def = towerDef(k);
              const afford = battle.popularity >= def.cost;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={!afford}
                  onClick={() => onRecruit(k)}
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-40"
                >
                  + {k} · {def.cost}
                </button>
              );
            })}
          </div>

          {battle.roster.length > 0 && (
            <ul className="mt-4 space-y-2">
              {battle.roster.map((u) => {
                const isSource = mergeSource === u.id;
                const canMerge =
                  mergeSource &&
                  mergeSource !== u.id &&
                  canMergeCrew(
                    battle.roster.find((r) => r.id === mergeSource)!,
                    u,
                  );
                return (
                  <li
                    key={u.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                      isSource ? "border-amber-400/60 bg-amber-500/10" : "border-white/10"
                    } ${canMerge ? "ring-1 ring-amber-300/50" : ""}`}
                  >
                    <span>
                      {u.kind} Lv.{u.level} · HP {u.hp}/{u.maxHp}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (mergeSource && mergeSource !== u.id) {
                          onMerge(mergeSource, u.id);
                          setMergeSource(null);
                        } else {
                          setMergeSource(isSource ? null : u.id);
                        }
                      }}
                      className="text-xs text-amber-200 underline"
                    >
                      {mergeSource && mergeSource !== u.id && canMerge
                        ? t("mergeWithShort")
                        : isSource
                          ? t("mergeCancel")
                          : t("mergeSelect")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {mergeSource && (
            <p className="mt-2 text-[11px] text-amber-200/80">{t("mergeRosterHint")}</p>
          )}
        </section>
      )}

      {!inSetup && battle.roster.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="mb-2 text-xs text-white/40">{t("rosterSummary")}</p>
          <p className="text-sm text-white/70">
            {battle.roster.map((u) => `${u.kind}Lv${u.level}`).join(" · ")}
          </p>
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-black/40 p-4">
        <h2 className="mb-2 text-sm font-semibold text-white/80">{t("combatLogTitle")}</h2>
        <div
          className="max-h-[50vh] overflow-y-auto font-mono text-xs leading-relaxed text-white/75"
          lang={locale}
        >
          {battle.log.length === 0 ? (
            <p className="text-white/35">{t("combatLogEmpty")}</p>
          ) : (
            battle.log.map((line, i) => (
              <p key={i} className="whitespace-pre-wrap border-b border-white/5 py-1">
                {line}
              </p>
            ))
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        {canFight && (
          <button
            type="button"
            onClick={onFightWave}
            className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-ink"
          >
            {battle.wave === 0 ? t("beginBattle") : t("nextWave")}
          </button>
        )}
        {battle.phase === "done" && (
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

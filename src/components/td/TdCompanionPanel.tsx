"use client";

import { useTranslations } from "next-intl";
import {
  ALLY_DEPLOY_LEVEL,
  allyName,
  maxAllySlots,
  PARTY_ALLY_SLOTS,
} from "@/config/td/battle-squads";
import {
  COMPANION_UNLOCK_GOLD,
  MAX_COMPANION_LEVEL,
  companionAtk,
  type CompanionKind,
  type HeroSave,
} from "@/config/td/rpg";
import {
  PET_CATALOG,
  petRole,
  petSummonRoadmap,
} from "@/config/td/pet-catalog";
import { alliesInBattle } from "@/lib/td/battle-party";
import { upgradeCost, type UpgradeKind } from "@/lib/td/rpg-storage";

const MAX_BATTLE_SLOTS = 4;

function slotUnlockLevel(slotIndex: number): number {
  const row = PARTY_ALLY_SLOTS.find((r) => r.allies === slotIndex + 1);
  return row?.minLevel ?? 99;
}

type Props = {
  save: HeroSave;
  locale: string;
  gold: number;
  onUpgrade: (kind: UpgradeKind) => void;
};

export function TdCompanionPanel({ save, locale, gold, onUpgrade }: Props) {
  const t = useTranslations("td");
  const deployed = alliesInBattle(save);
  const openSlots = maxAllySlots(save.level);
  const roadmap = petSummonRoadmap(save.level, locale);

  return (
    <section className="space-y-4">
      {/* 召唤路线图 */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
        <h3 className="text-xs font-semibold text-amber-100/90">{t("petSummonRoadmap")}</h3>
        <p className="mb-2 mt-1 text-[10px] text-white/40">{t("petSummonRoadmapHint")}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] text-left text-[10px]">
            <thead>
              <tr className="border-b border-white/10 text-white/45">
                <th className="pb-1.5 pr-2 font-medium">{t("petColTier")}</th>
                <th className="pb-1.5 pr-2 font-medium">{t("petColName")}</th>
                <th className="pb-1.5 pr-2 font-medium">{t("petColLevel")}</th>
                <th className="pb-1.5 pr-2 font-medium">{t("petColCost")}</th>
                <th className="pb-1.5 font-medium">{t("petColStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {roadmap.map((p) => {
                const unlocked = save.companionUnlocked[p.id];
                const inBattle = deployed.includes(p.id);
                let status = t("petStatusLocked");
                if (!p.canSummon) {
                  status = t("petStatusNeedLevel", { level: p.summonLevel });
                } else if (inBattle) {
                  status = t("petStatusBattle");
                } else if (unlocked) {
                  status = t("petStatusOwned");
                } else if (p.summonGold === 0) {
                  status = t("petStatusFree");
                } else {
                  status = t("petStatusSummonable");
                }
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-white/5 ${
                      p.canSummon && !unlocked ? "text-amber-100/90" : "text-white/65"
                    }`}
                  >
                    <td className="py-1.5 pr-2">T{p.tier}</td>
                    <td className="py-1.5 pr-2">
                      <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-black/40 text-[9px] font-bold">
                        {p.glyph}
                      </span>
                      {p.name}
                      <span className="ml-1 text-white/35">({p.role})</span>
                    </td>
                    <td className="py-1.5 pr-2">Lv.{p.summonLevel}</td>
                    <td className="py-1.5 pr-2">
                      {p.summonGold > 0 ? `${p.summonGold}金` : t("petCostFree")}
                    </td>
                    <td className="py-1.5">{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 上阵栏 */}
      <div className="rounded-xl border border-violet-400/30 bg-gradient-to-b from-violet-500/10 to-black/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-violet-100">
            {t("companionBattleBar")}
          </h3>
          <span className="text-[10px] text-white/45">
            {t("companionDeployed", { count: deployed.length, slots: openSlots })}
          </span>
        </div>
        <p className="mb-3 text-[10px] leading-snug text-white/40">
          {t("companionBattleBarHint")}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: MAX_BATTLE_SLOTS }, (_, i) => {
            const pet = deployed[i] ?? null;
            const slotOpen = i < openSlots;
            const unlockLv = slotUnlockLevel(i);

            if (pet) {
              const lv = save.companionLevel[pet];
              const def = PET_CATALOG.find((x) => x.id === pet);
              return (
                <div
                  key={`slot-${i}`}
                  className="flex flex-col items-center rounded-lg border border-emerald-400/45 bg-emerald-500/10 px-1 py-2"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-300/40 bg-black/40 text-sm font-bold text-emerald-100">
                    {def?.glyph ?? pet}
                  </span>
                  <p className="mt-1 max-w-full truncate text-[9px] font-medium text-white/85">
                    {allyName(pet, locale)}
                  </p>
                  <p className="text-[8px] text-emerald-200/70">Lv.{lv}</p>
                </div>
              );
            }

            if (slotOpen) {
              return (
                <div
                  key={`slot-${i}`}
                  className="flex flex-col items-center rounded-lg border border-dashed border-white/20 bg-black/25 px-1 py-2"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-white/15 text-lg text-white/20">
                    +
                  </span>
                  <p className="mt-1 text-[8px] text-white/35">{t("companionSlotEmpty")}</p>
                </div>
              );
            }

            return (
              <div
                key={`slot-${i}`}
                className="flex flex-col items-center rounded-lg border border-white/8 bg-black/40 px-1 py-2 opacity-60"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-sm text-white/25">
                  🔒
                </span>
                <p className="mt-1 text-center text-[8px] leading-tight text-white/30">
                  {t("companionSlotLocked", { level: unlockLv })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 宠物名册 */}
      <div className="rounded-xl border border-white/10 bg-surface/80 p-3">
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-white/70">
          {t("companionRoster")}
        </h3>
        <p className="mb-3 text-[10px] text-white/40">{t("companionBattleHint")}</p>
        <div className="space-y-2">
          {PET_CATALOG.map((def) => {
            const kind = def.id;
            const deployLv = ALLY_DEPLOY_LEVEL[kind];
            const unlocked = save.companionUnlocked[kind];
            const lv = save.companionLevel[kind];
            const inBattle = deployed.includes(kind);
            const canDeploy = save.level >= deployLv;
            const unlockGold = COMPANION_UNLOCK_GOLD[kind];
            const needsGoldUnlock = unlockGold > 0 && !unlocked;
            const upgradeCostGold = upgradeCost(save, { type: "companion", kind });
            const canUnlock =
              needsGoldUnlock && gold >= unlockGold && canDeploy;
            const canUpgrade =
              unlocked &&
              upgradeCostGold != null &&
              gold >= upgradeCostGold &&
              lv < MAX_COMPANION_LEVEL;

            let status = t("companionLocked");
            if (inBattle) status = t("companionInBattle");
            else if (!canDeploy) status = t("companionNeedLevel", { level: deployLv });
            else if (unlocked) status = t("companionReady");

            return (
              <div
                key={kind}
                className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 ${
                  inBattle
                    ? "border-violet-400/40 bg-violet-500/10"
                    : "border-white/10 bg-black/25"
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-base font-bold ${
                    inBattle
                      ? "border-violet-300/50 bg-violet-600/20 text-violet-100"
                      : unlocked
                        ? "border-white/20 bg-black/40 text-white/70"
                        : "border-white/10 bg-black/30 text-white/30"
                  }`}
                >
                  {def.glyph}
                  <span className="text-[7px] font-normal text-white/40">T{def.tier}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/90">
                    {allyName(kind, locale)}{" "}
                    <span className="text-violet-200/90">Lv.{lv}</span>
                    <span className="ml-1 text-[9px] text-white/35">
                      {petRole(def, locale)}
                    </span>
                    {inBattle && (
                      <span className="ml-1 rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] text-emerald-200">
                        {t("companionInBattleTag")}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {status} · {t("companionAtk", { atk: companionAtk(kind, lv) })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {canUnlock && (
                    <button
                      type="button"
                      onClick={() => onUpgrade({ type: "unlock", kind })}
                      className="rounded border border-gold/40 bg-gold/15 px-2.5 py-1.5 text-[10px] font-medium text-gold"
                    >
                      {t("companionUnlock", { gold: unlockGold })}
                    </button>
                  )}
                  {canUpgrade && (
                    <button
                      type="button"
                      onClick={() => onUpgrade({ type: "companion", kind })}
                      className="rounded border border-violet-400/40 bg-violet-500/15 px-2.5 py-1.5 text-[10px] font-medium text-violet-100"
                    >
                      {t("companionUpgrade", { gold: upgradeCostGold })}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

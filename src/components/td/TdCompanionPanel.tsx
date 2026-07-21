"use client";

import { useTranslations } from "next-intl";
import {
  ALLY_DEPLOY_LEVEL,
  PARTY_ALLY_SLOTS,
  allyName,
  maxAllySlots,
} from "@/config/td/battle-squads";
import {
  COMPANION_KINDS,
  COMPANION_UNLOCK_GOLD,
  MAX_COMPANION_LEVEL,
  companionAtk,
  type CompanionKind,
  type HeroSave,
} from "@/config/td/rpg";
import { alliesInBattle } from "@/lib/td/battle-party";
import { upgradeCost, type UpgradeKind } from "@/lib/td/rpg-storage";

const KIND_GLYPH: Record<CompanionKind, string> = {
  群: "群",
  粉: "粉",
  编: "编",
  导: "导",
};

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

  return (
    <section className="space-y-4">
      {/* 上阵栏 · 梦幻西游式出战位 */}
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
              return (
                <div
                  key={`slot-${i}`}
                  className="flex flex-col items-center rounded-lg border border-emerald-400/45 bg-emerald-500/10 px-1 py-2"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-300/40 bg-black/40 text-sm font-bold text-emerald-100">
                    {KIND_GLYPH[pet]}
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
          {COMPANION_KINDS.map((kind) => {
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
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-base font-bold ${
                    inBattle
                      ? "border-violet-300/50 bg-violet-600/20 text-violet-100"
                      : unlocked
                        ? "border-white/20 bg-black/40 text-white/70"
                        : "border-white/10 bg-black/30 text-white/30"
                  }`}
                >
                  {KIND_GLYPH[kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/90">
                    {allyName(kind, locale)}{" "}
                    <span className="text-violet-200/90">Lv.{lv}</span>
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

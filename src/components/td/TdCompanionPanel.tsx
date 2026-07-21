"use client";

import { useTranslations } from "next-intl";
import {
  ALLY_DEPLOY_LEVEL,
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

type Props = {
  save: HeroSave;
  locale: string;
  gold: number;
  onUpgrade: (kind: UpgradeKind) => void;
};

export function TdCompanionPanel({ save, locale, gold, onUpgrade }: Props) {
  const t = useTranslations("td");
  const deployed = alliesInBattle(save);
  const slots = maxAllySlots(save.level);

  return (
    <section className="mt-4 rounded-xl border border-violet-500/25 bg-violet-500/5 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-200/80">
          {t("companionTitle")}
        </h3>
        <span className="text-[10px] text-white/45">
          {t("companionDeployed", { count: deployed.length, slots })}
        </span>
      </div>
      <p className="mb-3 text-[10px] leading-snug text-white/40">
        {t("companionBattleHint")}
      </p>
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
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                inBattle
                  ? "border-violet-400/40 bg-violet-500/10"
                  : "border-white/10 bg-black/25"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/90">
                  {allyName(kind, locale)}{" "}
                  <span className="text-violet-200/90">Lv.{lv}</span>
                  {inBattle && (
                    <span className="ml-1 text-[10px] text-emerald-300/90">
                      · {t("companionInBattleTag")}
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
                    className="rounded border border-gold/40 bg-gold/15 px-2 py-1 text-[10px] text-gold"
                  >
                    {t("companionUnlock", { gold: unlockGold })}
                  </button>
                )}
                {canUpgrade && (
                  <button
                    type="button"
                    onClick={() => onUpgrade({ type: "companion", kind })}
                    className="rounded border border-violet-400/40 bg-violet-500/15 px-2 py-1 text-[10px] text-violet-100"
                  >
                    {t("companionUpgrade", { gold: upgradeCostGold })}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

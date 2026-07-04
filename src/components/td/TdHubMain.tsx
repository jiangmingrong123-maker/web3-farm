"use client";

import { useTranslations } from "next-intl";
import { TdQuestTracker } from "@/components/td/TdQuestTracker";
import { ProtagonistAvatar } from "@/components/td/TdHeroPicker";
import { STAMINA_MAX } from "@/config/td/economy";
import { expLevelProgress } from "@/config/td/hero-levels";
import { heroCombatStats, type HeroSave } from "@/config/td/rpg";
import { heroCombatPowerScore } from "@/lib/td/equip-score";
import { protagonistName } from "@/config/td/protagonists";
import { getZone, zoneName } from "@/config/td/zones";

type Props = {
  save: HeroSave;
  locale: string;
  gold: number;
  stamina: number;
  farmPoints: number;
  loading?: boolean;
  refillCost: number;
  goldExchangeCost: number;
  fightMapId?: number;
  fightScene?: number;
  fightRounds?: number;
  fastClearCost?: number;
  buffLabels?: string[];
  onOpenPanel: (id: "stats" | "equip") => void;
  onRefill: () => void;
  onExchangeGold: () => void;
};

export function TdHubMain({
  save,
  locale,
  gold,
  stamina,
  farmPoints,
  loading,
  refillCost,
  goldExchangeCost,
  fightMapId,
  fightScene,
  fightRounds,
  fastClearCost = 0,
  buffLabels = [],
  onOpenPanel,
  onRefill,
  onExchangeGold,
}: Props) {
  const t = useTranslations("td");
  const combat = heroCombatStats(save);
  const combatPower = heroCombatPowerScore(save);
  const exp = expLevelProgress(save.level, save.exp);
  const points = Math.floor(farmPoints);
  const zone = fightMapId != null ? getZone(fightMapId) : null;
  const fightName = zone ? zoneName(zone, locale) : null;

  return (
    <section className="space-y-2">
      <div className="rounded-xl border border-gold/25 bg-gradient-to-b from-gold/5 to-black/40 p-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onOpenPanel("equip")}
            className="shrink-0 rounded-lg border border-white/10 bg-black/30 p-1 active:scale-95"
          >
            <ProtagonistAvatar id={save.protagonistId} locale={locale} level={save.level} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <p className="truncate text-sm font-semibold text-white/95">
                {protagonistName(save.protagonistId, locale)}
              </p>
              <p className="text-xs text-gold">
                {t("heroCombatPower", { power: combatPower })}
              </p>
            </div>

            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/55">
              <span>
                {t("statAtkShort")} {combat.atk}
              </span>
              <span>
                {t("statDefShort")} {combat.def}
              </span>
              <span>
                {t("statHpShort")} {combat.maxHp}
              </span>
              {save.statPoints > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenPanel("stats")}
                  className="text-sky-300 underline"
                >
                  {t("statPointsLeft", { n: save.statPoints })}
                </button>
              )}
            </div>

            <div className="mt-2">
              <div className="mb-0.5 flex justify-between text-[9px] text-white/40">
                <span>EXP</span>
                <span>
                  {exp.into}/{exp.span}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold/80 to-amber-400/80"
                  style={{ width: `${Math.min(100, exp.pct)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-surface/80 px-3 py-2.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[11px] text-white/50">{t("stamina")}</span>
              <span className="text-lg font-bold tabular-nums text-sky-200">{stamina}</span>
              <button
                type="button"
                disabled={loading || points < refillCost}
                onClick={onRefill}
                className="rounded-md border border-sky-400/40 bg-sky-500/12 px-2 py-1 text-[10px] leading-snug text-sky-100 disabled:opacity-40"
              >
                {t("refillStamina", { cost: refillCost })}
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[11px] text-white/50">{t("gold")}</span>
              <span className="text-base font-bold tabular-nums text-gold">{gold}</span>
              <span className="text-[11px] text-white/25">·</span>
              <span className="text-[11px] text-white/50">{t("pointsShort")}</span>
              <span className="text-base font-semibold tabular-nums text-cyan-200">{points}</span>
              <button
                type="button"
                disabled={loading || points < goldExchangeCost}
                onClick={onExchangeGold}
                className="rounded-md border border-gold/40 bg-gold/10 px-2 py-1 text-[10px] leading-snug text-gold disabled:opacity-40"
              >
                {t("exchangeGold", { cost: goldExchangeCost, gold: 100 })}
              </button>
            </div>

            <p className="mt-2 text-[9px] leading-snug text-white/35">
              {t("staminaAutoCapHint", { max: STAMINA_MAX })}
            </p>
          </div>

          {fightMapId != null && fightScene != null && (
            <div className="border-t border-white/10 pt-2.5 sm:w-[44%] sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                {t("hubNextFight")}
              </p>
              <p className="mt-1 text-[11px] font-medium leading-snug text-gold">
                {fightName ?? `#${fightMapId}`}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-white/55">
                {t("hubNextFightDetail", {
                  scene: fightScene,
                  rounds: fightRounds ?? "?",
                })}
              </p>
              <p className="mt-1.5 text-[10px] text-white/50">
                {fastClearCost > 0
                  ? t("hubFastClearOk", { cost: fastClearCost })
                  : t("hubFastClearBlocked")}
              </p>
              {buffLabels.length > 0 && (
                <p className="mt-1 text-[10px] leading-snug text-gold/80">
                  {t("hubActiveBuffs", { list: buffLabels.join("、") })}
                </p>
              )}
              {save.inventory.length > 0 && (
                <p className="mt-1 text-[10px] text-white/40">
                  {t("hubBagCount", { count: save.inventory.length })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <TdQuestTracker save={save} locale={locale} />
    </section>
  );
}

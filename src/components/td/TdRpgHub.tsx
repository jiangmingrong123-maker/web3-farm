"use client";

import { useTranslations } from "next-intl";
import {
  COMPANION_KINDS,
  EQUIP_NAMES,
  EQUIP_SLOTS,
  companionAtk,
  heroCombatStats,
  type HeroSave,
} from "@/config/td/rpg";
import {
  activeCompanions,
  upgradeCost,
  type UpgradeKind,
} from "@/lib/td/rpg-storage";

type Props = {
  save: HeroSave;
  gold: number;
  onUpgrade: (kind: UpgradeKind) => void;
};

export function TdRpgHub({ save, gold, onUpgrade }: Props) {
  const t = useTranslations("td");
  const stats = heroCombatStats(save);
  const companions = activeCompanions(save);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gold/30 bg-gold/5 p-4">
        <h2 className="mb-2 text-sm font-bold text-gold">{t("heroTitle")}</h2>
        <p className="text-xs text-white/50">{t("heroHint")}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <span>HP {stats.maxHp}</span>
          <span>{t("statAtk", { v: stats.atk })}</span>
          <span>{t("heroDef", { v: stats.def })}</span>
          <span>Lv.{save.level}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {EQUIP_SLOTS.map((slot) => (
            <span
              key={slot}
              className="rounded border border-white/15 px-2 py-1 text-xs text-white/70"
            >
              {EQUIP_NAMES[slot]} Lv.{save.equipLevel[slot]}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-surface p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          {t("upgradeTitle")}
        </h3>
        <div className="flex flex-wrap gap-2">
          <UpgradeBtn
            label={t("upgradeHero", { lv: save.level })}
            cost={upgradeCost(save, { type: "hero" })}
            gold={gold}
            onClick={() => onUpgrade({ type: "hero" })}
          />
          {EQUIP_SLOTS.map((slot) => (
            <UpgradeBtn
              key={slot}
              label={`${EQUIP_NAMES[slot]} Lv.${save.equipLevel[slot]}`}
              cost={upgradeCost(save, { type: "equip", slot })}
              gold={gold}
              onClick={() => onUpgrade({ type: "equip", slot })}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-surface p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          {t("companionTitle")}
        </h3>
        <div className="space-y-2">
          {COMPANION_KINDS.map((kind) => {
            const unlocked = save.companionUnlocked[kind];
            const lv = save.companionLevel[kind];
            return (
              <div
                key={kind}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"
              >
                <span className="text-white/80">
                  {kind}
                  {unlocked ? ` Lv.${lv} · ${t("statAtk", { v: companionAtk(kind, lv) })}` : ` · ${t("companionLocked")}`}
                </span>
                {unlocked ? (
                  <UpgradeBtn
                    label={t("upgrade")}
                    cost={upgradeCost(save, { type: "companion", kind })}
                    gold={gold}
                    onClick={() => onUpgrade({ type: "companion", kind })}
                  />
                ) : (
                  <UpgradeBtn
                    label={t("unlock")}
                    cost={upgradeCost(save, { type: "unlock", kind })}
                    gold={gold}
                    onClick={() => onUpgrade({ type: "unlock", kind })}
                  />
                )}
              </div>
            );
          })}
        </div>
        {companions.length > 0 && (
          <p className="mt-2 text-[11px] text-white/35">{t("companionBattleHint")}</p>
        )}
      </section>
    </div>
  );
}

function UpgradeBtn({
  label,
  cost,
  gold,
  onClick,
}: {
  label: string;
  cost: number | null;
  gold: number;
  onClick: () => void;
}) {
  const t = useTranslations("td");
  if (cost == null) return null;
  const afford = gold >= cost;
  return (
    <button
      type="button"
      disabled={!afford}
      onClick={onClick}
      className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold disabled:opacity-40"
    >
      {label} · {cost}G
      {!afford && ` (${t("needGold")})`}
    </button>
  );
}

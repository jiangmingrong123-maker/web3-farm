"use client";

import { useTranslations } from "next-intl";
import {
  COMPANION_KINDS,
  companionAtk,
  type HeroSave,
} from "@/config/td/rpg";
import {
  activeCompanions,
  upgradeCost,
  type UpgradeKind,
} from "@/lib/td/rpg-storage";
import { TdEquipPanel } from "@/components/td/TdEquipPanel";

type Props = {
  save: HeroSave;
  gold: number;
  locale: string;
  onUpgrade: (kind: UpgradeKind) => void;
};

export function TdRpgHub({ save, gold, locale, onUpgrade }: Props) {
  const t = useTranslations("td");
  const companions = activeCompanions(save);

  return (
    <div className="space-y-4">
      <TdEquipPanel save={save} gold={gold} locale={locale} onUpgrade={onUpgrade} />

      <section className="rounded-xl border border-white/10 bg-surface p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          {t("upgradeTitle")}
        </h3>
        <UpgradeBtn
          label={t("upgradeHero", { lv: save.level })}
          cost={upgradeCost(save, { type: "hero" })}
          gold={gold}
          onClick={() => onUpgrade({ type: "hero" })}
        />
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
                  {unlocked
                    ? ` Lv.${lv} · ${t("statAtk", { v: companionAtk(kind, lv) })}`
                    : ` · ${t("companionLocked")}`}
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

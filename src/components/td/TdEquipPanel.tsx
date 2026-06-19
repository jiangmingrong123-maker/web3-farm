"use client";

import { useTranslations } from "next-intl";
import {
  EQUIP_SLOTS,
  equipBonus,
  equipDisplayName,
  heroCombatStats,
  maxEquipTierForHero,
  type EquipSlot,
  type HeroSave,
} from "@/config/td/rpg";
import { upgradeCost, type UpgradeKind } from "@/lib/td/rpg-storage";

type Props = {
  save: HeroSave;
  gold: number;
  locale: string;
  onUpgrade: (kind: UpgradeKind) => void;
};

const SLOT_LAYOUT: { slot: EquipSlot; grid: string }[] = [
  { slot: "hat", grid: "col-start-2 row-start-1" },
  { slot: "bracelet", grid: "col-start-1 row-start-2" },
  { slot: "weapon", grid: "col-start-3 row-start-2" },
  { slot: "clothes", grid: "col-start-2 row-start-3" },
  { slot: "pants", grid: "col-start-2 row-start-4" },
  { slot: "ring", grid: "col-start-2 row-start-5" },
];

export function TdEquipPanel({ save, gold, locale, onUpgrade }: Props) {
  const t = useTranslations("td");
  const stats = heroCombatStats(save);
  const equipCap = maxEquipTierForHero(save.level);

  return (
    <section className="rounded-xl border border-gold/30 bg-gold/5 p-4">
      <h2 className="mb-1 text-sm font-bold text-gold">{t("heroTitle")}</h2>
      <p className="mb-3 text-xs text-white/45">{t("heroHint")}</p>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-3 grid-rows-5 gap-2 max-w-xs mx-auto lg:mx-0">
          {SLOT_LAYOUT.map(({ slot, grid }) => (
            <EquipSlotCard
              key={slot}
              className={grid}
              slot={slot}
              save={save}
              gold={gold}
              cap={equipCap}
              locale={locale}
              onUpgrade={onUpgrade}
            />
          ))}
          <div className="col-start-2 row-start-2 flex flex-col items-center justify-center rounded-lg border-2 border-gold/40 bg-black/30 px-2 py-3">
            <span className="text-lg font-bold text-gold">Lv.{save.level}</span>
            <span className="text-[10px] text-white/40">{t("heroLabel")}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          <StatChip label="HP" value={stats.maxHp} />
          <StatChip label={t("statAtkShort")} value={stats.atk} />
          <StatChip label={t("statDefShort")} value={stats.def} />
          <StatChip label={t("statCrit")} value={`${stats.crit}%`} />
          <StatChip label={t("statAtkSpd")} value={`${stats.atkSpd}%`} />
          <span className="col-span-full text-[11px] text-white/35">
            {t("equipCapHint", { cap: equipCap })}
          </span>
        </div>
      </div>
    </section>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-white/10 px-2 py-1">
      <span className="text-[10px] text-white/40">{label}</span>
      <p className="font-semibold text-white/90">{value}</p>
    </div>
  );
}

function EquipSlotCard({
  slot,
  save,
  gold,
  cap,
  locale,
  className,
  onUpgrade,
}: {
  slot: EquipSlot;
  save: HeroSave;
  gold: number;
  cap: number;
  locale: string;
  className: string;
  onUpgrade: (kind: UpgradeKind) => void;
}) {
  const t = useTranslations("td");
  const tier = save.equipTier[slot];
  const bonus = equipBonus(slot, tier);
  const name = equipDisplayName(slot, tier, locale);
  const cost = upgradeCost(save, { type: "equip", slot });
  const atCap = tier >= cap;

  const bonusText = [
    bonus.atk ? `+${bonus.atk}${t("statAtkShort")}` : "",
    bonus.def ? `+${bonus.def}${t("statDefShort")}` : "",
    bonus.hp ? `+${bonus.hp}HP` : "",
    bonus.crit ? `+${bonus.crit}%${t("statCritShort")}` : "",
    bonus.atkSpd ? `+${bonus.atkSpd}%${t("statAtkSpdShort")}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`flex flex-col rounded-lg border border-white/15 bg-surface/80 p-2 ${className}`}
    >
      <span className="text-[9px] uppercase tracking-wide text-white/35">
        {EQUIP_SLOTS.includes(slot) ? t(`equip_${slot}`) : slot}
      </span>
      <span className="mt-0.5 text-[11px] font-medium leading-tight text-white/85">
        {name}
      </span>
      <span className="text-[9px] text-gold/80">T{tier}</span>
      {bonusText && (
        <span className="mt-1 text-[9px] leading-snug text-white/45">{bonusText}</span>
      )}
      {cost != null && (
        <button
          type="button"
          disabled={gold < cost}
          onClick={() => onUpgrade({ type: "equip", slot })}
          className="mt-auto pt-1 text-left text-[9px] text-gold disabled:opacity-40"
        >
          {atCap ? t("equipNeedHeroLv") : `${t("upgrade")} · ${cost}G`}
        </button>
      )}
    </div>
  );
}

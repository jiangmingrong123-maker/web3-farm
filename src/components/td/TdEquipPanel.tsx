"use client";

import { useTranslations } from "next-intl";
import { TdHeroPortrait } from "@/components/td/TdHeroPortrait";
import {
  equipBonus,
  equipDisplayName,
  heroCombatStats,
  maxEquipTierForHero,
  type EquipSlot,
  type HeroSave,
} from "@/config/td/rpg";
import type { HeroAvatar } from "@/lib/td/hero-avatar";
import { upgradeCost, type UpgradeKind } from "@/lib/td/rpg-storage";

const SLOT_POS: { slot: EquipSlot; className: string }[] = [
  { slot: "hat", className: "top-0 left-1/2 -translate-x-1/2" },
  { slot: "weapon", className: "top-[68px] right-0" },
  { slot: "bracelet", className: "top-[136px] left-0" },
  { slot: "ring", className: "top-[136px] right-0" },
  { slot: "clothes", className: "bottom-[52px] left-1/2 -translate-x-1/2" },
  { slot: "pants", className: "bottom-0 left-1/2 -translate-x-1/2" },
];

type Props = {
  save: HeroSave;
  gold: number;
  locale: string;
  avatar: HeroAvatar;
  onUpgrade: (kind: UpgradeKind) => void;
};

export function TdEquipPanel({ save, gold, locale, avatar, onUpgrade }: Props) {
  const t = useTranslations("td");
  const stats = heroCombatStats(save);
  const equipCap = maxEquipTierForHero(save.level);

  return (
    <section className="rounded-xl border border-gold/30 bg-gold/5 p-4">
      <h2 className="mb-1 text-sm font-bold text-gold">{t("heroTitle")}</h2>
      <p className="mb-3 text-xs text-white/45">{t("heroHint")}</p>

      <div className="mx-auto max-w-md space-y-4">
        <div className="relative mx-auto h-[340px] w-[280px] rounded-xl border border-emerald-800/50 bg-gradient-to-b from-emerald-950/50 via-emerald-950/20 to-black/60 p-2 shadow-[inset_0_0_40px_rgba(16,80,60,0.25)]">
          <div className="absolute left-1/2 top-[44px] z-0 h-[230px] w-[150px] -translate-x-1/2">
            <TdHeroPortrait avatar={avatar} level={save.level} />
          </div>

          {SLOT_POS.map(({ slot, className }) => (
            <EquipSlotBox
              key={slot}
              slot={slot}
              className={`absolute z-10 w-[78px] ${className}`}
              save={save}
              gold={gold}
              cap={equipCap}
              locale={locale}
              onUpgrade={onUpgrade}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-5">
          <StatChip label="HP" value={stats.maxHp} />
          <StatChip label={t("statAtkShort")} value={stats.atk} />
          <StatChip label={t("statDefShort")} value={stats.def} />
          <StatChip label={t("statCrit")} value={`${stats.crit}%`} />
          <StatChip label={t("statAtkSpd")} value={`${stats.atkSpd}%`} />
        </div>
        <p className="text-center text-[11px] text-white/35">
          {t("equipCapHint", { cap: equipCap })}
        </p>
      </div>
    </section>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-white/10 bg-black/20 px-2 py-1.5 text-center">
      <span className="text-[10px] text-white/40">{label}</span>
      <p className="font-semibold text-white/90">{value}</p>
    </div>
  );
}

function EquipSlotBox({
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

  const bonusLine = [
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
      className={`flex flex-col rounded-md border border-stone-600/80 bg-stone-900/90 p-1.5 shadow-md ${className}`}
      title={`${name}\n${bonusLine}`}
    >
      <span className="text-center text-[8px] uppercase tracking-wider text-emerald-400/70">
        {t(`equip_${slot}`)}
      </span>
      <span className="mt-0.5 line-clamp-2 min-h-[26px] text-center text-[9px] font-medium leading-tight text-stone-100">
        {name}
      </span>
      <span className="text-center text-[8px] font-bold text-gold">T{tier}</span>
      {bonusLine && (
        <span className="mt-0.5 line-clamp-2 text-center text-[7px] leading-tight text-white/45">
          {bonusLine}
        </span>
      )}
      {cost != null && (
        <button
          type="button"
          disabled={gold < cost}
          onClick={() => onUpgrade({ type: "equip", slot })}
          className="mt-1 rounded border border-gold/25 bg-gold/10 py-0.5 text-[8px] text-gold disabled:opacity-40"
        >
          {atCap ? "↑Lv" : `${cost}G`}
        </button>
      )}
    </div>
  );
}

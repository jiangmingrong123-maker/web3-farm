"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { TdHeroHead } from "@/components/td/TdHeroPortrait";
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

/** 红月式人体装备位 — 百分比定位在 200×260 面板上 */
const SLOT_POS: { slot: EquipSlot; style: CSSProperties }[] = [
  { slot: "hat", style: { top: "2%", left: "50%", transform: "translateX(-50%)" } },
  { slot: "ring", style: { top: "34%", left: "2%" } },
  { slot: "bracelet", style: { top: "52%", left: "2%" } },
  { slot: "weapon", style: { top: "36%", right: "2%" } },
  { slot: "clothes", style: { top: "42%", left: "50%", transform: "translateX(-50%)" } },
  { slot: "pants", style: { top: "62%", left: "50%", transform: "translateX(-50%)" } },
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

      <div className="mx-auto max-w-xs space-y-3">
        <div className="relative mx-auto h-[260px] w-[200px] rounded-lg border border-emerald-800/60 bg-gradient-to-b from-emerald-950/60 to-black/70 shadow-[inset_0_0_30px_rgba(16,70,50,0.3)]">
          {/* 人体剪影 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/td/hero-body.svg"
            alt=""
            className="pointer-events-none absolute inset-x-4 bottom-3 top-6 h-[calc(100%-2rem)] w-[calc(100%-2rem)] object-contain opacity-90"
          />

          {/* 头部：Nobody 头像 */}
          <div
            className="absolute z-[5]"
            style={{ top: "14%", left: "50%", transform: "translateX(-50%)" }}
          >
            <TdHeroHead avatar={avatar} level={save.level} />
          </div>

          {SLOT_POS.map(({ slot, style }) => (
            <EquipSlotBox
              key={slot}
              slot={slot}
              style={style}
              save={save}
              gold={gold}
              cap={equipCap}
              locale={locale}
              onUpgrade={onUpgrade}
            />
          ))}
        </div>

        <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
          <StatChip label="HP" value={stats.maxHp} />
          <StatChip label={t("statAtkShort")} value={stats.atk} />
          <StatChip label={t("statDefShort")} value={stats.def} />
          <StatChip label={t("statCrit")} value={`${stats.crit}%`} />
          <StatChip label={t("statAtkSpd")} value={`${stats.atkSpd}%`} />
        </div>
        <p className="text-center text-[10px] text-white/35">
          {t("equipHoverHint")} · {t("equipCapHint", { cap: equipCap })}
        </p>
      </div>
    </section>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-white/10 bg-black/25 px-1 py-1">
      <span className="block text-[9px] text-white/40">{label}</span>
      <span className="font-semibold text-white/85">{value}</span>
    </div>
  );
}

function EquipSlotBox({
  slot,
  save,
  gold,
  cap,
  locale,
  style,
  onUpgrade,
}: {
  slot: EquipSlot;
  save: HeroSave;
  gold: number;
  cap: number;
  locale: string;
  style: CSSProperties;
  onUpgrade: (kind: UpgradeKind) => void;
}) {
  const t = useTranslations("td");
  const tier = save.equipTier[slot];
  const bonus = equipBonus(slot, tier);
  const name = equipDisplayName(slot, tier, locale);
  const cost = upgradeCost(save, { type: "equip", slot });
  const atCap = tier >= cap;

  const bonusLines = [
    bonus.atk ? `+${bonus.atk} ${t("statAtkShort")}` : "",
    bonus.def ? `+${bonus.def} ${t("statDefShort")}` : "",
    bonus.hp ? `+${bonus.hp} HP` : "",
    bonus.crit ? `+${bonus.crit}% ${t("statCrit")}` : "",
    bonus.atkSpd ? `+${bonus.atkSpd}% ${t("statAtkSpd")}` : "",
  ].filter(Boolean);

  const slotLabel = t(`equip_${slot}`);

  return (
    <div className="group absolute z-10" style={style}>
      <div
        className="flex h-11 w-11 cursor-default flex-col items-center justify-center rounded border border-stone-600/90 bg-stone-900/95 shadow-md transition-colors hover:border-gold/50 hover:bg-stone-800"
        aria-label={name}
      >
        <span className="text-[7px] uppercase leading-none text-emerald-500/80">
          {slotLabel.slice(0, 2)}
        </span>
        <span className="mt-0.5 text-[10px] font-bold leading-none text-gold">
          T{tier}
        </span>
      </div>

      {/* 悬停详情 */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden w-[148px] -translate-x-1/2 rounded-md border border-stone-600 bg-stone-950/98 p-2 text-left shadow-xl group-hover:pointer-events-auto group-hover:block">
        <p className="text-[10px] font-medium text-stone-100">{name}</p>
        <p className="text-[9px] text-emerald-400/80">{slotLabel}</p>
        {bonusLines.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-[9px] text-white/55">
            {bonusLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        {cost != null && (
          <button
            type="button"
            disabled={gold < cost}
            onClick={() => onUpgrade({ type: "equip", slot })}
            className="mt-1.5 w-full rounded border border-gold/30 bg-gold/10 py-0.5 text-[9px] text-gold disabled:opacity-40"
          >
            {atCap ? t("equipNeedHeroLv") : `${t("upgrade")} · ${cost}G`}
          </button>
        )}
      </div>
    </div>
  );
}

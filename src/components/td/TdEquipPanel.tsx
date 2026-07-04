"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { ProtagonistAvatar } from "@/components/td/TdHeroPicker";
import {
  EquipDetailSheet,
} from "@/components/td/TdEquipInfo";
import {
  equipItemName,
  equipNameGrid,
  getEquipItem,
  itemStats,
} from "@/config/td/equipment-catalog";
import { expLevelProgress, maxEquipLevelForHero } from "@/config/td/hero-levels";
import {
  EQUIP_NAMES,
  EQUIP_NAMES_EN,
  heroCombatStats,
  type EquipSlot,
  type HeroSave,
} from "@/config/td/rpg";
import { canHeroWearItem } from "@/lib/td/equip-rules";
import {
  heroCombatPowerScore,
  totalEquippedGearScore,
} from "@/lib/td/equip-score";
import { inventoryForSlot, type UpgradeKind } from "@/lib/td/rpg-storage";

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
  locale: string;
  onEquip: (kind: UpgradeKind) => void;
};

export function TdEquipPanel({ save, locale, onEquip }: Props) {
  const t = useTranslations("td");
  const combat = heroCombatStats(save);
  const equipCap = maxEquipLevelForHero(save.level);
  const expProg = expLevelProgress(save.level, save.exp);
  const gearScore = totalEquippedGearScore(save);
  const combatPower = heroCombatPowerScore(save);
  const [activeSlot, setActiveSlot] = useState<EquipSlot>("weapon");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const selectSlot = (slot: EquipSlot) => {
    setActiveSlot(slot);
    setPreviewId(null);
  };

  const equipped = getEquipItem(save.equipped[activeSlot]);
  const equippedStats = equipped ? itemStats(equipped) : null;
  const previewItem = previewId ? getEquipItem(previewId) : null;
  const displayItem = previewItem ?? equipped;
  const candidates = inventoryForSlot(save, activeSlot).filter(
    (id) => id !== save.equipped[activeSlot],
  );
  const canWear =
    previewId != null &&
    previewId !== save.equipped[activeSlot] &&
    save.inventory.includes(previewId) &&
    canHeroWearItem(save, previewId);

  return (
    <section className="rounded-xl border border-gold/30 bg-gold/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-gold">{t("heroTitle")}</h2>
          <p className="text-xs text-white/45">{t("heroHint")}</p>
        </div>
        <div className="text-right text-[10px]">
          <p className="text-gold">{t("heroCombatPower", { power: combatPower })}</p>
          <p className="text-white/45">{t("equipTotalScore", { score: gearScore })}</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-3">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:justify-center">
          <div className="relative h-[220px] w-[200px] shrink-0 overflow-visible rounded-lg border border-emerald-800/60 bg-gradient-to-b from-emerald-950/60 to-black/70 shadow-[inset_0_0_30px_rgba(16,70,50,0.3)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/td/hero-body.svg"
            alt=""
            className="pointer-events-none absolute inset-x-4 bottom-3 top-6 h-[calc(100%-2rem)] w-[calc(100%-2rem)] object-contain opacity-90"
          />

          <div
            className="pointer-events-none absolute z-[5]"
            style={{ top: "8%", left: "50%", transform: "translateX(-50%)" }}
          >
            <ProtagonistAvatar
              id={save.protagonistId}
              locale={locale}
              level={save.level}
            />
          </div>

          {SLOT_POS.map(({ slot, style }) => (
            <EquipSlotButton
              key={slot}
              slot={slot}
              style={style}
              save={save}
              cap={equipCap}
              locale={locale}
              selected={activeSlot === slot}
              onSelect={() => selectSlot(slot)}
            />
          ))}
          </div>

          {displayItem && (
            <div className="w-full sm:w-[268px] sm:shrink-0">
              <EquipDetailSheet
                item={displayItem}
                locale={locale}
                cap={equipCap}
                t={t}
                wornItem={
                  previewItem && equipped && previewItem.id !== equipped.id
                    ? equipped
                    : undefined
                }
                wornStats={
                  previewItem && equipped && equippedStats && previewItem.id !== equipped.id
                    ? equippedStats
                    : undefined
                }
                footer={
                  <>
                    {candidates.length > 0 && (
                      <div className="mb-1.5 flex gap-1 overflow-x-auto pb-0.5">
                        {candidates.slice(0, 5).map((id) => {
                          const opt = getEquipItem(id);
                          if (!opt) return null;
                          const active = previewId === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setPreviewId(active ? null : id)}
                              className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] ${
                                active
                                  ? "border-gold/50 bg-gold/15 text-gold"
                                  : "border-white/15 text-white/60"
                              }`}
                            >
                              {equipNameGrid(equipItemName(opt, locale))}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {canWear && previewId && (
                      <button
                        type="button"
                        onClick={() =>
                          onEquip({ type: "equip", slot: activeSlot, itemId: previewId })
                        }
                        className="w-full rounded border border-emerald-500/50 bg-emerald-950/50 py-1.5 text-[11px] font-semibold text-emerald-300"
                      >
                        {t("equipWear")}
                      </button>
                    )}
                  </>
                }
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-gold">
              {t("heroLevel", { lv: save.level })}
            </span>
            <span className="text-white/45">
              {expProg.isMax
                ? t("heroLevelMax")
                : t("heroExpProgress", {
                    cur: expProg.into,
                    need: expProg.span,
                  })}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/50">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
              style={{ width: `${expProg.pct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
          <StatChip label={t("statHpShort")} value={combat.maxHp} />
          <StatChip label={t("statStrAtkShort")} value={combat.strAtk} />
          <StatChip label={t("statAgiAtkShort")} value={combat.agiAtk} />
          <StatChip label={t("statDefShort")} value={combat.def} />
          <StatChip label={t("statDodge")} value={`${combat.dodge}%`} />
          <StatChip label={t("statMagDmg")} value={combat.magDmg} />
          <StatChip label={t("statMp")} value={combat.maxMp} />
        </div>

        <p className="text-center text-[10px] text-white/35">
          {t("equipInteractHint")} · {t("equipCapHint", { cap: equipCap })}
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

function EquipSlotButton({
  slot,
  save,
  cap,
  locale,
  style,
  selected,
  onSelect,
}: {
  slot: EquipSlot;
  save: HeroSave;
  cap: number;
  locale: string;
  style: CSSProperties;
  selected: boolean;
  onSelect: () => void;
}) {
  const itemId = save.equipped[slot];
  const item = getEquipItem(itemId);
  const slotLabel = locale === "zh" ? EQUIP_NAMES[slot] : EQUIP_NAMES_EN[slot];
  const overCap = item && item.level > cap;

  return (
    <button
      type="button"
      className={`absolute z-10 flex h-11 w-11 flex-col items-center justify-center rounded border bg-stone-900/95 shadow-md transition-colors ${
        selected
          ? "border-gold ring-2 ring-gold/50"
          : overCap
            ? "border-red-500/60 hover:border-red-400/80"
            : "border-stone-600/90 hover:border-gold/50"
      }`}
      style={style}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={item ? equipItemName(item, locale) : slotLabel}
    >
      <span className="text-[7px] uppercase leading-none text-emerald-500/80">
        {slotLabel.slice(0, 2)}
      </span>
      <span className="mt-0.5 max-w-[40px] truncate px-0.5 text-[8px] font-bold leading-none text-gold">
        {item ? `L${item.level}` : "—"}
      </span>
    </button>
  );
}

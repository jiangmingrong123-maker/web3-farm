"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { EquipDetailSheet } from "@/components/td/TdEquipInfo";
import {
  equipItemName,
  equipNameGrid,
  getEquipItem,
  itemStats,
  RARITY_TEXT_CLASS,
  STARTER_EQUIP_IDS,
} from "@/config/td/equipment-catalog";
import { equipRecycleGold } from "@/config/td/economy";
import { maxEquipLevelForHero } from "@/config/td/hero-levels";
import { type HeroSave } from "@/config/td/rpg";
import { canHeroWearItem } from "@/lib/td/equip-rules";
import { scoreEquipItem, scoreEquipItemId } from "@/lib/td/equip-score";
import type { UpgradeKind } from "@/lib/td/rpg-storage";

type Props = {
  save: HeroSave;
  locale: string;
  onUpgrade: (kind: UpgradeKind) => void;
};

export function TdBackpack({ save, locale, onUpgrade }: Props) {
  const t = useTranslations("td");
  const cap = maxEquipLevelForHero(save.level);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ids = useMemo(
    () =>
      [...save.inventory]
        .filter((id) => !Object.values(STARTER_EQUIP_IDS).includes(id))
        .sort((a, b) => scoreEquipItemId(b) - scoreEquipItemId(a)),
    [save.inventory],
  );

  useEffect(() => {
    if (ids.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !ids.includes(selectedId)) {
      setSelectedId(ids[0]!);
    }
  }, [ids, selectedId]);

  const selected = selectedId ? getEquipItem(selectedId) : null;
  const equippedId = selected ? save.equipped[selected.slot] : null;
  const equipped = equippedId ? getEquipItem(equippedId) : null;
  const equippedStats = equipped ? itemStats(equipped) : null;
  const isEquipped = selectedId != null && equippedId === selectedId;
  const canWear =
    selectedId != null && !isEquipped && canHeroWearItem(save, selectedId);
  const sellGold = selected ? equipRecycleGold(selected.level, selected.rarity) : 0;

  return (
    <section className="flex max-h-[70dvh] flex-col rounded-xl border border-white/10 bg-surface p-3">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
          {t("inventoryTitle")}
        </h3>
        <span className="text-[11px] text-white/35">
          {t("inventoryCount", { count: ids.length })}
        </span>
      </div>
      <p className="mb-2 shrink-0 px-1 text-[11px] text-white/35">{t("inventoryHint")}</p>

      {ids.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/40">
          {t("inventoryEmpty")}
        </p>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-0.5">
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
              {ids.map((id) => {
                const item = getEquipItem(id);
                if (!item) return null;
                const worn = save.equipped[item.slot] === id;
                const active = selectedId === id;
                const itemScore = scoreEquipItem(item);
                const slotEquippedScore = scoreEquipItemId(save.equipped[item.slot]);
                const better = !worn && itemScore > slotEquippedScore;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded border px-0.5 py-1 text-center transition-colors ${
                      active
                        ? "border-gold/70 bg-gold/15 ring-1 ring-gold/40"
                        : "border-white/15 bg-black/35 hover:border-white/35"
                    }`}
                  >
                    {better && (
                      <span className="absolute -right-0.5 -top-0.5 text-[8px] text-emerald-400">
                        ↑
                      </span>
                    )}
                    {worn && (
                      <span className="absolute -left-0.5 -top-0.5 text-[8px] text-emerald-400">
                        ✓
                      </span>
                    )}
                    <span
                      className={`max-w-full px-0.5 text-[9px] font-semibold leading-tight ${RARITY_TEXT_CLASS[item.rarity]}`}
                    >
                      {equipNameGrid(equipItemName(item, locale))}
                    </span>
                    <span className="mt-0.5 px-0.5 text-[7px] leading-tight text-amber-300/95">
                      {t("equipScoreGrid", { score: itemScore })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selected && selectedId && (
            <div className="mt-2 shrink-0 border-t border-white/10 pt-2">
              <EquipDetailSheet
                item={selected}
                locale={locale}
                cap={cap}
                t={t}
                sellGold={sellGold}
                wornItem={
                  equipped && !isEquipped && equipped.id !== selected.id ? equipped : undefined
                }
                wornStats={
                  equippedStats && !isEquipped && equipped?.id !== selected.id
                    ? equippedStats
                    : undefined
                }
                footer={
                  <div className="space-y-1">
                    {isEquipped && (
                      <p className="text-center text-[10px] text-emerald-400">
                        {t("inventoryEquipped")}
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        disabled={isEquipped}
                        onClick={() => onUpgrade({ type: "discard", itemId: selectedId })}
                        className="rounded border border-red-500/40 bg-red-950/40 py-1.5 text-[10px] text-red-300 disabled:opacity-35"
                      >
                        {t("inventoryDiscard")}
                      </button>
                      <button
                        type="button"
                        disabled={!canWear}
                        onClick={() =>
                          onUpgrade({
                            type: "equip",
                            slot: selected.slot,
                            itemId: selectedId,
                          })
                        }
                        className="rounded border border-emerald-500/50 bg-emerald-950/50 py-1.5 text-[10px] font-semibold text-emerald-300 disabled:opacity-35"
                      >
                        {t("equipWear")}
                      </button>
                      <button
                        type="button"
                        disabled
                        title={t("inventoryEnhanceSoon")}
                        className="rounded border border-white/15 bg-black/30 py-1.5 text-[10px] text-white/35"
                      >
                        {t("inventoryEnhance")}
                      </button>
                    </div>
                    {!canWear && !isEquipped && (
                      <p className="text-center text-[9px] text-red-400">
                        {t("equipNeedHeroLv")}
                      </p>
                    )}
                  </div>
                }
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}

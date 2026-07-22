"use client";

import { useTranslations } from "next-intl";
import { getEquipItem, itemStats } from "@/config/td/equipment-catalog";
import { maxEquipLevelForHero } from "@/config/td/hero-levels";
import type { HeroSave } from "@/config/td/rpg";
import { EquipDetailSheet } from "@/components/td/TdEquipInfo";
import type { ShopItemDef } from "@/config/td/shop";
import { shopItemLocalized } from "@/config/td/shop";

type Props = {
  items: ShopItemDef[];
  save: HeroSave;
  locale: string;
  gold: number;
  loading?: boolean;
  onBuy: (itemId: string) => void;
};

export function TdShopGearList({ items, save, locale, gold, loading, onBuy }: Props) {
  const t = useTranslations("td");
  const cap = maxEquipLevelForHero(save.level);

  return (
    <div className="space-y-3">
      {items.map((raw) => {
        const shopItem = shopItemLocalized(raw, locale);
        const gear = shopItem.gearId ? getEquipItem(shopItem.gearId) : null;
        if (!gear) return null;
        const wornId = save.equipped[gear.slot];
        const worn = getEquipItem(wornId);
        const wornStats = worn ? itemStats(worn) : undefined;
        const canBuy = gold >= shopItem.price && !loading;

        return (
          <div
            key={shopItem.id}
            className="overflow-hidden rounded-xl border border-white/15 bg-surface"
          >
            <div className="flex items-start justify-between gap-2 border-b border-white/10 bg-black/25 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-white/90">{shopItem.name}</p>
                <p className="mt-0.5 text-[11px] text-white/45">{shopItem.description}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-gold">{shopItem.price}G</span>
            </div>
            <div className="p-2">
              <EquipDetailSheet
                item={gear}
                locale={locale}
                cap={cap}
                t={t}
                wornItem={worn && worn.id !== gear.id ? worn : undefined}
                wornStats={worn && worn.id !== gear.id ? wornStats : undefined}
                footer={
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => onBuy(shopItem.id)}
                    className="w-full rounded border border-emerald-500/50 bg-emerald-950/50 py-1.5 text-[11px] font-semibold text-emerald-300 disabled:opacity-40"
                  >
                    {t("buy")}
                  </button>
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

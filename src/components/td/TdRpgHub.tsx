"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  SHOP_BUFF_ITEMS,
  SHOP_GEAR_ITEMS,
  SHOP_MATERIAL_ITEMS,
} from "@/config/td/shop";
import type { EquipRarity } from "@/config/td/equipment-catalog";
import type { HeroSave } from "@/config/td/rpg";
import { TdBackpack } from "@/components/td/TdBackpack";
import { TdShopGearList } from "@/components/td/TdShopGearList";
import { TdEquipPanel } from "@/components/td/TdEquipPanel";
import { TdHubDock, hubPanelTitleKey, type HubPanelId } from "@/components/td/TdHubDock";
import { TdHubMain } from "@/components/td/TdHubMain";
import { TdHubSheet } from "@/components/td/TdHubSheet";
import { TdMapProgress } from "@/components/td/TdMapProgress";
import { TdStatAllocator } from "@/components/td/TdStatAllocator";
import { TdSweepDrawer } from "@/components/td/TdSweepDrawer";
import { TdSystemChat } from "@/components/td/TdSystemChat";
import type { MapSweepMode } from "@/lib/td/map-sweep";
import type { SystemLogLine } from "@/lib/td/system-log";
import type { UpgradeKind } from "@/lib/td/rpg-storage";

type ShopTab = "buff" | "gear" | "material";

type Props = {
  save: HeroSave;
  locale: string;
  gold: number;
  stamina: number;
  farmPoints: number;
  mapSweepUnlocked: boolean;
  activeRun: boolean;
  sweepLoading?: boolean;
  loading?: boolean;
  refillCost: number;
  goldExchangeCost: number;
  buffIds: string[];
  buffExpiry: Record<string, number>;
  sweepOpen: boolean;
  systemLog: SystemLogLine[];
  sweepAutoEquip: boolean;
  sweepRecycleRarities: EquipRarity[];
  onSweepOpenChange: (open: boolean) => void;
  onSweepAutoEquipChange: (value: boolean) => void;
  onSweepRecycleRaritiesChange: (value: EquipRarity[]) => void;
  onUpgrade: (kind: UpgradeKind) => void;
  onUnlockMapSweep: () => void;
  onMapSweep: (mapId: number, mode: MapSweepMode, runs: number) => void;
  onRefill: () => void;
  onExchangeGold: () => void;
  onBuyShop: (itemId: string) => void;
  formatBuffExpiry: (ms: number) => string;
  fightMapId?: number;
  fightScene?: number;
  fightRounds?: number;
  fastClearCost?: number;
  buffLabels?: string[];
};

export function TdRpgHub({
  save,
  locale,
  gold,
  stamina,
  farmPoints,
  mapSweepUnlocked,
  activeRun,
  sweepLoading,
  loading,
  refillCost,
  goldExchangeCost,
  buffIds,
  buffExpiry,
  sweepOpen,
  systemLog,
  sweepAutoEquip,
  sweepRecycleRarities,
  onSweepOpenChange,
  onSweepAutoEquipChange,
  onSweepRecycleRaritiesChange,
  onUpgrade,
  onUnlockMapSweep,
  onMapSweep,
  onRefill,
  onExchangeGold,
  onBuyShop,
  formatBuffExpiry,
  fightMapId,
  fightScene,
  fightRounds,
  fastClearCost,
  buffLabels,
}: Props) {
  const t = useTranslations("td");
  const [panel, setPanel] = useState<HubPanelId | null>(null);
  const [shopTab, setShopTab] = useState<ShopTab>("buff");

  const togglePanel = (id: HubPanelId) => {
    onSweepOpenChange(false);
    setPanel((prev) => (prev === id ? null : id));
  };

  const toggleSweep = () => {
    setPanel(null);
    onSweepOpenChange(!sweepOpen);
  };

  const materialSummary = Object.entries(save.materials ?? {})
    .filter(([, n]) => n > 0)
    .map(([id, n]) => {
      const shopMat = SHOP_MATERIAL_ITEMS.find((m) => m.materialId === id);
      return `${shopMat?.name ?? id}×${n}`;
    })
    .join(" · ");

  const panelContent = (() => {
    switch (panel) {
      case "stats":
        return <TdStatAllocator save={save} locale={locale} onUpgrade={onUpgrade} />;
      case "equip":
        return <TdEquipPanel save={save} locale={locale} onEquip={onUpgrade} />;
      case "backpack":
        return <TdBackpack save={save} locale={locale} onUpgrade={onUpgrade} />;
      case "shop":
        return (
          <div className="space-y-3">
            <p className="text-xs text-white/45">
              {t("shopGoldHint", { gold })}
            </p>
            {materialSummary && (
              <p className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-[11px] text-cyan-200/90">
                {t("shopMaterialsOwned", { list: materialSummary })}
              </p>
            )}
            <div className="flex gap-1">
              {(
                [
                  ["buff", t("shopTabBuff")],
                  ["gear", t("shopTabGear")],
                  ["material", t("shopTabMaterial")],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setShopTab(tab)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[10px] ${
                    shopTab === tab
                      ? "border-gold/50 bg-gold/10 text-gold"
                      : "border-white/15 text-white/55"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {shopTab === "buff" && buffIds.length > 0 && (
              <div className="rounded-lg border border-gold/25 bg-gold/5 p-3">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
                  {t("activeBuffs")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {buffIds.map((id) => {
                    const item = SHOP_BUFF_ITEMS.find((i) => i.id === id);
                    const exp = buffExpiry[id] ?? 0;
                    return (
                      <span
                        key={id}
                        className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] text-gold"
                      >
                        {item?.name ?? id} · {formatBuffExpiry(Math.max(0, exp - Date.now()))}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="grid gap-2">
              {shopTab === "gear" ? (
                <TdShopGearList
                  items={SHOP_GEAR_ITEMS}
                  save={save}
                  locale={locale}
                  gold={gold}
                  loading={loading}
                  onBuy={onBuyShop}
                />
              ) : (
                (shopTab === "buff" ? SHOP_BUFF_ITEMS : SHOP_MATERIAL_ITEMS).map((item) => {
                const active = buffIds.includes(item.id);
                const canBuy = gold >= item.price && !loading;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-surface p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="mt-0.5 text-[11px] text-white/45">{item.description}</p>
                      </div>
                      <span className="shrink-0 text-sm text-gold">{item.price}G</span>
                    </div>
                    {active ? (
                      <p className="mt-2 text-xs text-green-400">{t("buffActive")}</p>
                    ) : (
                      <button
                        type="button"
                        disabled={!canBuy}
                        onClick={() => onBuyShop(item.id)}
                        className="mt-2 rounded-lg border border-white/15 px-3 py-1 text-xs disabled:opacity-40"
                      >
                        {t("buy")}
                      </button>
                    )}
                  </div>
                );
              })
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-3">
      <TdHubMain
        save={save}
        locale={locale}
        gold={gold}
        stamina={stamina}
        farmPoints={farmPoints}
        loading={loading}
        refillCost={refillCost}
        goldExchangeCost={goldExchangeCost}
        fightMapId={fightMapId}
        fightScene={fightScene}
        fightRounds={fightRounds}
        fastClearCost={fastClearCost}
        buffLabels={buffLabels}
        onOpenPanel={(id) => {
          onSweepOpenChange(false);
          setPanel(id);
        }}
        onRefill={onRefill}
        onExchangeGold={onExchangeGold}
      />

      <TdMapProgress save={save} locale={locale} />

      <TdSystemChat lines={systemLog} locale={locale} />

      <TdSweepDrawer
        open={sweepOpen}
        onClose={() => onSweepOpenChange(false)}
        save={save}
        locale={locale}
        gold={gold}
        mapSweepUnlocked={mapSweepUnlocked}
        stamina={stamina}
        farmPoints={farmPoints}
        activeRun={activeRun}
        loading={sweepLoading}
        autoEquip={sweepAutoEquip}
        recycleRarities={sweepRecycleRarities}
        onAutoEquipChange={onSweepAutoEquipChange}
        onRecycleRaritiesChange={onSweepRecycleRaritiesChange}
        systemLog={systemLog}
        onUnlock={onUnlockMapSweep}
        onSweep={onMapSweep}
      />

      <TdHubSheet
        open={panel != null}
        title={panel ? t(hubPanelTitleKey(panel)) : ""}
        onClose={() => setPanel(null)}
      >
        {panelContent}
      </TdHubSheet>

      <TdHubDock
        active={panel}
        sweepOpen={sweepOpen}
        onSelect={togglePanel}
        onSweep={toggleSweep}
      />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { TdMapSweep } from "@/components/td/TdMapSweep";
import { TdSystemChat } from "@/components/td/TdSystemChat";
import {
  EQUIP_RARITIES,
  RARITY_TEXT_CLASS,
  type EquipRarity,
} from "@/config/td/equipment-catalog";
import type { MapSweepMode } from "@/lib/td/map-sweep";
import { toggleRecycleRarity } from "@/lib/td/sweep-prefs";
import type { HeroSave } from "@/config/td/rpg";
import type { SystemLogLine } from "@/lib/td/system-log";

type Props = {
  open: boolean;
  onClose: () => void;
  save: HeroSave;
  locale: string;
  gold: number;
  mapSweepUnlocked: boolean;
  stamina: number;
  farmPoints: number;
  activeRun: boolean;
  loading?: boolean;
  autoEquip: boolean;
  recycleRarities: EquipRarity[];
  onAutoEquipChange: (value: boolean) => void;
  onRecycleRaritiesChange: (value: EquipRarity[]) => void;
  systemLog: SystemLogLine[];
  onUnlock: () => void;
  onSweep: (mapId: number, mode: MapSweepMode, runs: number) => void;
};

export function TdSweepDrawer({
  open,
  onClose,
  save,
  locale,
  gold,
  mapSweepUnlocked,
  stamina,
  farmPoints,
  activeRun,
  loading,
  autoEquip,
  recycleRarities,
  onAutoEquipChange,
  onRecycleRaritiesChange,
  systemLog,
  onUnlock,
  onSweep,
}: Props) {
  const t = useTranslations("td");
  const zh = locale === "zh";

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const rarityLabel = (r: EquipRarity) => {
    if (!zh) {
      const map: Record<EquipRarity, string> = {
        普通: "Common",
        高级: "Fine",
        稀有: "Rare",
        传说: "Legend",
        特制: "Unique",
      };
      return map[r];
    }
    return r;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="close"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-violet-500/30 bg-[#0a0710] shadow-2xl"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-3">
          <div>
            <h2 className="text-sm font-semibold text-violet-200">{t("mapSweepTitle")}</h2>
            <p className="text-[10px] text-white/40">
              {t("gold")} {gold} · {t("stamina")} {stamina}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          <label className="mb-2 flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <input
              type="checkbox"
              checked={!autoEquip}
              onChange={(e) => onAutoEquipChange(!e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-[11px] leading-snug text-white/70">{t("sweepNoAutoEquip")}</span>
          </label>

          <div className="mb-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <p className="mb-2 text-[11px] font-medium text-white/75">{t("sweepRecycleTitle")}</p>
            <p className="mb-2 text-[10px] leading-snug text-white/40">{t("sweepRecycleHint")}</p>
            <div className="flex flex-wrap gap-2">
              {EQUIP_RARITIES.map((rarity) => {
                const checked = recycleRarities.includes(rarity);
                return (
                  <label
                    key={rarity}
                    className={`flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-[10px] ${
                      checked
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        onRecycleRaritiesChange(
                          toggleRecycleRarity(recycleRarities, rarity, e.target.checked),
                        )
                      }
                      className="shrink-0"
                    />
                    <span className={RARITY_TEXT_CLASS[rarity]}>{rarityLabel(rarity)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <TdMapSweep
            embedded
            save={save}
            locale={locale}
            mapSweepUnlocked={mapSweepUnlocked}
            stamina={stamina}
            farmPoints={farmPoints}
            activeRun={activeRun}
            loading={loading}
            onUnlock={onUnlock}
            onSweep={onSweep}
          />

          <div className="mt-3">
            <TdSystemChat
              lines={systemLog}
              locale={locale}
              compact
              defaultFilter="sweep"
            />
          </div>
        </div>
      </aside>
    </div>
  );
}

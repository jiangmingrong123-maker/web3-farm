"use client";

import { useTranslations } from "next-intl";

export type HubPanelId = "stats" | "equip" | "backpack" | "shop";

type DockItem = {
  id: HubPanelId | "sweep";
  glyph: string;
  labelKey: "dockStats" | "dockEquip" | "dockBackpack" | "dockShop" | "dockSweep";
  accent: string;
  isSweep?: boolean;
};

const DOCK: DockItem[] = [
  { id: "stats", glyph: "属", labelKey: "dockStats", accent: "border-sky-500/40 bg-sky-500/10 text-sky-200" },
  { id: "equip", glyph: "装", labelKey: "dockEquip", accent: "border-amber-500/40 bg-amber-500/10 text-amber-200" },
  { id: "backpack", glyph: "包", labelKey: "dockBackpack", accent: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" },
  { id: "shop", glyph: "店", labelKey: "dockShop", accent: "border-gold/40 bg-gold/10 text-gold" },
  {
    id: "sweep",
    glyph: "扫",
    labelKey: "dockSweep",
    accent: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200",
    isSweep: true,
  },
];

type Props = {
  active: HubPanelId | null;
  sweepOpen: boolean;
  onSelect: (id: HubPanelId) => void;
  onSweep: () => void;
};

export function TdHubDock({ active, sweepOpen, onSelect, onSweep }: Props) {
  const t = useTranslations("td");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#08060c]/95 backdrop-blur-md"
      style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2 py-1.5">
        {DOCK.map((item) => {
          const isActive = item.isSweep ? sweepOpen : active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (item.isSweep ? onSweep() : onSelect(item.id as HubPanelId))}
              className={`flex flex-col items-center rounded-lg border px-1 py-2 transition-colors ${
                isActive
                  ? `${item.accent} ring-1 ring-white/20`
                  : "border-white/10 bg-black/30 text-white/55 hover:border-white/25 hover:text-white/80"
              }`}
            >
              <span className="text-sm font-bold leading-none">{item.glyph}</span>
              <span className="mt-0.5 truncate text-[9px] leading-tight">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function hubPanelTitleKey(id: HubPanelId): DockItem["labelKey"] {
  return DOCK.find((d) => d.id === id && !d.isSweep)!.labelKey;
}

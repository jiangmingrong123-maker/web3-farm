import type { EquipRarity } from "@/config/td/equipment-catalog";
import { EQUIP_RARITIES } from "@/config/td/equipment-catalog";

const KEY = "td_sweep_prefs";

export type SweepPrefs = {
  autoEquip: boolean;
  /** 勾选的品级会在扫图/挂机时直接卖掉 */
  recycleRarities: EquipRarity[];
};

function storageKey(wallet: string): string {
  return `${KEY}:${wallet.toLowerCase()}`;
}

function parseRecycleRarities(raw: unknown, legacyAutoRecycle?: boolean): EquipRarity[] {
  if (Array.isArray(raw)) {
    return raw.filter((r): r is EquipRarity => EQUIP_RARITIES.includes(r as EquipRarity));
  }
  if (legacyAutoRecycle === true) return ["普通"];
  return [];
}

export function defaultSweepPrefs(): SweepPrefs {
  return { autoEquip: true, recycleRarities: [] };
}

export function loadSweepPrefs(wallet: string): SweepPrefs {
  if (typeof window === "undefined") return defaultSweepPrefs();
  try {
    const raw = localStorage.getItem(storageKey(wallet));
    if (!raw) return defaultSweepPrefs();
    const parsed = JSON.parse(raw) as Partial<SweepPrefs & { autoRecycle?: boolean }>;
    return {
      autoEquip: parsed.autoEquip !== false,
      recycleRarities: parseRecycleRarities(parsed.recycleRarities, parsed.autoRecycle),
    };
  } catch {
    return defaultSweepPrefs();
  }
}

export function saveSweepPrefs(wallet: string, prefs: SweepPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(wallet), JSON.stringify(prefs));
}

export function toggleRecycleRarity(
  current: EquipRarity[],
  rarity: EquipRarity,
  on: boolean,
): EquipRarity[] {
  if (on) return current.includes(rarity) ? current : [...current, rarity];
  return current.filter((r) => r !== rarity);
}

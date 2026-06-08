import type { TraitRarityStat } from "@/lib/rarity/types";
import nobodySampleStats from "../../data/trait-rarity/nobody-v1.sample.json";

export function loadTraitStats(tableId: string): Map<string, TraitRarityStat> {
  const map = new Map<string, TraitRarityStat>();

  if (tableId !== "nobody_stats_v1") {
    return map;
  }

  for (const row of nobodySampleStats as TraitRarityStat[]) {
    const key = `${row.trait_type.toLowerCase()}::${String(row.trait_value).trim()}`;
    map.set(key, row);
  }

  return map;
}

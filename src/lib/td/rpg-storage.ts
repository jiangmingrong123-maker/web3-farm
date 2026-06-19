import {
  COMPANION_KINDS,
  COMPANION_UNLOCK_GOLD,
  companionLevelCost,
  defaultHeroSave,
  equipLevelCost,
  heroLevelCost,
  MAX_COMPANION_LEVEL,
  MAX_EQUIP_LEVEL,
  MAX_HERO_LEVEL,
  type CompanionKind,
  type EquipSlot,
  type HeroSave,
} from "@/config/td/rpg";

const KEY = "td_rpg_save";

export function loadHeroSave(wallet: string): HeroSave {
  if (typeof window === "undefined") return defaultHeroSave();
  try {
    const raw = localStorage.getItem(`${KEY}:${wallet.toLowerCase()}`);
    if (!raw) return defaultHeroSave();
    const parsed = JSON.parse(raw) as HeroSave;
    return { ...defaultHeroSave(), ...parsed };
  } catch {
    return defaultHeroSave();
  }
}

export function saveHeroSave(wallet: string, save: HeroSave) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${KEY}:${wallet.toLowerCase()}`, JSON.stringify(save));
}

export type UpgradeKind =
  | { type: "hero" }
  | { type: "equip"; slot: EquipSlot }
  | { type: "companion"; kind: CompanionKind }
  | { type: "unlock"; kind: CompanionKind };

export function upgradeCost(save: HeroSave, kind: UpgradeKind): number | null {
  if (kind.type === "hero") {
    if (save.level >= MAX_HERO_LEVEL) return null;
    return heroLevelCost(save.level);
  }
  if (kind.type === "equip") {
    const lv = save.equipLevel[kind.slot];
    if (lv >= MAX_EQUIP_LEVEL) return null;
    return equipLevelCost(lv);
  }
  if (kind.type === "companion") {
    if (!save.companionUnlocked[kind.kind]) return null;
    const lv = save.companionLevel[kind.kind];
    if (lv >= MAX_COMPANION_LEVEL) return null;
    return companionLevelCost(lv);
  }
  if (kind.type === "unlock") {
    if (save.companionUnlocked[kind.kind]) return null;
    return COMPANION_UNLOCK_GOLD[kind.kind];
  }
  return null;
}

export function applyUpgrade(save: HeroSave, kind: UpgradeKind): HeroSave | null {
  const cost = upgradeCost(save, kind);
  if (cost == null) return null;
  const next = structuredClone(save);
  if (kind.type === "hero") {
    next.level += 1;
  } else if (kind.type === "equip") {
    next.equipLevel[kind.slot] += 1;
  } else if (kind.type === "companion") {
    next.companionLevel[kind.kind] += 1;
  } else if (kind.type === "unlock") {
    next.companionUnlocked[kind.kind] = true;
    next.companionLevel[kind.kind] = 1;
  }
  return next;
}

export function activeCompanions(save: HeroSave): CompanionKind[] {
  return COMPANION_KINDS.filter((k) => save.companionUnlocked[k]);
}

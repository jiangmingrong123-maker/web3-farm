import {
  COMPANION_KINDS,
  COMPANION_UNLOCK_GOLD,
  companionLevelCost,
  defaultEquipTier,
  defaultHeroSave,
  equipTierCost,
  heroLevelCost,
  maxEquipTierForHero,
  MAX_COMPANION_LEVEL,
  MAX_EQUIP_TIER,
  MAX_HERO_LEVEL,
  type CompanionKind,
  type EquipSlot,
  type HeroSave,
} from "@/config/td/rpg";

const KEY = "td_rpg_save";

function migrateSave(parsed: Record<string, unknown>): HeroSave {
  const base = defaultHeroSave();
  const level = typeof parsed.level === "number" ? parsed.level : base.level;

  let equipTier = base.equipTier;
  if (parsed.equipTier && typeof parsed.equipTier === "object") {
    equipTier = { ...defaultEquipTier(), ...(parsed.equipTier as HeroSave["equipTier"]) };
  } else if (parsed.equipLevel && typeof parsed.equipLevel === "object") {
    const old = parsed.equipLevel as Record<string, number>;
    equipTier = {
      weapon: old.weapon ?? 1,
      hat: old.accessory ?? 1,
      clothes: old.armor ?? 1,
      pants: old.armor ?? 1,
      ring: 1,
      bracelet: 1,
    };
  }

  return {
    level,
    equipTier,
    companionLevel: {
      ...base.companionLevel,
      ...(parsed.companionLevel as HeroSave["companionLevel"] | undefined),
    },
    companionUnlocked: {
      ...base.companionUnlocked,
      ...(parsed.companionUnlocked as HeroSave["companionUnlocked"] | undefined),
    },
  };
}

export function loadHeroSave(wallet: string): HeroSave {
  if (typeof window === "undefined") return defaultHeroSave();
  try {
    const raw = localStorage.getItem(`${KEY}:${wallet.toLowerCase()}`);
    if (!raw) return defaultHeroSave();
    return migrateSave(JSON.parse(raw) as Record<string, unknown>);
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
    const tier = save.equipTier[kind.slot];
    const cap = maxEquipTierForHero(save.level);
    if (tier >= MAX_EQUIP_TIER || tier >= cap) return null;
    return equipTierCost(tier);
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
  if (upgradeCost(save, kind) == null) return null;
  const next = structuredClone(save);
  if (kind.type === "hero") {
    next.level += 1;
  } else if (kind.type === "equip") {
    next.equipTier[kind.slot] += 1;
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

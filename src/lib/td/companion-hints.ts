import { maxAllySlots } from "@/config/td/battle-squads";
import {
  COMPANION_KINDS,
  COMPANION_UNLOCK_GOLD,
  ensureCompanionMaps,
  type HeroSave,
} from "@/config/td/rpg";
import {
  MAX_CULTIVATE_LEVEL,
  MAX_NEIDAN_LEVEL,
  NEIDAN_SLOTS,
} from "@/config/td/pet-catalog";
import { alliesInBattle } from "@/lib/td/battle-party";
import { upgradeCost } from "@/lib/td/rpg-storage";

export function companionHubFlags(save: HeroSave, gold: number) {
  const s = ensureCompanionMaps(save);
  const deployed = alliesInBattle(s);
  const slots = maxAllySlots(s.level);
  let companionUnlockable = false;
  let companionUpgradeable = false;

  for (const kind of COMPANION_KINDS) {
    const unlockGold = COMPANION_UNLOCK_GOLD[kind];
    if (unlockGold > 0 && !s.companionUnlocked[kind] && gold >= unlockGold) {
      companionUnlockable = true;
    }
    const levelCost = upgradeCost(s, { type: "companion", kind });
    if (levelCost != null && gold >= levelCost) companionUpgradeable = true;
    const cultCost = upgradeCost(s, { type: "cultivate", kind });
    if (cultCost != null && gold >= cultCost) companionUpgradeable = true;
    for (const slot of NEIDAN_SLOTS) {
      const nCost = upgradeCost(s, { type: "neidan", kind, slot });
      if (nCost != null && gold >= nCost) companionUpgradeable = true;
    }
    void MAX_CULTIVATE_LEVEL;
    void MAX_NEIDAN_LEVEL;
  }

  return {
    alliesInBattle: deployed.length,
    maxAllySlots: slots,
    companionUnlockable,
    companionUpgradeable,
  };
}

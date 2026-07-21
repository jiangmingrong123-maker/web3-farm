import { maxAllySlots } from "@/config/td/battle-squads";
import {
  COMPANION_KINDS,
  COMPANION_UNLOCK_GOLD,
  MAX_COMPANION_LEVEL,
  type HeroSave,
} from "@/config/td/rpg";
import { petSummonLevel } from "@/config/td/pet-catalog";
import { alliesInBattle } from "@/lib/td/battle-party";
import { upgradeCost } from "@/lib/td/rpg-storage";

export function companionHubFlags(save: HeroSave, gold: number) {
  const deployed = alliesInBattle(save);
  const slots = maxAllySlots(save.level);
  let companionUnlockable = false;
  let companionUpgradeable = false;

  for (const kind of COMPANION_KINDS) {
    const unlockGold = COMPANION_UNLOCK_GOLD[kind];
    if (
      unlockGold > 0 &&
      !save.companionUnlocked[kind] &&
      save.level >= petSummonLevel(kind) &&
      gold >= unlockGold
    ) {
      companionUnlockable = true;
    }
    const cost = upgradeCost(save, { type: "companion", kind });
    if (
      save.companionUnlocked[kind] &&
      cost != null &&
      gold >= cost &&
      save.companionLevel[kind] < MAX_COMPANION_LEVEL
    ) {
      companionUpgradeable = true;
    }
  }

  return {
    alliesInBattle: deployed.length,
    maxAllySlots: slots,
    companionUnlockable,
    companionUpgradeable,
  };
}

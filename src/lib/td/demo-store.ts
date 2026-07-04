import { BUFF_DURATION_MS } from "@/config/td/shop";
import {
  FAIL_CONSOLATION_GOLD,
  GOLD_EXCHANGE_REWARD,
  MAP_SWEEP_RUNS_BATCH,
  MAP_SWEEP_UNLOCK_POINTS,
  STAMINA_MAX,
  STAMINA_PER_RUN,
  STAMINA_PER_SWEEP_RUN,
  applyDailyStaminaReset,
  applyStaminaRefill,
  goldExchangeCost,
  refillPointsCost,
  stageClearGold,
} from "@/config/td/economy";
import type { HeroSave } from "@/config/td/rpg";
import type { TdProfile } from "@/lib/td-api";
import {
  applyUpgrade,
  upgradeCost,
  type UpgradeKind,
} from "@/lib/td/rpg-storage";

const SHOP: Record<string, { price: number; kind: "passive" | "active" }> = {
  notice: { price: 25, kind: "passive" },
  hot: { price: 40, kind: "passive" },
  promo: { price: 50, kind: "passive" },
  fan: { price: 35, kind: "passive" },
  shield: { price: 45, kind: "passive" },
  pack: { price: 60, kind: "passive" },
  buy_hype: { price: 15, kind: "active" },
  freeze: { price: 25, kind: "active" },
  nerf: { price: 30, kind: "active" },
};

function dayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** 跨日重置：体力补至 100（已超 100 保留）、计数清零 */
export function applyDailyProfileReset(profile: TdProfile): TdProfile {
  const dk = dayKey();
  if (profile.refillDayKey === dk) return profile;
  return {
    ...profile,
    refillDayKey: dk,
    refillCountToday: 0,
    goldExchangeCountToday: 0,
    stamina: applyDailyStaminaReset(profile.stamina),
  };
}

export function defaultDemoProfile(): TdProfile {
  return {
    gold: 200,
    stamina: STAMINA_MAX,
    unlockedStage: 1,
    buffs: {},
    refillCountToday: 0,
    goldExchangeCountToday: 0,
    refillDayKey: dayKey(),
    activeRunId: null,
    activeRunStage: null,
    activeRunStartedAt: null,
    mapSweepUnlocked: false,
  };
}

export const DEMO_FARM_POINTS = 500;

export function demoRefillCost(profile: TdProfile): number {
  return refillPointsCost(profile.refillCountToday);
}

export function demoGoldExchangeCost(profile: TdProfile): number {
  return goldExchangeCost(profile.goldExchangeCountToday);
}

export function demoRefill(
  profile: TdProfile,
  farmPoints: number,
): { profile: TdProfile; farmPoints: number; pointsSpent: number } | null {
  const cost = refillPointsCost(profile.refillCountToday);
  if (farmPoints < cost) return null;
  return {
    profile: {
      ...profile,
      stamina: applyStaminaRefill(profile.stamina),
      refillCountToday: profile.refillCountToday + 1,
    },
    farmPoints: farmPoints - cost,
    pointsSpent: cost,
  };
}

export function demoExchangeGold(
  profile: TdProfile,
  farmPoints: number,
): { profile: TdProfile; farmPoints: number; pointsSpent: number; goldGained: number } | null {
  const cost = goldExchangeCost(profile.goldExchangeCountToday);
  if (farmPoints < cost) return null;
  return {
    profile: {
      ...profile,
      gold: profile.gold + GOLD_EXCHANGE_REWARD,
      goldExchangeCountToday: profile.goldExchangeCountToday + 1,
    },
    farmPoints: farmPoints - cost,
    pointsSpent: cost,
    goldGained: GOLD_EXCHANGE_REWARD,
  };
}

export function demoStart(profile: TdProfile): { profile: TdProfile; runId: string } | null {
  if (profile.stamina < STAMINA_PER_RUN || profile.activeRunId) return null;
  const runId = `demo_${Date.now().toString(36)}`;
  const now = Date.now();
  return {
    runId,
    profile: {
      ...profile,
      stamina: profile.stamina - STAMINA_PER_RUN,
      activeRunId: runId,
      activeRunStage: 1,
      activeRunStartedAt: now,
    },
  };
}

export function demoFinish(
  profile: TdProfile,
  cleared: boolean,
  wavesReached: number,
  runId?: string | null,
): { profile: TdProfile; goldEarned: number } | null {
  const activeId = runId ?? profile.activeRunId;
  if (!activeId) return null;
  if (profile.activeRunId && profile.activeRunId !== activeId) return null;

  let goldEarned = 0;
  let unlockedStage = profile.unlockedStage;
  if (cleared) {
    goldEarned = stageClearGold(1);
    unlockedStage = Math.max(unlockedStage, 2);
  } else if (wavesReached > 0 || profile.activeRunId === activeId) {
    goldEarned = wavesReached > 0 ? FAIL_CONSOLATION_GOLD : 0;
  }
  return {
    goldEarned,
    profile: {
      ...profile,
      gold: profile.gold + goldEarned,
      unlockedStage,
      activeRunId: null,
      activeRunStage: null,
      activeRunStartedAt: null,
    },
  };
}

export function demoBuy(profile: TdProfile, itemId: string): TdProfile | null {
  const item = SHOP[itemId];
  if (!item || profile.gold < item.price) return null;
  const now = Date.now();
  return {
    ...profile,
    gold: profile.gold - item.price,
    buffs: {
      ...profile.buffs,
      [itemId]: {
        purchasedAt: now,
        expiresAt: now + BUFF_DURATION_MS,
        usesLeft: item.kind === "active" ? 1 : undefined,
      },
    },
  };
}

export function demoUpgrade(
  profile: TdProfile,
  hero: HeroSave,
  kind: UpgradeKind,
): { profile: TdProfile; hero: HeroSave } | null {
  const cost = upgradeCost(hero, kind);
  if (cost == null || profile.gold < cost) return null;
  const nextHero = applyUpgrade(hero, kind);
  if (!nextHero) return null;
  return {
    profile: { ...profile, gold: profile.gold - cost },
    hero: nextHero,
  };
}

export function demoUnlockMapSweep(
  profile: TdProfile,
  farmPoints: number,
): { profile: TdProfile; farmPoints: number; pointsSpent: number } | null {
  if (profile.mapSweepUnlocked || farmPoints < MAP_SWEEP_UNLOCK_POINTS) return null;
  return {
    profile: { ...profile, mapSweepUnlocked: true },
    farmPoints: farmPoints - MAP_SWEEP_UNLOCK_POINTS,
    pointsSpent: MAP_SWEEP_UNLOCK_POINTS,
  };
}

export function demoMapSweepStamina(profile: TdProfile, runs: number): TdProfile | null {
  const cost = runs * STAMINA_PER_SWEEP_RUN;
  if (
    !profile.mapSweepUnlocked ||
    profile.stamina < cost ||
    profile.activeRunId ||
    runs < 1 ||
    runs > MAP_SWEEP_RUNS_BATCH
  ) {
    return null;
  }
  return { ...profile, stamina: profile.stamina - cost };
}

export function demoFastClear(
  profile: TdProfile,
  staminaCost: number,
  sceneWon: boolean,
  didProgress: boolean,
): TdProfile | null {
  if (staminaCost <= 0 || profile.stamina < staminaCost || profile.activeRunId) {
    return null;
  }
  let goldEarned = 0;
  if (sceneWon) {
    goldEarned = stageClearGold(1);
  } else if (didProgress) {
    goldEarned = FAIL_CONSOLATION_GOLD;
  }
  return {
    ...profile,
    stamina: profile.stamina - staminaCost,
    gold: profile.gold + goldEarned,
    unlockedStage: sceneWon
      ? Math.max(profile.unlockedStage, 2)
      : profile.unlockedStage,
  };
}

export function isTdDevDemoEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

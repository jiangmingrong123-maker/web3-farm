import { BUFF_DURATION_MS } from "@/config/td/shop";
import {
  FAIL_CONSOLATION_GOLD,
  GOLD_EXCHANGE_REWARD,
  STAMINA_MAX,
  STAMINA_PER_RUN,
  STAMINA_REFILL_AMOUNT,
  goldExchangeCost,
  refillPointsCost,
  stageClearGold,
} from "@/config/td/economy";
import type { TdProfile } from "@/lib/td-api";

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
      stamina: profile.stamina + STAMINA_REFILL_AMOUNT,
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
  if (!activeId || profile.activeRunId !== activeId) return null;

  let goldEarned = 0;
  let unlockedStage = profile.unlockedStage;
  if (cleared) {
    goldEarned = stageClearGold(1);
    unlockedStage = Math.max(unlockedStage, 2);
  } else if (wavesReached > 0) {
    goldEarned = FAIL_CONSOLATION_GOLD;
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

export function isTdDevDemoEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

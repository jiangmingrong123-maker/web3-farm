import { buildFarmSignMessage } from "./farm-sign";
import { apiRoot } from "./api-origin";
import type { HeroSave } from "@/config/td/rpg";

const API = `${apiRoot()}/td`;

export type TdBuff = {
  purchasedAt: number;
  expiresAt: number;
  usesLeft?: number;
};

export type TdProfile = {
  gold: number;
  stamina: number;
  unlockedStage: number;
  buffs: Record<string, TdBuff>;
  refillCountToday: number;
  goldExchangeCountToday: number;
  refillDayKey: string;
  activeRunId: string | null;
  activeRunStage: number | null;
  activeRunStartedAt: number | null;
  /** 已解锁扫图（首次消耗 100 积分） */
  mapSweepUnlocked?: boolean;
};

export type TdSignFn = (message: string) => Promise<`0x${string}`>;

export type HeroCloudPayload = {
  heroSave: HeroSave;
  heroUpdatedAt: number;
};

async function signedPost<T>(
  wallet: string,
  subpath: string,
  action: string,
  body: Record<string, unknown>,
  sign: TdSignFn,
  data?: string,
): Promise<T | null> {
  try {
    const timestamp = Date.now();
    const message = buildFarmSignMessage(action, wallet, timestamp, data);
    const signature = await sign(message);
    const res = await fetch(`${API}/${wallet.toLowerCase()}/${subpath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, timestamp, signature }),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchTdProfileApi(wallet: string): Promise<{
  profile: TdProfile;
  farmPoints: number;
  refillCost: number;
  goldExchangeCost: number;
  heroSave: HeroSave | null;
  heroUpdatedAt: number;
} | null> {
  try {
    const res = await fetch(`${API}/${wallet.toLowerCase()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      profile?: TdProfile;
      farmPoints?: number;
      refillCost?: number;
      goldExchangeCost?: number;
      heroSave?: HeroSave | null;
      heroUpdatedAt?: number;
    };
    if (!data.ok || !data.profile) return null;
    return {
      profile: data.profile,
      farmPoints: data.farmPoints ?? 0,
      refillCost: data.refillCost ?? 0,
      goldExchangeCost: data.goldExchangeCost ?? 0,
      heroSave: data.heroSave ?? null,
      heroUpdatedAt: data.heroUpdatedAt ?? 0,
    };
  } catch {
    return null;
  }
}

export async function refillTdStaminaApi(
  wallet: string,
  sign: TdSignFn,
): Promise<{ profile: TdProfile; farmPoints: number; pointsSpent: number } | null> {
  const data = await signedPost<{
    ok?: boolean;
    profile?: TdProfile;
    farmPoints?: number;
    pointsSpent?: number;
    error?: string;
  }>(wallet, "refill-stamina", "td-refill-stamina", {}, sign);
  if (!data?.ok || !data.profile) return null;
  return {
    profile: data.profile,
    farmPoints: data.farmPoints ?? 0,
    pointsSpent: data.pointsSpent ?? 0,
  };
}

export async function startTdRunApi(
  wallet: string,
  stage: number,
  sign: TdSignFn,
): Promise<{ profile: TdProfile; runId: string; finishToken: string } | null> {
  const data = await signedPost<{
    ok?: boolean;
    profile?: TdProfile;
    runId?: string;
    finishToken?: string;
  }>(wallet, "start", "td-start", { stage }, sign, `stage=${stage}`);
  if (!data?.ok || !data.profile || !data.runId || !data.finishToken) return null;
  return {
    profile: data.profile,
    runId: data.runId,
    finishToken: data.finishToken,
  };
}

export async function finishTdRunApi(
  wallet: string,
  sign: TdSignFn,
  payload: {
    runId: string;
    cleared: boolean;
    wavesReached: number;
    finishToken?: string;
    hero?: HeroCloudPayload;
  },
): Promise<{ profile: TdProfile; goldEarned: number; cleared: boolean } | null> {
  try {
    const body: Record<string, unknown> = {
      runId: payload.runId,
      cleared: payload.cleared,
      wavesReached: payload.wavesReached,
    };
    if (payload.hero) {
      body.heroSave = payload.hero.heroSave;
      body.heroUpdatedAt = payload.hero.heroUpdatedAt;
    }
    if (payload.finishToken) {
      body.finishToken = payload.finishToken;
    } else {
      const timestamp = Date.now();
      const message = buildFarmSignMessage(
        "td-finish",
        wallet,
        timestamp,
        `runId=${payload.runId}:cleared=${payload.cleared ? 1 : 0}`,
      );
      const signature = await sign(message);
      body.timestamp = timestamp;
      body.signature = signature;
    }
    const res = await fetch(`${API}/${wallet.toLowerCase()}/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      profile?: TdProfile;
      goldEarned?: number;
      cleared?: boolean;
    };
    if (!data?.ok || !data.profile) return null;
    return {
      profile: data.profile,
      goldEarned: data.goldEarned ?? 0,
      cleared: !!data.cleared,
    };
  } catch {
    return null;
  }
}

export async function exchangeTdGoldApi(
  wallet: string,
  sign: TdSignFn,
): Promise<{ profile: TdProfile; farmPoints: number; pointsSpent: number; goldGained: number } | null> {
  const data = await signedPost<{
    ok?: boolean;
    profile?: TdProfile;
    farmPoints?: number;
    pointsSpent?: number;
    goldGained?: number;
    error?: string;
  }>(wallet, "exchange-gold", "td-exchange-gold", {}, sign);
  if (!data?.ok || !data.profile) return null;
  return {
    profile: data.profile,
    farmPoints: data.farmPoints ?? 0,
    pointsSpent: data.pointsSpent ?? 0,
    goldGained: data.goldGained ?? 0,
  };
}

export async function buyTdShopItemApi(
  wallet: string,
  itemId: string,
  sign: TdSignFn,
): Promise<TdProfile | null> {
  const data = await signedPost<{ ok?: boolean; profile?: TdProfile }>(
    wallet,
    "shop-buy",
    "td-shop-buy",
    { itemId },
    sign,
    `itemId=${itemId}`,
  );
  return data?.ok && data.profile ? data.profile : null;
}

export async function unlockMapSweepApi(
  wallet: string,
  sign: TdSignFn,
): Promise<{ profile: TdProfile; farmPoints: number; pointsSpent: number } | null> {
  const data = await signedPost<{
    ok?: boolean;
    profile?: TdProfile;
    farmPoints?: number;
    pointsSpent?: number;
  }>(wallet, "unlock-map-sweep", "td-unlock-map-sweep", {}, sign);
  if (!data?.ok || !data.profile) return null;
  return {
    profile: data.profile,
    farmPoints: data.farmPoints ?? 0,
    pointsSpent: data.pointsSpent ?? 0,
  };
}

export async function mapSweepStaminaApi(
  wallet: string,
  sign: TdSignFn,
  runs: number,
  hero?: HeroCloudPayload,
): Promise<TdProfile | null> {
  const data = await signedPost<{ ok?: boolean; profile?: TdProfile }>(
    wallet,
    "map-sweep",
    "td-map-sweep",
    {
      runs,
      ...(hero
        ? { heroSave: hero.heroSave, heroUpdatedAt: hero.heroUpdatedAt }
        : {}),
    },
    sign,
    `runs=${runs}`,
  );
  return data?.ok && data.profile ? data.profile : null;
}

export async function fastClearStaminaApi(
  wallet: string,
  sign: TdSignFn,
  cost: number,
  sceneWon: boolean,
  hero?: HeroCloudPayload,
): Promise<{ profile: TdProfile; goldEarned: number } | null> {
  const data = await signedPost<{
    ok?: boolean;
    profile?: TdProfile;
    goldEarned?: number;
  }>(
    wallet,
    "fast-clear",
    "td-fast-clear",
    {
      cost,
      sceneWon,
      ...(hero
        ? { heroSave: hero.heroSave, heroUpdatedAt: hero.heroUpdatedAt }
        : {}),
    },
    sign,
    `cost=${cost}:won=${sceneWon ? 1 : 0}`,
  );
  if (!data?.ok || !data.profile) return null;
  return { profile: data.profile, goldEarned: data.goldEarned ?? 0 };
}

export async function authTdRpgSyncApi(
  wallet: string,
  sign: TdSignFn,
): Promise<{ syncToken: string; expiresAt: number } | null> {
  const data = await signedPost<{
    ok?: boolean;
    syncToken?: string;
    expiresAt?: number;
  }>(wallet, "rpg-sync-auth", "td-rpg-sync-auth", {}, sign);
  if (!data?.ok || !data.syncToken || !data.expiresAt) return null;
  return { syncToken: data.syncToken, expiresAt: data.expiresAt };
}

export async function saveTdRpgApi(
  wallet: string,
  hero: HeroCloudPayload,
  auth: { syncToken: string } | { sign: TdSignFn },
): Promise<{ saved: boolean; heroUpdatedAt: number } | null> {
  try {
    const body: Record<string, unknown> = {
      heroSave: hero.heroSave,
      heroUpdatedAt: hero.heroUpdatedAt,
    };
    if ("syncToken" in auth) {
      body.syncToken = auth.syncToken;
    } else {
      const timestamp = Date.now();
      const message = buildFarmSignMessage(
        "td-rpg-save",
        wallet,
        timestamp,
        `updatedAt=${hero.heroUpdatedAt}`,
      );
      body.timestamp = timestamp;
      body.signature = await auth.sign(message);
    }
    const res = await fetch(`${API}/${wallet.toLowerCase()}/rpg-save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      saved?: boolean;
      heroUpdatedAt?: number;
    };
    if (!data?.ok) return null;
    return {
      saved: !!data.saved,
      heroUpdatedAt: data.heroUpdatedAt ?? hero.heroUpdatedAt,
    };
  } catch {
    return null;
  }
}

import { buildFarmSignMessage } from "./farm-sign";

const API = "/api/td";

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
  refillDayKey: string;
  activeRunId: string | null;
  activeRunStage: number | null;
  activeRunStartedAt: number | null;
};

export type TdSignFn = (message: string) => Promise<`0x${string}`>;

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
  refillCost: number | null;
} | null> {
  try {
    const res = await fetch(`${API}/${wallet.toLowerCase()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      profile?: TdProfile;
      farmPoints?: number;
      refillCost?: number | null;
    };
    if (!data.ok || !data.profile) return null;
    return {
      profile: data.profile,
      farmPoints: data.farmPoints ?? 0,
      refillCost: data.refillCost ?? null,
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
): Promise<{ profile: TdProfile; runId: string } | null> {
  const data = await signedPost<{
    ok?: boolean;
    profile?: TdProfile;
    runId?: string;
  }>(wallet, "start", "td-start", { stage }, sign, `stage=${stage}`);
  if (!data?.ok || !data.profile || !data.runId) return null;
  return { profile: data.profile, runId: data.runId };
}

export async function finishTdRunApi(
  wallet: string,
  sign: TdSignFn,
  payload: { runId: string; cleared: boolean; wavesReached: number },
): Promise<{ profile: TdProfile; goldEarned: number; cleared: boolean } | null> {
  const data = await signedPost<{
    ok?: boolean;
    profile?: TdProfile;
    goldEarned?: number;
    cleared?: boolean;
  }>(
    wallet,
    "finish",
    "td-finish",
    payload,
    sign,
    `runId=${payload.runId}:cleared=${payload.cleared ? 1 : 0}`,
  );
  if (!data?.ok || !data.profile) return null;
  return {
    profile: data.profile,
    goldEarned: data.goldEarned ?? 0,
    cleared: !!data.cleared,
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

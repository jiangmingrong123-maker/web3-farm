import { buildFarmSignMessage } from "./farm-sign";
import type { FarmState, RemovedBinding } from "./farm-storage";
import { verifyNftOwnership } from "./nft/verify";
import type { Address } from "viem";
import { pruneBindingsLocally, syncAccrual } from "./farm-storage";

const API = "/api/farm";

export type FarmSignFn = (message: string) => Promise<`0x${string}`>;

async function signedPost<T>(
  wallet: string,
  subpath: string,
  action: string,
  body: Record<string, unknown>,
  sign: FarmSignFn,
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

export async function fetchFarmStateApi(
  wallet: string,
): Promise<FarmState | null> {
  try {
    const res = await fetch(`${API}/${wallet.toLowerCase()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      exists?: boolean;
      state?: FarmState | null;
    };
    if (!data.ok || !data.exists || !data.state) return null;
    return data.state;
  } catch {
    return null;
  }
}

export async function initFarmApi(
  wallet: string,
  sign: FarmSignFn,
): Promise<FarmState | null> {
  const data = await signedPost<{
    ok?: boolean;
    state?: FarmState;
  }>(wallet, "init", "init", {}, sign);
  return data?.ok && data.state ? data.state : null;
}

export async function claimFarmApi(
  wallet: string,
  sign: FarmSignFn,
): Promise<{ state: FarmState; removed: RemovedBinding[] } | null> {
  const data = await signedPost<{
    ok?: boolean;
    state?: FarmState;
    removed?: RemovedBinding[];
    error?: string;
  }>(wallet, "claim", "claim", {}, sign);
  if (!data?.ok || !data.state) return null;
  return { state: data.state, removed: data.removed ?? [] };
}

export async function unlockSlotApi(
  wallet: string,
  slotIndex: number,
  sign: FarmSignFn,
): Promise<FarmState | null> {
  const data = await signedPost<{
    ok?: boolean;
    state?: FarmState;
  }>(
    wallet,
    "unlock-slot",
    "unlock-slot",
    { slotIndex },
    sign,
    `slot=${slotIndex}`,
  );
  return data?.ok && data.state ? data.state : null;
}

export async function bindNftApi(
  wallet: string,
  sign: FarmSignFn,
  payload: {
    slot: number;
    contract: string;
    tokenId: string;
    name: string;
    imageUrl: string;
    collectionSlug: string;
  },
): Promise<FarmState | null> {
  const data = await signedPost<{
    ok?: boolean;
    state?: FarmState;
    error?: string;
  }>(
    wallet,
    "bind",
    "bind",
    payload,
    sign,
    `slot=${payload.slot}:contract=${payload.contract.toLowerCase()}:tokenId=${payload.tokenId}`,
  );
  return data?.ok && data.state ? data.state : null;
}

export type ChargeSwapResult =
  | {
      ok: true;
      charged: number;
      free: boolean;
      swapCount: number;
      points: number;
      freeRemaining: number;
      alreadyCharged?: boolean;
    }
  | {
      ok: false;
      error: "INSUFFICIENT_POINTS" | "NETWORK" | "SIGN_REJECTED";
      need?: number;
      have?: number;
    };

export async function syncFarmBindingsApi(
  wallet: string,
  sign: FarmSignFn,
): Promise<{ state: FarmState; removed: RemovedBinding[] } | null> {
  const data = await signedPost<{
    ok?: boolean;
    state?: FarmState;
    removed?: RemovedBinding[];
  }>(wallet, "sync-bindings", "sync-bindings", {}, sign);
  if (!data?.ok || !data.state) return null;
  return { state: data.state, removed: data.removed ?? [] };
}

/** Client fallback when farm sync-bindings API is unavailable (e.g. local dev). */
export async function syncFarmBindingsClient(
  wallet: Address,
  state: FarmState,
): Promise<{ state: FarmState; removed: RemovedBinding[] }> {
  const toClear: number[] = [];
  const names: Record<number, string> = {};
  const tokenIds: Record<number, string> = {};

  for (const [key, nft] of Object.entries(state.boundSlots)) {
    if (!nft) continue;
    const slot = Number(key);
    const result = await verifyNftOwnership(nft.contract, nft.tokenId, wallet);
    if (!result.ok && (result.error === "NOT_OWNER" || result.error === "NOT_FOUND")) {
      toClear.push(slot);
      names[slot] = nft.name;
      tokenIds[slot] = nft.tokenId;
    }
  }

  if (toClear.length === 0) {
    return { state: syncAccrual(state, Date.now()), removed: [] };
  }
  return pruneBindingsLocally(state, toClear, names, tokenIds);
}

export async function chargeSwapFeeApi(
  wallet: string,
  roomId: string,
  sign: FarmSignFn,
): Promise<ChargeSwapResult> {
  try {
    const timestamp = Date.now();
    const message = buildFarmSignMessage(
      "charge-swap",
      wallet,
      timestamp,
      `roomId=${roomId}`,
    );
    const signature = await sign(message);
    const res = await fetch(`${API}/${wallet.toLowerCase()}/charge-swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, timestamp, signature }),
    });
    const data = (await res.json()) as ChargeSwapResult & { ok: boolean };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "SIGN_REJECTED" };
    }
    if (data.ok) return data;
    if (!res.ok && "error" in data) return data;
    return { ok: false, error: "NETWORK" };
  } catch {
    return { ok: false, error: "NETWORK" };
  }
}

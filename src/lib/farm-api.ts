import type { FarmState, RemovedBinding } from "./farm-storage";
import { verifyNftOwnership } from "./nft/verify";
import type { Address } from "viem";
import { pruneBindingsLocally, syncAccrual } from "./farm-storage";

const API = "/api/farm";

function isLocalDev(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
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
    return isLocalDev() ? null : null;
  }
}

export async function saveFarmStateApi(
  wallet: string,
  state: FarmState,
): Promise<FarmState | null> {
  try {
    const res = await fetch(`${API}/${wallet.toLowerCase()}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; state?: FarmState };
    return data.ok && data.state ? data.state : null;
  } catch {
    return null;
  }
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
      error: "INSUFFICIENT_POINTS" | "NETWORK";
      need?: number;
      have?: number;
    };

export async function syncFarmBindingsApi(
  wallet: string,
): Promise<{ state: FarmState; removed: RemovedBinding[] } | null> {
  try {
    const res = await fetch(`${API}/${wallet.toLowerCase()}/sync-bindings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      state?: FarmState;
      removed?: RemovedBinding[];
    };
    if (!data.ok || !data.state) return null;
    return { state: data.state, removed: data.removed ?? [] };
  } catch {
    return null;
  }
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
): Promise<ChargeSwapResult> {
  try {
    const res = await fetch(`${API}/${wallet.toLowerCase()}/charge-swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    const data = (await res.json()) as ChargeSwapResult & { ok: boolean };
    if (data.ok) return data;
    if (!res.ok && "error" in data) return data;
    return { ok: false, error: "NETWORK" };
  } catch {
    return { ok: false, error: "NETWORK" };
  }
}

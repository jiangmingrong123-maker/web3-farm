/**
 * GET  /api/farm/:wallet           — load Season 0 state
 * PUT  /api/farm/:wallet           — save state
 * POST /api/farm/:wallet/charge-swap — deduct swap fee (idempotent per room)
 */

const INITIAL_UNLOCKED_SLOTS = 2;
const DAILY_POINTS_CAP = 1000;
const SEASON0_DAILY_BASE = 10;
const POINTS_PER_BOUND_NFT = 100;
const MAX_ACCRUAL_HOURS = 72;
const SWAP_FREE_COUNT = 10;
const SWAP_FEE_POINTS = 10;

interface BoundNft {
  contract: string;
  tokenId: string;
  name: string;
  imageUrl: string;
  collectionSlug: string;
}

interface FarmState {
  points: number;
  unlockedSlots: number;
  lastClaimAt: number | null;
  boundSlots: Record<number, BoundNft | null>;
  pendingPoints: number;
  accrualAnchorAt: number | null;
  lastAccrualTickAt: number | null;
  swapCount: number;
}

interface Env {
  SWAP_KV?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const memory = new Map<string, FarmState>();
const feeMemory = new Set<string>();

const NO_CACHE = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: NO_CACHE });
}

function defaultState(): FarmState {
  return {
    points: 0,
    unlockedSlots: INITIAL_UNLOCKED_SLOTS,
    lastClaimAt: null,
    boundSlots: {},
    pendingPoints: 0,
    accrualAnchorAt: null,
    lastAccrualTickAt: null,
    swapCount: 0,
  };
}

function normalizeWallet(w: string): string | null {
  const x = w.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(x)) return null;
  return x;
}

function boundCount(state: FarmState): number {
  return Object.values(state.boundSlots).filter(Boolean).length;
}

function dailyRate(state: FarmState): number {
  const n = boundCount(state);
  const raw = n > 0 ? n * POINTS_PER_BOUND_NFT : SEASON0_DAILY_BASE;
  return Math.min(raw, DAILY_POINTS_CAP);
}

function maxPending(state: FarmState): number {
  return (dailyRate(state) * MAX_ACCRUAL_HOURS) / 24;
}

function syncAccrual(state: FarmState, now: number): FarmState {
  const rate = dailyRate(state);
  if (rate <= 0) return state;

  let anchor = state.accrualAnchorAt;
  if (anchor == null) {
    if (state.lastClaimAt != null) anchor = state.lastClaimAt;
    else anchor = now;
  }

  const tickFrom = state.lastAccrualTickAt ?? anchor;
  const accrualEndsAt = anchor + MAX_ACCRUAL_HOURS * HOUR_MS;
  if (now <= tickFrom || tickFrom >= accrualEndsAt) return state;

  const effectiveNow = Math.min(now, accrualEndsAt);
  const added = (rate * (effectiveNow - tickFrom)) / DAY_MS;
  return {
    ...state,
    pendingPoints: Math.min(state.pendingPoints + added, maxPending(state)),
    accrualAnchorAt: anchor,
    lastAccrualTickAt: effectiveNow,
  };
}

function sanitizeState(raw: Partial<FarmState>): FarmState {
  const base = defaultState();
  const merged: FarmState = {
    ...base,
    ...raw,
    boundSlots: raw.boundSlots ?? {},
    unlockedSlots: Math.max(
      Math.min(Number(raw.unlockedSlots) || INITIAL_UNLOCKED_SLOTS, 12),
      INITIAL_UNLOCKED_SLOTS,
    ),
    points: Math.max(0, Number(raw.points) || 0),
    pendingPoints: Math.max(0, Number(raw.pendingPoints) || 0),
    swapCount: Math.max(0, Number(raw.swapCount) || 0),
    lastClaimAt: raw.lastClaimAt ?? null,
    accrualAnchorAt: raw.accrualAnchorAt ?? null,
    lastAccrualTickAt: raw.lastAccrualTickAt ?? null,
  };
  return syncAccrual(merged, Date.now());
}

async function loadFarm(
  env: Env,
  wallet: string,
): Promise<{ exists: boolean; state: FarmState }> {
  const key = `farm:${wallet}`;
  if (env.SWAP_KV) {
    const raw = await env.SWAP_KV.get(key);
    if (raw) {
      return {
        exists: true,
        state: sanitizeState(JSON.parse(raw) as Partial<FarmState>),
      };
    }
    return { exists: false, state: defaultState() };
  }
  const mem = memory.get(wallet);
  if (mem) return { exists: true, state: mem };
  return { exists: false, state: defaultState() };
}

async function saveFarm(env: Env, wallet: string, state: FarmState) {
  const key = `farm:${wallet}`;
  const synced = syncAccrual(state, Date.now());
  if (env.SWAP_KV) {
    await env.SWAP_KV.put(key, JSON.stringify(synced));
  } else {
    memory.set(wallet, synced);
  }
  return synced;
}

async function feeCharged(
  env: Env,
  wallet: string,
  roomId: string,
): Promise<boolean> {
  const key = `swap_fee:${roomId}:${wallet}`;
  if (env.SWAP_KV) {
    return (await env.SWAP_KV.get(key)) === "1";
  }
  return feeMemory.has(key);
}

async function markFeeCharged(env: Env, wallet: string, roomId: string) {
  const key = `swap_fee:${roomId}:${wallet}`;
  if (env.SWAP_KV) {
    await env.SWAP_KV.put(key, "1");
  } else {
    feeMemory.add(key);
  }
}

function pathSegments(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.split("/").filter(Boolean);
}

export const onRequest = async (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[] | undefined>;
}) => {
  const { request, env, params } = context;
  const path = pathSegments(params.path as string | string[] | undefined);
  const wallet = path[0] ? normalizeWallet(path[0]) : null;
  if (!wallet) return new Response("Bad wallet", { status: 400 });

  if (path.length === 1 && request.method === "GET") {
    const { exists, state } = await loadFarm(env, wallet);
    return json({ ok: true, exists, state: exists ? state : null });
  }

  if (path.length === 1 && request.method === "PUT") {
    const body = (await request.json()) as { state?: Partial<FarmState> };
    if (!body.state) return new Response("Missing state", { status: 400 });
    const saved = await saveFarm(env, wallet, sanitizeState(body.state));
    return json({ ok: true, state: saved });
  }

  if (path[1] === "charge-swap" && request.method === "POST") {
    const body = (await request.json()) as { roomId?: string };
    const roomId = (body.roomId ?? "").trim();
    if (!roomId) return new Response("Missing roomId", { status: 400 });

    if (await feeCharged(env, wallet, roomId)) {
      const { state } = await loadFarm(env, wallet);
      return json({
        ok: true,
        alreadyCharged: true,
        charged: 0,
        free: state.swapCount <= SWAP_FREE_COUNT,
        swapCount: state.swapCount,
        points: state.points,
        freeRemaining: Math.max(0, SWAP_FREE_COUNT - state.swapCount),
      });
    }

    let state = syncAccrual((await loadFarm(env, wallet)).state, Date.now());
    let charged = 0;
    const free = state.swapCount < SWAP_FREE_COUNT;

    if (free) {
      state = { ...state, swapCount: state.swapCount + 1 };
    } else {
      if (state.points < SWAP_FEE_POINTS) {
        return json(
          {
            ok: false,
            error: "INSUFFICIENT_POINTS",
            need: SWAP_FEE_POINTS,
            have: state.points,
            swapCount: state.swapCount,
          },
          400,
        );
      }
      state = {
        ...state,
        points: state.points - SWAP_FEE_POINTS,
        swapCount: state.swapCount + 1,
      };
      charged = SWAP_FEE_POINTS;
    }

    state = await saveFarm(env, wallet, state);
    await markFeeCharged(env, wallet, roomId);

    return json({
      ok: true,
      charged,
      free,
      swapCount: state.swapCount,
      points: state.points,
      freeRemaining: Math.max(0, SWAP_FREE_COUNT - state.swapCount),
    });
  }

  return new Response("Not found", { status: 404 });
};

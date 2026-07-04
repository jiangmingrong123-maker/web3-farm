/**
 * GET  /api/farm/:wallet                 — load state (syncs pending accrual)
 * POST /api/farm/:wallet/init            — create record (wallet signature)
 * POST /api/farm/:wallet/claim           — claim pending (wallet signature)
 * POST /api/farm/:wallet/unlock-slot     — unlock slot (wallet signature)
 * POST /api/farm/:wallet/bind            — bind NFT (wallet signature + ownerOf)
 * POST /api/farm/:wallet/sync-bindings   — verify bindings (wallet signature)
 * POST /api/farm/:wallet/charge-swap     — swap fee (wallet signature)
 * POST /api/farm/admin/grant             — admin grant points (ADMIN_SECRET)
 *
 * PUT is disabled — clients cannot overwrite farm state directly.
 */

import { requireWalletSignature, type SignedBody } from "../../lib/farm-sign";
import { corsPreflight, withCors } from "../../lib/cors";

const RPC_URLS = [
  "https://ethereum.publicnode.com",
  "https://1rpc.io/eth",
  "https://eth.drpc.org",
  "https://rpc.ankr.com/eth",
];

const WHITELIST = new Set(["0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a"]);
const INITIAL_UNLOCKED_SLOTS = 2;
const HALL_SLOT_COUNT = 12;
const DAILY_POINTS_CAP = 1000;
const SEASON0_DAILY_BASE = 10;
const POINTS_PER_BOUND_NFT = 100;
const MAX_ACCRUAL_HOURS = 72;
const CLAIM_COOLDOWN_HOURS = 24;
const SWAP_FREE_COUNT = 10;
const SWAP_FEE_POINTS = 10;

const SLOT_UNLOCK_COSTS: Record<number, number> = {
  1: 0,
  2: 0,
  3: 100,
  4: 200,
  5: 400,
  6: 800,
  7: 1600,
  8: 3200,
  9: 6400,
  10: 12800,
  11: 25600,
  12: 51200,
};

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
  ALCHEMY_API_KEY?: string;
  ADMIN_SECRET?: string;
}

type OwnerLookup =
  | { kind: "owner"; address: string }
  | { kind: "not_owner"; address: string }
  | { kind: "not_found" }
  | { kind: "rpc_error" };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const memory = new Map<string, FarmState>();
const feeMemory = new Set<string>();

const NO_CACHE = withCors({
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: NO_CACHE });
}

function defaultState(now = Date.now()): FarmState {
  return {
    points: 0,
    unlockedSlots: INITIAL_UNLOCKED_SLOTS,
    lastClaimAt: null,
    boundSlots: {},
    pendingPoints: 0,
    accrualAnchorAt: now,
    lastAccrualTickAt: now,
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

function sanitizeLoaded(raw: Partial<FarmState>): FarmState {
  const base = defaultState();
  return syncAccrual(
    {
      ...base,
      ...raw,
      boundSlots: raw.boundSlots ?? {},
      unlockedSlots: Math.max(
        Math.min(Number(raw.unlockedSlots) || INITIAL_UNLOCKED_SLOTS, HALL_SLOT_COUNT),
        INITIAL_UNLOCKED_SLOTS,
      ),
      points: Math.max(0, Number(raw.points) || 0),
      pendingPoints: Math.max(0, Number(raw.pendingPoints) || 0),
      swapCount: Math.max(0, Number(raw.swapCount) || 0),
      lastClaimAt: raw.lastClaimAt ?? null,
      accrualAnchorAt: raw.accrualAnchorAt ?? null,
      lastAccrualTickAt: raw.lastAccrualTickAt ?? null,
    },
    Date.now(),
  );
}

function accrualChanged(a: FarmState, b: FarmState): boolean {
  return (
    a.pendingPoints !== b.pendingPoints ||
    a.lastAccrualTickAt !== b.lastAccrualTickAt ||
    a.accrualAnchorAt !== b.accrualAnchorAt
  );
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
        state: sanitizeLoaded(JSON.parse(raw) as Partial<FarmState>),
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

async function loadOrCreate(env: Env, wallet: string): Promise<FarmState> {
  const loaded = await loadFarm(env, wallet);
  if (loaded.exists) return loaded.state;
  const created = defaultState();
  return saveFarm(env, wallet, created);
}

function canClaim(state: FarmState, now: number): boolean {
  const synced = syncAccrual(state, now);
  if (synced.pendingPoints < 0.01) return false;
  if (!synced.lastClaimAt) return true;
  return now - synced.lastClaimAt >= CLAIM_COOLDOWN_HOURS * HOUR_MS;
}

function performClaim(state: FarmState, now: number): FarmState | null {
  const synced = syncAccrual(state, now);
  if (!canClaim(synced, now)) return null;
  const collected = Math.floor(synced.pendingPoints * 100) / 100;
  return {
    ...synced,
    points: synced.points + collected,
    pendingPoints: 0,
    lastClaimAt: now,
    accrualAnchorAt: now,
    lastAccrualTickAt: now,
  };
}

function unlockSlot(state: FarmState, slotIndex: number, cost: number): FarmState | null {
  if (slotIndex > state.unlockedSlots + 1 || slotIndex <= state.unlockedSlots) return null;
  if (state.points < cost) return null;
  return {
    ...state,
    points: state.points - cost,
    unlockedSlots: slotIndex,
  };
}

function isNftAlreadyBound(state: FarmState, contract: string, tokenId: string): boolean {
  const c = contract.toLowerCase();
  return Object.values(state.boundSlots).some(
    (b) => b && b.contract.toLowerCase() === c && b.tokenId === tokenId,
  );
}

function bindNftToSlot(
  state: FarmState,
  slotIndex: number,
  nft: BoundNft,
  now: number,
): FarmState | null {
  if (slotIndex < 1 || slotIndex > state.unlockedSlots) return null;
  if (state.boundSlots[slotIndex]) return null;
  if (isNftAlreadyBound(state, nft.contract, nft.tokenId)) return null;

  const synced = syncAccrual(state, now);
  const anchor = synced.accrualAnchorAt ?? now;
  return {
    ...synced,
    boundSlots: { ...synced.boundSlots, [slotIndex]: nft },
    accrualAnchorAt: anchor,
    lastAccrualTickAt: synced.lastAccrualTickAt ?? now,
  };
}

async function feeCharged(env: Env, wallet: string, roomId: string): Promise<boolean> {
  const key = `swap_fee:${roomId}:${wallet}`;
  if (env.SWAP_KV) return (await env.SWAP_KV.get(key)) === "1";
  return feeMemory.has(key);
}

async function markFeeCharged(env: Env, wallet: string, roomId: string) {
  const key = `swap_fee:${roomId}:${wallet}`;
  if (env.SWAP_KV) await env.SWAP_KV.put(key, "1");
  else feeMemory.add(key);
}

function pathSegments(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.split("/").filter(Boolean);
}

function encodeOwnerOf(tokenId: string): string {
  const id = BigInt(tokenId);
  const selector = "6352211e";
  const hex = id.toString(16).padStart(64, "0");
  return `0x${selector}${hex}`;
}

function decodeAddress(hex: string): string | null {
  const clean = hex.replace(/^0x/, "");
  if (clean.length < 40) return null;
  return `0x${clean.slice(-40)}`.toLowerCase();
}

function rpcUrls(env: Env): string[] {
  const key = env.ALCHEMY_API_KEY?.trim();
  const urls: string[] = [];
  if (key) urls.push(`https://eth-mainnet.g.alchemy.com/v2/${key}`);
  return [...urls, ...RPC_URLS];
}

async function ethOwnerOf(
  env: Env,
  contract: string,
  tokenId: string,
): Promise<OwnerLookup> {
  const data = encodeOwnerOf(tokenId);
  let rpcFailed = false;

  for (const rpc of rpcUrls(env)) {
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: contract, data }, "latest"],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        rpcFailed = true;
        continue;
      }
      const body = (await res.json()) as {
        result?: string;
        error?: { message?: string };
      };
      if (body.error) {
        const msg = (body.error.message ?? "").toLowerCase();
        if (
          msg.includes("revert") ||
          msg.includes("erc721") ||
          msg.includes("nonexistent")
        ) {
          return { kind: "not_found" };
        }
        rpcFailed = true;
        continue;
      }
      if (!body.result || body.result === "0x") {
        rpcFailed = true;
        continue;
      }
      const owner = decodeAddress(body.result);
      if (!owner) {
        rpcFailed = true;
        continue;
      }
      return { kind: "owner", address: owner };
    } catch {
      rpcFailed = true;
    }
  }

  return rpcFailed ? { kind: "rpc_error" } : { kind: "not_found" };
}

async function purgeStaleBindings(
  env: Env,
  state: FarmState,
  wallet: string,
): Promise<{
  state: FarmState;
  removed: { slot: number; name: string; tokenId: string }[];
  skipped: boolean;
}> {
  const boundSlots = { ...state.boundSlots };
  const removed: { slot: number; name: string; tokenId: string }[] = [];
  let skipped = false;

  for (const [key, nft] of Object.entries(boundSlots)) {
    if (!nft) continue;
    const slot = Number(key);
    const lookup = await ethOwnerOf(env, nft.contract.toLowerCase(), nft.tokenId);

    if (lookup.kind === "rpc_error") {
      skipped = true;
      continue;
    }
    if (lookup.kind === "not_found") {
      boundSlots[slot] = null;
      removed.push({ slot, name: nft.name, tokenId: nft.tokenId });
      continue;
    }
    if (lookup.kind === "owner" && lookup.address !== wallet) {
      boundSlots[slot] = null;
      removed.push({ slot, name: nft.name, tokenId: nft.tokenId });
    }
  }

  const next = syncAccrual({ ...state, boundSlots }, Date.now());
  return { state: next, removed, skipped };
}

async function parseJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

async function handleAdminGrant(request: Request, env: Env): Promise<Response> {
  const secret = env.ADMIN_SECRET?.trim();
  if (!secret) {
    return json({ ok: false, error: "ADMIN_NOT_CONFIGURED" }, 503);
  }

  const headerSecret = request.headers.get("X-Admin-Secret")?.trim();
  const body = await parseJson<{
    secret?: string;
    wallet?: string;
    points?: number;
    mode?: "add" | "set";
  }>(request);
  if (!body) return new Response("Bad JSON", { status: 400 });

  const provided = headerSecret || body.secret?.trim();
  if (!provided || provided !== secret) {
    return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  }

  const wallet = body.wallet ? normalizeWallet(body.wallet) : null;
  const points = Number(body.points);
  const mode = body.mode === "set" ? "set" : "add";

  if (!wallet || !Number.isFinite(points) || points < 0) {
    return json({ ok: false, error: "BAD_REQUEST" }, 400);
  }

  const loaded = await loadFarm(env, wallet);
  const base = loaded.exists ? loaded.state : defaultState();
  const next = syncAccrual(base, Date.now());
  const updated: FarmState = {
    ...next,
    points: mode === "set" ? points : next.points + points,
  };
  const saved = await saveFarm(env, wallet, updated);
  return json({ ok: true, state: saved, mode, granted: points });
}

export const onRequest = async (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[] | undefined>;
}) => {
  const { request, env, params } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  const path = pathSegments(params.path as string | string[] | undefined);

  if (path[0] === "admin" && path[1] === "grant" && request.method === "POST") {
    return handleAdminGrant(request, env);
  }

  const wallet = path[0] ? normalizeWallet(path[0]) : null;
  if (!wallet) return new Response("Bad wallet", { status: 400 });

  if (path.length === 1 && request.method === "GET") {
    const loaded = await loadFarm(env, wallet);
    if (!loaded.exists) {
      return json({ ok: true, exists: false, state: null });
    }
    const synced = syncAccrual(loaded.state, Date.now());
    const state =
      accrualChanged(loaded.state, synced) ?
        await saveFarm(env, wallet, synced)
      : synced;
    return json({ ok: true, exists: true, state });
  }

  if (path.length === 1 && request.method === "PUT") {
    return json(
      {
        ok: false,
        error: "PUT_DISABLED",
        message: "Farm state is server-authoritative. Use signed POST actions.",
      },
      403,
    );
  }

  if (path[1] === "init" && request.method === "POST") {
    const body = await parseJson<SignedBody>(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const auth = await requireWalletSignature("init", wallet, body);
    if (auth) return auth;

    const loaded = await loadFarm(env, wallet);
    if (loaded.exists) {
      return json({ ok: true, state: loaded.state, created: false });
    }
    const created = await saveFarm(env, wallet, defaultState());
    return json({ ok: true, state: created, created: true });
  }

  if (path[1] === "sync-bindings" && request.method === "POST") {
    const body = await parseJson<SignedBody>(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const auth = await requireWalletSignature("sync-bindings", wallet, body);
    if (auth) return auth;

    const loaded = await loadFarm(env, wallet);
    const base = loaded.exists ? loaded.state : defaultState();
    const synced = syncAccrual(base, Date.now());
    const { state, removed, skipped } = await purgeStaleBindings(env, synced, wallet);
    const saved =
      skipped && removed.length === 0 ? state : await saveFarm(env, wallet, state);
    return json({ ok: true, state: saved, removed, skipped });
  }

  if (path[1] === "claim" && request.method === "POST") {
    const body = await parseJson<SignedBody>(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const auth = await requireWalletSignature("claim", wallet, body);
    if (auth) return auth;

    const now = Date.now();
    let state = await loadOrCreate(env, wallet);
    const purged = await purgeStaleBindings(env, state, wallet);
    state = purged.state;

    const claimed = performClaim(state, now);
    if (!claimed) {
      return json({ ok: false, error: "CLAIM_NOT_READY" }, 400);
    }
    const saved = await saveFarm(env, wallet, claimed);
    return json({
      ok: true,
      state: saved,
      removed: purged.removed,
    });
  }

  if (path[1] === "unlock-slot" && request.method === "POST") {
    const body = await parseJson<SignedBody & { slotIndex?: number }>(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const slotIndex = Number(body.slotIndex);
    const auth = await requireWalletSignature(
      "unlock-slot",
      wallet,
      body,
      `slot=${slotIndex}`,
    );
    if (auth) return auth;

    const cost = SLOT_UNLOCK_COSTS[slotIndex] ?? -1;
    if (!Number.isInteger(slotIndex) || slotIndex < 3 || slotIndex > HALL_SLOT_COUNT) {
      return json({ ok: false, error: "INVALID_SLOT" }, 400);
    }

    const state = await loadOrCreate(env, wallet);
    if (slotIndex <= state.unlockedSlots) {
      return json(
        { ok: false, error: "ALREADY_UNLOCKED", unlockedSlots: state.unlockedSlots },
        400,
      );
    }
    if (slotIndex > state.unlockedSlots + 1) {
      return json(
        {
          ok: false,
          error: "UNLOCK_ORDER",
          unlockedSlots: state.unlockedSlots,
          needSlot: state.unlockedSlots + 1,
        },
        400,
      );
    }
    if (state.points < cost) {
      return json(
        { ok: false, error: "INSUFFICIENT_POINTS", need: cost, have: state.points },
        400,
      );
    }
    const next = unlockSlot(state, slotIndex, cost);
    if (!next) {
      return json({ ok: false, error: "UNLOCK_FAILED" }, 400);
    }
    const saved = await saveFarm(env, wallet, next);
    return json({ ok: true, state: saved });
  }

  if (path[1] === "bind" && request.method === "POST") {
    const body = await parseJson<
      SignedBody & {
        slot?: number;
        contract?: string;
        tokenId?: string;
        name?: string;
        imageUrl?: string;
        collectionSlug?: string;
      }
    >(request);
    if (!body) return new Response("Bad JSON", { status: 400 });

    const slot = Number(body.slot);
    const contract = body.contract?.toLowerCase();
    const tokenId = body.tokenId?.trim();
    const signData =
      contract && tokenId ? `slot=${slot}:contract=${contract}:tokenId=${tokenId}` : undefined;
    const auth = await requireWalletSignature("bind", wallet, body, signData);
    if (auth) return auth;

    if (!contract || !tokenId || !WHITELIST.has(contract)) {
      return json({ ok: false, error: "NOT_WHITELISTED" }, 400);
    }
    if (!Number.isInteger(slot) || slot < 1) {
      return json({ ok: false, error: "INVALID_SLOT" }, 400);
    }

    const lookup = await ethOwnerOf(env, contract, tokenId);
    if (lookup.kind !== "owner" || lookup.address !== wallet) {
      return json({ ok: false, error: "NOT_OWNER" }, 403);
    }

    const state = await loadOrCreate(env, wallet);
    const bindings = Object.values(state.boundSlots).filter(Boolean).length;
    if (bindings >= 5) {
      return json({ ok: false, error: "MAX_BINDINGS" }, 400);
    }

    const nft: BoundNft = {
      contract,
      tokenId,
      name: body.name?.trim() || `Nobody #${tokenId}`,
      imageUrl:
        body.imageUrl?.trim() ||
        `/api/nft/image?contract=${encodeURIComponent(contract)}&tokenId=${encodeURIComponent(tokenId)}`,
      collectionSlug: body.collectionSlug?.trim() || "nobody",
    };

    const next = bindNftToSlot(state, slot, nft, Date.now());
    if (!next) {
      return json({ ok: false, error: "BIND_FAILED" }, 400);
    }
    const saved = await saveFarm(env, wallet, next);
    return json({ ok: true, state: saved });
  }

  if (path[1] === "charge-swap" && request.method === "POST") {
    const body = await parseJson<SignedBody & { roomId?: string }>(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const roomId = (body.roomId ?? "").trim();
    if (!roomId) return new Response("Missing roomId", { status: 400 });

    const auth = await requireWalletSignature("charge-swap", wallet, body, `roomId=${roomId}`);
    if (auth) return auth;

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

    let state = syncAccrual((await loadOrCreate(env, wallet)).state, Date.now());
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

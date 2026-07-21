/**
 * GET  /api/td/:wallet              — profile + cloud heroSave (gold, stamina, buffs, stage)
 * POST /api/td/:wallet/refill-stamina — points → +100 stamina (signed)
 * POST /api/td/:wallet/exchange-gold  — points → gold, escalating cost (signed)
 * POST /api/td/:wallet/start        — begin run, -5 stamina (signed)
 * POST /api/td/:wallet/finish       — settle run gold (signed); optional heroSave sync
 * POST /api/td/:wallet/shop-buy     — buy 24h buff (signed)
 * POST /api/td/:wallet/rpg-sync-auth — one-time signature → syncToken (7d)
 * POST /api/td/:wallet/rpg-save     — upload heroSave (syncToken or signature)
 */

import { requireWalletSignature, type SignedBody } from "../../lib/farm-sign";
import { corsPreflight, withCors } from "../../lib/cors";

const BUFF_DURATION_MS = 24 * 60 * 60 * 1000;
const STAMINA_MAX = 100;
const STAMINA_REFILL_AMOUNT = 100;
const STAMINA_PER_RUN = 1;
const REFILL_BASE_POINTS = 10;
const GOLD_EXCHANGE_BASE_POINTS = 100;
const GOLD_EXCHANGE_REWARD = 100;
const MAP_SWEEP_UNLOCK_POINTS = 100;
const STAMINA_PER_MAP_SWEEP = 1;
const MAP_SWEEP_RUNS_MAX = 10;
const FAST_CLEAR_STAMINA_MAX = 1;
const RUN_STALE_MS = 20 * 60 * 1000;
const FAIL_CONSOLATION_GOLD = 3;
const RPG_SYNC_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RPG_HERO_MAX_BYTES = 200_000;

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

function stageClearGold(stage: number): number {
  return Math.min(30 + (stage - 1) * 15, 120);
}

interface Env {
  SWAP_KV?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
}

interface FarmState {
  points: number;
}

interface ActiveBuff {
  purchasedAt: number;
  expiresAt: number;
  usesLeft?: number;
}

interface TdProfile {
  gold: number;
  stamina: number;
  unlockedStage: number;
  buffs: Record<string, ActiveBuff>;
  refillCountToday: number;
  goldExchangeCountToday: number;
  refillDayKey: string;
  activeRunId: string | null;
  activeRunStage: number | null;
  activeRunStartedAt: number | null;
  mapSweepUnlocked?: boolean;
}

interface ActiveRun {
  runId: string;
  wallet: string;
  stage: number;
  startedAt: number;
  finishToken?: string;
}

interface RpgCloud {
  hero: Record<string, unknown>;
  updatedAt: number;
}

interface RpgSyncSession {
  token: string;
  expiresAt: number;
}

const NO_CACHE = withCors({
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
});

const memoryTd = new Map<string, TdProfile>();
const memoryRuns = new Map<string, ActiveRun>();
const memoryFarm = new Map<string, FarmState>();
const memoryRpg = new Map<string, RpgCloud>();
const memoryRpgSync = new Map<string, RpgSyncSession>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: NO_CACHE });
}

function normalizeWallet(w: string): string | null {
  const x = w.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(x)) return null;
  return x;
}

function dayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

function defaultProfile(): TdProfile {
  return {
    gold: 0,
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

function purgeExpiredBuffs(profile: TdProfile, now: number): TdProfile {
  const buffs: Record<string, ActiveBuff> = {};
  for (const [id, b] of Object.entries(profile.buffs)) {
    if (b.expiresAt > now) buffs[id] = b;
  }
  return { ...profile, buffs };
}

function resetDailyCounters(profile: TdProfile, now: number): TdProfile {
  const dk = dayKey(now);
  if (profile.refillDayKey === dk) return profile;
  return {
    ...profile,
    refillDayKey: dk,
    refillCountToday: 0,
    goldExchangeCountToday: 0,
    stamina: profile.stamina >= STAMINA_MAX ? profile.stamina : STAMINA_MAX,
  };
}

async function loadFarm(env: Env, wallet: string): Promise<FarmState> {
  const key = `farm:${wallet}`;
  if (env.SWAP_KV) {
    const raw = await env.SWAP_KV.get(key);
    if (raw) {
      const p = JSON.parse(raw) as { points?: number };
      return { points: Math.max(0, Number(p.points) || 0) };
    }
    return { points: 0 };
  }
  return memoryFarm.get(wallet) ?? { points: 0 };
}

async function saveFarmPoints(env: Env, wallet: string, points: number) {
  const key = `farm:${wallet}`;
  if (env.SWAP_KV) {
    const raw = await env.SWAP_KV.get(key);
    const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    await env.SWAP_KV.put(key, JSON.stringify({ ...base, points: Math.max(0, points) }));
  } else {
    memoryFarm.set(wallet, { points: Math.max(0, points) });
  }
}

async function loadTd(env: Env, wallet: string): Promise<TdProfile> {
  const key = `td:${wallet}`;
  let profile: TdProfile;
  if (env.SWAP_KV) {
    const raw = await env.SWAP_KV.get(key);
    profile = raw ? (JSON.parse(raw) as TdProfile) : defaultProfile();
  } else {
    profile = memoryTd.get(wallet) ?? defaultProfile();
  }
  const now = Date.now();
  if (typeof profile.goldExchangeCountToday !== "number") {
    profile = { ...profile, goldExchangeCountToday: 0 };
  }
  profile = resetDailyCounters(profile, now);
  profile = purgeExpiredBuffs(profile, now);
  return profile;
}

async function reconcileActiveRun(
  env: Env,
  profile: TdProfile,
  now: number,
): Promise<TdProfile> {
  if (!profile.activeRunId) return profile;

  const run = await loadRun(env, profile.activeRunId);
  const startedAt = profile.activeRunStartedAt ?? run?.startedAt ?? 0;
  const stale = !run || now - startedAt > RUN_STALE_MS;

  if (!stale) return profile;

  if (run) await deleteRun(env, profile.activeRunId);
  const staleGold =
    run && now - startedAt > 60_000 ? FAIL_CONSOLATION_GOLD : 0;
  return {
    ...profile,
    gold: profile.gold + staleGold,
    activeRunId: null,
    activeRunStage: null,
    activeRunStartedAt: null,
  };
}

async function saveTd(env: Env, wallet: string, profile: TdProfile) {
  const key = `td:${wallet}`;
  const now = Date.now();
  const cleaned = purgeExpiredBuffs(resetDailyCounters(profile, now), now);
  if (env.SWAP_KV) {
    await env.SWAP_KV.put(key, JSON.stringify(cleaned));
  } else {
    memoryTd.set(wallet, cleaned);
  }
  return cleaned;
}

async function loadRun(env: Env, runId: string): Promise<ActiveRun | null> {
  const key = `td_run:${runId}`;
  if (env.SWAP_KV) {
    const raw = await env.SWAP_KV.get(key);
    return raw ? (JSON.parse(raw) as ActiveRun) : null;
  }
  return memoryRuns.get(runId) ?? null;
}

async function saveRun(env: Env, run: ActiveRun) {
  const key = `td_run:${run.runId}`;
  if (env.SWAP_KV) {
    await env.SWAP_KV.put(key, JSON.stringify(run));
  } else {
    memoryRuns.set(run.runId, run);
  }
}

async function deleteRun(env: Env, runId: string) {
  if (env.SWAP_KV) {
    await env.SWAP_KV.put(`td_run:${runId}`, "");
  } else {
    memoryRuns.delete(runId);
  }
}

function roughHeroProgress(hero: Record<string, unknown>): number {
  const map = Math.max(1, Number(hero.worldMap) || 1);
  const scene = Math.max(1, Number(hero.worldScene) || 1);
  const level = Math.max(1, Number(hero.level) || 1);
  const exp = Math.max(0, Number(hero.exp) || 0);
  return map * 1_000_000 + scene * 10_000 + level * 1_000 + exp;
}

function isHeroPayload(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  try {
    return JSON.stringify(raw).length <= RPG_HERO_MAX_BYTES;
  } catch {
    return false;
  }
}

async function loadRpg(env: Env, wallet: string): Promise<RpgCloud | null> {
  const key = `td_rpg:${wallet}`;
  if (env.SWAP_KV) {
    const raw = await env.SWAP_KV.get(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as RpgCloud;
      if (!parsed?.hero || typeof parsed.hero !== "object") return null;
      return {
        hero: parsed.hero,
        updatedAt: Number(parsed.updatedAt) || 0,
      };
    } catch {
      return null;
    }
  }
  return memoryRpg.get(wallet) ?? null;
}

async function saveRpg(
  env: Env,
  wallet: string,
  hero: Record<string, unknown>,
  updatedAt: number,
): Promise<{ saved: boolean; cloud: RpgCloud }> {
  const incoming: RpgCloud = { hero, updatedAt: Math.max(0, updatedAt) || Date.now() };
  const existing = await loadRpg(env, wallet);
  if (existing) {
    const inScore = roughHeroProgress(incoming.hero);
    const exScore = roughHeroProgress(existing.hero);
    if (inScore < exScore) return { saved: false, cloud: existing };
    if (inScore === exScore && incoming.updatedAt < existing.updatedAt) {
      return { saved: false, cloud: existing };
    }
  }
  const key = `td_rpg:${wallet}`;
  if (env.SWAP_KV) {
    await env.SWAP_KV.put(key, JSON.stringify(incoming));
  } else {
    memoryRpg.set(wallet, incoming);
  }
  return { saved: true, cloud: incoming };
}

async function maybeSaveHeroFromBody(
  env: Env,
  wallet: string,
  body: { heroSave?: unknown; heroUpdatedAt?: unknown },
): Promise<void> {
  if (!isHeroPayload(body.heroSave)) return;
  const updatedAt = Number(body.heroUpdatedAt) || Date.now();
  await saveRpg(env, wallet, body.heroSave, updatedAt);
}

async function loadRpgSync(env: Env, wallet: string): Promise<RpgSyncSession | null> {
  const key = `td_rpg_sync:${wallet}`;
  if (env.SWAP_KV) {
    const raw = await env.SWAP_KV.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RpgSyncSession;
    } catch {
      return null;
    }
  }
  return memoryRpgSync.get(wallet) ?? null;
}

async function saveRpgSync(env: Env, wallet: string, session: RpgSyncSession) {
  const key = `td_rpg_sync:${wallet}`;
  if (env.SWAP_KV) {
    await env.SWAP_KV.put(key, JSON.stringify(session));
  } else {
    memoryRpgSync.set(wallet, session);
  }
}

async function validateRpgSyncToken(
  env: Env,
  wallet: string,
  token: string | undefined,
): Promise<boolean> {
  if (!token || typeof token !== "string" || token.length < 16) return false;
  const session = await loadRpgSync(env, wallet);
  if (!session || session.token !== token) return false;
  if (Date.now() > session.expiresAt) return false;
  return true;
}

function refillCost(profile: TdProfile): number {
  return REFILL_BASE_POINTS * 2 ** profile.refillCountToday;
}

function goldExchangeCost(profile: TdProfile): number {
  return GOLD_EXCHANGE_BASE_POINTS * 2 ** profile.goldExchangeCountToday;
}

function pathSegments(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.split("/").filter(Boolean);
}

async function parseJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export const onRequest = async (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[] | undefined>;
}) => {
  const { request, env, params } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  const path = pathSegments(params.path as string | string[] | undefined);
  const wallet = path[0] ? normalizeWallet(path[0]) : null;
  if (!wallet) return new Response("Bad wallet", { status: 400 });

  if (path.length === 1 && request.method === "GET") {
    const now = Date.now();
    let profile = await loadTd(env, wallet);
    profile = await reconcileActiveRun(env, profile, now);
    const farm = await loadFarm(env, wallet);
    const saved = await saveTd(env, wallet, profile);
    const rpg = await loadRpg(env, wallet);
    return json({
      ok: true,
      profile: saved,
      farmPoints: farm.points,
      refillCost: refillCost(saved),
      goldExchangeCost: goldExchangeCost(saved),
      heroSave: rpg?.hero ?? null,
      heroUpdatedAt: rpg?.updatedAt ?? 0,
    });
  }

  if (path[1] === "refill-stamina" && request.method === "POST") {
    const body = await parseJson<SignedBody>(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const auth = await requireWalletSignature("td-refill-stamina", wallet, body);
    if (auth) return auth;

    let profile = await loadTd(env, wallet);
    const cost = refillCost(profile);
    const farm = await loadFarm(env, wallet);
    if (farm.points < cost) {
      return json({ ok: false, error: "INSUFFICIENT_POINTS", need: cost, have: farm.points }, 400);
    }

    await saveFarmPoints(env, wallet, farm.points - cost);
    const before = profile.stamina;
    profile = {
      ...profile,
      stamina: profile.stamina + STAMINA_REFILL_AMOUNT,
      refillCountToday: profile.refillCountToday + 1,
    };
    const gained = profile.stamina - before;
    const saved = await saveTd(env, wallet, profile);
    return json({
      ok: true,
      profile: saved,
      pointsSpent: cost,
      farmPoints: farm.points - cost,
      staminaGained: gained,
    });
  }

  if (path[1] === "exchange-gold" && request.method === "POST") {
    const body = await parseJson<SignedBody>(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const auth = await requireWalletSignature("td-exchange-gold", wallet, body);
    if (auth) return auth;

    let profile = await loadTd(env, wallet);
    const cost = goldExchangeCost(profile);
    const farm = await loadFarm(env, wallet);
    if (farm.points < cost) {
      return json({ ok: false, error: "INSUFFICIENT_POINTS", need: cost, have: farm.points }, 400);
    }

    await saveFarmPoints(env, wallet, farm.points - cost);
    profile = {
      ...profile,
      gold: profile.gold + GOLD_EXCHANGE_REWARD,
      goldExchangeCountToday: profile.goldExchangeCountToday + 1,
    };
    const saved = await saveTd(env, wallet, profile);
    return json({
      ok: true,
      profile: saved,
      pointsSpent: cost,
      farmPoints: farm.points - cost,
      goldGained: GOLD_EXCHANGE_REWARD,
    });
  }

  if (path[1] === "start" && request.method === "POST") {
    const body = await parseJson<SignedBody & { stage?: number }>(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const stage = Number(body.stage) || 1;
    const auth = await requireWalletSignature("td-start", wallet, body, `stage=${stage}`);
    if (auth) return auth;

    let profile = await loadTd(env, wallet);
    if (profile.stamina < STAMINA_PER_RUN) {
      return json({ ok: false, error: "NO_STAMINA", need: STAMINA_PER_RUN, have: profile.stamina }, 400);
    }
    if (stage > profile.unlockedStage) {
      return json({ ok: false, error: "STAGE_LOCKED", unlocked: profile.unlockedStage }, 400);
    }
    if (profile.activeRunId) {
      return json({ ok: false, error: "RUN_ACTIVE" }, 400);
    }

    const runId = `${wallet.slice(2, 10)}_${Date.now().toString(36)}`;
    const finishToken = crypto.randomUUID();
    const now = Date.now();
    await saveRun(env, { runId, wallet, stage, startedAt: now, finishToken });

    profile = {
      ...profile,
      stamina: profile.stamina - STAMINA_PER_RUN,
      activeRunId: runId,
      activeRunStage: stage,
      activeRunStartedAt: now,
    };
    const saved = await saveTd(env, wallet, profile);
    return json({ ok: true, profile: saved, runId, finishToken, activeBuffs: saved.buffs });
  }

  if (path[1] === "finish" && request.method === "POST") {
    const body = await parseJson<
      SignedBody & {
        runId?: string;
        cleared?: boolean;
        wavesReached?: number;
        finishToken?: string;
        heroSave?: unknown;
        heroUpdatedAt?: unknown;
      }
    >(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const runId = (body.runId ?? "").trim();
    const cleared = !!body.cleared;
    const wavesReached = Math.max(0, Math.min(20, Number(body.wavesReached) || 0));
    const finishToken = (body.finishToken ?? "").trim();

    const run = await loadRun(env, runId);
    if (!run || run.wallet !== wallet) {
      return json({ ok: false, error: "INVALID_RUN" }, 400);
    }

    const tokenOk =
      finishToken.length > 0 &&
      (finishToken === run.finishToken || !run.finishToken);
    if (!tokenOk) {
      const auth = await requireWalletSignature(
        "td-finish",
        wallet,
        body,
        `runId=${runId}:cleared=${cleared ? 1 : 0}`,
      );
      if (auth) return auth;
    }

    let profile = await loadTd(env, wallet);
    if (profile.activeRunId !== runId) {
      return json({ ok: false, error: "RUN_MISMATCH" }, 400);
    }

    let goldEarned = 0;
    if (cleared) {
      goldEarned = stageClearGold(run.stage);
      if (run.stage >= profile.unlockedStage) {
        profile.unlockedStage = Math.min(run.stage + 1, 99);
      }
    } else if (wavesReached > 0) {
      goldEarned = FAIL_CONSOLATION_GOLD;
    }

    profile = {
      ...profile,
      gold: profile.gold + goldEarned,
      activeRunId: null,
      activeRunStage: null,
      activeRunStartedAt: null,
    };
    const saved = await saveTd(env, wallet, profile);
    await deleteRun(env, runId);
    await maybeSaveHeroFromBody(env, wallet, body);

    return json({ ok: true, profile: saved, goldEarned, cleared });
  }

  if (path[1] === "unlock-map-sweep" && request.method === "POST") {
    const body = await parseJson<SignedBody>(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const auth = await requireWalletSignature("td-unlock-map-sweep", wallet, body);
    if (auth) return auth;

    let profile = await loadTd(env, wallet);
    if (profile.mapSweepUnlocked) {
      return json({ ok: false, error: "ALREADY_UNLOCKED" }, 400);
    }
    const farm = await loadFarm(env, wallet);
    if (farm.points < MAP_SWEEP_UNLOCK_POINTS) {
      return json(
        {
          ok: false,
          error: "INSUFFICIENT_POINTS",
          need: MAP_SWEEP_UNLOCK_POINTS,
          have: farm.points,
        },
        400,
      );
    }
    await saveFarmPoints(env, wallet, farm.points - MAP_SWEEP_UNLOCK_POINTS);
    profile = { ...profile, mapSweepUnlocked: true };
    const saved = await saveTd(env, wallet, profile);
    return json({
      ok: true,
      profile: saved,
      pointsSpent: MAP_SWEEP_UNLOCK_POINTS,
      farmPoints: farm.points - MAP_SWEEP_UNLOCK_POINTS,
    });
  }

  if (path[1] === "fast-clear" && request.method === "POST") {
    const body = await parseJson<
      SignedBody & {
        cost?: number;
        sceneWon?: boolean;
        heroSave?: unknown;
        heroUpdatedAt?: unknown;
      }
    >(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const cost = Math.max(1, Math.min(FAST_CLEAR_STAMINA_MAX, Number(body.cost) || 1));
    const sceneWon = !!body.sceneWon;
    const auth = await requireWalletSignature(
      "td-fast-clear",
      wallet,
      body,
      `cost=${cost}:won=${sceneWon ? 1 : 0}`,
    );
    if (auth) return auth;

    let profile = await loadTd(env, wallet);
    if (profile.stamina < cost) {
      return json({ ok: false, error: "NO_STAMINA", need: cost, have: profile.stamina }, 400);
    }
    if (profile.activeRunId) {
      return json({ ok: false, error: "RUN_ACTIVE" }, 400);
    }

    let goldEarned = 0;
    if (sceneWon) {
      goldEarned = stageClearGold(1);
      profile = {
        ...profile,
        unlockedStage: Math.max(profile.unlockedStage, 2),
      };
    } else {
      goldEarned = FAIL_CONSOLATION_GOLD;
    }

    profile = {
      ...profile,
      stamina: profile.stamina - cost,
      gold: profile.gold + goldEarned,
    };
    const saved = await saveTd(env, wallet, profile);
    await maybeSaveHeroFromBody(env, wallet, body);
    return json({ ok: true, profile: saved, goldEarned });
  }

  if (path[1] === "map-sweep" && request.method === "POST") {
    const body = await parseJson<
      SignedBody & { runs?: number; heroSave?: unknown; heroUpdatedAt?: unknown }
    >(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const runs = Math.max(1, Math.min(MAP_SWEEP_RUNS_MAX, Number(body.runs) || 1));
    const auth = await requireWalletSignature("td-map-sweep", wallet, body, `runs=${runs}`);
    if (auth) return auth;

    let profile = await loadTd(env, wallet);
    if (!profile.mapSweepUnlocked) {
      return json({ ok: false, error: "SWEEP_LOCKED" }, 400);
    }
    const cost = runs * STAMINA_PER_MAP_SWEEP;
    if (profile.stamina < cost) {
      return json({ ok: false, error: "NO_STAMINA", need: cost, have: profile.stamina }, 400);
    }
    if (profile.activeRunId) {
      return json({ ok: false, error: "RUN_ACTIVE" }, 400);
    }
    profile = { ...profile, stamina: profile.stamina - cost };
    const saved = await saveTd(env, wallet, profile);
    await maybeSaveHeroFromBody(env, wallet, body);
    return json({ ok: true, profile: saved });
  }

  if (path[1] === "rpg-sync-auth" && request.method === "POST") {
    const body = await parseJson<SignedBody>(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const auth = await requireWalletSignature("td-rpg-sync-auth", wallet, body);
    if (auth) return auth;

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = Date.now() + RPG_SYNC_TTL_MS;
    await saveRpgSync(env, wallet, { token, expiresAt });
    return json({ ok: true, syncToken: token, expiresAt });
  }

  if (path[1] === "rpg-save" && request.method === "POST") {
    const body = await parseJson<
      SignedBody & {
        syncToken?: string;
        heroSave?: unknown;
        heroUpdatedAt?: unknown;
      }
    >(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    if (!isHeroPayload(body.heroSave)) {
      return json({ ok: false, error: "BAD_HERO" }, 400);
    }
    const updatedAt = Number(body.heroUpdatedAt) || Date.now();
    const tokenOk = await validateRpgSyncToken(env, wallet, body.syncToken);
    if (!tokenOk) {
      const auth = await requireWalletSignature(
        "td-rpg-save",
        wallet,
        body,
        `updatedAt=${updatedAt}`,
      );
      if (auth) return auth;
    }
    const result = await saveRpg(env, wallet, body.heroSave, updatedAt);
    return json({
      ok: true,
      saved: result.saved,
      heroUpdatedAt: result.cloud.updatedAt,
      heroSave: result.cloud.hero,
    });
  }

  if (path[1] === "shop-buy" && request.method === "POST") {
    const body = await parseJson<SignedBody & { itemId?: string }>(request);
    if (!body) return new Response("Bad JSON", { status: 400 });
    const itemId = (body.itemId ?? "").trim();
    const item = SHOP[itemId];
    if (!item) return json({ ok: false, error: "UNKNOWN_ITEM" }, 400);

    const auth = await requireWalletSignature("td-shop-buy", wallet, body, `itemId=${itemId}`);
    if (auth) return auth;

    let profile = await loadTd(env, wallet);
    if (profile.gold < item.price) {
      return json({ ok: false, error: "INSUFFICIENT_GOLD", need: item.price, have: profile.gold }, 400);
    }

    const now = Date.now();
    profile = {
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
    const saved = await saveTd(env, wallet, profile);
    return json({ ok: true, profile: saved, itemId });
  }

  return new Response("Not found", { status: 404 });
};

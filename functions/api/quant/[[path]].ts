/**
 * GET  /api/quant/:wallet              — load cloud paper state
 * POST /api/quant/:wallet/unlock-sim     — unlock paper sim (100 pts, once)
 * POST /api/quant/:wallet/start            — start cloud paper (wallet signature)
 * POST /api/quant/:wallet/reset          — reset cloud paper
 * POST /api/quant/:wallet/liquidate      — sell all positions at chain price (stopped only)
 * POST /api/quant/cron/tick              — manual cron (CRON_SECRET header)
 */

import { corsPreflight, withCors } from "../../lib/cors";
import { requireWalletSignature, type SignedBody } from "../../lib/farm-sign";
import {
  addActiveWallet,
  loadPaper,
  removeActiveWallet,
  savePaper,
  snapshotEquity,
  tickAllRunning,
  tickPaperState,
  tickWallet,
} from "../../lib/quant/tick";
import {
  defaultCloudPaperState,
  liquidateAllPositions,
  type CloudPaperState,
} from "../../lib/quant/paper";
import {
  beginCloudHourlyAnchor,
  ensureSimUnlocked,
  loadQuantBilling,
  quantPricingPublic,
  saveQuantBilling,
} from "../../lib/quant/billing";
import { loadFarmPoints } from "../../lib/farm-points";
import type { StrategyId } from "../../lib/quant/markets";

interface Env {
  SWAP_KV?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    list(opts: {
      prefix: string;
      cursor?: string;
    }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
  };
  CRON_SECRET?: string;
}

const NO_CACHE = withCors({
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: NO_CACHE });
}

function normalizeWallet(w: string): string | null {
  const x = w.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(x)) return null;
  return x;
}

function isStrategyId(v: unknown): v is StrategyId {
  return v === "ma_cross" || v === "rsi_revert" || v === "grid";
}

type StartBody = SignedBody & {
  marketId?: string;
  strategyId?: StrategyId;
  params?: Record<string, number>;
};

export async function onRequest(context: {
  request: Request;
  env: Env;
  params: { path?: string | string[] };
}): Promise<Response> {
  const { request, env, params } = context;

  if (request.method === "OPTIONS") return corsPreflight(request);

  const rawPath = params.path;
  const segments = Array.isArray(rawPath)
    ? rawPath
    : typeof rawPath === "string"
      ? rawPath.split("/").filter(Boolean)
      : [];

  if (segments[0] === "cron" && segments[1] === "tick" && request.method === "POST") {
    const secret = request.headers.get("x-cron-secret") ?? "";
    if (!env.CRON_SECRET || secret !== env.CRON_SECRET) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }
    const result = await tickAllRunning(env.SWAP_KV);
    return json({ ok: true, ...result });
  }

  const wallet = normalizeWallet(segments[0] ?? "");
  if (!wallet) return json({ ok: false, error: "invalid wallet" }, 400);

  const action = segments[1] ?? "";

  if (request.method === "GET" && !action) {
    const state = await loadPaper(env.SWAP_KV, wallet);
    const billing = await loadQuantBilling(env.SWAP_KV, wallet);
    const farmPoints = await loadFarmPoints(env.SWAP_KV, wallet);
    return json({
      ok: true,
      exists: !!state,
      state,
      equity: state ? snapshotEquity(state) : null,
      kv: !!env.SWAP_KV,
      billing,
      farmPoints,
      pricing: quantPricingPublic(),
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method not allowed" }, 405);
  }

  let body: StartBody = {};
  try {
    body = (await request.json()) as StartBody;
  } catch {
    return json({ ok: false, error: "invalid json" }, 400);
  }

  if (action === "unlock-sim") {
    const authErr = await requireWalletSignature("quant_unlock_sim", wallet, body);
    if (authErr) return authErr;
    const unlocked = await ensureSimUnlocked(env.SWAP_KV, wallet);
    if (!unlocked.ok) {
      return json(
        { ok: false, error: unlocked.error, need: unlocked.need, have: unlocked.have },
        400,
      );
    }
    return json({
      ok: true,
      billing: unlocked.billing,
      farmPoints: unlocked.farmPoints,
      pointsSpent: unlocked.pointsSpent,
      pricing: quantPricingPublic(),
    });
  }

  if (action === "start") {
    const configData = JSON.stringify({
      marketId: body.marketId,
      strategyId: body.strategyId,
      params: body.params,
    });
    const authErr = await requireWalletSignature("quant_start", wallet, body, configData);
    if (authErr) return authErr;

    if (!body.marketId || !isStrategyId(body.strategyId) || !body.params) {
      return json({ ok: false, error: "missing config" }, 400);
    }

    const unlocked = await ensureSimUnlocked(env.SWAP_KV, wallet);
    if (!unlocked.ok) {
      return json(
        { ok: false, error: unlocked.error, need: unlocked.need, have: unlocked.have },
        400,
      );
    }

    const billing = beginCloudHourlyAnchor(unlocked.billing);
    await saveQuantBilling(env.SWAP_KV, wallet, billing);

    const prev = (await loadPaper(env.SWAP_KV, wallet)) ?? defaultCloudPaperState();
    const next: CloudPaperState = {
      ...prev,
      marketId: body.marketId,
      strategyId: body.strategyId,
      params: body.params,
      running: true,
      startedAt: Date.now(),
      lastError: null,
      logs: [
        {
          time: Date.now(),
          text: `Cloud start · ${body.marketId} · ${body.strategyId}`,
        },
        ...prev.logs.slice(0, 48),
      ],
    };

    let ticked = next;
    try {
      ticked = await tickPaperState(next, env.SWAP_KV);
    } catch (e) {
      ticked = {
        ...next,
        lastError: e instanceof Error ? e.message : "first tick failed",
        lastTickAt: Date.now(),
      };
    }

    await savePaper(env.SWAP_KV, wallet, ticked);
    await addActiveWallet(env.SWAP_KV, wallet);
    return json({
      ok: true,
      state: ticked,
      equity: snapshotEquity(ticked),
      billing,
      farmPoints: await loadFarmPoints(env.SWAP_KV, wallet),
      pointsSpent: unlocked.pointsSpent,
      pricing: quantPricingPublic(),
    });
  }

  if (action === "stop") {
    const authErr = await requireWalletSignature("quant_stop", wallet, body);
    if (authErr) return authErr;
    const prev = await loadPaper(env.SWAP_KV, wallet);
    if (!prev) return json({ ok: false, error: "not found" }, 404);
    const next: CloudPaperState = {
      ...prev,
      running: false,
      lastError: null,
      logs: [{ time: Date.now(), text: "Cloud stop" }, ...prev.logs.slice(0, 49)],
    };
    await savePaper(env.SWAP_KV, wallet, next);
    await removeActiveWallet(env.SWAP_KV, wallet);
    return json({ ok: true, state: next, equity: snapshotEquity(next) });
  }

  if (action === "reset") {
    const authErr = await requireWalletSignature("quant_reset", wallet, body);
    if (authErr) return authErr;
    const next = defaultCloudPaperState();
    await savePaper(env.SWAP_KV, wallet, next);
    await removeActiveWallet(env.SWAP_KV, wallet);
    return json({ ok: true, state: next, equity: snapshotEquity(next) });
  }

  if (action === "liquidate") {
    const authErr = await requireWalletSignature("quant_liquidate", wallet, body);
    if (authErr) return authErr;
    const prev = await loadPaper(env.SWAP_KV, wallet);
    if (!prev) return json({ ok: false, error: "not found" }, 404);
    if (prev.running) {
      return json({ ok: false, error: "stop cloud first" }, 400);
    }
    if (!prev.positions.some((p) => p.qty > 1e-12)) {
      return json({ ok: false, error: "no position" }, 400);
    }
    try {
      const next = await liquidateAllPositions(prev);
      await savePaper(env.SWAP_KV, wallet, next);
      return json({ ok: true, state: next, equity: snapshotEquity(next) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "liquidate failed";
      return json({ ok: false, error: msg }, 500);
    }
  }

  if (action === "tick") {
    const authErr = await requireWalletSignature("quant_tick", wallet, body);
    if (authErr) return authErr;
    const after = await tickWallet(env.SWAP_KV, wallet);
    if (!after) return json({ ok: false, error: "not found" }, 404);
    return json({ ok: true, state: after, equity: snapshotEquity(after) });
  }

  return json({ ok: false, error: "not found" }, 404);
}

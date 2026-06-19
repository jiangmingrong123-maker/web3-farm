"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccount, useSignMessage } from "wagmi";
import { TD_TICK_MS } from "@/config/td/pacing";
import { STAGE1_NAME } from "@/config/td/stage1";
import { STAGE1_TAGLINE } from "@/config/td/stage-theme";
import { SHOP_ITEMS } from "@/config/td/shop";
import { STAMINA_MAX, STAMINA_PER_RUN } from "@/config/td/economy";
import { START_POPULARITY } from "@/config/td/units";
import {
  buyTdShopItemApi,
  fetchTdProfileApi,
  finishTdRunApi,
  refillTdStaminaApi,
  startTdRunApi,
  type TdProfile,
  type TdSignFn,
} from "@/lib/td-api";
import {
  createRunState,
  isDefeat,
  isVictory,
  beginBattle,
  dropTower,
  mergeCrewTowers,
  placeTower,
  tickRun,
  type RunState,
} from "@/lib/td/engine";
import {
  DEMO_FARM_POINTS,
  defaultDemoProfile,
  demoBuy,
  demoFinish,
  demoRefill,
  demoRefillCost,
  demoStart,
  isTdDevDemoEnabled,
} from "@/lib/td/demo-store";
import { TdBattleGrid } from "@/components/td/TdBattleGrid";
import { TdTowerPicker } from "@/components/td/TdTowerPicker";
import {
  playTdSfx,
  setTdMuted,
  unlockTdAudio,
} from "@/lib/td/sfx";
import type { TowerKind } from "@/lib/td/towers";

type Screen = "hub" | "shop" | "play";

function activeBuffIds(profile: TdProfile): string[] {
  const now = Date.now();
  return Object.entries(profile.buffs)
    .filter(([, b]) => b.expiresAt > now)
    .map(([id]) => id);
}

function formatExpiry(ms: number, locale: string) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (locale === "zh") return `${h}时${m}分`;
  return `${h}h ${m}m`;
}

export function TowerDefenseApp({ locale }: { locale: string }) {
  const t = useTranslations("td");
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [screen, setScreen] = useState<Screen>("hub");
  const [profile, setProfile] = useState<TdProfile | null>(null);
  const [farmPoints, setFarmPoints] = useState(0);
  const [refillCost, setRefillCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [selectedKind, setSelectedKind] = useState<TowerKind>("群");
  const [paused, setPaused] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [inspectedTowerId, setInspectedTowerId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const devDemo = isTdDevDemoEnabled();
  const runRef = useRef<RunState | null>(null);
  const buffsRef = useRef<string[]>([]);
  const finishingRef = useRef(false);
  const runFxRef = useRef<RunState | null>(null);

  useEffect(() => {
    setTdMuted(!soundOn);
  }, [soundOn]);

  const sign: TdSignFn = useCallback(
    async (message) => {
      if (!signMessageAsync) throw new Error("no signer");
      return signMessageAsync({ message });
    },
    [signMessageAsync],
  );

  const enterDemo = useCallback(() => {
    const p = defaultDemoProfile();
    setDemoMode(true);
    setProfile(p);
    setFarmPoints(DEMO_FARM_POINTS);
    setRefillCost(demoRefillCost(p));
    buffsRef.current = [];
    setError(null);
    setResultMsg(null);
    setScreen("hub");
  }, []);

  const refresh = useCallback(async () => {
    if (demoMode) return;
    if (!address) return;
    setLoading(true);
    setError(null);
    const data = await fetchTdProfileApi(address);
    setLoading(false);
    if (!data) {
      setError(t("loadFailed"));
      return;
    }
    setProfile(data.profile);
    setFarmPoints(data.farmPoints);
    setRefillCost(data.refillCost);
    buffsRef.current = activeBuffIds(data.profile);
  }, [address, t, demoMode]);

  useEffect(() => {
    if (demoMode) return;
    if (isConnected && address) refresh();
    else {
      setProfile(null);
      setFarmPoints(0);
    }
  }, [isConnected, address, refresh, demoMode]);

  useEffect(() => {
    if (screen !== "play" || !runId) return;
    const id = setInterval(() => {
      if (paused) return;
      const cur = runRef.current;
      if (!cur) return;
      const next = tickRun(cur, Date.now(), buffsRef.current);
      runFxRef.current = cur;
      runRef.current = next;
      setRun(next);

      if (runFxRef.current && next.hearts < runFxRef.current.hearts) {
        playTdSfx("leak");
      }
      if (
        runFxRef.current?.waveActive &&
        !next.waveActive &&
        next.wave > 0 &&
        runFxRef.current.wave === next.wave
      ) {
        playTdSfx("wave_clear");
      }
    }, TD_TICK_MS);
    return () => clearInterval(id);
  }, [screen, runId, paused]);

  const updateRun = (next: RunState) => {
    runRef.current = next;
    setRun(next);
  };

  const handleRefill = async () => {
    if (!profile) return;
    if (demoMode) {
      const res = demoRefill(profile, farmPoints);
      if (!res) {
        setError(t("refillFailed"));
        return;
      }
      setProfile(res.profile);
      setFarmPoints(res.farmPoints);
      setRefillCost(demoRefillCost(res.profile));
      return;
    }
    if (!address) return;
    setLoading(true);
    setError(null);
    const res = await refillTdStaminaApi(address, sign);
    setLoading(false);
    if (!res) {
      setError(t("refillFailed"));
      return;
    }
    setProfile(res.profile);
    setFarmPoints(res.farmPoints);
    refresh();
  };

  const handleStart = async () => {
    if (!profile) return;
    if (demoMode) {
      const res = demoStart(profile);
      if (!res) {
        setError(t("startFailed"));
        return;
      }
      setProfile(res.profile);
      buffsRef.current = activeBuffIds(res.profile);
      const pop = START_POPULARITY + (buffsRef.current.includes("pack") ? 5 : 0);
      const initial = createRunState(pop);
      runRef.current = initial;
      finishingRef.current = false;
      setRunId(res.runId);
      setRun(initial);
      setScreen("play");
      setResultMsg(null);
      return;
    }
    if (!address) return;
    setLoading(true);
    setError(null);
    const res = await startTdRunApi(address, 1, sign);
    setLoading(false);
    if (!res) {
      setError(t("startFailed"));
      return;
    }
    setProfile(res.profile);
    buffsRef.current = activeBuffIds(res.profile);
    const pop =
      START_POPULARITY + (buffsRef.current.includes("pack") ? 5 : 0);
    const initial = createRunState(pop);
    runRef.current = initial;
    finishingRef.current = false;
    setRunId(res.runId);
    setRun(initial);
    setScreen("play");
    setResultMsg(null);
  };

  const handleForfeit = async (wavesReached: number) => {
    if (!runId || !profile) return;
    if (demoMode) {
      const res = demoFinish(profile, false, wavesReached);
      setProfile(res.profile);
      setResultMsg(t("forfeitResult", { gold: res.goldEarned }));
      setRunId(null);
      setRun(null);
      setScreen("hub");
      setRefillCost(demoRefillCost(res.profile));
      return;
    }
    if (!address) return;
    setLoading(true);
    const res = await finishTdRunApi(address, sign, {
      runId,
      cleared: false,
      wavesReached,
    });
    setLoading(false);
    if (res) {
      setProfile(res.profile);
      setResultMsg(t("forfeitResult", { gold: res.goldEarned }));
    }
    setRunId(null);
    setRun(null);
    setScreen("hub");
    refresh();
  };

  const endRun = useCallback(
    async (cleared: boolean, wavesReached: number) => {
      if (!runId || !profile) return;
      if (demoMode) {
        const res = demoFinish(profile, cleared, wavesReached);
        setProfile(res.profile);
        setResultMsg(
          cleared
            ? t("victoryResult", { gold: res.goldEarned })
            : t("defeatResult", { gold: res.goldEarned }),
        );
        setRunId(null);
        setRun(null);
        setScreen("hub");
        setRefillCost(demoRefillCost(res.profile));
        return;
      }
      if (!address) return;
      setLoading(true);
      const res = await finishTdRunApi(address, sign, {
        runId,
        cleared,
        wavesReached,
      });
      setLoading(false);
      if (res) {
        setProfile(res.profile);
        setResultMsg(
          cleared
            ? t("victoryResult", { gold: res.goldEarned })
            : t("defeatResult", { gold: res.goldEarned }),
        );
      }
      setRunId(null);
      setRun(null);
      setScreen("hub");
      refresh();
    },
    [address, runId, profile, demoMode, sign, t, refresh],
  );

  useEffect(() => {
    if (!run || screen !== "play" || finishingRef.current) return;
    if (isVictory(run)) {
      finishingRef.current = true;
      playTdSfx("victory");
      endRun(true, run.wave);
    } else if (isDefeat(run)) {
      finishingRef.current = true;
      playTdSfx("defeat");
      endRun(false, run.wave);
    }
  }, [run, screen, endRun]);

  const handleCellClick = (x: number, y: number) => {
    unlockTdAudio();
    setMergeSourceId(null);
    if (!run || paused) return;
    const next = placeTower(run, selectedKind, x, y);
    if (next) {
      playTdSfx("build");
      updateRun(next);
    }
  };

  const handleTowerClick = (towerId: string) => {
    if (!run || paused) return;
    const tower = run.towers.find((t) => t.id === towerId);
    if (!tower) return;

    setInspectedTowerId(towerId);

    if (mergeSourceId && mergeSourceId !== towerId) {
      const merged = mergeCrewTowers(run, mergeSourceId, towerId);
      if (merged) {
        playTdSfx("build");
        updateRun(merged);
        setMergeSourceId(null);
        setInspectedTowerId(towerId);
        return;
      }
    }

    if (mergeSourceId === towerId) {
      setMergeSourceId(null);
      return;
    }
  };

  const handleTowerDragStart = () => {
    setMergeSourceId(null);
  };

  const handleTowerDrop = (towerId: string, x: number, y: number) => {
    if (!run || paused) return;
    setMergeSourceId(null);
    const result = dropTower(run, towerId, x, y);
    if (result) {
      playTdSfx(result.action === "merge" ? "build" : "ui");
      updateRun(result.state);
    }
  };

  const handleBeginBattle = () => {
    unlockTdAudio();
    if (!run || run.battleStarted) return;
    playTdSfx("wave_start");
    updateRun(beginBattle(run));
  };

  const handleFxSound = useCallback((kind: "hit" | "die" | "shoot" | "shoot_star") => {
    if (kind === "shoot_star") playTdSfx("shoot_star");
    else if (kind === "shoot") playTdSfx("shoot");
    else if (kind === "hit") playTdSfx("hit");
    else playTdSfx("enemy_die");
  }, []);

  const handleBuy = async (itemId: string) => {
    if (!profile) return;
    if (demoMode) {
      const next = demoBuy(profile, itemId);
      if (!next) {
        setError(t("buyFailed"));
        return;
      }
      setProfile(next);
      buffsRef.current = activeBuffIds(next);
      return;
    }
    if (!address) return;
    setLoading(true);
    setError(null);
    const next = await buyTdShopItemApi(address, itemId, sign);
    setLoading(false);
    if (!next) {
      setError(t("buyFailed"));
      return;
    }
    setProfile(next);
    buffsRef.current = activeBuffIds(next);
    refresh();
  };

  if (!isConnected && !demoMode) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-white/60">{t("connectFirst")}</p>
        {devDemo && (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-white/40">{t("demoHint")}</p>
            <button
              type="button"
              onClick={enterDemo}
              className="rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-ink"
            >
              {t("demoPlay")}
            </button>
          </div>
        )}
      </div>
    );
  }

  const buffs = profile ? activeBuffIds(profile) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gold">{t("title")}</h1>
          <p className="mt-1 text-sm text-white/50">
            {demoMode ? t("demoBadge") : screen === "play" ? STAGE1_TAGLINE : t("subtitle")}
          </p>
        </div>
        {screen === "hub" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScreen("shop")}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:border-gold/40"
            >
              {t("shop")}
            </button>
          </div>
        )}
        {screen !== "hub" && (
          <button
            type="button"
            onClick={() => {
              if (screen === "play" && run) {
                handleForfeit(run.wave);
              } else {
                setScreen("hub");
              }
            }}
            className="text-sm text-white/50 hover:text-white"
          >
            {t("back")}
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {resultMsg && screen === "hub" && (
        <p className="mb-4 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2 text-sm text-gold">
          {resultMsg}
        </p>
      )}

      {screen === "hub" && profile && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t("gold")} value={profile.gold} />
            <Stat
              label={t("stamina")}
              value={`${profile.stamina}/${STAMINA_MAX}`}
            />
            <Stat label={t("farmPoints")} value={farmPoints} />
            <Stat label={t("stage")} value={`${STAGE1_NAME}`} />
          </div>

          {buffs.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-surface p-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-white/40">
                {t("activeBuffs")}
              </p>
              <div className="flex flex-wrap gap-2">
                {buffs.map((id) => {
                  const item = SHOP_ITEMS.find((i) => i.id === id);
                  const exp = profile.buffs[id]?.expiresAt ?? 0;
                  return (
                    <span
                      key={id}
                      className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold"
                    >
                      {item?.name ?? id} ·{" "}
                      {formatExpiry(Math.max(0, exp - Date.now()), locale)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {profile.activeRunId && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-200">{t("runInProgress")}</p>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleForfeit(0)}
                className="mt-2 text-sm underline text-amber-300"
              >
                {t("forfeit")}
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={
                loading ||
                !!profile.activeRunId ||
                profile.stamina < STAMINA_PER_RUN
              }
              onClick={handleStart}
              className="rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-ink disabled:opacity-40"
            >
              {t("startRun", { cost: STAMINA_PER_RUN })}
            </button>
            {profile.stamina < STAMINA_MAX && refillCost != null && (
              <button
                type="button"
                disabled={loading || farmPoints < refillCost}
                onClick={handleRefill}
                className="rounded-lg border border-white/20 px-6 py-3 text-sm disabled:opacity-40"
              >
                {t("refillStamina", { cost: refillCost })}
              </button>
            )}
          </div>

          <p className="text-xs text-white/35">{t("rulesHint")}</p>
        </div>
      )}

      {screen === "shop" && profile && (
        <div className="space-y-4">
          <p className="text-sm text-white/50">
            {t("shopHint")} · {t("gold")}: {profile.gold}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SHOP_ITEMS.map((item) => {
              const active = buffs.includes(item.id);
              const canBuy = profile.gold >= item.price && !loading;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-1 text-xs text-white/45">{item.description}</p>
                    </div>
                    <span className="shrink-0 text-sm text-gold">{item.price}G</span>
                  </div>
                  {active ? (
                    <p className="mt-3 text-xs text-green-400">{t("buffActive")}</p>
                  ) : (
                    <button
                      type="button"
                      disabled={!canBuy}
                      onClick={() => handleBuy(item.id)}
                      className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      {t("buy")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {screen === "play" && run && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>{t("wave")}: {run.wave}/20</span>
            <span>{t("hearts")}: {"❤".repeat(run.hearts)}{"🖤".repeat(3 - run.hearts)}</span>
            <span>{t("popularity")}: {Math.floor(run.popularity)}</span>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded border border-white/20 px-3 py-1 text-xs hover:border-white/40"
            >
              {paused ? t("resume") : t("pause")}
            </button>
            <button
              type="button"
              onClick={() => {
                unlockTdAudio();
                setSoundOn((s) => !s);
              }}
              className="rounded border border-white/20 px-3 py-1 text-xs hover:border-white/40"
            >
              {soundOn ? t("soundOn") : t("soundOff")}
            </button>
          </div>

          {!run.battleStarted && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-center text-sm text-cyan-100">
              {t("placementHint")}
            </div>
          )}

          <TdTowerPicker
            selected={selectedKind}
            disabled={paused}
            inspectedTower={run.towers.find((tw) => tw.id === inspectedTowerId) ?? null}
            mergeSourceId={mergeSourceId}
            allTowers={run.towers}
            onMergeSelect={(id) => {
              playTdSfx("ui");
              setMergeSourceId(id);
            }}
            onMergeCancel={() => setMergeSourceId(null)}
            onSelect={(k) => {
              unlockTdAudio();
              playTdSfx("ui");
              setSelectedKind(k);
              setMergeSourceId(null);
              setInspectedTowerId(null);
            }}
          />

          <TdBattleGrid
            run={run}
            selectedKind={selectedKind}
            paused={paused}
            mergeSourceId={mergeSourceId}
            inspectedTowerId={inspectedTowerId}
            onCellClick={handleCellClick}
            onTowerClick={handleTowerClick}
            onTowerDragStart={handleTowerDragStart}
            onTowerDrop={handleTowerDrop}
            onFxSound={handleFxSound}
          />

          <div className="flex flex-wrap gap-3">
            {!run.battleStarted && (
              <button
                type="button"
                disabled={paused}
                onClick={handleBeginBattle}
                className="rounded-lg bg-gold px-6 py-2 text-sm font-semibold text-ink disabled:opacity-40"
              >
                {t("beginBattle")}
              </button>
            )}
            {run.battleStarted && run.interWaveTimer > 0 && (
              <span className="self-center text-xs text-gold/80">
                {t("interWave", { sec: Math.ceil(run.interWaveTimer / 1000) })}
              </span>
            )}
            {run.battleStarted && run.waveActive && !paused && (
              <span className="self-center text-xs text-white/45">{t("waveActive")}</span>
            )}
            {paused && (
              <span className="self-center text-xs text-amber-300/80">{t("pausedHint")}</span>
            )}
          </div>
        </div>
      )}

      {loading && screen === "hub" && !profile && (
        <p className="text-center text-white/40">{t("loading")}</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface px-4 py-3">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

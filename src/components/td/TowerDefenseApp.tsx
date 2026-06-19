"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { useFarmSign } from "@/lib/web3/use-farm-sign";
import { STAGE1_NAME } from "@/config/td/stage1";
import { SHOP_ITEMS } from "@/config/td/shop";
import { STAMINA_PER_RUN, STAMINA_REFILL_AMOUNT } from "@/config/td/economy";
import { defaultHeroSave, type HeroSave } from "@/config/td/rpg";
import {
  buyTdShopItemApi,
  exchangeTdGoldApi,
  fetchTdProfileApi,
  finishTdRunApi,
  refillTdStaminaApi,
  startTdRunApi,
  type TdProfile,
} from "@/lib/td-api";
import {
  createClimbRun,
  fightNextFloor,
  floorsCleared,
  type ClimbRunState,
} from "@/lib/td/rpg-combat";
import {
  applyUpgrade,
  loadHeroSave,
  saveHeroSave,
  upgradeCost,
  type UpgradeKind,
} from "@/lib/td/rpg-storage";
import {
  DEMO_FARM_POINTS,
  defaultDemoProfile,
  demoBuy,
  demoExchangeGold,
  demoFinish,
  demoGoldExchangeCost,
  demoRefill,
  demoRefillCost,
  demoStart,
  demoUpgrade,
  isTdDevDemoEnabled,
} from "@/lib/td/demo-store";
import {
  clearPendingRun,
  loadPendingRun,
  savePendingRun,
} from "@/lib/td/rpg-run-storage";
import { TdRpgClimb } from "@/components/td/TdRpgClimb";
import { TdRpgHub } from "@/components/td/TdRpgHub";
import { fetchFarmStateApi } from "@/lib/farm-api";
import {
  resolveHeroAvatar,
  type HeroAvatar,
} from "@/lib/td/hero-avatar";
import { playTdSfx } from "@/lib/td/sfx";

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
  const sign = useFarmSign();
  const [profile, setProfile] = useState<TdProfile | null>(null);
  const [farmPoints, setFarmPoints] = useState(0);
  const [refillCost, setRefillCost] = useState(0);
  const [goldExchangeCost, setGoldExchangeCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const [runId, setRunId] = useState<string | null>(null);
  const [heroSave, setHeroSave] = useState<HeroSave>(defaultHeroSave());
  const [heroAvatar, setHeroAvatar] = useState<HeroAvatar>({ kind: "generic", name: "路人" });
  const [climb, setClimb] = useState<ClimbRunState | null>(null);
  const [settling, setSettling] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const devDemo = isTdDevDemoEnabled();
  const buffsRef = useRef<string[]>([]);
  const heroSaveRef = useRef(heroSave);
  const finishingRef = useRef(false);
  const finishTokenRef = useRef<string | null>(null);
  const runIdRef = useRef<string | null>(null);
  const activeRunIdRef = useRef<string | null>(null);
  const autoClimbRef = useRef(false);
  const restoredRunRef = useRef<string | null>(null);
  const settleGenRef = useRef(0);

  const [screen, setScreen] = useState<Screen>("hub");

  const enterDemo = useCallback(() => {
    const p = defaultDemoProfile();
    setDemoMode(true);
    setProfile(p);
    setFarmPoints(DEMO_FARM_POINTS);
    setRefillCost(demoRefillCost(p));
    setGoldExchangeCost(demoGoldExchangeCost(p));
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
    setGoldExchangeCost(data.goldExchangeCost);
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
    const wallet = demoMode ? "demo" : address;
    if (wallet) setHeroSave(loadHeroSave(wallet));
  }, [address, demoMode]);

  useEffect(() => {
    let cancelled = false;
    void resolveHeroAvatar(
      demoMode ? "demo" : address,
      demoMode,
      fetchFarmStateApi,
    ).then((avatar) => {
      if (!cancelled) setHeroAvatar(avatar);
    });
    return () => {
      cancelled = true;
    };
  }, [address, demoMode]);

  useEffect(() => {
    heroSaveRef.current = heroSave;
  }, [heroSave]);

  useEffect(() => {
    runIdRef.current = runId;
  }, [runId]);

  useEffect(() => {
    activeRunIdRef.current = profile?.activeRunId ?? null;
  }, [profile?.activeRunId]);

  const walletKey = demoMode ? "demo" : address ?? "";

  const persistActiveRun = useCallback(
    (id: string, token: string, climbState: ClimbRunState) => {
      if (demoMode || !walletKey) return;
      savePendingRun(walletKey, {
        runId: id,
        finishToken: token,
        climb: climbState,
        updatedAt: Date.now(),
      });
    },
    [demoMode, walletKey],
  );

  const showSettleMessage = useCallback(
    (cleared: boolean, wavesReached: number, goldEarned: number) => {
      if (cleared) {
        setResultMsg(t("victoryResult", { gold: goldEarned }));
      } else if (wavesReached > 0) {
        setResultMsg(t("defeatResult", { gold: goldEarned }));
      } else {
        setResultMsg(t("forfeitResult", { gold: goldEarned }));
      }
    },
    [t],
  );

  const settleRun = useCallback(
    async (
      cleared: boolean,
      wavesReached: number,
      activeId?: string | null,
      gen?: number,
    ): Promise<boolean> => {
      const id = activeId ?? runIdRef.current ?? activeRunIdRef.current;
      const currentProfile = profile;
      if (!id || !currentProfile) return false;
      if (gen != null && gen !== settleGenRef.current) return false;

      if (demoMode) {
        const res = demoFinish(currentProfile, cleared, wavesReached, id);
        if (!res) return false;
        if (gen != null && gen !== settleGenRef.current) return false;
        setProfile(res.profile);
        setRefillCost(demoRefillCost(res.profile));
        setGoldExchangeCost(demoGoldExchangeCost(res.profile));
        showSettleMessage(cleared, wavesReached, res.goldEarned);
        clearPendingRun(walletKey);
        return true;
      }

      if (!address) return false;
      const token =
        finishTokenRef.current ?? loadPendingRun(walletKey)?.finishToken ?? undefined;

      for (let attempt = 0; attempt < 3; attempt++) {
        if (gen != null && gen !== settleGenRef.current) return false;
        const res = await finishTdRunApi(address, sign, {
          runId: id,
          cleared,
          wavesReached,
          finishToken: token,
        });
        if (res) {
          if (gen != null && gen !== settleGenRef.current) return false;
          finishTokenRef.current = null;
          clearPendingRun(walletKey);
          setProfile(res.profile);
          showSettleMessage(cleared, wavesReached, res.goldEarned);
          await refresh();
          return true;
        }
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        }
      }

      if (gen != null && gen !== settleGenRef.current) return false;
      const data = await fetchTdProfileApi(address);
      if (data && !data.profile.activeRunId) {
        finishTokenRef.current = null;
        clearPendingRun(walletKey);
        setProfile(data.profile);
        setFarmPoints(data.farmPoints);
        return true;
      }
      return false;
    },
    [
      address,
      demoMode,
      profile,
      refresh,
      showSettleMessage,
      sign,
      walletKey,
    ],
  );

  const autoSettleAndReturn = useCallback(
    async (climbState: ClimbRunState, gen: number) => {
      if (finishingRef.current) return;
      if (gen !== settleGenRef.current) return;
      finishingRef.current = true;
      setSettling(true);
      setError(null);
      const id = runIdRef.current ?? activeRunIdRef.current;
      const token = finishTokenRef.current ?? loadPendingRun(walletKey)?.finishToken ?? "";
      if (id && token) {
        persistActiveRun(id, token, climbState);
      }
      const cleared = climbState.victory;
      const waves = cleared ? climbState.maxFloor : floorsCleared(climbState);
      const ok = await settleRun(cleared, waves, id, gen);
      if (gen !== settleGenRef.current) return;
      setSettling(false);
      setRunId(null);
      setClimb(null);
      setScreen("hub");
      autoClimbRef.current = false;
      if (!ok && !demoMode) {
        finishingRef.current = false;
        setError(t("settleRetryHint"));
      }
    },
    [demoMode, persistActiveRun, settleRun, t, walletKey],
  );

  const runAutoClimbLoop = useCallback(
    async (initial: ClimbRunState, gen: number) => {
      if (autoClimbRef.current || initial.done) return;
      if (gen !== settleGenRef.current) return;
      autoClimbRef.current = true;
      setAutoRunning(true);
      setError(null);
      let state = initial;

      while (!state.done) {
        if (gen !== settleGenRef.current) {
          autoClimbRef.current = false;
          setAutoRunning(false);
          return;
        }
        setClimb({ ...state, activeFloor: state.floor + 1 });
        await new Promise((r) => setTimeout(r, 320));
        state = fightNextFloor(state, heroSaveRef.current, buffsRef.current, locale);
        setClimb(state);
        const id = runIdRef.current ?? activeRunIdRef.current;
        const token =
          finishTokenRef.current ?? loadPendingRun(walletKey)?.finishToken ?? "";
        if (id && token) persistActiveRun(id, token, state);
        if (!state.done) await new Promise((r) => setTimeout(r, 180));
      }

      setAutoRunning(false);
      if (gen !== settleGenRef.current) {
        autoClimbRef.current = false;
        return;
      }
      if (state.victory) playTdSfx("victory");
      else playTdSfx("defeat");
      await autoSettleAndReturn(state, gen);
    },
    [autoSettleAndReturn, locale, persistActiveRun, walletKey],
  );

  useEffect(() => {
    if (demoMode || !address || !profile?.activeRunId) return;
    const activeId = profile.activeRunId;
    if (restoredRunRef.current === activeId) return;
    if (autoClimbRef.current) return;

    const pending = loadPendingRun(address);
    if (!pending || pending.runId !== activeId) return;

    restoredRunRef.current = activeId;
    finishTokenRef.current = pending.finishToken;
    runIdRef.current = pending.runId;
    setRunId(pending.runId);
    setClimb(pending.climb);

    const gen = settleGenRef.current;
    if (pending.climb.done) {
      void autoSettleAndReturn(pending.climb, gen);
    } else {
      setScreen("play");
      void runAutoClimbLoop(pending.climb, gen);
    }
  }, [
    address,
    autoSettleAndReturn,
    demoMode,
    profile?.activeRunId,
    runAutoClimbLoop,
  ]);

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
      setGoldExchangeCost(demoGoldExchangeCost(res.profile));
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

  const handleExchangeGold = async () => {
    if (!profile) return;
    if (demoMode) {
      const res = demoExchangeGold(profile, farmPoints);
      if (!res) {
        setError(t("exchangeFailed"));
        return;
      }
      setProfile(res.profile);
      setFarmPoints(res.farmPoints);
      setGoldExchangeCost(demoGoldExchangeCost(res.profile));
      setResultMsg(t("exchangeResult", { gold: res.goldGained, cost: res.pointsSpent }));
      return;
    }
    if (!address) return;
    setLoading(true);
    setError(null);
    const res = await exchangeTdGoldApi(address, sign);
    setLoading(false);
    if (!res) {
      setError(t("exchangeFailed"));
      return;
    }
    setProfile(res.profile);
    setFarmPoints(res.farmPoints);
    setResultMsg(t("exchangeResult", { gold: res.goldGained, cost: res.pointsSpent }));
    refresh();
  };

  const beginRunSession = (id: string, token: string, climbState: ClimbRunState) => {
    settleGenRef.current += 1;
    const gen = settleGenRef.current;
    restoredRunRef.current = id;
    finishingRef.current = false;
    autoClimbRef.current = false;
    finishTokenRef.current = token;
    runIdRef.current = id;
    activeRunIdRef.current = id;
    clearPendingRun(walletKey);
    setRunId(id);
    setClimb(climbState);
    persistActiveRun(id, token, climbState);
    setScreen("play");
    setResultMsg(null);
    setError(null);
    void runAutoClimbLoop(climbState, gen);
    return gen;
  };

  const handleForfeit = async (wavesReached: number) => {
    const gen = settleGenRef.current;
    setSettling(true);
    setError(null);
    const ok = await settleRun(false, wavesReached, undefined, gen);
    setSettling(false);
    if (!ok && !demoMode) setError(t("settleRetryHint"));
    finishTokenRef.current = null;
    runIdRef.current = null;
    restoredRunRef.current = null;
    setRunId(null);
    setClimb(null);
    setScreen("hub");
    autoClimbRef.current = false;
    if (ok) clearPendingRun(walletKey);
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
      activeRunIdRef.current = res.runId;
      const climbState = createClimbRun();
      beginRunSession(res.runId, "demo", climbState);
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
    activeRunIdRef.current = res.runId;
    beginRunSession(res.runId, res.finishToken, createClimbRun());
  };

  const handleClimbFinish = () => {
    if (!climb || settling) return;
    void autoSettleAndReturn(climb, settleGenRef.current);
  };

  const handleUpgrade = (kind: UpgradeKind) => {
    if (!profile) return;
    const cost = upgradeCost(heroSave, kind);
    if (cost == null || profile.gold < cost) {
      setError(t("upgradeFailed"));
      return;
    }
    if (demoMode) {
      const res = demoUpgrade(profile, heroSave, kind);
      if (!res) {
        setError(t("upgradeFailed"));
        return;
      }
      setProfile(res.profile);
      setHeroSave(res.hero);
      saveHeroSave(walletKey, res.hero);
      setError(null);
      return;
    }
    const nextHero = applyUpgrade(heroSave, kind);
    if (!nextHero) {
      setError(t("upgradeFailed"));
      return;
    }
    setProfile({ ...profile, gold: profile.gold - cost });
    setHeroSave(nextHero);
    saveHeroSave(walletKey, nextHero);
    setError(null);
  };

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
            {demoMode ? t("demoBadge") : screen === "play" ? t("textModeTagline") : t("subtitle")}
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
              if (screen === "play" && climb) {
                handleForfeit(floorsCleared(climb));
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

      {error && screen === "hub" && (
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
              value={profile.stamina}
            />
            <Stat label={t("farmPoints")} value={Math.floor(farmPoints)} />
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

          {profile.activeRunId && !settling && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-200">{t("runInProgress")}</p>
              <p className="mt-1 text-xs text-amber-200/70">{t("runInProgressHint")}</p>
              <button
                type="button"
                disabled={loading || settling}
                onClick={() => {
                  const pending = loadPendingRun(walletKey);
                  handleForfeit(pending ? floorsCleared(pending.climb) : 0);
                }}
                className="mt-2 text-sm underline text-amber-300 disabled:opacity-40"
              >
                {t("forfeit")}
              </button>
            </div>
          )}

          {settling && (
            <p className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-2 text-sm text-gold">
              {t("settling")}
            </p>
          )}

          <TdRpgHub
            save={heroSave}
            gold={profile.gold}
            locale={locale}
            avatar={heroAvatar}
            onUpgrade={handleUpgrade}
          />

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
            <button
              type="button"
              disabled={loading || farmPoints < refillCost}
              onClick={handleRefill}
              className="rounded-lg border border-white/20 px-6 py-3 text-sm disabled:opacity-40"
            >
              {t("refillStamina", { cost: refillCost, amount: STAMINA_REFILL_AMOUNT })}
            </button>
            <button
              type="button"
              disabled={loading || farmPoints < goldExchangeCost}
              onClick={handleExchangeGold}
              className="rounded-lg border border-gold/30 bg-gold/10 px-6 py-3 text-sm text-gold disabled:opacity-40"
            >
              {t("exchangeGold", { cost: goldExchangeCost, gold: 100 })}
            </button>
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

      {screen === "play" && climb && (
        <TdRpgClimb
          climb={climb}
          settling={settling}
          autoRunning={autoRunning}
          onFinish={handleClimbFinish}
        />
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

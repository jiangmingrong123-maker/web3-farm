"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { useFarmSign } from "@/lib/web3/use-farm-sign";
import { STAMINA_PER_RUN } from "@/config/td/economy";
import { defaultHeroSave, syncHeroLevel, type HeroSave } from "@/config/td/rpg";
import {
  buyTdShopItemApi,
  exchangeTdGoldApi,
  fetchTdProfileApi,
  finishTdRunApi,
  fastClearStaminaApi,
  mapSweepStaminaApi,
  refillTdStaminaApi,
  startTdRunApi,
  unlockMapSweepApi,
  type TdProfile,
} from "@/lib/td-api";
import {
  applySkippedProgress,
  executeFastClear,
  estimateFastClearStaminaCost,
  combatLogDelay,
  createClimbRun,
  finalizeSceneRun,
  planBattleEntry,
  runProgressScore,
  simulateSceneBattle,
  type ClimbRunState,
} from "@/lib/td/rpg-combat";
import {
  applyRunRewards,
  applyUpgrade,
  discardInventoryGold,
  loadHeroSave,
  loadHeroUpdatedAt,
  saveHeroSave,
  upgradeCost,
  type UpgradeKind,
} from "@/lib/td/rpg-storage";
import {
  ensureRpgSyncToken,
  loadSyncToken,
  mergeHeroWithCloud,
  queueHeroCloudUpload,
  toHeroCloudPayload,
} from "@/lib/td/rpg-cloud-sync";
import {
  DEMO_FARM_POINTS,
  applyDailyProfileReset,
  defaultDemoProfile,
  demoBuy,
  demoExchangeGold,
  demoFastClear,
  demoFinish,
  demoGoldExchangeCost,
  demoRefill,
  demoRefillCost,
  demoMapSweepStamina,
  demoStart,
  demoUnlockMapSweep,
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
import { TdHubActionPanel } from "@/components/td/TdHubActionPanel";
import { shopBuffLabel, shopItem } from "@/config/td/shop";
import { executeMapSweep, type MapSweepMode } from "@/lib/td/map-sweep";
import type { EquipRarity } from "@/config/td/equipment-catalog";
import { loadSweepPrefs, saveSweepPrefs } from "@/lib/td/sweep-prefs";
import { applyShopPurchase } from "@/lib/td/shop-purchase";
import {
  appendSystemLogs,
  sweepEntryToLog,
  type SystemLogKind,
  type SystemLogLine,
} from "@/lib/td/system-log";
import type { SweepLogEntry } from "@/lib/td/sweep-loot";
import { playTdSfx } from "@/lib/td/sfx";

type Screen = "hub" | "play";

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
  const [systemLog, setSystemLog] = useState<SystemLogLine[]>([]);

  const [runId, setRunId] = useState<string | null>(null);
  const [heroSave, setHeroSave] = useState<HeroSave>(defaultHeroSave());
  const [climb, setClimb] = useState<ClimbRunState | null>(null);
  const [settling, setSettling] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [sweepOpen, setSweepOpen] = useState(false);
  const [sweepAutoEquip, setSweepAutoEquip] = useState(true);
  const [sweepRecycleRarities, setSweepRecycleRarities] = useState<EquipRarity[]>([]);
  const sweepAutoEquipRef = useRef(true);
  const sweepRecycleRaritiesRef = useRef<EquipRarity[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const devDemo = isTdDevDemoEnabled();
  const buffsRef = useRef<string[]>([]);
  const heroSaveRef = useRef(heroSave);
  const profileRef = useRef(profile);
  const finishingRef = useRef(false);
  const finishTokenRef = useRef<string | null>(null);
  const runIdRef = useRef<string | null>(null);
  const activeRunIdRef = useRef<string | null>(null);
  const autoClimbRef = useRef(false);
  const restoredRunRef = useRef<string | null>(null);
  const settleGenRef = useRef(0);
  const rewardedRunRef = useRef<string | null>(null);

  const [screen, setScreen] = useState<Screen>("hub");

  const pushLog = useCallback((text: string, kind: SystemLogKind = "system") => {
    setSystemLog((prev) => appendSystemLogs(prev, [{ kind, text }]));
  }, []);

  const pushSweepLogs = useCallback((entries: SweepLogEntry[]) => {
    if (entries.length === 0) return;
    setSystemLog((prev) =>
      appendSystemLogs(
        prev,
        entries.map((e) => sweepEntryToLog(e)),
      ),
    );
  }, []);

  const welcomedRef = useRef(false);

  useEffect(() => {
    if (profile && screen === "hub" && systemLog.length === 0 && !welcomedRef.current) {
      welcomedRef.current = true;
      pushLog(t("systemChatWelcome"), "system");
    }
  }, [profile, screen, systemLog.length, pushLog, t]);

  const enterDemo = useCallback(() => {
    const p = defaultDemoProfile();
    const fresh = defaultHeroSave();
    setDemoMode(true);
    setProfile(p);
    profileRef.current = p;
    setHeroSave(fresh);
    heroSaveRef.current = fresh;
    saveHeroSave("demo", fresh);
    setFarmPoints(DEMO_FARM_POINTS);
    setRefillCost(demoRefillCost(p));
    setGoldExchangeCost(demoGoldExchangeCost(p));
    buffsRef.current = [];
    setError(null);
    setSystemLog([]);
    welcomedRef.current = false;
    setRunId(null);
    setClimb(null);
    setSettling(false);
    autoClimbRef.current = false;
    finishingRef.current = false;
    rewardedRunRef.current = null;
    runIdRef.current = null;
    activeRunIdRef.current = null;
    clearPendingRun("demo");
    setScreen("hub");
  }, []);

  const walletKey = demoMode ? "demo" : address ?? "";

  const persistHero = useCallback(
    (save: HeroSave, opts?: { upload?: boolean }) => {
      const updatedAt = Date.now();
      heroSaveRef.current = save;
      setHeroSave(save);
      saveHeroSave(walletKey || "demo", save, updatedAt);
      if (opts?.upload === false || demoMode || !address) return;
      queueHeroCloudUpload(address, save, updatedAt, sign, { force: true });
    },
    [address, demoMode, sign, walletKey],
  );

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
    const p = applyDailyProfileReset(data.profile);
    setProfile(p);
    profileRef.current = p;
    setFarmPoints(data.farmPoints);
    setRefillCost(data.refillCost);
    setGoldExchangeCost(data.goldExchangeCost);
    buffsRef.current = activeBuffIds(p);

    const merged = mergeHeroWithCloud(address, data.heroSave, data.heroUpdatedAt);
    heroSaveRef.current = merged.save;
    setHeroSave(merged.save);
    // 本机进度更靠前时上传云端（可能需签一次开通同步令牌）
    if (merged.needsUpload) {
      queueHeroCloudUpload(address, merged.save, merged.updatedAt, sign);
    }
  }, [address, t, demoMode, sign]);

  useEffect(() => {
    if (!demoMode || !profile) return;
    const p = applyDailyProfileReset(profile);
    if (p !== profile) {
      setProfile(p);
      profileRef.current = p;
      setRefillCost(demoRefillCost(p));
      setGoldExchangeCost(demoGoldExchangeCost(p));
    }
  }, [demoMode, profile]);

  useEffect(() => {
    if (demoMode) return;
    if (isConnected && address) refresh();
    else {
      setProfile(null);
      setFarmPoints(0);
    }
  }, [isConnected, address, refresh, demoMode]);

  useEffect(() => {
    if (demoMode) {
      setHeroSave(loadHeroSave("demo"));
      return;
    }
    if (!address) setHeroSave(defaultHeroSave());
  }, [address, demoMode]);

  useEffect(() => {
    heroSaveRef.current = heroSave;
  }, [heroSave]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    runIdRef.current = runId;
  }, [runId]);

  useEffect(() => {
    activeRunIdRef.current = profile?.activeRunId ?? null;
  }, [profile?.activeRunId]);

  useEffect(() => {
    if (!walletKey) return;
    const prefs = loadSweepPrefs(walletKey);
    setSweepAutoEquip(prefs.autoEquip);
    setSweepRecycleRarities(prefs.recycleRarities);
    sweepAutoEquipRef.current = prefs.autoEquip;
    sweepRecycleRaritiesRef.current = prefs.recycleRarities;
  }, [walletKey]);

  useEffect(() => {
    sweepAutoEquipRef.current = sweepAutoEquip;
  }, [sweepAutoEquip]);

  useEffect(() => {
    sweepRecycleRaritiesRef.current = sweepRecycleRarities;
  }, [sweepRecycleRarities]);

  const grantRunRewards = useCallback(
    (climbState: ClimbRunState) => {
      const runKey = runIdRef.current ?? activeRunIdRef.current;
      if (runKey && rewardedRunRef.current === runKey) return;
      if (climbState.runExp <= 0 && climbState.runLoot.length === 0 && !climbState.sceneWon)
        return;
      const reward = applyRunRewards(
        heroSaveRef.current,
        climbState.runExp,
        climbState.runLoot,
        climbState.sceneWon,
        climbState.mapId,
        climbState.scene,
        climbState.monsterKills,
        locale,
      );
      persistHero(reward.save);
      if (runKey) rewardedRunRef.current = runKey;
      for (const q of reward.questLogs) {
        pushLog(q.text, "system");
      }
      pushLog(
        t("runRewardSummary", {
          exp: climbState.runExp,
          loot: climbState.runLoot.length,
        }),
        "battle",
      );
    },
    [persistHero, pushLog, t, locale],
  );

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
    (
      cleared: boolean,
      wavesReached: number,
      goldEarned: number,
      skip?: { count: number; exp: number },
    ) => {
      if (cleared) {
        if (skip && skip.count > 0) {
          pushLog(
            t("victoryAfterSkip", {
              skipCount: skip.count,
              skipExp: skip.exp,
              gold: goldEarned,
            }),
            "battle",
          );
        } else {
          pushLog(t("victoryResult", { gold: goldEarned }), "battle");
        }
      } else if (wavesReached > 0) {
        if (skip && skip.count > 0) {
          pushLog(
            t("defeatAfterSkip", {
              skipCount: skip.count,
              skipExp: skip.exp,
              gold: goldEarned,
            }),
            "battle",
          );
        } else {
          pushLog(t("defeatResult", { gold: goldEarned }), "battle");
        }
      } else {
        pushLog(t("forfeitResult", { gold: goldEarned }), "battle");
      }
    },
    [pushLog, t],
  );

  const settleRun = useCallback(
    async (
      cleared: boolean,
      wavesReached: number,
      activeId?: string | null,
      gen?: number,
      skip?: { count: number; exp: number },
    ): Promise<boolean> => {
      const id = activeId ?? runIdRef.current ?? activeRunIdRef.current;
      const currentProfile = profileRef.current;
      if (!id || !currentProfile) return false;
      if (gen != null && gen !== settleGenRef.current) return false;

      if (demoMode) {
        const res = demoFinish(currentProfile, cleared, wavesReached, id);
        if (!res) {
          const recovered: TdProfile = {
            ...currentProfile,
            activeRunId: null,
            activeRunStage: null,
            activeRunStartedAt: null,
          };
          profileRef.current = recovered;
          setProfile(recovered);
          clearPendingRun(walletKey);
          return true;
        }
        if (gen != null && gen !== settleGenRef.current) return false;
        profileRef.current = res.profile;
        setProfile(res.profile);
        setRefillCost(demoRefillCost(res.profile));
        setGoldExchangeCost(demoGoldExchangeCost(res.profile));
        showSettleMessage(cleared, wavesReached, res.goldEarned, skip);
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
          hero: toHeroCloudPayload(
            heroSaveRef.current,
            loadHeroUpdatedAt(walletKey) || Date.now(),
          ),
        });
        if (res) {
          if (gen != null && gen !== settleGenRef.current) return false;
          finishTokenRef.current = null;
          clearPendingRun(walletKey);
          setProfile(res.profile);
          showSettleMessage(cleared, wavesReached, res.goldEarned, skip);
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
      const waves = runProgressScore(climbState);
      const skip =
        climbState.skipCount != null && climbState.skipExp != null
          ? { count: climbState.skipCount, exp: climbState.skipExp }
          : undefined;
      const ok = await settleRun(climbState.sceneWon, waves, id, gen, skip);
      if (gen !== settleGenRef.current) return;
      setSettling(false);
      setRunId(null);
      setClimb(null);
      setScreen("hub");
      autoClimbRef.current = false;
      finishingRef.current = false;
      if (!ok && !demoMode) {
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

      const plan = planBattleEntry(
        heroSaveRef.current,
        locale,
        buffsRef.current,
      );
      let save = heroSaveRef.current;
      if (plan.skipped.length > 0) {
        save = applySkippedProgress(save, plan.skipped);
        save = syncHeroLevel({ ...save, exp: save.exp + plan.skippedExp });
        persistHero(save);
      }

      const fightRun = createClimbRun(plan.fightMapId, plan.fightScene);
      setClimb({
        ...fightRun,
        log: [],
        done: false,
        activeMap: plan.fightMapId,
        activeScene: plan.fightScene,
      });
      await new Promise((r) => setTimeout(r, 300));

      const sim = simulateSceneBattle(
        plan.fightMapId,
        plan.fightScene,
        save,
        buffsRef.current,
        locale,
      );
      const allLines = [...plan.skipLog, ...sim.detail, ...sim.summary];
      const revealed: string[] = [];

      for (const line of allLines) {
        if (gen !== settleGenRef.current) {
          autoClimbRef.current = false;
          setAutoRunning(false);
          return;
        }
        revealed.push(line);
        setClimb((prev) =>
          prev
            ? {
                ...prev,
                log: [...revealed],
              }
            : null,
        );
        await new Promise((r) => setTimeout(r, combatLogDelay(line)));
      }

      const state = finalizeSceneRun(fightRun, sim, revealed);
      setClimb({
        ...state,
        skipCount: plan.skipped.length,
        skipExp: plan.skippedExp,
      });

      const id = runIdRef.current ?? activeRunIdRef.current;
      const token =
        finishTokenRef.current ?? loadPendingRun(walletKey)?.finishToken ?? "";
      if (id && token) persistActiveRun(id, token, state);

      setAutoRunning(false);
      autoClimbRef.current = false;

      if (gen !== settleGenRef.current) return;

      if (state.sceneWon) playTdSfx("victory");
      else playTdSfx("defeat");
      grantRunRewards(state);
    },
    [grantRunRewards, locale, persistActiveRun, persistHero, walletKey],
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
      grantRunRewards(pending.climb);
      void autoSettleAndReturn(pending.climb, gen);
    } else {
      setScreen("play");
      void runAutoClimbLoop(pending.climb, gen);
    }
  }, [
    address,
    autoSettleAndReturn,
    demoMode,
    grantRunRewards,
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
      pushLog(t("refillStaminaDone", { cost: res.pointsSpent }), "economy");
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
    pushLog(t("refillStaminaDone", { cost: refillCost }), "economy");
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
      pushLog(t("exchangeResult", { gold: res.goldGained, cost: res.pointsSpent }), "economy");
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
    pushLog(t("exchangeResult", { gold: res.goldGained, cost: res.pointsSpent }), "economy");
    refresh();
  };

  const beginRunSession = (id: string, token: string, climbState: ClimbRunState) => {
    settleGenRef.current += 1;
    const gen = settleGenRef.current;
    restoredRunRef.current = id;
    finishingRef.current = false;
    autoClimbRef.current = false;
    rewardedRunRef.current = null;
    finishTokenRef.current = token;
    runIdRef.current = id;
    activeRunIdRef.current = id;
    clearPendingRun(walletKey);
    setRunId(id);
    setClimb(climbState);
    persistActiveRun(id, token, climbState);
    setScreen("play");
    setError(null);
    void runAutoClimbLoop(climbState, gen);
    return gen;
  };

  const handleForfeit = async (wavesReached: number) => {
    const gen = settleGenRef.current;
    const pending = loadPendingRun(walletKey);
    const rewardState = climb ?? pending?.climb;
    if (rewardState) grantRunRewards(rewardState);
    setSettling(true);
    setError(null);
    const ok = await settleRun(false, wavesReached, undefined, gen);
    setSettling(false);
    finishingRef.current = false;
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

  const handleFastClear = async () => {
    if (!profile || profile.activeRunId || autoRunning || settling) return;

    const preview = executeFastClear(
      heroSaveRef.current,
      locale,
      buffsRef.current,
    );
    const cost = preview.staminaCost;

    if (!preview.didProgress || cost <= 0) {
      setError(
        t("fastClearBlocked", {
          map: preview.plan.fightMapId,
          scene: preview.plan.fightScene,
          rounds: preview.plan.fightMetrics.rounds,
        }),
      );
      return;
    }

    if (profile.stamina < cost) {
      setError(t("fastClearNoStamina", { need: cost, have: profile.stamina }));
      return;
    }

    setLoading(true);
    setError(null);

    if (demoMode) {
      const spent = demoFastClear(
        profileRef.current ?? profile,
        cost,
        preview.sceneWon,
        preview.didProgress,
      );
      setLoading(false);
      if (!spent) {
        setError(t("startFailed"));
        return;
      }
      profileRef.current = spent;
      setProfile(spent);
      setRefillCost(demoRefillCost(spent));
      setGoldExchangeCost(demoGoldExchangeCost(spent));
      persistHero(preview.save);
      pushLog(preview.summary, "battle");
      if (preview.sceneWon) playTdSfx("victory");
      return;
    }

    if (!address) {
      setLoading(false);
      return;
    }
    persistHero(preview.save, { upload: false });
    let sessionToken = loadSyncToken(address)?.syncToken ?? null;
    let cleared = await fastClearStaminaApi(
      address,
      sign,
      cost,
      preview.sceneWon,
      toHeroCloudPayload(preview.save, loadHeroUpdatedAt(walletKey) || Date.now()),
      sessionToken,
    );
    if (!cleared) {
      sessionToken = await ensureRpgSyncToken(address, sign);
      if (sessionToken) {
        cleared = await fastClearStaminaApi(
          address,
          sign,
          cost,
          preview.sceneWon,
          toHeroCloudPayload(preview.save, loadHeroUpdatedAt(walletKey) || Date.now()),
          sessionToken,
        );
      }
    }
    setLoading(false);
    if (!cleared) {
      setError(t("startFailed"));
      return;
    }
    persistHero(preview.save);
    setProfile(cleared.profile);
    profileRef.current = cleared.profile;
    pushLog(
      `${preview.summary}${cleared.goldEarned > 0 ? ` · +${cleared.goldEarned} 金币` : ""}`,
      "battle",
    );
    if (preview.sceneWon) playTdSfx("victory");
    await refresh();
  };

  const handleStart = async () => {
    if (!profile) return;
    if (demoMode) {
      let p = profileRef.current ?? profile;
      if (p.activeRunId && screen === "hub" && !climb && !autoRunning) {
        p = {
          ...p,
          activeRunId: null,
          activeRunStage: null,
          activeRunStartedAt: null,
        };
        profileRef.current = p;
        setProfile(p);
      }
      const res = demoStart(p);
      if (!res) {
        setError(t("startFailed"));
        return;
      }
      profileRef.current = res.profile;
      setProfile(res.profile);
      buffsRef.current = activeBuffIds(res.profile);
      activeRunIdRef.current = res.runId;
      const climbState = createClimbRun(heroSaveRef.current.worldMap, heroSaveRef.current.worldScene);
      beginRunSession(res.runId, "demo", climbState);
      return;
    }
    if (!address) return;
    setLoading(true);
    setError(null);
    let sessionToken = loadSyncToken(address)?.syncToken ?? null;
    let res = await startTdRunApi(address, 1, sign, sessionToken);
    if (!res) {
      sessionToken = await ensureRpgSyncToken(address, sign);
      if (sessionToken) {
        res = await startTdRunApi(address, 1, sign, sessionToken);
      }
    }
    setLoading(false);
    if (!res) {
      setError(t("startFailed"));
      return;
    }
    setProfile(res.profile);
    buffsRef.current = activeBuffIds(res.profile);
    activeRunIdRef.current = res.runId;
    beginRunSession(res.runId, res.finishToken, createClimbRun(heroSaveRef.current.worldMap, heroSaveRef.current.worldScene));
  };

  const handleClimbFinish = () => {
    if (!climb || settling || !climb.done) return;
    void autoSettleAndReturn(climb, settleGenRef.current);
  };

  const handleUnlockMapSweep = async () => {
    if (!profile) return;
    setSweepLoading(true);
    setError(null);
    if (demoMode) {
      const res = demoUnlockMapSweep(profile, farmPoints);
      setSweepLoading(false);
      if (!res) {
        setError(t("mapSweepUnlockFailed"));
        return;
      }
      setProfile(res.profile);
      profileRef.current = res.profile;
      setFarmPoints(res.farmPoints);
      pushLog(t("mapSweepUnlocked"), "system");
      return;
    }
    if (!address) {
      setSweepLoading(false);
      return;
    }
    const res = await unlockMapSweepApi(address, sign);
    setSweepLoading(false);
    if (!res) {
      setError(t("mapSweepUnlockFailed"));
      return;
    }
    setProfile(res.profile);
    profileRef.current = res.profile;
    setFarmPoints(res.farmPoints);
    pushLog(t("mapSweepUnlocked"), "system");
  };

  const handleMapSweep = async (mapId: number, mode: MapSweepMode = "boss", runs = 1) => {
    if (!profile || profile.activeRunId || sweepLoading) return;
    const preview = executeMapSweep(
      heroSaveRef.current,
      mapId,
      locale,
      mode,
      runs,
      { autoEquip: sweepAutoEquipRef.current, recycleRarities: sweepRecycleRaritiesRef.current },
    );
    if (!preview) {
      setError(t("mapSweepFailed"));
      return;
    }
    setSweepLoading(true);
    setError(null);
    if (demoMode) {
      const spent = demoMapSweepStamina(profile, runs);
      setSweepLoading(false);
      if (!spent) {
        setError(t("mapSweepFailed"));
        return;
      }
      const nextProfile = { ...spent, gold: spent.gold + preview.goldGained };
      profileRef.current = nextProfile;
      setProfile(nextProfile);
      persistHero(preview.save);
      pushSweepLogs(preview.log);
      playTdSfx("victory");
      return;
    }
    if (!address) {
      setSweepLoading(false);
      return;
    }
    persistHero(preview.save, { upload: false });
    let sessionToken = loadSyncToken(address)?.syncToken ?? null;
    let spent = await mapSweepStaminaApi(
      address,
      sign,
      runs,
      toHeroCloudPayload(preview.save, loadHeroUpdatedAt(walletKey) || Date.now()),
      sessionToken,
    );
    if (!spent) {
      sessionToken = await ensureRpgSyncToken(address, sign);
      if (sessionToken) {
        spent = await mapSweepStaminaApi(
          address,
          sign,
          runs,
          toHeroCloudPayload(preview.save, loadHeroUpdatedAt(walletKey) || Date.now()),
          sessionToken,
        );
      }
    }
    setSweepLoading(false);
    if (!spent) {
      setError(t("mapSweepFailed"));
      return;
    }
    const nextProfile = { ...spent, gold: spent.gold + preview.goldGained };
    profileRef.current = nextProfile;
    setProfile(nextProfile);
    persistHero(preview.save);
    pushSweepLogs(preview.log);
    playTdSfx("victory");
  };

  const handleUpgrade = (kind: UpgradeKind) => {
    if (
      kind.type === "protagonist" ||
      kind.type === "equip" ||
      kind.type === "stat" ||
      kind.type === "statBatch" ||
      kind.type === "discard" ||
      kind.type === "battleSlot"
    ) {
      if (kind.type === "discard") {
        const gold = discardInventoryGold(kind.itemId);
        const next = applyUpgrade(heroSave, kind);
        if (!next) return;
        persistHero(next);
        if (profile && gold > 0) {
          const np = { ...profile, gold: profile.gold + gold };
          setProfile(np);
          profileRef.current = np;
          pushLog(t("inventoryDiscardGold", { gold }), "economy");
        }
        setError(null);
        return;
      }
      const next = applyUpgrade(heroSave, kind);
      if (!next) return;
      persistHero(next);
      setError(null);
      return;
    }
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
      persistHero(res.hero);
      setError(null);
      return;
    }
    const nextHero = applyUpgrade(heroSave, kind);
    if (!nextHero) {
      setError(t("upgradeFailed"));
      return;
    }
    setProfile({ ...profile, gold: profile.gold - cost });
    persistHero(nextHero);
    setError(null);
  };

  const handleBuy = async (itemId: string) => {
    if (!profile) return;
    const def = shopItem(itemId);
    if (def?.kind === "gear" || def?.kind === "material") {
      const res = applyShopPurchase(profile, heroSave, itemId);
      if (!res) {
        setError(t("buyFailed"));
        return;
      }
      setProfile(res.profile);
      profileRef.current = res.profile;
      persistHero(res.hero);
      setError(null);
      return;
    }
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
  const entryPlan =
    screen === "hub" && profile
      ? planBattleEntry(heroSave, locale, buffs)
      : null;
  const isPowerWall = entryPlan != null && !entryPlan.fightMetrics.canWin;
  const fastClearCost =
    profile ? estimateFastClearStaminaCost(heroSave, locale, buffs) : 0;
  const buffLabels = buffs.map((id) => shopBuffLabel(id, locale));

  return (
    <div
      className={`mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6 ${screen === "hub" ? "pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]" : ""}`}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-gold sm:text-2xl">{t("title")}</h1>
          <p className="mt-0.5 text-xs text-white/50 sm:text-sm">
            {demoMode ? t("demoBadge") : screen === "play" ? t("textModeTagline") : t("subtitle")}
          </p>
        </div>
        {screen !== "hub" && (
          <button
            type="button"
            onClick={() => {
              if (screen === "play" && climb) {
                handleForfeit(runProgressScore(climb));
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
        <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {screen === "hub" && profile && (
        <div className="space-y-4">
          {profile.activeRunId && !settling && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-sm text-amber-200">{t("runInProgress")}</p>
              <p className="mt-1 text-xs text-amber-200/70">{t("runInProgressHint")}</p>
              <button
                type="button"
                disabled={loading || settling}
                onClick={() => {
                  const pending = loadPendingRun(walletKey);
                  handleForfeit(pending ? runProgressScore(pending.climb) : 0);
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
            locale={locale}
            gold={profile.gold}
            stamina={profile.stamina}
            farmPoints={farmPoints}
            mapSweepUnlocked={!!profile.mapSweepUnlocked}
            activeRun={!!profile.activeRunId}
            sweepLoading={sweepLoading || loading}
            loading={loading}
            refillCost={refillCost}
            goldExchangeCost={goldExchangeCost}
            buffIds={buffs}
            buffExpiry={Object.fromEntries(
              Object.entries(profile.buffs).map(([id, b]) => [id, b.expiresAt]),
            )}
            sweepOpen={sweepOpen}
            systemLog={systemLog}
            sweepAutoEquip={sweepAutoEquip}
            sweepRecycleRarities={sweepRecycleRarities}
            onSweepOpenChange={setSweepOpen}
            onSweepAutoEquipChange={(v) => {
              setSweepAutoEquip(v);
              if (walletKey) {
                saveSweepPrefs(walletKey, {
                  autoEquip: v,
                  recycleRarities: sweepRecycleRaritiesRef.current,
                });
              }
            }}
            onSweepRecycleRaritiesChange={(v) => {
              setSweepRecycleRarities(v);
              if (walletKey) {
                saveSweepPrefs(walletKey, {
                  autoEquip: sweepAutoEquipRef.current,
                  recycleRarities: v,
                });
              }
            }}
            onUpgrade={handleUpgrade}
            onUnlockMapSweep={() => void handleUnlockMapSweep()}
            onMapSweep={(mapId, mode, runs) => void handleMapSweep(mapId, mode, runs)}
            onRefill={() => void handleRefill()}
            onExchangeGold={() => void handleExchangeGold()}
            onBuyShop={(itemId) => void handleBuy(itemId)}
            formatBuffExpiry={(ms) => formatExpiry(ms, locale)}
            fightMapId={entryPlan?.fightMapId}
            fightScene={entryPlan?.fightScene}
            fightRounds={entryPlan?.fightMetrics.rounds}
            fastClearCost={fastClearCost}
            buffLabels={buffLabels}
          />

          <TdHubActionPanel
            startDisabled={
              loading ||
              !!profile.activeRunId ||
              profile.stamina < STAMINA_PER_RUN ||
              settling ||
              autoRunning
            }
            fastClearDisabled={
              loading ||
              !!profile.activeRunId ||
              fastClearCost <= 0 ||
              profile.stamina < fastClearCost ||
              settling ||
              autoRunning
            }
            fastClearCost={fastClearCost}
            onStart={handleStart}
            onFastClear={() => void handleFastClear()}
            powerWall={
              isPowerWall && entryPlan
                ? {
                    map: entryPlan.fightMapId,
                    scene: entryPlan.fightScene,
                    rounds: entryPlan.fightMetrics.rounds,
                  }
                : null
            }
          />
        </div>
      )}

      {screen === "play" && climb && (
        <TdRpgClimb
          climb={climb}
          settling={settling}
          autoRunning={autoRunning}
          locale={locale}
          onFinish={handleClimbFinish}
        />
      )}

      {loading && screen === "hub" && !profile && (
        <p className="text-center text-white/40">{t("loading")}</p>
      )}
    </div>
  );
}

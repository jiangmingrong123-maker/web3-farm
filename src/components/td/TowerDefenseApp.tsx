"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { useFarmSign } from "@/lib/web3/use-farm-sign";
import { STAGE1_NAME } from "@/config/td/stage1";
import { SHOP_ITEMS } from "@/config/td/shop";
import { STAMINA_PER_RUN, STAMINA_REFILL_AMOUNT } from "@/config/td/economy";
import { START_POPULARITY } from "@/config/td/units";
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
  createTextBattle,
  isTextVictory,
  mergeRosterUnits,
  recruitUnit,
  simulateWave,
  type TextBattleState,
} from "@/lib/td/text-combat";
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
  isTdDevDemoEnabled,
} from "@/lib/td/demo-store";
import { TdTextBattle } from "@/components/td/TdTextBattle";
import { playTdSfx } from "@/lib/td/sfx";
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
  const sign = useFarmSign();
  const [profile, setProfile] = useState<TdProfile | null>(null);
  const [farmPoints, setFarmPoints] = useState(0);
  const [refillCost, setRefillCost] = useState(0);
  const [goldExchangeCost, setGoldExchangeCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const [runId, setRunId] = useState<string | null>(null);
  const [textBattle, setTextBattle] = useState<TextBattleState | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const devDemo = isTdDevDemoEnabled();
  const buffsRef = useRef<string[]>([]);
  const finishingRef = useRef(false);

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

  const updateBattle = (next: TextBattleState) => {
    setTextBattle(next);
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

  const settleRun = async (
    cleared: boolean,
    wavesReached: number,
    activeId?: string | null,
  ) => {
    const id = activeId ?? runId ?? profile?.activeRunId;
    if (!id || !profile) return false;

    if (demoMode) {
      const res = demoFinish(profile, cleared, wavesReached, id);
      if (!res) return false;
      setProfile(res.profile);
      setRefillCost(demoRefillCost(res.profile));
      setGoldExchangeCost(demoGoldExchangeCost(res.profile));
      if (cleared) {
        setResultMsg(t("victoryResult", { gold: res.goldEarned }));
      } else if (wavesReached > 0) {
        setResultMsg(t("defeatResult", { gold: res.goldEarned }));
      } else {
        setResultMsg(t("forfeitResult", { gold: res.goldEarned }));
      }
      return true;
    }

    if (!address) return false;
    setLoading(true);
    const res = await finishTdRunApi(address, sign, {
      runId: id,
      cleared,
      wavesReached,
    });
    setLoading(false);
    if (!res) return false;
    setProfile(res.profile);
    if (cleared) {
      setResultMsg(t("victoryResult", { gold: res.goldEarned }));
    } else if (wavesReached > 0) {
      setResultMsg(t("defeatResult", { gold: res.goldEarned }));
    } else {
      setResultMsg(t("forfeitResult", { gold: res.goldEarned }));
    }
    await refresh();
    return true;
  };

  const handleForfeit = async (wavesReached: number) => {
    const ok = await settleRun(false, wavesReached);
    if (!ok && !demoMode) setError(t("forfeitFailed"));
    setRunId(null);
    setTextBattle(null);
    setScreen("hub");
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
      finishingRef.current = false;
      setRunId(res.runId);
      setTextBattle(
        createTextBattle(
          START_POPULARITY + (buffsRef.current.includes("pack") ? 5 : 0),
        ),
      );
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
    const pop2 =
      START_POPULARITY + (buffsRef.current.includes("pack") ? 5 : 0);
    finishingRef.current = false;
    setRunId(res.runId);
    setTextBattle(createTextBattle(pop2));
    setScreen("play");
    setResultMsg(null);
  };

  const endRun = useCallback(
    async (cleared: boolean, wavesReached: number) => {
      const ok = await settleRun(cleared, wavesReached);
      if (!ok && !demoMode) setError(t("forfeitFailed"));
      finishingRef.current = true;
      setRunId(null);
      setTextBattle(null);
      setScreen("hub");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settleRun closes over latest profile/runId
    [address, demoMode, profile, runId, sign, t, refresh],
  );

  const handleRecruit = (kind: TowerKind) => {
    if (!textBattle) return;
    const next = recruitUnit(textBattle, kind);
    if (next) {
      playTdSfx("build");
      updateBattle(next);
    }
  };

  const handleRosterMerge = (fromId: string, toId: string) => {
    if (!textBattle) return;
    const next = mergeRosterUnits(textBattle, fromId, toId);
    if (next) {
      playTdSfx("build");
      updateBattle(next);
    }
  };

  const handleFightWave = () => {
    if (!textBattle) return;
    playTdSfx("wave_start");
    const next = simulateWave(textBattle, buffsRef.current, locale);
    updateBattle(next);
    if (next.phase === "done") {
      if (isTextVictory(next)) playTdSfx("victory");
      else playTdSfx("defeat");
    } else {
      playTdSfx("wave_clear");
    }
  };

  const handleBattleFinish = () => {
    if (!textBattle) return;
    if (isTextVictory(textBattle)) void endRun(true, textBattle.wave);
    else void endRun(false, textBattle.wave);
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
              if (screen === "play" && textBattle) {
                handleForfeit(textBattle.wave);
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
              value={profile.stamina}
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
              <p className="mt-1 text-xs text-amber-200/70">{t("runInProgressHint")}</p>
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

      {screen === "play" && textBattle && (
        <TdTextBattle
          battle={textBattle}
          buffs={buffs}
          locale={locale}
          onRecruit={handleRecruit}
          onMerge={handleRosterMerge}
          onFightWave={handleFightWave}
          onFinish={handleBattleFinish}
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

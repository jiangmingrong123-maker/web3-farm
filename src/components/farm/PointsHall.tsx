"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { AddNftPanel } from "@/components/swap/AddNftPanel";
import {
  DAILY_POINTS_CAP,
  HALL_SLOT_COUNT,
  SLOT_UNLOCK_COSTS,
} from "@/config/slots";
import { getCollectionByContract } from "@/config/collections";
import { fetchFarmStateApi, saveFarmStateApi } from "@/lib/farm-api";
import {
  accrualStopped,
  bindNftToSlot,
  canClaim,
  claimCooldownLeftMs,
  dailyAccrualRate,
  loadFarmState,
  mergeFarmStates,
  maxPendingPoints,
  performClaim,
  saveFarmState,
  syncAccrual,
  unlockSlot,
  type FarmState,
} from "@/lib/farm-storage";
import type { VerifiedNft } from "@/lib/nft/verify";
import { ExhibitSlot, type SlotStatus } from "./ExhibitSlot";

function formatCountdown(ms: number, locale: string) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (locale === "zh") return `${h} 小时 ${m} 分`;
  return `${h}h ${m}m`;
}

function formatPts(n: number) {
  return Math.floor(n * 10) / 10;
}

export function PointsHall({ locale }: { locale: string }) {
  const t = useTranslations("hall");
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<FarmState | null>(null);
  const [bindingSlot, setBindingSlot] = useState<number | null>(null);
  const [bindError, setBindError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!address) {
      setState(null);
      return;
    }
    let cancelled = false;

    (async () => {
      setSyncError(false);
      const local = syncAccrual(loadFarmState(address), Date.now());
      const remote = await fetchFarmStateApi(address);
      let merged = remote ? mergeFarmStates(local, remote) : local;

      if (merged.accrualAnchorAt == null) {
        const now = Date.now();
        merged = {
          ...merged,
          accrualAnchorAt: now,
          lastAccrualTickAt: now,
        };
      }

      if (cancelled) return;
      setState(merged);
      saveFarmState(address, merged);

      const saved = await saveFarmStateApi(address, merged);
      if (cancelled) return;
      if (saved) {
        setState(saved);
        saveFarmState(address, saved);
      } else {
        setSyncError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => {
        if (!prev) return prev;
        return syncAccrual(prev, Date.now());
      });
      setTick((n) => n + 1);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const persist = useCallback(
    async (next: FarmState) => {
      const synced = syncAccrual(next, Date.now());
      setState(synced);
      if (!address) return synced;
      saveFarmState(address, synced);
      setSyncError(false);
      const saved = await saveFarmStateApi(address, synced);
      if (saved) {
        setState(saved);
        saveFarmState(address, saved);
        return saved;
      }
      setSyncError(true);
      return synced;
    },
    [address],
  );

  const handleClaim = async () => {
    if (!isConnected || !address || !state) return;
    const next = performClaim(state);
    if (next) await persist(next);
  };

  const handleUnlock = async (slotIndex: number) => {
    if (!state) return;
    const cost = SLOT_UNLOCK_COSTS[slotIndex] ?? 0;
    const next = unlockSlot(state, slotIndex, cost);
    if (next) await persist(next);
  };

  const handleBindNft = (nft: VerifiedNft) => {
    if (!state || bindingSlot == null) return;
    setBindError(null);

    const collection = getCollectionByContract(nft.contract);
    const maxBindings = collection?.maxBindingsPerWallet ?? 5;
    const currentBindings = Object.values(state.boundSlots).filter(Boolean).length;
    if (currentBindings >= maxBindings) {
      setBindError(t("errMaxBindings", { max: maxBindings }));
      return;
    }

    const next = bindNftToSlot(state, bindingSlot, {
      contract: nft.contract,
      tokenId: nft.tokenId.toString(),
      name: `${nft.collectionName} #${nft.tokenId}`,
      imageUrl: nft.imageUrl ?? "",
      collectionSlug: nft.collectionSlug,
    });

    if (!next) {
      setBindError(t("errAlreadyBound"));
      return;
    }

    await persist(next);
    setBindingSlot(null);
  };

  const ready = isConnected && state;
  const synced = state ? syncAccrual(state, Date.now()) : null;
  const claimable = ready && synced && canClaim(synced);
  const cooldownMs = synced ? claimCooldownLeftMs(synced) : 0;
  const dailyRate = synced ? dailyAccrualRate(synced) : 0;
  const pending = synced ? formatPts(synced.pendingPoints) : 0;
  const pendingCap = synced ? formatPts(maxPendingPoints(synced)) : 0;
  const stopped = synced ? accrualStopped(synced) : false;

  function slotStatus(index: number): SlotStatus {
    if (!state) return index <= 2 ? "empty" : "locked";
    if (index > state.unlockedSlots) return "locked";
    if (state.boundSlots[index]) return "filled";
    return "empty";
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-surface via-ink to-black p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs tracking-[0.2em] text-gold/70">{t("seasonBadge")}</p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("title")}</h1>
            <p className="mt-2 max-w-md text-sm text-white/50">{t("subtitle")}</p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:min-w-[240px]">
            <div className="rounded-xl border border-white/10 bg-black/40 px-5 py-4 text-center">
              <p className="text-xs text-white/40">{t("balance")}</p>
              <p className="font-mono text-3xl font-bold text-gold">
                {ready ? formatPts(state.points) : "—"}
              </p>
              <p className="mt-1 text-[10px] text-white/30">{t("balanceHint")}</p>
            </div>

            <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-center">
              <p className="text-[10px] text-white/40">{t("pending")}</p>
              <p className="font-mono text-xl font-semibold text-gold/90">
                {ready ? pending : "—"}
                {ready && (
                  <span className="text-sm text-white/35"> / {pendingCap}</span>
                )}
              </p>
              <p className="mt-1 text-[10px] text-white/35">
                {ready
                  ? t("dailyRate", { rate: dailyRate, cap: DAILY_POINTS_CAP })
                  : t("connectToClaim")}
              </p>
              {ready && stopped && (
                <p className="mt-1 text-[10px] text-amber-400/90">{t("accrualStopped")}</p>
              )}
            </div>

            {syncError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-[11px] text-red-300">
                {t("syncFailed")}
              </p>
            )}

            <button
              type="button"
              disabled={!claimable}
              onClick={() => void handleClaim()}
              className="rounded-full bg-gold px-5 py-3 text-sm font-bold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {!isConnected
                ? t("connectToClaim")
                : claimable
                  ? t("claimPending", { amount: pending })
                  : pending < 0.01
                    ? t("claimAccruing")
                    : `${t("claimWait")} ${formatCountdown(cooldownMs, locale)}`}
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{t("gridTitle")}</h2>
            <p className="text-sm text-white/45">{t("gridHint")}</p>
          </div>
          <p className="shrink-0 font-mono text-xs text-white/35">
            {ready ? `${state.unlockedSlots}/${HALL_SLOT_COUNT}` : `2/${HALL_SLOT_COUNT}`}{" "}
            {t("unlocked")}
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-surface/40 p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
            {Array.from({ length: HALL_SLOT_COUNT }, (_, i) => {
              const index = i + 1;
              const status = slotStatus(index);
              const bound = state?.boundSlots[index];
              const unlockedCount = state?.unlockedSlots ?? 2;
              const nextLocked = state ? index === unlockedCount + 1 : index === 3;
              const cost = SLOT_UNLOCK_COSTS[index] ?? 0;
              const showUnlockCost =
                status === "locked" &&
                index > unlockedCount &&
                index <= unlockedCount + 2;
              const canUnlock =
                !!state &&
                nextLocked &&
                status === "locked" &&
                state.points >= cost;

              return (
                <ExhibitSlot
                  key={index}
                  index={index}
                  status={status}
                  label={bound?.name}
                  imageUrl={bound?.imageUrl}
                  showUnlockCost={showUnlockCost}
                  canUnlock={canUnlock}
                  onUnlock={() => handleUnlock(index)}
                  onBind={
                    isConnected && status === "empty"
                      ? () => {
                          setBindError(null);
                          setBindingSlot(index);
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </section>

      {bindingSlot != null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md">
            {bindError && (
              <p className="mb-2 rounded-lg bg-red-500/20 px-3 py-2 text-center text-xs text-red-300">
                {bindError}
              </p>
            )}
            <AddNftPanel
              onAdded={handleBindNft}
              onCancel={() => {
                setBindingSlot(null);
                setBindError(null);
              }}
            />
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-white/8 bg-black/30 p-5 text-sm text-white/45">
        <h3 className="mb-2 font-semibold text-white/70">{t("rulesTitle")}</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>{t("rule1")}</li>
          <li>{t("rule2")}</li>
          <li>{t("rule3")}</li>
          <li>{t("rule4")}</li>
          <li>{t("rule5")}</li>
        </ul>
      </section>
    </div>
  );
}

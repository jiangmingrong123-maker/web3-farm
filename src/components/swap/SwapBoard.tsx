"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { SWAP_ESCROW_ENABLED, SWAP_SLOTS_PER_SIDE } from "@/config/swap";
import type { VerifiedNft } from "@/lib/nft/verify";
import type { ApiRoom } from "@/lib/swap/api-types";
import {
  counterSide,
  createRoomApi,
  fetchRoomApi,
  getParty,
  resolveMySide,
  saveCreatorToken,
  updatePartyApi,
  verifiedToApiSlot,
} from "@/lib/swap/api";
import { useSwapExecute } from "@/lib/swap/use-swap-execute";
import { useSwapOrderStatus } from "@/lib/swap/use-swap-order-status";
import { AddNftPanel } from "./AddNftPanel";
import { ChatPanel } from "./ChatPanel";
import { SwapDeadline } from "./SwapDeadline";
import { SwapSlot } from "./SwapSlot";

function getCreatorTokenFromStorage(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(`swap_creator_${roomId}`);
}

export function SwapBoard({ initialRoomId }: { initialRoomId?: string }) {
  const t = useTranslations("swap");
  const { address, isConnected } = useAccount();
  const [roomId, setRoomId] = useState(initialRoomId ?? "");
  const [room, setRoom] = useState<ApiRoom | null>(null);
  const [addingSlot, setAddingSlot] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tick, setTick] = useState(0);
  const [orderTick, setOrderTick] = useState(0);

  const creatorToken = roomId ? getCreatorTokenFromStorage(roomId) : null;
  const mySide = room ? resolveMySide(room, address, creatorToken, roomId) : null;
  const theirSide = mySide ? counterSide(mySide) : null;

  const refresh = useCallback(async (id: string) => {
    const data = await fetchRoomApi(id);
    if (data) setRoom(data);
  }, []);

  useEffect(() => {
    if (initialRoomId) {
      setRoomId(initialRoomId);
      refresh(initialRoomId);
    }
  }, [initialRoomId, refresh]);

  useEffect(() => {
    if (!roomId) return;
    const id = setInterval(() => refresh(roomId), 3000);
    return () => clearInterval(id);
  }, [roomId, refresh]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!roomId || !room || !address || !mySide) return;
    const party = getParty(room, mySide);
    if (party.address?.toLowerCase() === address.toLowerCase()) return;
    updatePartyApi(roomId, mySide, { ...party, address }, {
      address,
      creatorToken: creatorToken ?? undefined,
    }).then((updated) => updated && setRoom(updated));
  }, [roomId, room, address, mySide, creatorToken]);

  const shareUrl = useMemo(() => {
    if (!roomId || typeof window === "undefined") return "";
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${roomId}`;
  }, [roomId]);

  const handleCreateRoom = async () => {
    setCreating(true);
    const res = await createRoomApi();
    saveCreatorToken(res.id, res.creatorToken);
    setRoomId(res.id);
    setRoom(res.room);
    const url = new URL(window.location.href);
    url.searchParams.set("room", res.id);
    window.history.replaceState({}, "", url.toString());
    setCreating(false);
  };

  const myParty = mySide && room ? getParty(room, mySide) : null;
  const theirParty = theirSide && room ? getParty(room, theirSide) : null;

  const persistParty = async (
    patch: Parameters<typeof updatePartyApi>[2],
  ) => {
    if (!roomId || !mySide) return;
    const updated = await updatePartyApi(roomId, mySide, patch, {
      address,
      creatorToken: creatorToken ?? undefined,
    });
    if (updated) setRoom(updated);
  };

  const handleAddNft = async (slotIndex: number, nft: VerifiedNft) => {
    if (!myParty || !mySide || myParty.confirmed) return;
    const slots = [...myParty.slots];
    slots[slotIndex] = verifiedToApiSlot(nft, false);
    await persistParty({ slots, confirmed: false });
    setAddingSlot(null);
  };

  const orderStatus = useSwapOrderStatus(room?.chainOrderId, mySide, tick);

  const onChainUpdate = useCallback(() => {
    setOrderTick((n) => n + 1);
    if (roomId) refresh(roomId);
  }, [roomId, refresh]);

  void orderTick;

  const {
    deposit,
    withdraw,
    pending: chainPending,
    error: chainError,
    canDeposit,
    canWithdraw,
    swapInProgress,
    myDeposited,
  } = useSwapExecute(room, mySide, orderStatus, onChainUpdate);

  const swapLocked = myDeposited || (swapInProgress && myDeposited);

  const handleRemove = async (slotIndex: number) => {
    if (!myParty || myParty.confirmed || swapLocked) return;
    const slots = [...myParty.slots];
    slots[slotIndex] = null;
    await persistParty({ slots, confirmed: false });
  };

  const handleConfirm = async () => {
    if (!myParty) return;
    const hasNft = myParty.slots.some(Boolean);
    if (!hasNft) return;
    const slots = myParty.slots.map((s) => (s ? { ...s, locked: true } : null));
    await persistParty({ slots, confirmed: true });
  };

  const handleResetConfirm = async () => {
    if (!myParty || myDeposited || swapInProgress) return;
    const slots = myParty.slots.map((s) => (s ? { ...s, locked: false } : null));
    await persistParty({ slots, confirmed: false });
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selfFilled = myParty?.slots.filter(Boolean).length ?? 0;

  const apiNftToSlotItem = (slot: NonNullable<typeof myParty>["slots"][0]) => {
    if (!slot) return null;
    return {
      nft: {
        contract: slot.contract as `0x${string}`,
        tokenId: BigInt(slot.tokenId),
        owner: "0x" as `0x${string}`,
        collectionName: slot.collectionName,
        collectionSlug: slot.collectionSlug,
        chainId: 1,
        tokenUri: null,
        imageUrl: slot.imageUrl,
        verified: true as const,
      },
      locked: slot.locked,
    };
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
        <h2 className="mb-2 text-sm font-bold text-emerald-300">{t("securityTitle")}</h2>
        <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed text-white/50">
          <li>{t("security1")}</li>
          <li>{t("security2")}</li>
          <li>{t("security3")}</li>
          <li>{t("security4")}</li>
        </ul>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs tracking-widest text-gold/70">{t("badge")}</p>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-white/45">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!roomId ? (
            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={creating}
              className="rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
            >
              {creating ? t("creating") : t("createRoom")}
            </button>
          ) : (
            <>
              <span className="rounded-full border border-white/15 px-4 py-2 font-mono text-sm">
                {t("roomId")}: {roomId}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-full border border-gold/40 px-4 py-2 text-sm text-gold"
              >
                {copied ? t("copied") : t("copyLink")}
              </button>
            </>
          )}
        </div>
      </section>

      {!roomId && (
        <p className="text-xs text-white/40">{t("createWithoutWallet")}</p>
      )}

      {!SWAP_ESCROW_ENABLED && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200/90">
          {t("escrowPending")}
        </p>
      )}

      {room && myParty && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-gold/25 bg-black/30 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-gold">{t("yourSide")}</h2>
                <span className="text-xs text-white/40">
                  {selfFilled}/{SWAP_SLOTS_PER_SIDE}
                  {!isConnected && " · " + t("connectToAdd")}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                {myParty.slots.map((item, i) => (
                  <SwapSlot
                    key={i}
                    index={i}
                    item={apiNftToSlotItem(item)}
                    editable={isConnected && !myParty.confirmed && !swapLocked}
                    onAdd={() => isConnected && !swapLocked && setAddingSlot(i)}
                    onRemove={() => !swapLocked && handleRemove(i)}
                  />
                ))}
              </div>

              {addingSlot !== null && isConnected && !myParty.confirmed && (
                <div className="mb-4">
                  <AddNftPanel
                    onAdded={(nft) => handleAddNft(addingSlot, nft)}
                    onCancel={() => setAddingSlot(null)}
                  />
                </div>
              )}

              <div className="flex gap-2">
                {!myParty.confirmed ? (
                  <button
                    type="button"
                    disabled={!isConnected || selfFilled === 0}
                    onClick={handleConfirm}
                    className="flex-1 rounded-full bg-gold px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
                  >
                    {t("confirmSide")}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!isConnected || swapLocked}
                    onClick={handleResetConfirm}
                    className="flex-1 rounded-full border border-white/20 px-4 py-2.5 text-sm text-white/70 disabled:opacity-40"
                  >
                    {t("revokeConfirm")}
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-white/70">{t("theirSide")}</h2>
                <span className="text-xs text-white/30">
                  {theirParty?.address
                    ? `${theirParty.address.slice(0, 6)}…${theirParty.address.slice(-4)}`
                    : t("waitingJoin")}
                  {theirParty?.confirmed && ` · ${t("confirmed")}`}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                {(theirParty?.slots ?? []).map((item, i) => (
                  <SwapSlot
                    key={i}
                    index={i}
                    item={apiNftToSlotItem(item)}
                    editable={false}
                  />
                ))}
              </div>

              <p className="rounded-lg bg-white/5 px-3 py-3 text-xs leading-relaxed text-white/40">
                {t("counterpartyHint")}
              </p>
            </section>
          </div>

          {orderStatus.awaitingCounterparty && (
            <SwapDeadline
              remainingSec={orderStatus.remainingSec}
              expired={orderStatus.expired}
              myDeposited={orderStatus.myDeposited}
            />
          )}

          {orderStatus.executed && (
            <p className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-4 text-center text-sm font-semibold text-emerald-300">
              {t("swapCompleted")}
            </p>
          )}

          {(canDeposit || myDeposited) && !orderStatus.executed && (
            <div className="rounded-2xl border border-gold/40 bg-gold/10 p-5 text-center">
              <p className="mb-2 text-sm text-white/70">{t("depositHint")}</p>
              <p className="mb-4 text-xs text-white/45">{t("depositAtomicNote")}</p>
              <button
                type="button"
                disabled={chainPending || !canDeposit || myDeposited}
                onClick={deposit}
                className="rounded-full bg-gold px-8 py-3 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                {chainPending
                  ? t("executing")
                  : myDeposited
                    ? t("depositDone")
                    : t("depositNfts")}
              </button>
              {chainError && (
                <p className="mt-2 text-xs text-red-400">{t("executeFailed")}</p>
              )}
            </div>
          )}

          {canWithdraw && (
            <div className="text-center">
              <button
                type="button"
                disabled={chainPending}
                onClick={withdraw}
                className="rounded-full border border-red-400/50 px-8 py-3 text-sm font-semibold text-red-300 disabled:opacity-40"
              >
                {chainPending ? t("executing") : t("withdrawNfts")}
              </button>
            </div>
          )}

        </>
      )}

      {room && roomId && (
        <>
          {!isConnected && (
            <p className="text-xs text-white/40">{t("chatWithoutWallet")}</p>
          )}
          <ChatPanel
            roomId={roomId}
            messages={room.messages}
            address={address}
            onSent={() => refresh(roomId)}
          />
        </>
      )}

      {room && !mySide && isConnected && (
        <p className="text-sm text-amber-200/80">{t("claimingSide")}</p>
      )}

      <section className="rounded-2xl border border-white/8 bg-black/30 p-5 text-sm text-white/45">
        <h3 className="mb-2 font-semibold text-white/70">{t("flowTitle")}</h3>
        <ol className="list-inside list-decimal space-y-1">
          <li>{t("flow1")}</li>
          <li>{t("flow2")}</li>
          <li>{t("flow3")}</li>
          <li>{t("flow4")}</li>
          <li>{t("flow5")}</li>
        </ol>
      </section>
    </div>
  );
}

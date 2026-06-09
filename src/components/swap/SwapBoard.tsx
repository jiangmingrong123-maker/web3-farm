"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { SWAP_ESCROW_ENABLED, SWAP_SLOTS_PER_SIDE } from "@/config/swap";
import type { VerifiedNft } from "@/lib/nft/verify";
import {
  createEmptyRoom,
  createRoomId,
  hydrateRoom,
  loadRoom,
  saveRoom,
  serializeRoom,
} from "@/lib/swap/room";
import type { SwapRoom } from "@/lib/swap/types";
import { AddNftPanel } from "./AddNftPanel";
import { SwapSlot } from "./SwapSlot";

export function SwapBoard({ initialRoomId }: { initialRoomId?: string }) {
  const t = useTranslations("swap");
  const { address, isConnected } = useAccount();
  const [roomId, setRoomId] = useState(initialRoomId ?? "");
  const [room, setRoom] = useState<SwapRoom | null>(null);
  const [addingSlot, setAddingSlot] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialRoomId) {
      setRoomId(initialRoomId);
      setRoom(hydrateRoom(loadRoom(initialRoomId)));
    }
  }, [initialRoomId]);

  const persist = useCallback((next: SwapRoom) => {
    const serialized = serializeRoom(next);
    saveRoom(serialized);
    setRoom(hydrateRoom(serialized));
  }, []);

  const shareUrl = useMemo(() => {
    if (!roomId || typeof window === "undefined") return "";
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${roomId}`;
  }, [roomId]);

  const handleCreateRoom = () => {
    const id = createRoomId();
    const next = createEmptyRoom(id);
    setRoomId(id);
    persist(next);
    const url = new URL(window.location.href);
    url.searchParams.set("room", id);
    window.history.replaceState({}, "", url.toString());
  };

  const handleAddNft = (slotIndex: number, nft: VerifiedNft) => {
    if (!room || !address) return;
    const slots = [...room.self.slots];
    slots[slotIndex] = { nft, locked: false };
    persist({
      ...room,
      self: { ...room.self, address, slots, confirmed: false },
    });
    setAddingSlot(null);
  };

  const handleRemove = (slotIndex: number) => {
    if (!room || room.self.confirmed) return;
    const slots = [...room.self.slots];
    slots[slotIndex] = null;
    persist({
      ...room,
      self: { ...room.self, slots, confirmed: false },
    });
  };

  const handleConfirm = () => {
    if (!room || !address) return;
    const hasNft = room.self.slots.some(Boolean);
    if (!hasNft) return;
    const slots = room.self.slots.map((s) =>
      s ? { ...s, locked: true } : null,
    );
    persist({
      ...room,
      self: { ...room.self, address, slots, confirmed: true },
    });
  };

  const handleResetConfirm = () => {
    if (!room) return;
    const slots = room.self.slots.map((s) =>
      s ? { ...s, locked: false } : null,
    );
    persist({
      ...room,
      self: { ...room.self, slots, confirmed: false },
      status: "open",
    });
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selfFilled = room?.self.slots.filter(Boolean).length ?? 0;

  return (
    <div className="space-y-8">
      {/* security banner */}
      <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
        <h2 className="mb-2 text-sm font-bold text-emerald-300">{t("securityTitle")}</h2>
        <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed text-white/50">
          <li>{t("security1")}</li>
          <li>{t("security2")}</li>
          <li>{t("security3")}</li>
          <li>{t("security4")}</li>
        </ul>
      </section>

      {/* room bar */}
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
              disabled={!isConnected}
              className="rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
            >
              {t("createRoom")}
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

      {!SWAP_ESCROW_ENABLED && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200/90">
          {t("escrowPending")}
        </p>
      )}

      {room && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* your side */}
          <section className="rounded-2xl border border-gold/25 bg-black/30 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-gold">{t("yourSide")}</h2>
              <span className="text-xs text-white/40">
                {selfFilled}/{SWAP_SLOTS_PER_SIDE}
              </span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              {room.self.slots.map((item, i) => (
                <SwapSlot
                  key={i}
                  index={i}
                  item={item}
                  editable={!room.self.confirmed}
                  onAdd={() => setAddingSlot(i)}
                  onRemove={() => handleRemove(i)}
                />
              ))}
            </div>

            {addingSlot !== null && !room.self.confirmed && (
              <div className="mb-4">
                <AddNftPanel
                  onAdded={(nft) => handleAddNft(addingSlot, nft)}
                  onCancel={() => setAddingSlot(null)}
                />
              </div>
            )}

            <div className="flex gap-2">
              {!room.self.confirmed ? (
                <button
                  type="button"
                  disabled={selfFilled === 0}
                  onClick={handleConfirm}
                  className="flex-1 rounded-full bg-gold px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
                >
                  {t("confirmSide")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetConfirm}
                  className="flex-1 rounded-full border border-white/20 px-4 py-2.5 text-sm text-white/70"
                >
                  {t("revokeConfirm")}
                </button>
              )}
            </div>
          </section>

          {/* counterparty */}
          <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-white/70">{t("theirSide")}</h2>
              <span className="text-xs text-white/30">{t("waitingJoin")}</span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              {room.counterparty.slots.map((item, i) => (
                <SwapSlot key={i} index={i} item={item} editable={false} />
              ))}
            </div>

            <p className="rounded-lg bg-white/5 px-3 py-3 text-xs leading-relaxed text-white/40">
              {t("counterpartyHint")}
            </p>
          </section>
        </div>
      )}

      {/* flow */}
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

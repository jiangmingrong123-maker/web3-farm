"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { SLOT_UNLOCK_COSTS } from "@/config/slots";

export type SlotStatus = "locked" | "empty" | "filled";

interface ExhibitSlotProps {
  index: number;
  status: SlotStatus;
  label?: string;
  imageUrl?: string;
  /** Show unlock cost (only next 2 locked slots). */
  showUnlockCost?: boolean;
  onUnlock?: () => void;
  onBind?: () => void;
  canUnlock?: boolean;
}

export function ExhibitSlot({
  index,
  status,
  label,
  imageUrl,
  showUnlockCost = false,
  onUnlock,
  onBind,
  canUnlock,
}: ExhibitSlotProps) {
  const t = useTranslations("hall");
  const cost = SLOT_UNLOCK_COSTS[index] ?? 0;

  return (
    <div
      className={`group relative flex aspect-[3/4] min-h-[140px] flex-col overflow-hidden rounded-xl border transition-all duration-300 ${
        status === "filled"
          ? "border-gold/40 bg-gradient-to-b from-gold/10 to-surface shadow-[0_0_24px_rgba(212,175,55,0.12)]"
          : status === "empty"
            ? "border-gold/25 bg-surface/80 hover:border-gold/45 hover:shadow-[0_0_20px_rgba(212,175,55,0.08)]"
            : "border-white/8 bg-black/40"
      }`}
    >
      <div className="absolute inset-x-2 top-2 h-0.5 rounded-full bg-gradient-to-r from-transparent via-gold/30 to-transparent sm:inset-x-3 sm:top-3 sm:h-1" />

      <div className="flex min-h-0 flex-1 flex-col p-2 pt-4 sm:p-3 sm:pt-5">
        <span className="text-center font-mono text-[9px] tracking-widest text-white/30 sm:text-[10px]">
          {String(index).padStart(2, "0")}
        </span>

        {status === "locked" && (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-1 py-1">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/30 text-lg text-white/25 sm:h-12 sm:w-12 sm:text-2xl">
                🔒
              </div>
              <p className="text-center text-[10px] leading-tight text-white/40 sm:text-[11px]">
                {t("slotLocked")}
              </p>
            </div>

            {showUnlockCost && cost > 0 ? (
              <div className="w-full shrink-0 rounded-lg border border-gold/25 bg-black/50 px-1 py-1.5 text-center sm:py-2">
                <p className="font-mono text-sm font-bold leading-none text-gold sm:text-base">
                  {cost}
                </p>
                <p className="mt-0.5 text-[9px] text-gold/70 sm:text-[10px]">{t("pts")}</p>
              </div>
            ) : (
              <p className="shrink-0 pb-1 text-[10px] text-white/20">···</p>
            )}

            {canUnlock && onUnlock && (
              <button
                type="button"
                onClick={onUnlock}
                className="w-full shrink-0 rounded-full border border-gold/50 bg-gold/10 py-1.5 text-[10px] font-semibold text-gold transition hover:bg-gold/20 sm:py-1"
              >
                {t("unlock")}
              </button>
            )}
          </div>
        )}

        {status === "empty" && (
          <button
            type="button"
            onClick={onBind}
            disabled={!onBind}
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 disabled:cursor-default sm:gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-gold/30 bg-gold/5 text-xl text-gold/50 transition group-hover:scale-105 group-hover:border-gold/50 sm:h-14 sm:w-14 sm:text-2xl">
              +
            </div>
            <p className="text-center text-[10px] text-white/45 sm:text-[11px]">{t("slotEmpty")}</p>
            <p className="text-[9px] text-gold/60 sm:text-[10px]">{t("tapToBind")}</p>
          </button>
        )}

        {status === "filled" && (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 sm:gap-2">
            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-gold/50 bg-black/40 sm:h-20 sm:w-20">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={label ?? `NFT #${index}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl text-gold sm:text-2xl">
                  ✦
                </div>
              )}
            </div>
            <p className="line-clamp-2 px-0.5 text-center text-[10px] font-semibold leading-tight text-gold sm:text-xs">
              {label}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

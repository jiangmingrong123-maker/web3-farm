"use client";

import { useTranslations } from "next-intl";
import { SLOT_UNLOCK_COSTS } from "@/config/slots";

export type SlotStatus = "locked" | "empty" | "filled";

interface ExhibitSlotProps {
  index: number;
  status: SlotStatus;
  label?: string;
  tier?: string;
  onUnlock?: () => void;
  canUnlock?: boolean;
}

export function ExhibitSlot({
  index,
  status,
  label,
  tier,
  onUnlock,
  canUnlock,
}: ExhibitSlotProps) {
  const t = useTranslations("hall");

  const cost = SLOT_UNLOCK_COSTS[index] ?? 0;

  return (
    <div
      className={`group relative flex aspect-[3/4] flex-col overflow-hidden rounded-xl border transition-all duration-300 ${
        status === "filled"
          ? "border-gold/40 bg-gradient-to-b from-gold/10 to-surface shadow-[0_0_24px_rgba(212,175,55,0.12)]"
          : status === "empty"
            ? "border-gold/25 bg-surface/80 hover:border-gold/45 hover:shadow-[0_0_20px_rgba(212,175,55,0.08)]"
            : "border-white/8 bg-black/40"
      }`}
    >
      {/* pedestal top */}
      <div className="absolute inset-x-3 top-3 h-1 rounded-full bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-3 pt-5">
        <span className="font-mono text-[10px] tracking-widest text-white/30">
          {String(index).padStart(2, "0")}
        </span>

        {status === "locked" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/30 text-2xl text-white/25">
              🔒
            </div>
            <p className="text-center text-[11px] text-white/40">{t("slotLocked")}</p>
            <p className="font-mono text-xs text-gold/80">
              {cost} {t("pts")}
            </p>
            {canUnlock && onUnlock && (
              <button
                type="button"
                onClick={onUnlock}
                className="mt-1 rounded-full border border-gold/40 px-3 py-1 text-[10px] font-semibold text-gold transition hover:bg-gold/10"
              >
                {t("unlock")}
              </button>
            )}
          </>
        )}

        {status === "empty" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-gold/30 bg-gold/5 text-2xl text-gold/50 transition group-hover:scale-105 group-hover:border-gold/50">
              +
            </div>
            <p className="text-center text-[11px] text-white/45">{t("slotEmpty")}</p>
            <p className="text-[10px] text-white/25">{t("bindSoon")}</p>
          </>
        )}

        {status === "filled" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-gold/50 bg-gradient-to-br from-gold/20 to-transparent text-2xl">
              ✦
            </div>
            <p className="line-clamp-1 text-center text-xs font-semibold text-gold">
              {label}
            </p>
            {tier && (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">
                {tier}
              </span>
            )}
          </>
        )}
      </div>

      {/* pedestal base */}
      <div className="h-2 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  );
}

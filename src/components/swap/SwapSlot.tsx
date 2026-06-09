"use client";

import { useTranslations } from "next-intl";
import type { SwapSlotItem } from "@/lib/swap/types";

interface SwapSlotProps {
  index: number;
  item: SwapSlotItem | null;
  editable: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}

export function SwapSlot({ index, item, editable, onAdd, onRemove }: SwapSlotProps) {
  const t = useTranslations("swap");

  return (
    <div
      className={`relative flex aspect-square flex-col overflow-hidden rounded-xl border transition ${
        item
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-dashed border-white/15 bg-black/30 hover:border-gold/30"
      }`}
    >
      <span className="absolute left-2 top-2 font-mono text-[10px] text-white/30">
        {String(index + 1).padStart(2, "0")}
      </span>

      {item ? (
        <>
          {item.nft.imageUrl ? (
            <img
              src={item.nft.imageUrl}
              alt={`#${item.nft.tokenId.toString()}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 p-2">
              <span className="text-2xl text-gold">✦</span>
              <span className="font-mono text-sm font-bold text-gold">
                #{item.nft.tokenId.toString()}
              </span>
            </div>
          )}
          <div className="border-t border-white/10 bg-black/60 p-2">
            <p className="truncate text-[10px] font-semibold text-white/80">
              {item.nft.collectionName}
            </p>
            <p className="truncate font-mono text-[9px] text-emerald-400/80">
              {t("verifiedOnChain")}
            </p>
            {editable && !item.locked && onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="mt-1 text-[10px] text-red-400/80 hover:text-red-300"
              >
                {t("remove")}
              </button>
            )}
            {item.locked && (
              <p className="mt-1 text-[10px] text-gold/70">{t("locked")}</p>
            )}
          </div>
        </>
      ) : editable ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/40 transition hover:text-gold"
        >
          <span className="text-3xl">+</span>
          <span className="text-[11px]">{t("addNft")}</span>
        </button>
      ) : (
        <div className="flex h-full items-center justify-center text-2xl text-white/15">
          —
        </div>
      )}
    </div>
  );
}

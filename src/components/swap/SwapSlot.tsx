"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { resolveNftImage } from "@/lib/nft/metadata";
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
  const [imageUrl, setImageUrl] = useState<string | null>(item?.nft.imageUrl ?? null);
  const [imageBroken, setImageBroken] = useState(false);

  const tokenId = item?.nft.tokenId.toString() ?? "";

  useEffect(() => {
    if (!item) return;
    setImageBroken(false);
    if (item.nft.imageUrl) {
      setImageUrl(item.nft.imageUrl);
      return;
    }
    if (!item.nft.tokenUri) return;
    let cancelled = false;
    resolveNftImage(item.nft.tokenUri).then((url) => {
      if (!cancelled && url) setImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [item]);

  return (
    <div
      className={`relative flex aspect-square flex-col overflow-hidden rounded-xl border transition ${
        item
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-dashed border-white/15 bg-black/30 hover:border-gold/30"
      }`}
    >
      <span className="absolute left-2 top-2 z-10 font-mono text-[10px] text-white/40">
        {String(index + 1).padStart(2, "0")}
      </span>

      {item ? (
        <>
          <div className="relative min-h-0 flex-1 bg-black/50">
            {imageUrl && !imageBroken ? (
              <img
                src={imageUrl}
                alt={`${item.nft.collectionName} #${tokenId}`}
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setImageBroken(true)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
                <span className="text-3xl text-gold/40">✦</span>
                <span className="font-mono text-lg font-bold text-gold">
                  #{tokenId}
                </span>
              </div>
            )}
            <span className="absolute bottom-2 right-2 z-10 rounded-md bg-black/75 px-2 py-0.5 font-mono text-[11px] font-bold text-gold shadow">
              #{tokenId}
            </span>
          </div>

          <div className="border-t border-white/10 bg-black/70 p-2">
            <p className="truncate text-xs font-semibold text-white">
              {item.nft.collectionName}{" "}
              <span className="font-mono text-gold">#{tokenId}</span>
            </p>
            <p className="truncate text-[10px] text-emerald-400/80">
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

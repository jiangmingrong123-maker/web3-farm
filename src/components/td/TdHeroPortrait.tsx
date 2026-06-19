"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { NftAvatar } from "@/components/td/TdSprites";
import type { HeroAvatar } from "@/lib/td/hero-avatar";

type Props = {
  avatar: HeroAvatar;
  level: number;
};

export function TdHeroPortrait({ avatar, level }: Props) {
  const t = useTranslations("td");
  const isNobody = avatar.kind === "nobody" && avatar.tokenId;

  return (
    <div className="relative flex h-full min-h-[200px] w-full flex-col items-center justify-end overflow-hidden rounded-lg border-2 border-emerald-700/50 bg-gradient-to-b from-emerald-950/70 via-emerald-950/40 to-black/80 shadow-inner">
      {/* 红月风剪影底 */}
      <svg
        className="pointer-events-none absolute inset-x-6 bottom-4 top-6 text-emerald-800/35"
        viewBox="0 0 100 140"
        aria-hidden
      >
        <ellipse cx="50" cy="28" rx="18" ry="20" fill="currentColor" />
        <path
          d="M22 52 Q50 42 78 52 L72 130 Q50 138 28 130 Z"
          fill="currentColor"
        />
      </svg>

      {isNobody ? (
        <NftAvatar
          tokenId={avatar.tokenId}
          alt={avatar.name}
          fallback={avatar.name.slice(0, 1)}
          className="relative z-10 h-[88%] w-full object-contain object-bottom drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
        />
      ) : (
        <GenericHero />
      )}

      <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-6 text-center">
        <p className="truncate text-[11px] font-medium text-white/90">
          {isNobody ? avatar.name : t("heroGenericName")}
        </p>
        <p className="text-sm font-bold text-gold">Lv.{level}</p>
        {!isNobody && (
          <p className="text-[9px] text-white/40">{t("heroGenericHint")}</p>
        )}
      </div>
    </div>
  );
}

function GenericHero() {
  const t = useTranslations("td");
  const [imgOk, setImgOk] = useState(true);

  return (
    <div className="relative z-10 flex h-[85%] w-full flex-col items-center justify-end pb-2">
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/td/hero-generic.svg"
          alt=""
          className="h-full max-h-[180px] w-auto object-contain opacity-90"
          onError={() => setImgOk(false)}
        />
      ) : (
        <span className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-white/25 bg-white/5 text-4xl text-white/30">
          ?
        </span>
      )}
      <span className="text-[10px] text-white/35">{t("heroGenericName")}</span>
    </div>
  );
}

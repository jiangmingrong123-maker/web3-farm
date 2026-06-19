"use client";

import { useTranslations } from "next-intl";
import { NftAvatar } from "@/components/td/TdSprites";
import type { HeroAvatar } from "@/lib/td/hero-avatar";

type Props = {
  avatar: HeroAvatar;
  level: number;
};

/** Nobody 仅为头像 — 嵌在人体剪影的头部区域 */
export function TdHeroHead({ avatar, level }: Props) {
  const t = useTranslations("td");
  const isNobody = avatar.kind === "nobody" && avatar.tokenId;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[52px] w-[52px] overflow-hidden rounded-md border border-emerald-600/60 bg-black/50 shadow-inner ring-1 ring-emerald-900/40">
        {isNobody ? (
          <NftAvatar
            tokenId={avatar.tokenId}
            alt={avatar.name}
            fallback={avatar.name.slice(0, 1)}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <GenericHead />
        )}
      </div>
      <p className="mt-1 max-w-[72px] truncate text-center text-[9px] text-white/70">
        {isNobody ? avatar.name : t("heroGenericName")}
      </p>
      <p className="text-[10px] font-bold text-gold">Lv.{level}</p>
    </div>
  );
}

function GenericHead() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-emerald-950/80 text-lg text-emerald-700/80">
      ?
    </div>
  );
}

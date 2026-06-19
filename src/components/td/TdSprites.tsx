"use client";

import { useState } from "react";
import { starXpProgress } from "@/config/td/xp";
import { nobodyAvatarUrls } from "@/lib/td/nft-avatar";
import { towerDef } from "@/lib/td/towers";
import type { PlacedTower } from "@/lib/td/engine";

export function NftAvatar({
  tokenId,
  alt,
  className,
  fallback,
}: {
  tokenId: string;
  alt: string;
  className?: string;
  fallback: string;
}) {
  const urls = nobodyAvatarUrls(tokenId);
  const [idx, setIdx] = useState(0);
  const failed = idx >= urls.length;

  if (failed) {
    return (
      <span
        className={`flex items-center justify-center bg-ink/80 text-xs font-bold text-gold ${className ?? ""}`}
      >
        {fallback}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urls[idx]}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}

function LevelBadge({ lv, className = "" }: { lv: number; className?: string }) {
  return (
    <span
      className={`rounded bg-ink/90 px-1 text-[9px] font-bold leading-tight ${className}`}
    >
      Lv{lv}
    </span>
  );
}

export function TowerSprite({ tower }: { tower: PlacedTower }) {
  const def = towerDef(tower.kind);
  const lv = tower.level;

  if (def.isStar && def.tokenId) {
    const xp = starXpProgress(tower.kills, lv);
    return (
      <span className="absolute inset-0.5 flex flex-col overflow-hidden rounded-md ring-2 ring-gold/70 shadow-[0_0_12px_rgba(212,175,55,0.45)]">
        <span className="relative min-h-0 flex-1">
          <NftAvatar
            tokenId={def.tokenId}
            alt={def.starName ?? def.label}
            fallback={def.label.slice(0, 1)}
            className="h-full w-full object-cover object-top"
          />
          <span className="absolute bottom-0 right-0">
            <LevelBadge lv={lv} className="text-gold" />
          </span>
        </span>
        <span className="shrink-0 bg-ink/95 px-0.5 py-px">
          <span className="mb-px block text-center text-[7px] text-white/60">
            {tower.kills} XP
            {xp.need != null ? ` / ${xp.nextAt}` : " MAX"}
          </span>
          <span className="block h-1 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full bg-gold transition-all duration-300"
              style={{ width: `${xp.pct}%` }}
            />
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center rounded-md bg-ink/50 ring-2 ring-cyan-500/50">
      <span className="text-base font-bold text-cyan-200">{def.label}</span>
      <LevelBadge lv={lv} className="mt-0.5 text-cyan-300" />
    </span>
  );
}

"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  equipItemName,
  equipNameGrid,
  itemStats,
  RARITY_TEXT_CLASS,
  type EquipItemDef,
} from "@/config/td/equipment-catalog";
import { rarityLabel } from "@/lib/td/equip-rules";
import {
  scoreEquipItem,
  scoreEquipStats,
  type EquipStatBonus,
} from "@/lib/td/equip-score";

export type EquipStatKey = keyof EquipStatBonus;

export const EQUIP_STAT_KEYS: EquipStatKey[] = [
  "str",
  "agi",
  "mag",
  "atk",
  "def",
  "dodge",
  "hp",
  "mp",
  "magDmg",
];

type TFn = ReturnType<typeof useTranslations<"td">>;

export function EquipScoreBadge({
  score,
  compact,
}: {
  score: number;
  compact?: boolean;
}) {
  const t = useTranslations("td");
  return (
    <span
      className={`inline-flex items-center rounded border border-amber-500/35 bg-amber-500/10 font-semibold text-amber-300 ${
        compact ? "px-1 py-0 text-[8px]" : "px-1.5 py-0.5 text-[10px]"
      }`}
    >
      {t("equipScore", { score })}
    </span>
  );
}

export function EquipItemHeader({
  item,
  locale,
  cap,
  score,
}: {
  item: EquipItemDef;
  locale: string;
  cap?: number;
  score?: number;
}) {
  const t = useTranslations("td");
  const overCap = cap != null && item.level > cap;
  const s = score ?? scoreEquipItem(item);
  return (
    <div className="flex flex-wrap items-start justify-between gap-1">
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium ${RARITY_TEXT_CLASS[item.rarity]}`}>
          {equipItemName(item, locale)}
        </p>
        <p className="text-[9px] text-white/50">
          Lv.{item.level} · {rarityLabel(item, locale)}
        </p>
        {overCap && (
          <p className="mt-0.5 text-[9px] text-red-400">{t("equipNeedHeroLv")}</p>
        )}
      </div>
      <EquipScoreBadge score={s} />
    </div>
  );
}

export function EquipStatLines({
  stats,
  t,
  size = "sm",
}: {
  stats: EquipStatBonus;
  t: TFn;
  size?: "sm" | "xs" | "md";
}) {
  const lines = formatStatLines(stats, t);
  if (lines.length === 0) return null;
  const text =
    size === "md" ? "text-sm" : size === "xs" ? "text-[8px]" : "text-[11px]";
  return (
    <ul className={`mt-1.5 space-y-1 ${text}`}>
      {lines.map((line) => (
        <li key={line.key} className="text-sky-300/95">
          {line.text}
        </li>
      ))}
    </ul>
  );
}

/** 紧凑一行对比（不重复双栏大面板） */
export function EquipCompareInline({
  wornItem,
  wornStats,
  bagItem,
  bagStats,
  locale,
  t,
}: {
  wornItem: EquipItemDef;
  wornStats: EquipStatBonus;
  bagItem: EquipItemDef;
  bagStats: EquipStatBonus;
  locale: string;
  t: TFn;
}) {
  const wornScore = scoreEquipStats(wornStats);
  const bagScore = scoreEquipStats(bagStats);
  const scoreD = bagScore - wornScore;
  const deltas = EQUIP_STAT_KEYS.map((key) => {
    const d = bagStats[key] - wornStats[key];
    if (!d) return null;
    const sign = d > 0 ? "+" : "";
    if (key === "dodge") return `${sign}${d}%`;
    if (key === "hp") return `${sign}${d} HP`;
    return `${sign}${d} ${statLabel(key, t)}`;
  }).filter(Boolean);

  return (
    <div className="mt-1.5 rounded border border-white/10 bg-black/35 px-2 py-1">
      <p className="text-[9px] text-white/40">{t("equipCompare")}</p>
      <p className="truncate text-[10px] text-white/65">
        {equipNameGrid(equipItemName(wornItem, locale))}({wornScore}) →{" "}
        {equipNameGrid(equipItemName(bagItem, locale))}({bagScore})
      </p>
      <p className={`text-[10px] ${scoreD >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        {scoreD > 0 ? "+" : ""}
        {scoreD} {t("equipScoreLabel")}
        {deltas.length > 0 ? ` · ${deltas.join(" · ")}` : ""}
      </p>
    </div>
  );
}

/** 固定高度装备详情（商店/背包/装备栏共用） */
export function EquipDetailSheet({
  item,
  locale,
  cap,
  t,
  wornItem,
  wornStats,
  footer,
  sellGold,
  fixed = true,
}: {
  item: EquipItemDef;
  locale: string;
  cap?: number;
  t: TFn;
  wornItem?: EquipItemDef;
  wornStats?: EquipStatBonus;
  footer?: ReactNode;
  sellGold?: number;
  /** 固定高度框，内容区可微滚 */
  fixed?: boolean;
}) {
  const stats = itemStats(item);
  const statLine = formatStatLines(stats, t)
    .map((l) => l.text)
    .join(" · ");

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-bold ${RARITY_TEXT_CLASS[item.rarity]}`}>
            {equipItemName(item, locale)}
          </p>
          <p className="mt-0.5 text-[10px] text-white/50">
            {t("equipLevelLabel", { lv: item.level })} · {rarityLabel(item, locale)}
            {sellGold != null && (
              <span className="text-white/35"> · {t("inventorySellGold", { gold: sellGold })}</span>
            )}
          </p>
          {cap != null && item.level > cap && (
            <p className="text-[10px] text-red-400">{t("equipNeedHeroLv")}</p>
          )}
        </div>
        <EquipScoreBadge score={scoreEquipItem(item)} compact />
      </div>

      {statLine && (
        <p className="mt-1.5 text-[10px] leading-snug text-sky-300/95">
          <span className="text-violet-300/80">{t("equipBaseStats")} </span>
          {statLine}
        </p>
      )}

      {wornItem && wornStats && wornItem.id !== item.id && (
        <EquipCompareInline
          wornItem={wornItem}
          wornStats={wornStats}
          bagItem={item}
          bagStats={stats}
          locale={locale}
          t={t}
        />
      )}
    </>
  );

  if (!fixed) {
    return (
      <div className="rounded-lg border border-stone-500/60 bg-stone-950/95 p-2.5 shadow-lg">
        {body}
        {footer && <div className="mt-2 border-t border-white/10 pt-2">{footer}</div>}
      </div>
    );
  }

  return (
    <div className="flex h-[188px] flex-col overflow-hidden rounded-lg border border-stone-500/55 bg-gradient-to-b from-stone-900/95 to-black/90 shadow-md">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">{body}</div>
      {footer && (
        <div className="shrink-0 border-t border-white/10 bg-black/40 p-2">{footer}</div>
      )}
    </div>
  );
}

export function EquipCompareBlock({
  cur,
  next,
  t,
}: {
  cur: EquipStatBonus;
  next: EquipStatBonus;
  t: TFn;
}) {
  const curScore = scoreEquipStats(cur);
  const nextScore = scoreEquipStats(next);
  const scoreD = nextScore - curScore;
  const atkD = next.atk - cur.atk;
  const showHint =
    (atkD > 0 && scoreD < 0) || (atkD < 0 && scoreD > 0) || (atkD !== 0 && scoreD === 0);
  const statDeltas = EQUIP_STAT_KEYS.map((key) => {
    const d = next[key] - cur[key];
    if (!d) return null;
    return { key, text: `${d > 0 ? "+" : ""}${d} ${statLabel(key, t)}`, positive: d > 0 };
  }).filter(Boolean) as { key: EquipStatKey; text: string; positive: boolean }[];

  return (
    <div className="mt-1.5 border-t border-white/10 pt-1.5">
      <p className="text-[8px] text-white/40">{t("equipCompare")}</p>
      <div className="mt-1 flex items-center justify-between gap-2 text-[9px]">
        <span className="text-white/45">{t("equipScoreLabel")}</span>
        <span
          className={
            scoreD > 0 ? "font-semibold text-emerald-400" : scoreD < 0 ? "text-red-400" : "text-white/50"
          }
        >
          {scoreD > 0 ? "+" : ""}
          {scoreD}
        </span>
      </div>
      {statDeltas.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-[9px]">
          {statDeltas.map((d) => (
            <li key={d.key} className={d.positive ? "text-emerald-400" : "text-red-400"}>
              {d.text}
            </li>
          ))}
        </ul>
      )}
      {showHint && (
        <p className="mt-1 text-[8px] text-white/35">{t("equipScoreHint")}</p>
      )}
    </div>
  );
}

/** 装备格悬停用紧凑卡片 */
export function EquipHoverCard({
  item,
  locale,
  cap,
}: {
  item: EquipItemDef;
  locale: string;
  cap: number;
}) {
  const t = useTranslations("td");
  const stats = itemStats(item);
  return (
    <div className="w-[168px] rounded-md border border-stone-600 bg-stone-950/98 p-2 text-left shadow-xl">
      <EquipItemHeader item={item} locale={locale} cap={cap} />
      <EquipStatLines stats={stats} t={t} size="xs" />
    </div>
  );
}

function statLabel(key: EquipStatKey, t: TFn): string {
  if (key === "str") return t("statStrShort");
  if (key === "agi") return t("statAgiShort");
  if (key === "mag") return t("statMagShort");
  if (key === "atk") return t("statAtkShort");
  if (key === "def") return t("statDefShort");
  if (key === "dodge") return t("statDodgeShort");
  if (key === "hp") return "HP";
  if (key === "mp") return t("statMpShort");
  return t("statMagDmgShort");
}

export function EquipStatCompact({
  stats,
  t,
}: {
  stats: EquipStatBonus;
  t: TFn;
}) {
  const text = formatStatLines(stats, t)
    .map((l) => l.text)
    .join(" · ");
  if (!text) return null;
  return <p className="text-[10px] leading-snug text-white/55">{text}</p>;
}

/** 身上 vs 背包 双栏对比（红月式信息区） */
export function EquipSideBySideCompare({
  wornItem,
  wornStats,
  bagItem,
  bagStats,
  locale,
  cap,
  t,
}: {
  wornItem: EquipItemDef;
  wornStats: EquipStatBonus;
  bagItem: EquipItemDef;
  bagStats: EquipStatBonus;
  locale: string;
  cap: number;
  t: TFn;
}) {
  return (
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-white/15 bg-black/40 px-3 py-2">
        <p className="mb-1.5 text-[11px] font-semibold text-white/50">{t("equipCurrent")}</p>
        <EquipItemHeader item={wornItem} locale={locale} cap={cap} score={scoreEquipItem(wornItem)} />
        <EquipStatLines stats={wornStats} t={t} size="sm" />
      </div>
      <div className="rounded-lg border border-gold/35 bg-gold/8 px-3 py-2">
        <p className="mb-1.5 text-[11px] font-semibold text-gold/80">{t("equipCandidate")}</p>
        <EquipItemHeader item={bagItem} locale={locale} cap={cap} score={scoreEquipItem(bagItem)} />
        <EquipStatLines stats={bagStats} t={t} size="sm" />
      </div>
      <div className="sm:col-span-2">
        <EquipCompareBlock cur={wornStats} next={bagStats} t={t} />
      </div>
    </div>
  );
}

function formatStatLines(stats: EquipStatBonus, t: TFn) {
  return EQUIP_STAT_KEYS.map((key) => {
    const v = stats[key];
    if (!v) return null;
    const label = statLabel(key, t);
    const text =
      key === "dodge"
        ? `+${v}% ${label}`
        : key === "hp"
          ? `+${v} HP`
          : `+${v} ${label}`;
    return { key, text };
  }).filter(Boolean) as { key: EquipStatKey; text: string }[];
}

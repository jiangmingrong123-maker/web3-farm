import type { CellKind } from "@/config/td/stage1";

/** 小人物 → 大明星：拍摄现场主题 */
export interface CellTheme {
  label: string;
  bg: string;
  accent?: string;
}

export const STAGE1_THEME: Record<CellKind, CellTheme> = {
  "#": {
    label: "隔板",
    bg: "bg-gradient-to-br from-zinc-950 via-zinc-900 to-black",
  },
  B: {
    label: "场位",
    bg: "bg-gradient-to-b from-stone-800/95 via-stone-900 to-stone-950",
    accent: "ring-emerald-500/50",
  },
  M: {
    label: "灯位",
    bg: "bg-gradient-to-br from-amber-900/40 via-stone-900 to-stone-950",
    accent: "ring-amber-400/40",
  },
  R: {
    label: "红毯",
    bg: "bg-gradient-to-br from-red-600/90 via-red-800 to-red-950",
    accent: "ring-red-400/30",
  },
};

export const STAGE1_ZONES = [
  { rowStart: 0, rowEnd: 3, name: "摄影棚", sub: "Backstage" },
  { rowStart: 4, rowEnd: 7, name: "红毯区", sub: "Red Carpet" },
  { rowStart: 8, rowEnd: 10, name: "首映台", sub: "Premiere" },
] as const;

export const STAGE1_TAGLINE = "化妆间 → 摄影棚 → 红毯 → 首映";

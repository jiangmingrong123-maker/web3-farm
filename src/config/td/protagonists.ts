/** 可选主角 · 第一批 5 人（合规名称） */

import type { HeroStats3 } from "@/config/td/hero-attributes";

export type ProtagonistId = "goku" | "vegeta" | "android18" | "tien" | "launch";

/** 战斗流派：决定主要物理招式用力量攻还是敏捷攻 */
export type ProtagonistArchetype = "str" | "agi" | "mag";

export type ProtagonistDef = {
  id: ProtagonistId;
  nameZh: string;
  nameEn: string;
  gender: "male" | "female";
  archetype: ProtagonistArchetype;
  /** 1 级初始三维（共 28 点，侧重不同） */
  startStats: HeroStats3;
  /** 一句话定位 */
  focusZh: string;
  focusEn: string;
  avatarTokenId?: string;
};

export const PROTAGONISTS: ProtagonistDef[] = [
  {
    id: "goku",
    nameZh: "空明",
    nameEn: "Kongming",
    gender: "male",
    archetype: "str",
    startStats: { str: 11, agi: 9, mag: 8 },
    focusZh: "力量型 · 均衡",
    focusEn: "STR · balanced",
  },
  {
    id: "vegeta",
    nameZh: "赛塔",
    nameEn: "Seta",
    gender: "male",
    archetype: "str",
    startStats: { str: 13, agi: 9, mag: 6 },
    focusZh: "力量型 · 高爆发",
    focusEn: "STR · burst",
  },
  {
    id: "android18",
    nameZh: "十八号",
    nameEn: "No. 18",
    gender: "female",
    archetype: "agi",
    startStats: { str: 8, agi: 13, mag: 7 },
    focusZh: "敏捷型 · 快攻",
    focusEn: "AGI · fast",
  },
  {
    id: "tien",
    nameZh: "三眼",
    nameEn: "Third Eye",
    gender: "male",
    archetype: "mag",
    startStats: { str: 7, agi: 8, mag: 13 },
    focusZh: "魔力型 · 法术",
    focusEn: "MAG · caster",
  },
  {
    id: "launch",
    nameZh: "兰琪",
    nameEn: "Lanqi",
    gender: "female",
    archetype: "agi",
    startStats: { str: 7, agi: 14, mag: 7 },
    focusZh: "敏捷型 · 极高敏攻",
    focusEn: "AGI · top speed",
  },
];

export const DEFAULT_PROTAGONIST: ProtagonistId = "goku";

export function getProtagonist(id: ProtagonistId): ProtagonistDef {
  return PROTAGONISTS.find((p) => p.id === id) ?? PROTAGONISTS[0]!;
}

export function protagonistName(id: ProtagonistId, locale: string): string {
  const p = getProtagonist(id);
  return locale === "zh" ? p.nameZh : p.nameEn;
}

export function defaultStatsForProtagonist(id: ProtagonistId): HeroStats3 {
  return { ...getProtagonist(id).startStats };
}

/** 主角主要物理攻击（按流派） */
export function primaryPhysAtk(
  id: ProtagonistId,
  derived: { strAtk: number; agiAtk: number },
): number {
  const arch = getProtagonist(id).archetype;
  if (arch === "str") return derived.strAtk;
  if (arch === "agi") return derived.agiAtk;
  return Math.max(1, Math.floor(derived.strAtk * 0.35 + derived.agiAtk * 0.35));
}

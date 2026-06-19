import type { MobKind } from "@/config/td/units";

export type CrewTraitId = "block" | "slow" | "expose" | "splash";

export interface CrewTrait {
  id: CrewTraitId;
  name: string;
  description: string;
}

export const CREW_TRAITS: Record<MobKind, CrewTrait> = {
  群: {
    id: "block",
    name: "堵场",
    description: "近程重击 · 单点伤害 +15%",
  },
  粉: {
    id: "slow",
    name: "脱粉",
    description: "攻击附带减速 · 等级越高减速越久",
  },
  编: {
    id: "expose",
    name: "改剧本",
    description: "命中标记破绽 · 敌人额外 +30% 受伤",
  },
  导: {
    id: "splash",
    name: "全场 action",
    description: "射程内范围伤害 · 副目标 55% 伤害",
  },
};

/** 粉：减速毫秒（随等级） */
export function fanSlowMs(level: number): number {
  return 900 + level * 250;
}

/** 编：破绽持续时间 ms */
export function exposeMs(level: number): number {
  return 1200 + level * 200;
}

/** 编：额外受伤比例 */
export const EXPOSE_DAMAGE_MUL = 1.3;

/** 导：溅射伤害比例 */
export const DIRECTOR_SPLASH_MUL = 0.55;

/** 群：伤害加成 */
export const CROWD_DAMAGE_MUL = 1.15;

export function crewTrait(kind: MobKind): CrewTrait {
  return CREW_TRAITS[kind];
}

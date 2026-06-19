export type MobKind = "群" | "粉" | "编" | "导";

export interface MobDef {
  kind: MobKind;
  label: string;
  cost: number;
  range: number;
  damage: number;
  fireMs: number;
  description: string;
}

export const MOB_DEFS: Record<MobKind, MobDef> = {
  群: {
    kind: "群",
    label: "群",
    cost: 3,
    range: 1.35,
    damage: 2.5,
    fireMs: 1100,
    description: "群众演员 · 堵场重击",
  },
  粉: {
    kind: "粉",
    label: "粉",
    cost: 4,
    range: 2.1,
    damage: 2,
    fireMs: 850,
    description: "粉丝团 · 攻击减速",
  },
  编: {
    kind: "编",
    label: "编",
    cost: 5,
    range: 2.2,
    damage: 1.2,
    fireMs: 1100,
    description: "编剧 · 改剧本破绽",
  },
  导: {
    kind: "导",
    label: "导",
    cost: 6,
    range: 2.5,
    damage: 2.2,
    fireMs: 800,
    description: "导演 · 范围溅射",
  },
};

export type EnemyKind = "黑" | "水" | "混" | "Boss";

export interface EnemyDef {
  kind: EnemyKind;
  label: string;
  hp: number;
  speed: number;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  黑: { kind: "黑", label: "黑", hp: 8, speed: 0.5 },
  水: { kind: "水", label: "水", hp: 18, speed: 0.36 },
  混: { kind: "混", label: "混", hp: 14, speed: 0.42 },
  Boss: { kind: "Boss", label: "BOSS", hp: 55, speed: 0.32 },
};

export const STAGE1_WAVES = 20;
export const MAX_HEARTS = 3;
export const START_POPULARITY = 24;
export const WAVE_POPULARITY_BONUS = 3;
export const MINE_GOLD_INTERVAL_MS = 20_000;

import type { MobKind } from "@/config/td/units";
import { MOB_DEFS } from "@/config/td/units";
import type { StarDef, StarId } from "@/config/td/stars";
import { STAR_DEFS } from "@/config/td/stars";
import {
  CREW_LEVEL_DAMAGE_BONUS,
  CREW_LEVEL_RANGE_BONUS,
  CREW_LEVEL_SPEED_MUL,
  CREW_MAX_LEVEL,
  STAR_LEVEL_DAMAGE_BONUS,
  STAR_LEVEL_RANGE_BONUS,
  STAR_LEVEL_SPEED_MUL,
} from "@/config/td/xp";

export type TowerKind = MobKind | StarId;

export interface TowerCombatDef {
  kind: TowerKind;
  label: string;
  cost: number;
  range: number;
  damage: number;
  fireMs: number;
  description: string;
  isStar: boolean;
  isCrew: boolean;
  tokenId?: string;
  starName?: string;
}

export interface TowerCombatStats {
  damage: number;
  range: number;
  fireMs: number;
  attackSpeed: number;
}

export function isStarKind(kind: TowerKind): kind is StarId {
  return kind in STAR_DEFS;
}

export function isCrewKind(kind: TowerKind): kind is MobKind {
  return kind in MOB_DEFS;
}

export function towerDef(kind: TowerKind): TowerCombatDef {
  if (isStarKind(kind)) {
    const s: StarDef = STAR_DEFS[kind];
    return {
      kind,
      label: s.title,
      cost: s.cost,
      range: s.range,
      damage: s.damage,
      fireMs: s.fireMs,
      description: s.description,
      isStar: true,
      isCrew: false,
      tokenId: s.tokenId,
      starName: s.name,
    };
  }
  const m = MOB_DEFS[kind];
  return {
    kind,
    label: m.label,
    cost: m.cost,
    range: m.range,
    damage: m.damage,
    fireMs: m.fireMs,
    description: m.description,
    isStar: false,
    isCrew: true,
  };
}

export function towerCombatStats(kind: TowerKind, level: number): TowerCombatStats {
  const def = towerDef(kind);
  const lv = Math.max(1, level);

  if (def.isStar) {
    const damage = def.damage * (1 + (lv - 1) * STAR_LEVEL_DAMAGE_BONUS);
    const range = def.range + (lv - 1) * STAR_LEVEL_RANGE_BONUS;
    const fireMs = def.fireMs * STAR_LEVEL_SPEED_MUL ** (lv - 1);
    return { damage, range, fireMs, attackSpeed: 1000 / fireMs };
  }

  const damage = def.damage * (1 + (lv - 1) * CREW_LEVEL_DAMAGE_BONUS);
  const range = def.range + (lv - 1) * CREW_LEVEL_RANGE_BONUS;
  const fireMs = def.fireMs * CREW_LEVEL_SPEED_MUL ** (lv - 1);
  return { damage, range, fireMs, attackSpeed: 1000 / fireMs };
}

export function previewStats(kind: TowerKind, level = 1): TowerCombatStats {
  return towerCombatStats(kind, level);
}

export function canMergeCrew(
  a: { kind: TowerKind; level: number },
  b: { kind: TowerKind; level: number },
): boolean {
  return (
    isCrewKind(a.kind) &&
    isCrewKind(b.kind) &&
    a.kind === b.kind &&
    a.level === b.level &&
    a.level < CREW_MAX_LEVEL
  );
}

export const CREW_KINDS: MobKind[] = ["群", "粉", "编", "导"];
export const ALL_TOWER_KINDS: TowerKind[] = [
  "群",
  "粉",
  "编",
  "导",
  "monk",
  "water",
  "may",
  "celestial",
  "cuckoo",
];

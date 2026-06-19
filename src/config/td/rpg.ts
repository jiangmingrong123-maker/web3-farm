/** 单主角 RPG · 装备 · 配角 · 爬塔 */

export type EquipSlot = "weapon" | "armor" | "accessory";
export type CompanionKind = "群" | "粉" | "编" | "导";

export const COMPANION_KINDS: CompanionKind[] = ["群", "粉", "编", "导"];

export const EQUIP_SLOTS: EquipSlot[] = ["weapon", "armor", "accessory"];

export const EQUIP_NAMES: Record<EquipSlot, string> = {
  weapon: "武器",
  armor: "护甲",
  accessory: "配饰",
};

export const COMPANION_UNLOCK_GOLD: Record<CompanionKind, number> = {
  群: 0,
  粉: 0,
  编: 80,
  导: 120,
};

export const MAX_HERO_LEVEL = 30;
export const MAX_EQUIP_LEVEL = 10;
export const MAX_COMPANION_LEVEL = 5;
export const RUN_MAX_FLOOR = 20;

export function heroLevelCost(level: number): number {
  return 15 + level * 8;
}

export function equipLevelCost(level: number): number {
  return 20 + level * 12;
}

export function companionLevelCost(level: number): number {
  return 10 + level * 6;
}

export interface HeroStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
}

export interface HeroSave {
  level: number;
  equipLevel: Record<EquipSlot, number>;
  companionLevel: Record<CompanionKind, number>;
  companionUnlocked: Record<CompanionKind, boolean>;
}

export function defaultHeroSave(): HeroSave {
  return {
    level: 1,
    equipLevel: { weapon: 1, armor: 1, accessory: 1 },
    companionLevel: { 群: 1, 粉: 1, 编: 1, 导: 1 },
    companionUnlocked: { 群: true, 粉: true, 编: false, 导: false },
  };
}

/** 主角战斗属性（含装备） */
export function heroCombatStats(save: HeroSave): HeroStats {
  const lv = save.level;
  const w = save.equipLevel.weapon;
  const a = save.equipLevel.armor;
  const c = save.equipLevel.accessory;
  const maxHp = Math.floor(80 + lv * 12 + a * 15 + c * 5);
  const atk = Math.floor(8 + lv * 2 + w * 4 + c * 2);
  const def = Math.floor(3 + lv * 0.8 + a * 3 + c * 1);
  return { hp: maxHp, maxHp, atk, def };
}

export function companionAtk(kind: CompanionKind, level: number): number {
  const base = { 群: 4, 粉: 3, 编: 2, 导: 5 }[kind];
  return Math.floor(base + level * 1.5);
}

export interface FloorEnemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
}

/** 爬塔层数 → 怪物队伍 */
export function floorEnemies(floor: number): FloorEnemy[] {
  const tier = Math.floor((floor - 1) / 5);
  const count = Math.min(1 + Math.floor(floor / 3), 5);
  const enemies: FloorEnemy[] = [];
  for (let i = 0; i < count; i++) {
    const isBoss = floor % 5 === 0 && i === count - 1;
    const scale = 1 + (floor - 1) * 0.12 + tier * 0.15;
    const hp = Math.floor((isBoss ? 45 : 18) * scale);
    const atk = Math.round((isBoss ? 8 : 3 + tier) * (1 + floor * 0.04) * 10) / 10;
    const name = isBoss ? `第${floor}层·BOSS` : tier >= 2 ? "混子" : tier >= 1 ? "水军" : "黑粉";
    enemies.push({
      id: `e${floor}_${i}`,
      name,
      hp,
      maxHp: hp,
      atk,
    });
  }
  return enemies;
}

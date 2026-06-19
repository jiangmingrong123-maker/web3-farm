/** 单主角 RPG · 装备栏 · 配角 · 爬塔 */

export type EquipSlot =
  | "weapon"
  | "hat"
  | "clothes"
  | "pants"
  | "ring"
  | "bracelet";

export type CompanionKind = "群" | "粉" | "编" | "导";

export const COMPANION_KINDS: CompanionKind[] = ["群", "粉", "编", "导"];

export const EQUIP_SLOTS: EquipSlot[] = [
  "weapon",
  "hat",
  "clothes",
  "pants",
  "ring",
  "bracelet",
];

export const EQUIP_NAMES: Record<EquipSlot, string> = {
  weapon: "武器",
  hat: "帽子",
  clothes: "衣服",
  pants: "裤子",
  ring: "戒指",
  bracelet: "手环",
};

export const EQUIP_NAMES_EN: Record<EquipSlot, string> = {
  weapon: "Weapon",
  hat: "Hat",
  clothes: "Armor",
  pants: "Pants",
  ring: "Ring",
  bracelet: "Bracelet",
};

const TIER_ZH = ["劣质", "普通", "精良", "稀有", "史诗", "传说", "神话"];
const TIER_EN = ["Poor", "Common", "Fine", "Rare", "Epic", "Legend", "Mythic"];

export const COMPANION_UNLOCK_GOLD: Record<CompanionKind, number> = {
  群: 0,
  粉: 0,
  编: 80,
  导: 120,
};

export const MAX_HERO_LEVEL = 30;
export const MAX_EQUIP_TIER = 15;
export const MAX_COMPANION_LEVEL = 5;
export const RUN_MAX_FLOOR = 20;

export function heroLevelCost(level: number): number {
  return 15 + level * 8;
}

export function equipTierCost(tier: number): number {
  return 18 + tier * 14;
}

export function companionLevelCost(level: number): number {
  return 10 + level * 6;
}

/** 主角等级决定可穿戴装备最高阶 */
export function maxEquipTierForHero(heroLevel: number): number {
  return Math.min(MAX_EQUIP_TIER, Math.max(1, heroLevel));
}

export interface EquipBonus {
  hp: number;
  atk: number;
  def: number;
  crit: number;
  atkSpd: number;
}

export interface HeroStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  crit: number;
  atkSpd: number;
}

export interface HeroSave {
  level: number;
  equipTier: Record<EquipSlot, number>;
  companionLevel: Record<CompanionKind, number>;
  companionUnlocked: Record<CompanionKind, boolean>;
}

export function defaultEquipTier(): Record<EquipSlot, number> {
  return {
    weapon: 1,
    hat: 1,
    clothes: 1,
    pants: 1,
    ring: 1,
    bracelet: 1,
  };
}

export function defaultHeroSave(): HeroSave {
  return {
    level: 1,
    equipTier: defaultEquipTier(),
    companionLevel: { 群: 1, 粉: 1, 编: 1, 导: 1 },
    companionUnlocked: { 群: true, 粉: true, 编: false, 导: false },
  };
}

export function equipDisplayName(
  slot: EquipSlot,
  tier: number,
  locale: string,
): string {
  const zh = locale === "zh";
  const prefixes = zh ? TIER_ZH : TIER_EN;
  const slotName = zh ? EQUIP_NAMES[slot] : EQUIP_NAMES_EN[slot];
  const idx = Math.min(Math.max(0, tier - 1), prefixes.length - 1);
  return `${prefixes[idx]}·${slotName}`;
}

export function equipBonus(slot: EquipSlot, tier: number): EquipBonus {
  const t = Math.max(1, tier);
  const empty: EquipBonus = { hp: 0, atk: 0, def: 0, crit: 0, atkSpd: 0 };
  switch (slot) {
    case "weapon":
      return { ...empty, atk: 2 + t * 3, atkSpd: 4 + t * 2 };
    case "hat":
      return { ...empty, def: 1 + t * 2, hp: 6 + t * 7 };
    case "clothes":
      return { ...empty, def: 2 + t * 3, hp: 10 + t * 9 };
    case "pants":
      return { ...empty, def: 1 + t * 2, hp: 4 + t * 5 };
    case "ring":
      return { ...empty, atk: 1 + t * 2, crit: 2 + t * 1.5 };
    case "bracelet":
      return { ...empty, atkSpd: 3 + t * 2, crit: 1 + t };
    default:
      return empty;
  }
}

export function sumEquipBonus(save: HeroSave): EquipBonus {
  const sum: EquipBonus = { hp: 0, atk: 0, def: 0, crit: 0, atkSpd: 0 };
  for (const slot of EQUIP_SLOTS) {
    const b = equipBonus(slot, save.equipTier[slot]);
    sum.hp += b.hp;
    sum.atk += b.atk;
    sum.def += b.def;
    sum.crit += b.crit;
    sum.atkSpd += b.atkSpd;
  }
  return sum;
}

/** 主角战斗属性（等级 + 全身装备） */
export function heroCombatStats(save: HeroSave): HeroStats {
  const lv = save.level;
  const eq = sumEquipBonus(save);
  const maxHp = Math.floor(60 + lv * 10 + eq.hp);
  const atk = Math.floor(6 + lv * 2 + eq.atk);
  const def = Math.floor(2 + lv * 0.6 + eq.def);
  const crit = Math.min(50, Math.round(eq.crit * 10) / 10);
  const atkSpd = Math.min(80, Math.round(eq.atkSpd * 10) / 10);
  return { hp: maxHp, maxHp, atk, def, crit, atkSpd };
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

/**
 * 宠物召唤表 · 按主角等级解锁更高阶宠物（梦幻西游式）
 * 修改本文件即可调整等级门槛、金币、战力
 */

import type { CompanionKind } from "@/config/td/rpg";

export type PetTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type PetDef = {
  id: CompanionKind;
  tier: PetTier;
  /** 主角达到此等级可召唤/出战 */
  summonLevel: number;
  /** 0 = 达级自动获得；>0 = 花金币召唤 */
  summonGold: number;
  nameZh: string;
  nameEn: string;
  glyph: string;
  roleZh: string;
  roleEn: string;
  /** 基础攻击系数（见 companionAtk） */
  atkBase: number;
  atkPerLevel: number;
};

/** 从低到高；上阵顺序同此表 */
export const PET_CATALOG: PetDef[] = [
  {
    id: "群",
    tier: 1,
    summonLevel: 5,
    summonGold: 0,
    nameZh: "群攻小妖",
    nameEn: "Swarm Imp",
    glyph: "群",
    roleZh: "群攻",
    roleEn: "AoE",
    atkBase: 6,
    atkPerLevel: 2.2,
  },
  {
    id: "粉",
    tier: 2,
    summonLevel: 12,
    summonGold: 0,
    nameZh: "粉阵灵狐",
    nameEn: "Fan Fox",
    glyph: "粉",
    roleZh: "辅助",
    roleEn: "Support",
    atkBase: 5,
    atkPerLevel: 2,
  },
  {
    id: "编",
    tier: 3,
    summonLevel: 25,
    summonGold: 60,
    nameZh: "编策谋士",
    nameEn: "Script Sage",
    glyph: "编",
    roleZh: "策士",
    roleEn: "Tactician",
    atkBase: 4,
    atkPerLevel: 2.4,
  },
  {
    id: "导",
    tier: 4,
    summonLevel: 40,
    summonGold: 90,
    nameZh: "导演天师",
    nameEn: "Director Sage",
    glyph: "导",
    roleZh: "法系",
    roleEn: "Caster",
    atkBase: 8,
    atkPerLevel: 2.6,
  },
  {
    id: "盾",
    tier: 5,
    summonLevel: 55,
    summonGold: 180,
    nameZh: "玄铁盾卫",
    nameEn: "Iron Guard",
    glyph: "盾",
    roleZh: "坦克",
    roleEn: "Tank",
    atkBase: 5,
    atkPerLevel: 2.5,
  },
  {
    id: "医",
    tier: 6,
    summonLevel: 70,
    summonGold: 280,
    nameZh: "青囊医仙",
    nameEn: "Healer Immortal",
    glyph: "医",
    roleZh: "治疗",
    roleEn: "Heal",
    atkBase: 4,
    atkPerLevel: 2.3,
  },
  {
    id: "灵",
    tier: 7,
    summonLevel: 85,
    summonGold: 420,
    nameZh: "通灵法灵",
    nameEn: "Spirit Wisp",
    glyph: "灵",
    roleZh: "灵攻",
    roleEn: "Spirit",
    atkBase: 10,
    atkPerLevel: 3,
  },
  {
    id: "王",
    tier: 8,
    summonLevel: 100,
    summonGold: 600,
    nameZh: "王者战魂",
    nameEn: "King Soul",
    glyph: "王",
    roleZh: "终极",
    roleEn: "Ultimate",
    atkBase: 12,
    atkPerLevel: 3.2,
  },
];

export const PET_SUMMON_ORDER: CompanionKind[] = PET_CATALOG.map((p) => p.id);

export function getPetDef(id: CompanionKind): PetDef | undefined {
  return PET_CATALOG.find((p) => p.id === id);
}

export function petName(def: PetDef, locale: string): string {
  return locale === "zh" ? def.nameZh : def.nameEn;
}

export function petRole(def: PetDef, locale: string): string {
  return locale === "zh" ? def.roleZh : def.roleEn;
}

export function petSummonGold(id: CompanionKind): number {
  return getPetDef(id)?.summonGold ?? 0;
}

export function petSummonLevel(id: CompanionKind): number {
  return getPetDef(id)?.summonLevel ?? 99;
}

export function isAutoSummonPet(id: CompanionKind): boolean {
  return petSummonGold(id) === 0;
}

export function petAtkFromDef(def: PetDef, level: number): number {
  return Math.floor(def.atkBase + level * def.atkPerLevel);
}

/** 召唤路线图（给 UI 清单） */
export function petSummonRoadmap(heroLevel: number, locale: string) {
  return PET_CATALOG.map((p) => ({
    ...p,
    name: petName(p, locale),
    role: petRole(p, locale),
    canSummon: heroLevel >= p.summonLevel,
    needsGold: p.summonGold > 0,
  }));
}

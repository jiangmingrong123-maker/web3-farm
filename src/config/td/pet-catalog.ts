/**
 * 宠物召唤表 · 神仙道式：等级解锁 + 品质 + 修炼/内丹加成基数
 * 第一批 1–100 级共 16 只；后续批次继续往表后追加即可
 */

export type PetId =
  | "群"
  | "粉"
  | "刺"
  | "编"
  | "盾"
  | "火"
  | "医"
  | "导"
  | "风"
  | "毒"
  | "灵"
  | "雷"
  | "龙"
  | "凤"
  | "影"
  | "王";

export type PetTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type PetQuality = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** 内丹六格（神仙道味） */
export type NeidanSlot = "atk" | "def" | "hp" | "mag" | "crit" | "hit";

export const NEIDAN_SLOTS: NeidanSlot[] = ["atk", "def", "hp", "mag", "crit", "hit"];

export const NEIDAN_SLOT_LABEL_ZH: Record<NeidanSlot, string> = {
  atk: "攻",
  def: "防",
  hp: "血",
  mag: "法",
  crit: "暴",
  hit: "命",
};

export const NEIDAN_SLOT_LABEL_EN: Record<NeidanSlot, string> = {
  atk: "ATK",
  def: "DEF",
  hp: "HP",
  mag: "MAG",
  crit: "CRT",
  hit: "HIT",
};

export type PetDef = {
  id: PetId;
  tier: PetTier;
  quality: PetQuality;
  /** 主角达到此等级可召唤/出战 */
  summonLevel: number;
  /** 0 = 达级自动获得；>0 = 花金币召唤 */
  summonGold: number;
  nameZh: string;
  nameEn: string;
  glyph: string;
  roleZh: string;
  roleEn: string;
  atkBase: number;
  atkPerLevel: number;
  hpBase: number;
  hpPerLevel: number;
  defBase: number;
  defPerLevel: number;
};

const Q = {
  common: "common" as const,
  uncommon: "uncommon" as const,
  rare: "rare" as const,
  epic: "epic" as const,
  legendary: "legendary" as const,
};

/** 16 只 · 约每 5–8 级一只（100 级内） */
export const PET_CATALOG: PetDef[] = [
  {
    id: "群",
    tier: 1,
    quality: Q.common,
    summonLevel: 5,
    summonGold: 0,
    nameZh: "群攻小妖",
    nameEn: "Swarm Imp",
    glyph: "群",
    roleZh: "群攻",
    roleEn: "AoE",
    atkBase: 6,
    atkPerLevel: 2.2,
    hpBase: 40,
    hpPerLevel: 8,
    defBase: 2,
    defPerLevel: 0.8,
  },
  {
    id: "粉",
    tier: 1,
    quality: Q.common,
    summonLevel: 10,
    summonGold: 0,
    nameZh: "粉阵灵狐",
    nameEn: "Fan Fox",
    glyph: "粉",
    roleZh: "辅助",
    roleEn: "Support",
    atkBase: 5,
    atkPerLevel: 2,
    hpBase: 45,
    hpPerLevel: 9,
    defBase: 3,
    defPerLevel: 1,
  },
  {
    id: "刺",
    tier: 2,
    quality: Q.uncommon,
    summonLevel: 15,
    summonGold: 40,
    nameZh: "刺影刺客",
    nameEn: "Shadow Spike",
    glyph: "刺",
    roleZh: "爆发",
    roleEn: "Burst",
    atkBase: 8,
    atkPerLevel: 2.5,
    hpBase: 35,
    hpPerLevel: 7,
    defBase: 2,
    defPerLevel: 0.6,
  },
  {
    id: "编",
    tier: 2,
    quality: Q.uncommon,
    summonLevel: 20,
    summonGold: 60,
    nameZh: "编策谋士",
    nameEn: "Script Sage",
    glyph: "编",
    roleZh: "策士",
    roleEn: "Tactician",
    atkBase: 4,
    atkPerLevel: 2.4,
    hpBase: 42,
    hpPerLevel: 8,
    defBase: 3,
    defPerLevel: 0.9,
  },
  {
    id: "盾",
    tier: 3,
    quality: Q.uncommon,
    summonLevel: 28,
    summonGold: 90,
    nameZh: "玄铁盾卫",
    nameEn: "Iron Guard",
    glyph: "盾",
    roleZh: "坦克",
    roleEn: "Tank",
    atkBase: 5,
    atkPerLevel: 2.2,
    hpBase: 70,
    hpPerLevel: 14,
    defBase: 8,
    defPerLevel: 1.8,
  },
  {
    id: "火",
    tier: 3,
    quality: Q.rare,
    summonLevel: 35,
    summonGold: 120,
    nameZh: "烈焰魔犬",
    nameEn: "Flame Hound",
    glyph: "火",
    roleZh: "火攻",
    roleEn: "Fire",
    atkBase: 9,
    atkPerLevel: 2.7,
    hpBase: 48,
    hpPerLevel: 9,
    defBase: 3,
    defPerLevel: 0.9,
  },
  {
    id: "医",
    tier: 4,
    quality: Q.rare,
    summonLevel: 42,
    summonGold: 160,
    nameZh: "青囊医仙",
    nameEn: "Healer Immortal",
    glyph: "医",
    roleZh: "治疗",
    roleEn: "Heal",
    atkBase: 4,
    atkPerLevel: 2.1,
    hpBase: 55,
    hpPerLevel: 11,
    defBase: 4,
    defPerLevel: 1.1,
  },
  {
    id: "导",
    tier: 4,
    quality: Q.rare,
    summonLevel: 48,
    summonGold: 180,
    nameZh: "导演天师",
    nameEn: "Director Sage",
    glyph: "导",
    roleZh: "法系",
    roleEn: "Caster",
    atkBase: 8,
    atkPerLevel: 2.8,
    hpBase: 44,
    hpPerLevel: 8,
    defBase: 3,
    defPerLevel: 0.9,
  },
  {
    id: "风",
    tier: 5,
    quality: Q.rare,
    summonLevel: 55,
    summonGold: 220,
    nameZh: "疾风隼",
    nameEn: "Gale Falcon",
    glyph: "风",
    roleZh: "敏捷",
    roleEn: "Swift",
    atkBase: 10,
    atkPerLevel: 2.9,
    hpBase: 40,
    hpPerLevel: 8,
    defBase: 3,
    defPerLevel: 0.8,
  },
  {
    id: "毒",
    tier: 5,
    quality: Q.epic,
    summonLevel: 62,
    summonGold: 280,
    nameZh: "毒蟾妖姬",
    nameEn: "Venom Toad",
    glyph: "毒",
    roleZh: "毒伤",
    roleEn: "Poison",
    atkBase: 9,
    atkPerLevel: 2.8,
    hpBase: 50,
    hpPerLevel: 10,
    defBase: 4,
    defPerLevel: 1,
  },
  {
    id: "灵",
    tier: 6,
    quality: Q.epic,
    summonLevel: 70,
    summonGold: 340,
    nameZh: "通灵法灵",
    nameEn: "Spirit Wisp",
    glyph: "灵",
    roleZh: "灵攻",
    roleEn: "Spirit",
    atkBase: 11,
    atkPerLevel: 3.1,
    hpBase: 46,
    hpPerLevel: 9,
    defBase: 4,
    defPerLevel: 1,
  },
  {
    id: "雷",
    tier: 6,
    quality: Q.epic,
    summonLevel: 78,
    summonGold: 400,
    nameZh: "雷霆麒麟",
    nameEn: "Thunder Qilin",
    glyph: "雷",
    roleZh: "雷法",
    roleEn: "Thunder",
    atkBase: 12,
    atkPerLevel: 3.2,
    hpBase: 58,
    hpPerLevel: 11,
    defBase: 5,
    defPerLevel: 1.2,
  },
  {
    id: "龙",
    tier: 7,
    quality: Q.epic,
    summonLevel: 85,
    summonGold: 480,
    nameZh: "苍龙战骑",
    nameEn: "Azure Dragon",
    glyph: "龙",
    roleZh: "龙息",
    roleEn: "Dragon",
    atkBase: 13,
    atkPerLevel: 3.4,
    hpBase: 65,
    hpPerLevel: 12,
    defBase: 6,
    defPerLevel: 1.4,
  },
  {
    id: "凤",
    tier: 7,
    quality: Q.legendary,
    summonLevel: 90,
    summonGold: 520,
    nameZh: "涅槃火凤",
    nameEn: "Phoenix Flame",
    glyph: "凤",
    roleZh: "涅槃",
    roleEn: "Phoenix",
    atkBase: 12,
    atkPerLevel: 3.3,
    hpBase: 60,
    hpPerLevel: 12,
    defBase: 5,
    defPerLevel: 1.3,
  },
  {
    id: "影",
    tier: 8,
    quality: Q.legendary,
    summonLevel: 95,
    summonGold: 560,
    nameZh: "无影魔君",
    nameEn: "Void Lord",
    glyph: "影",
    roleZh: "暗影",
    roleEn: "Shadow",
    atkBase: 14,
    atkPerLevel: 3.5,
    hpBase: 52,
    hpPerLevel: 10,
    defBase: 5,
    defPerLevel: 1.2,
  },
  {
    id: "王",
    tier: 8,
    quality: Q.legendary,
    summonLevel: 100,
    summonGold: 600,
    nameZh: "王者战魂",
    nameEn: "King Soul",
    glyph: "王",
    roleZh: "终极",
    roleEn: "Ultimate",
    atkBase: 15,
    atkPerLevel: 3.6,
    hpBase: 72,
    hpPerLevel: 13,
    defBase: 7,
    defPerLevel: 1.5,
  },
];

export const PET_SUMMON_ORDER: PetId[] = PET_CATALOG.map((p) => p.id);

export const MAX_BATTLE_SLOTS = 4;
export const MAX_CULTIVATE_LEVEL = 20;
export const MAX_NEIDAN_LEVEL = 10;

export const QUALITY_MULT: Record<PetQuality, number> = {
  common: 1,
  uncommon: 1.08,
  rare: 1.16,
  epic: 1.28,
  legendary: 1.42,
};

export function getPetDef(id: PetId): PetDef | undefined {
  return PET_CATALOG.find((p) => p.id === id);
}

export function petName(def: PetDef, locale: string): string {
  return locale === "zh" ? def.nameZh : def.nameEn;
}

export function petRole(def: PetDef, locale: string): string {
  return locale === "zh" ? def.roleZh : def.roleEn;
}

export function petQualityLabel(q: PetQuality, locale: string): string {
  if (locale === "zh") {
    return (
      {
        common: "普通",
        uncommon: "优秀",
        rare: "稀有",
        epic: "史诗",
        legendary: "传说",
      } as const
    )[q];
  }
  return q;
}

export function petSummonGold(id: PetId): number {
  return getPetDef(id)?.summonGold ?? 0;
}

export function petSummonLevel(id: PetId): number {
  return getPetDef(id)?.summonLevel ?? 99;
}

export function isAutoSummonPet(id: PetId): boolean {
  return petSummonGold(id) === 0;
}

/** 伙伴独立等级升一级的金币（等级越高越贵） */
export function petLevelUpGold(petLevel: number): number {
  return 8 + petLevel * 5;
}

/** 修炼一级金币 */
export function petCultivateGold(cultivateLevel: number): number {
  return 15 + cultivateLevel * 12;
}

/** 内丹升一级金币 */
export function petNeidanGold(slotLevel: number): number {
  return 20 + slotLevel * 18;
}

export function petAtkFromDef(def: PetDef, level: number): number {
  const q = QUALITY_MULT[def.quality];
  return Math.floor((def.atkBase + level * def.atkPerLevel) * q);
}

export function petHpFromDef(def: PetDef, level: number): number {
  const q = QUALITY_MULT[def.quality];
  return Math.floor((def.hpBase + level * def.hpPerLevel) * q);
}

export function petDefFromDef(def: PetDef, level: number): number {
  const q = QUALITY_MULT[def.quality];
  return Math.floor((def.defBase + level * def.defPerLevel) * q);
}

/** 修炼加成（每级） */
export const CULTIVATE_BONUS = {
  atk: 1.5,
  hp: 6,
  def: 0.8,
};

/** 内丹每级加成 */
export const NEIDAN_BONUS: Record<NeidanSlot, number> = {
  atk: 2,
  def: 1.2,
  hp: 8,
  mag: 1.5,
  crit: 0.5,
  hit: 0.4,
};

export type PetCombatStats = {
  atk: number;
  hp: number;
  def: number;
  mag: number;
  crit: number;
  hit: number;
};

export function calcPetCombatStats(
  def: PetDef,
  petLevel: number,
  cultivate: number,
  neidan: Partial<Record<NeidanSlot, number>>,
): PetCombatStats {
  let atk = petAtkFromDef(def, petLevel);
  let hp = petHpFromDef(def, petLevel);
  let defStat = petDefFromDef(def, petLevel);
  let mag = Math.floor(atk * 0.4);
  let crit = 2 + petLevel * 0.15;
  let hit = 5 + petLevel * 0.1;

  const c = Math.max(0, Math.min(MAX_CULTIVATE_LEVEL, cultivate));
  atk += Math.floor(c * CULTIVATE_BONUS.atk);
  hp += Math.floor(c * CULTIVATE_BONUS.hp);
  defStat += Math.floor(c * CULTIVATE_BONUS.def);

  for (const slot of NEIDAN_SLOTS) {
    const lv = Math.max(0, Math.min(MAX_NEIDAN_LEVEL, neidan[slot] ?? 0));
    if (lv <= 0) continue;
    const b = NEIDAN_BONUS[slot] * lv;
    if (slot === "atk") atk += Math.floor(b);
    else if (slot === "def") defStat += Math.floor(b);
    else if (slot === "hp") hp += Math.floor(b);
    else if (slot === "mag") mag += Math.floor(b);
    else if (slot === "crit") crit += b;
    else if (slot === "hit") hit += b;
  }

  return {
    atk: Math.max(1, atk),
    hp: Math.max(1, hp),
    def: Math.max(0, defStat),
    mag: Math.max(0, mag),
    crit: Math.round(crit * 10) / 10,
    hit: Math.round(hit * 10) / 10,
  };
}

export function emptyNeidan(): Record<NeidanSlot, number> {
  return { atk: 0, def: 0, hp: 0, mag: 0, crit: 0, hit: 0 };
}

export function defaultBattleParty(): (PetId | null)[] {
  return [null, null, null, null];
}

export function petSummonRoadmap(heroLevel: number, locale: string) {
  return PET_CATALOG.map((p) => ({
    ...p,
    name: petName(p, locale),
    role: petRole(p, locale),
    qualityLabel: petQualityLabel(p.quality, locale),
    canSummon: heroLevel >= p.summonLevel,
    needsGold: p.summonGold > 0,
  }));
}

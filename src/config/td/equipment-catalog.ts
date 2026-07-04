import type { EquipSlot } from "@/config/td/rpg";

export type EquipRarity = "普通" | "高级" | "稀有" | "传说" | "特制";

/** 品级从低到高（扫图回收勾选等 UI 用） */
export const EQUIP_RARITIES: EquipRarity[] = ["普通", "高级", "稀有", "传说", "特制"];

export type EquipItemDef = {
  id: string;
  slot: EquipSlot;
  level: number;
  rarity: EquipRarity;
  nameZh: string;
  nameEn: string;
  dropZones?: number[];
  dropRate?: number;
};

const RARITY_MULT: Record<EquipRarity, number> = {
  普通: 1,
  高级: 1.38,
  稀有: 1.82,
  传说: 2.45,
  特制: 3.1,
};

export const RARITY_TEXT_CLASS: Record<EquipRarity, string> = {
  普通: "text-white/70",
  高级: "text-sky-300",
  稀有: "text-emerald-400",
  传说: "text-amber-400",
  特制: "text-fuchsia-400",
};

export const EQUIPMENT_CATALOG: EquipItemDef[] = [
  // —— 初始 ——
  { id: "w_stick", slot: "weapon", level: 1, rarity: "普通", nameZh: "木棒", nameEn: "Wooden Stick" },
  { id: "h_cloth_cap", slot: "hat", level: 1, rarity: "普通", nameZh: "布帽", nameEn: "Cloth Cap" },
  { id: "c_ragged", slot: "clothes", level: 1, rarity: "普通", nameZh: "破布衫", nameEn: "Ragged Shirt" },
  { id: "p_shorts", slot: "pants", level: 1, rarity: "普通", nameZh: "短裤", nameEn: "Shorts" },
  { id: "r_copper", slot: "ring", level: 1, rarity: "普通", nameZh: "铜戒指", nameEn: "Copper Ring" },
  { id: "b_rope", slot: "bracelet", level: 1, rarity: "普通", nameZh: "草编手环", nameEn: "Woven Band" },

  // —— 新手村 / 皮勒夫 1–5 ——
  { id: "w_hunter_knife", slot: "weapon", level: 2, rarity: "普通", nameZh: "猎户短刀", nameEn: "Hunter Knife", dropZones: [1, 2], dropRate: 28 },
  { id: "c_hunter_vest", slot: "clothes", level: 2, rarity: "普通", nameZh: "猎户皮甲", nameEn: "Hunter Vest", dropZones: [1, 2], dropRate: 25 },
  { id: "p_hunter_pants", slot: "pants", level: 2, rarity: "普通", nameZh: "猎户皮裤", nameEn: "Hunter Pants", dropZones: [1, 2], dropRate: 25 },
  { id: "h_hunter_hood", slot: "hat", level: 3, rarity: "普通", nameZh: "猎户头巾", nameEn: "Hunter Hood", dropZones: [1, 2, 3], dropRate: 22 },
  { id: "w_pilef_dagger", slot: "weapon", level: 3, rarity: "普通", nameZh: "皮勒夫短刀", nameEn: "Pilef Dagger", dropZones: [1, 2, 3], dropRate: 18 },
  { id: "r_pilef", slot: "ring", level: 4, rarity: "稀有", nameZh: "皮勒夫戒", nameEn: "Pilef Ring", dropZones: [2, 3, 4, 5], dropRate: 12 },
  { id: "c_pilef_robe", slot: "clothes", level: 5, rarity: "稀有", nameZh: "皮勒夫战袍", nameEn: "Pilef Robe", dropZones: [3, 4, 5], dropRate: 10 },
  { id: "h_pilef_cap", slot: "hat", level: 5, rarity: "高级", nameZh: "皮勒夫帽", nameEn: "Pilef Cap", dropZones: [3, 4, 5], dropRate: 14 },
  { id: "w_pilef_staff", slot: "weapon", level: 8, rarity: "稀有", nameZh: "皮勒夫法杖", nameEn: "Pilef Staff", dropZones: [4, 5], dropRate: 12 },
  { id: "b_pilef_gem", slot: "bracelet", level: 6, rarity: "高级", nameZh: "皮勒夫宝石镯", nameEn: "Pilef Gem Band", dropZones: [3, 4, 5], dropRate: 14 },

  // —— 赤纹武装团 6–15 ——
  { id: "w_scarlet_bayonet", slot: "weapon", level: 10, rarity: "普通", nameZh: "赤纹刺刀", nameEn: "Scarlet Bayonet", dropZones: [6, 7, 8], dropRate: 8 },
  { id: "c_scarlet_uniform", slot: "clothes", level: 12, rarity: "普通", nameZh: "赤纹制服", nameEn: "Scarlet Uniform", dropZones: [6, 7, 8, 9], dropRate: 8 },
  { id: "r_scarlet_badge", slot: "ring", level: 12, rarity: "高级", nameZh: "赤纹徽章戒", nameEn: "Scarlet Badge Ring", dropZones: [7, 8, 9], dropRate: 4 },
  { id: "h_scarlet_helmet", slot: "hat", level: 14, rarity: "高级", nameZh: "赤纹钢盔", nameEn: "Scarlet Helmet", dropZones: [8, 9, 10], dropRate: 4 },
  { id: "w_scarlet_pistol", slot: "weapon", level: 15, rarity: "稀有", nameZh: "赤纹手枪", nameEn: "Scarlet Pistol", dropZones: [9, 10], dropRate: 3 },
  { id: "p_scarlet_pants", slot: "pants", level: 15, rarity: "普通", nameZh: "赤纹军裤", nameEn: "Scarlet Pants", dropZones: [6, 7, 8, 9, 10], dropRate: 8 },
  { id: "w_assassin_blade", slot: "weapon", level: 22, rarity: "稀有", nameZh: "杀手短刃", nameEn: "Assassin Blade", dropZones: [10], dropRate: 4 },
  { id: "c_arena8_cape", slot: "clothes", level: 28, rarity: "稀有", nameZh: "八号械斗官披风", nameEn: "No.8 Arena Cape", dropZones: [11], dropRate: 3 },
  { id: "w_blue_rifle", slot: "weapon", level: 32, rarity: "稀有", nameZh: "蓝将军步枪", nameEn: "Blue General Rifle", dropZones: [12], dropRate: 3 },
  { id: "b_silver_gauntlet", slot: "bracelet", level: 38, rarity: "稀有", nameZh: "银大佐铁腕", nameEn: "Silver Gauntlet", dropZones: [13], dropRate: 3 },
  { id: "h_violet_beret", slot: "hat", level: 42, rarity: "稀有", nameZh: "紫罗兰贝雷帽", nameEn: "Violet Beret", dropZones: [14], dropRate: 3 },
  { id: "w_marshal_saber", slot: "weapon", level: 48, rarity: "传说", nameZh: "黑元帅军刀", nameEn: "Black Marshal Saber", dropZones: [15], dropRate: 1 },

  // —— 武道会 16–19 ——
  { id: "c_gi", slot: "clothes", level: 52, rarity: "普通", nameZh: "武道服", nameEn: "Martial Gi", dropZones: [16, 17], dropRate: 8 },
  { id: "b_tournament_wrap", slot: "bracelet", level: 54, rarity: "高级", nameZh: "武道会护腕", nameEn: "Tournament Wrap", dropZones: [16, 17, 18], dropRate: 4 },
  { id: "w_crane_style", slot: "weapon", level: 58, rarity: "稀有", nameZh: "云鹤爪套", nameEn: "Cloud Crane Claws", dropZones: [18, 19], dropRate: 3 },
  { id: "r_tournament_champ", slot: "ring", level: 60, rarity: "传说", nameZh: "冠军戒指", nameEn: "Champion Ring", dropZones: [19], dropRate: 1 },

  // —— 魔王城 20 ——
  { id: "c_demon_cloak", slot: "clothes", level: 62, rarity: "传说", nameZh: "魔王披风", nameEn: "Demon Cloak", dropZones: [20], dropRate: 2 },
  { id: "h_demon_horn", slot: "hat", level: 62, rarity: "稀有", nameZh: "魔族头角", nameEn: "Demon Horn", dropZones: [20], dropRate: 3 },
  { id: "w_demon_fang", slot: "weapon", level: 65, rarity: "传说", nameZh: "魔王之牙", nameEn: "Demon Fang", dropZones: [20], dropRate: 1.5 },
  { id: "p_demon_legs", slot: "pants", level: 60, rarity: "稀有", nameZh: "魔族护腿", nameEn: "Demon Greaves", dropZones: [20], dropRate: 3 },

  // —— 高阶套装（沃玛→战神，对应区域掉落） ——
  { id: "w_woma_pole", slot: "weapon", level: 20, rarity: "稀有", nameZh: "沃玛棍", nameEn: "Woma Pole", dropZones: [5, 9], dropRate: 2 },
  { id: "w_leiting_staff", slot: "weapon", level: 35, rarity: "传说", nameZh: "雷霆法杖", nameEn: "Thunder Staff", dropZones: [12, 15], dropRate: 0.8 },
  { id: "w_zhanshen_pole", slot: "weapon", level: 50, rarity: "特制", nameZh: "战神长棍", nameEn: "Warlord Pole", dropZones: [20], dropRate: 0.3 },
  { id: "c_chiyue_robe", slot: "clothes", level: 25, rarity: "传说", nameZh: "赤月道袍", nameEn: "Scarlet Moon Robe", dropZones: [10, 11], dropRate: 0.5 },
  { id: "r_tongxuan_ring", slot: "ring", level: 30, rarity: "特制", nameZh: "通玄宝戒", nameEn: "Mystic Ring", dropZones: [15], dropRate: 0.1 },
];

/** 旧存档装备 id → 新 id */
export const LEGACY_EQUIP_ID_MAP: Record<string, string> = {
  w_pilaf_dagger: "w_pilef_dagger",
  r_pilaf: "r_pilef",
  c_pilaf_robe: "c_pilef_robe",
  h_pilaf_cap: "h_pilef_cap",
  w_pilaf_staff: "w_pilef_staff",
  b_pilaf_gem: "b_pilef_gem",
  w_rr_bayonet: "w_scarlet_bayonet",
  c_rr_uniform: "c_scarlet_uniform",
  r_rr_badge: "r_scarlet_badge",
  h_rr_helmet: "h_scarlet_helmet",
  w_rr_pistol: "w_scarlet_pistol",
  p_rr_pants: "p_scarlet_pants",
  c_tao_cape: "c_arena8_cape",
  w_power_pole: "w_woma_pole",
  w_nimbus_staff: "w_leiting_staff",
  w_jingu_bang: "w_zhanshen_pole",
  c_turtle_hermit: "c_chiyue_robe",
  r_dragon_ball: "r_tongxuan_ring",
};

export const STARTER_EQUIP_IDS: Record<EquipSlot, string> = {
  weapon: "w_stick",
  hat: "h_cloth_cap",
  clothes: "c_ragged",
  pants: "p_shorts",
  ring: "r_copper",
  bracelet: "b_rope",
};

const catalogMap = new Map(EQUIPMENT_CATALOG.map((i) => [i.id, i]));

export function resolveEquipItemId(id: string): string {
  return LEGACY_EQUIP_ID_MAP[id] ?? id;
}

export function getEquipItem(id: string): EquipItemDef | undefined {
  return catalogMap.get(resolveEquipItemId(id));
}

export function equipItemName(item: EquipItemDef, locale: string): string {
  return locale === "zh" ? item.nameZh : item.nameEn;
}

/** 背包/格子短名：过长时用「首字..尾字」避免截断中间 */
export function equipNameGrid(name: string, maxChars = 5): string {
  if (name.length <= maxChars) return name;
  const tailLen = Math.min(2, name.length - 1);
  return `${name.slice(0, 1)}..${name.slice(-tailLen)}`;
}

export function itemStats(item: EquipItemDef): {
  str: number;
  agi: number;
  mag: number;
  atk: number;
  def: number;
  dodge: number;
  hp: number;
  mp: number;
  magDmg: number;
} {
  const t = item.level;
  const m = RARITY_MULT[item.rarity];
  const empty = {
    str: 0,
    agi: 0,
    mag: 0,
    atk: 0,
    def: 0,
    dodge: 0,
    hp: 0,
    mp: 0,
    magDmg: 0,
  };
  switch (item.slot) {
    case "weapon":
      return {
        ...empty,
        atk: Math.floor((2 + t * 3) * m),
        str: Math.floor((1 + t * 0.4) * m),
        magDmg: Math.floor((1 + t * 0.5) * m),
      };
    case "hat":
      return {
        ...empty,
        def: Math.floor((1 + t * 2) * m),
        hp: Math.floor((6 + t * 7) * m),
        agi: Math.floor((1 + t * 0.3) * m),
      };
    case "clothes":
      return {
        ...empty,
        def: Math.floor((2 + t * 3) * m),
        hp: Math.floor((10 + t * 9) * m),
        str: Math.floor((1 + t * 0.25) * m),
      };
    case "pants":
      return {
        ...empty,
        def: Math.floor((1 + t * 2) * m),
        hp: Math.floor((4 + t * 5) * m),
        dodge: Math.round((1 + t * 0.5) * m * 10) / 10,
      };
    case "ring":
      return {
        ...empty,
        mag: Math.floor((1 + t * 0.5) * m),
        mp: Math.floor((3 + t * 2) * m),
        magDmg: Math.floor((1 + t * 0.8) * m),
      };
    case "bracelet":
      return {
        ...empty,
        agi: Math.floor((1 + t * 0.4) * m),
        dodge: Math.round((2 + t * 0.8) * m * 10) / 10,
        atk: Math.floor((1 + t * 1) * m),
      };
    default:
      return empty;
  }
}

export function lootPoolForZone(zoneId: number, heroLevel: number): EquipItemDef[] {
  const cap = Math.min(100, heroLevel + 5);
  return EQUIPMENT_CATALOG.filter(
    (item) =>
      item.dropZones?.includes(zoneId) &&
      item.level <= cap &&
      item.dropRate != null &&
      item.id !== STARTER_EQUIP_IDS[item.slot],
  );
}

export function rollZoneLoot(
  zoneId: number,
  heroLevel: number,
  opts?: { sweep?: boolean; guaranteed?: boolean },
): EquipItemDef | null {
  const pool = lootPoolForZone(zoneId, heroLevel);
  if (pool.length === 0) {
    if (zoneId > 1) return rollZoneLoot(zoneId - 1, heroLevel, opts);
    return null;
  }
  const earlyBoost = zoneId <= 3 ? 1.6 : 1;
  const sweepBoost = opts?.sweep ? 2.2 : 1;
  const guaranteed = opts?.guaranteed ?? false;

  if (guaranteed) {
    const sorted = [...pool].sort((a, b) => b.level - a.level);
    return sorted[0] ?? null;
  }

  for (const item of pool) {
    const rate = (item.dropRate ?? 0) * earlyBoost * sweepBoost;
    if (Math.random() * 100 < Math.min(95, rate)) return item;
  }
  // 保底：约 35% 再给一件
  if (Math.random() < (opts?.sweep ? 0.55 : 0.35)) {
    const sorted = [...pool].sort((a, b) => b.level - a.level);
    return sorted[Math.floor(Math.random() * sorted.length)] ?? null;
  }
  return null;
}

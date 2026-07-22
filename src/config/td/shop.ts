export type ShopItemKind = "passive" | "active" | "gear" | "material";

export interface ShopItemDef {
  id: string;
  nameZh: string;
  nameEn: string;
  kind: ShopItemKind;
  price: number;
  descriptionZh: string;
  descriptionEn: string;
  /** 装备类：对应 equipment-catalog id */
  gearId?: string;
  /** 材料类：存入 HeroSave.materials */
  materialId?: string;
  materialQty?: number;
}

/** 兼容旧字段读取 */
export type ShopItemView = ShopItemDef & { name: string; description: string };

export function shopItemLocalized(item: ShopItemDef, locale: string): ShopItemView {
  const zh = locale === "zh";
  return {
    ...item,
    name: zh ? item.nameZh : item.nameEn,
    description: zh ? item.descriptionZh : item.descriptionEn,
  };
}

/**
 * 商店：贴合「推图 + 宠物养成」
 * 旧 id（notice/hot…）仍可在服务端校验；战斗里也会兼容旧 buff
 */
export const SHOP_ITEMS: ShopItemDef[] = [
  // —— 24h 被动增益（战斗生效） ——
  {
    id: "pack",
    nameZh: "战前鼓舞",
    nameEn: "War Drum",
    kind: "passive",
    price: 45,
    descriptionZh: "主角攻/血 +12，宠物攻 +8（24h）",
    descriptionEn: "Hero ATK/HP +12, pet ATK +8 (24h)",
  },
  {
    id: "shield",
    nameZh: "护体符",
    nameEn: "Ward Charm",
    kind: "passive",
    price: 50,
    descriptionZh: "每场战斗首次致命伤害抵挡一次（24h）",
    descriptionEn: "Block first lethal hit each fight (24h)",
  },
  {
    id: "fury",
    nameZh: "暴击丹",
    nameEn: "Crit Pill",
    kind: "passive",
    price: 55,
    descriptionZh: "主角与宠物暴击率 +12%（24h）",
    descriptionEn: "Hero & pet crit +12% (24h)",
  },
  {
    id: "bond",
    nameZh: "羁绊香",
    nameEn: "Bond Incense",
    kind: "passive",
    price: 60,
    descriptionZh: "上阵宠物伤害 ×1.25（24h）",
    descriptionEn: "Deployed pets deal ×1.25 damage (24h)",
  },
  {
    id: "fortune",
    nameZh: "寻宝符",
    nameEn: "Loot Charm",
    kind: "passive",
    price: 70,
    descriptionZh: "普通关掉装概率大幅提高（24h）",
    descriptionEn: "Much higher normal-scene loot chance (24h)",
  },
  {
    id: "insight",
    nameZh: "悟道符",
    nameEn: "Insight Charm",
    kind: "passive",
    price: 65,
    descriptionZh: "战斗经验 +30%（24h）",
    descriptionEn: "Battle EXP +30% (24h)",
  },
  // —— 主动（24h 内可触发，战斗内自动生效） ——
  {
    id: "nerf",
    nameZh: "弱化咒",
    nameEn: "Weaken Hex",
    kind: "active",
    price: 35,
    descriptionZh: "本场敌人气血 -20%（持有即生效）",
    descriptionEn: "Enemy HP −20% this fight while active",
  },
  {
    id: "freeze",
    nameZh: "定身符",
    nameEn: "Stun Talisman",
    kind: "active",
    price: 40,
    descriptionZh: "每场第 1 回合敌人不攻击（持有即生效）",
    descriptionEn: "Enemies skip round 1 each fight",
  },
  {
    id: "heal",
    nameZh: "急救丹",
    nameEn: "Emergency Pill",
    kind: "active",
    price: 30,
    descriptionZh: "主角血量低于 35% 时回 40% 最大气血一次/场",
    descriptionEn: "Once/fight: heal 40% max HP when hero <35%",
  },
  // —— 装备（金币直购） ——
  {
    id: "shop_w_hunter",
    nameZh: "猎户短刀",
    nameEn: "Hunter Knife",
    kind: "gear",
    price: 55,
    gearId: "w_hunter_knife",
    descriptionZh: "Lv.2 武器 · 新手区同款",
    descriptionEn: "Lv.2 weapon · early-zone drop",
  },
  {
    id: "shop_c_hunter",
    nameZh: "猎户皮甲",
    nameEn: "Hunter Vest",
    kind: "gear",
    price: 50,
    gearId: "c_hunter_vest",
    descriptionZh: "Lv.2 衣服 · 提升防御与气血",
    descriptionEn: "Lv.2 armor · DEF & HP",
  },
  {
    id: "shop_r_pilef",
    nameZh: "皮勒夫戒",
    nameEn: "Pilef Ring",
    kind: "gear",
    price: 120,
    gearId: "r_pilef",
    descriptionZh: "Lv.4 稀有戒指",
    descriptionEn: "Lv.4 rare ring",
  },
  {
    id: "shop_w_scarlet",
    nameZh: "赤纹刺刀",
    nameEn: "Scarlet Bayonet",
    kind: "gear",
    price: 220,
    gearId: "w_scarlet_bayonet",
    descriptionZh: "Lv.10 武器 · 赤纹区常用",
    descriptionEn: "Lv.10 weapon · Scarlet zone",
  },
  {
    id: "shop_c_scarlet",
    nameZh: "赤纹制服",
    nameEn: "Scarlet Uniform",
    kind: "gear",
    price: 200,
    gearId: "c_scarlet_uniform",
    descriptionZh: "Lv.12 衣服 · 中期防具",
    descriptionEn: "Lv.12 armor · mid-game",
  },
  {
    id: "shop_r_scarlet",
    nameZh: "赤纹徽章戒",
    nameEn: "Scarlet Badge Ring",
    kind: "gear",
    price: 280,
    gearId: "r_scarlet_badge",
    descriptionZh: "Lv.12 高级戒指",
    descriptionEn: "Lv.12 high-grade ring",
  },
  // —— 材料（宠物养成 / 强化预留） ——
  {
    id: "shop_mat_biscuit",
    nameZh: "宠物口粮",
    nameEn: "Pet Biscuit",
    kind: "material",
    price: 40,
    materialId: "pet_biscuit",
    materialQty: 1,
    descriptionZh: "修炼材料 · 在宠物栏消耗可 +1 修炼（后续开放一键使用）",
    descriptionEn: "Cultivate mat · +1 cultivate (one-tap use coming)",
  },
  {
    id: "shop_mat_neidan",
    nameZh: "内丹碎屑",
    nameEn: "Neidan Dust",
    kind: "material",
    price: 55,
    materialId: "neidan_dust",
    materialQty: 1,
    descriptionZh: "内丹材料 · 用于后续内丹升级折扣",
    descriptionEn: "Neidan mat · future upgrade discount",
  },
  {
    id: "shop_mat_stone",
    nameZh: "强化石",
    nameEn: "Enhance Stone",
    kind: "material",
    price: 35,
    materialId: "enhance_stone",
    materialQty: 1,
    descriptionZh: "装备强化材料（材料栏储存）",
    descriptionEn: "Gear enhance material (stored)",
  },
  {
    id: "shop_mat_scroll",
    nameZh: "洗练符",
    nameEn: "Refine Scroll",
    kind: "material",
    price: 80,
    materialId: "refine_scroll",
    materialQty: 1,
    descriptionZh: "重铸装备属性（材料栏储存）",
    descriptionEn: "Reroll gear stats (stored)",
  },
];

export const BUFF_DURATION_MS = 24 * 60 * 60 * 1000;

export function shopItem(id: string): ShopItemDef | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

export const SHOP_BUFF_ITEMS = SHOP_ITEMS.filter(
  (i) => i.kind === "passive" || i.kind === "active",
);
export const SHOP_GEAR_ITEMS = SHOP_ITEMS.filter((i) => i.kind === "gear");
export const SHOP_MATERIAL_ITEMS = SHOP_ITEMS.filter((i) => i.kind === "material");

/** 服务端校验用价目（含旧 id 兼容） */
export const SHOP_SERVER_PRICES: Record<string, { price: number; kind: "passive" | "active" }> =
  Object.fromEntries([
    ...SHOP_BUFF_ITEMS.map((i) => [i.id, { price: i.price, kind: i.kind as "passive" | "active" }]),
    // 旧商品：仍可结算，避免已购玩家报错
    ["notice", { price: 25, kind: "passive" as const }],
    ["hot", { price: 40, kind: "passive" as const }],
    ["promo", { price: 50, kind: "passive" as const }],
    ["fan", { price: 35, kind: "passive" as const }],
    ["buy_hype", { price: 15, kind: "active" as const }],
  ]);

const LEGACY_BUFF_LABELS: Record<string, { zh: string; en: string }> = {
  notice: { zh: "通告费(旧)", en: "Notice (legacy)" },
  hot: { zh: "热搜(旧)", en: "Trending (legacy)" },
  promo: { zh: "升职令(旧)", en: "Promo (legacy)" },
  fan: { zh: "死忠粉(旧)", en: "Fan (legacy)" },
  buy_hype: { zh: "买热度(旧)", en: "Hype (legacy)" },
};

export function shopBuffLabel(id: string, locale: string): string {
  const item = shopItem(id);
  if (item) return shopItemLocalized(item, locale).name;
  const legacy = LEGACY_BUFF_LABELS[id];
  if (legacy) return locale === "zh" ? legacy.zh : legacy.en;
  return id;
}

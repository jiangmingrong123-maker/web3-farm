export type ShopItemKind = "passive" | "active" | "gear" | "material";

export interface ShopItemDef {
  id: string;
  name: string;
  kind: ShopItemKind;
  price: number;
  description: string;
  /** 装备类：对应 equipment-catalog id */
  gearId?: string;
  /** 材料类：存入 HeroSave.materials */
  materialId?: string;
  materialQty?: number;
}

export const SHOP_ITEMS: ShopItemDef[] = [
  { id: "notice", name: "通告费", kind: "passive", price: 25, description: "开采格产出 ×2（24h）" },
  { id: "hot", name: "热搜体质", kind: "passive", price: 40, description: "明星出现率 ×2（24h）" },
  { id: "promo", name: "升职令", kind: "passive", price: 50, description: "新单位 5% 直接 Lv2（24h）" },
  { id: "fan", name: "死忠粉", kind: "passive", price: 35, description: "粉范围 +1 格（24h）" },
  { id: "shield", name: "烂片免疫", kind: "passive", price: 45, description: "每 Stage 1 次免漏怪扣心（24h）" },
  { id: "pack", name: "包场", kind: "passive", price: 60, description: "开局人气 +5（24h）" },
  { id: "buy_hype", name: "买热搜", kind: "active", price: 15, description: "本局 +15 人气（24h 内 1 次）" },
  { id: "freeze", name: "封镜头", kind: "active", price: 25, description: "全场定身 3 秒（24h 内 1 次）" },
  { id: "nerf", name: "加场", kind: "active", price: 30, description: "本波敌人 -20% 血（24h 内 1 次）" },
  // —— 装备（金币） ——
  {
    id: "shop_w_hunter",
    name: "猎户短刀",
    kind: "gear",
    price: 55,
    gearId: "w_hunter_knife",
    description: "Lv.2 武器 · 新手村掉落同款",
  },
  {
    id: "shop_c_hunter",
    name: "猎户皮甲",
    kind: "gear",
    price: 50,
    gearId: "c_hunter_vest",
    description: "Lv.2 衣服 · 提升防御与气血",
  },
  {
    id: "shop_r_pilef",
    name: "皮勒夫戒",
    kind: "gear",
    price: 120,
    gearId: "r_pilef",
    description: "Lv.4 稀有戒指",
  },
  // —— 特殊材料 ——
  {
    id: "shop_mat_stone",
    name: "强化石",
    kind: "material",
    price: 35,
    materialId: "enhance_stone",
    materialQty: 1,
    description: "用于后续装备强化（材料栏储存）",
  },
  {
    id: "shop_mat_scroll",
    name: "洗练符",
    kind: "material",
    price: 80,
    materialId: "refine_scroll",
    materialQty: 1,
    description: "用于重铸装备属性（材料栏储存）",
  },
];

export const BUFF_DURATION_MS = 24 * 60 * 60 * 1000;

export function shopItem(id: string): ShopItemDef | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

export const SHOP_BUFF_ITEMS = SHOP_ITEMS.filter((i) => i.kind === "passive" || i.kind === "active");
export const SHOP_GEAR_ITEMS = SHOP_ITEMS.filter((i) => i.kind === "gear");
export const SHOP_MATERIAL_ITEMS = SHOP_ITEMS.filter((i) => i.kind === "material");

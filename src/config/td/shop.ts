export type ShopItemKind = "passive" | "active";

export interface ShopItemDef {
  id: string;
  name: string;
  kind: ShopItemKind;
  price: number;
  description: string;
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
];

export const BUFF_DURATION_MS = 24 * 60 * 60 * 1000;

export function shopItem(id: string): ShopItemDef | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

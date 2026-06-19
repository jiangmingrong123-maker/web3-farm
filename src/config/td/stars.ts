import { NOBODY_COLLECTION } from "@/config/collections";

/** 五杰 · 2×1 明星塔（M1 先 1×1 + 头像，后续扩 2×1） */
export type StarId = "monk" | "water" | "may" | "celestial" | "cuckoo";

export interface StarDef {
  id: StarId;
  tokenId: string;
  name: string;
  title: string;
  cost: number;
  range: number;
  damage: number;
  fireMs: number;
  description: string;
}

export const STAR_DEFS: Record<StarId, StarDef> = {
  monk: {
    id: "monk",
    tokenId: "209",
    name: "Monk",
    title: "武僧",
    cost: 8,
    range: 2.4,
    damage: 3.5,
    fireMs: 950,
    description: "近身猛击 · 高伤",
  },
  water: {
    id: "water",
    tokenId: "7308",
    name: "Water",
    title: "水",
    cost: 8,
    range: 2.2,
    damage: 2,
    fireMs: 1000,
    description: "泼水减速 · 控场",
  },
  may: {
    id: "may",
    tokenId: "2718",
    name: "May",
    title: "阿 May",
    cost: 10,
    range: 2.5,
    damage: 3,
    fireMs: 800,
    description: "快剪连击",
  },
  celestial: {
    id: "celestial",
    tokenId: "1879",
    name: "Celestial",
    title: "天人",
    cost: 10,
    range: 2.8,
    damage: 2.8,
    fireMs: 900,
    description: "远程光环",
  },
  cuckoo: {
    id: "cuckoo",
    tokenId: "2369",
    name: "Cuckoo To",
    title: "布谷",
    cost: 9,
    range: 2.3,
    damage: 2.5,
    fireMs: 750,
    description: "节拍点射",
  },
};

export const STAR_IDS: StarId[] = ["monk", "water", "may", "celestial", "cuckoo"];

export const NOBODY_CONTRACT = NOBODY_COLLECTION.contractAddress;

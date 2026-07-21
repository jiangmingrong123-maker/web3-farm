/** 怪物区域 · 第一批 1–20（合规名称 · 来自设计表） */

import { mapExpMult } from "@/config/td/progression-feedback";

export type ZoneDef = {
  id: number;
  nameZh: string;
  nameEn: string;
  recommendLevel: number;
  mob1: string;
  mob2: string;
  boss: string;
  exp: number;
  gold: number;
  note?: string;
};

/** 设计表「单场经验」· SCENE_EXP_MULTIPLIER 可全局微调；前期地图另见 earlyMapExpMult */
export const SCENE_EXP_MULTIPLIER = 1.1;

export function sceneExpFromZone(
  zoneExp: number,
  mapId: number,
  scene: number,
  scenesPerMap: number,
): number {
  const base = Math.floor(5 + mapId * 1.05 + zoneExp / 100);
  const raw =
    scene >= scenesPerMap
      ? Math.max(7, Math.round(base * 1.32))
      : Math.max(4, base);
  return Math.max(
    1,
    Math.floor(raw * SCENE_EXP_MULTIPLIER * mapExpMult(mapId)),
  );
}

export const ZONES_BATCH1: ZoneDef[] = [
  {
    id: 1,
    nameZh: "新手村-森林",
    nameEn: "Starter Forest",
    recommendLevel: 1,
    mob1: "黑熊",
    mob2: "野狼",
    boss: "皮勒夫手下",
    exp: 10,
    gold: 5,
  },
  {
    id: 2,
    nameZh: "新手村-河边",
    nameEn: "Starter River",
    recommendLevel: 3,
    mob1: "大鱼",
    mob2: "螃蟹",
    boss: "皮勒夫手下",
    exp: 25,
    gold: 10,
  },
  {
    id: 3,
    nameZh: "新手村-山谷",
    nameEn: "Starter Valley",
    recommendLevel: 5,
    mob1: "野猪",
    mob2: "毒蛇",
    boss: "皮勒夫手下",
    exp: 50,
    gold: 20,
  },
  {
    id: 4,
    nameZh: "新手村-城堡外围",
    nameEn: "Castle Outskirts",
    recommendLevel: 8,
    mob1: "皮勒夫卫兵",
    mob2: "皮勒夫法师",
    boss: "皮勒夫大王",
    exp: 100,
    gold: 50,
  },
  {
    id: 5,
    nameZh: "新手村-皮勒夫城堡",
    nameEn: "Pilef Castle",
    recommendLevel: 10,
    mob1: "皮勒夫亲卫",
    mob2: "皮勒夫大祭司",
    boss: "皮勒夫",
    exp: 200,
    gold: 100,
    note: "BOSS关，通关后解锁赤纹武装团地图",
  },
  {
    id: 6,
    nameZh: "赤纹据点一层-军团前哨",
    nameEn: "Scarlet Outpost L1",
    recommendLevel: 12,
    mob1: "赤纹步卒",
    mob2: "红卫兵",
    boss: "红小队长",
    exp: 300,
    gold: 150,
  },
  {
    id: 7,
    nameZh: "赤纹据点二层-军团营地",
    nameEn: "Scarlet Camp L2",
    recommendLevel: 15,
    mob1: "红列兵",
    mob2: "红射手",
    boss: "红中队长",
    exp: 500,
    gold: 250,
  },
  {
    id: 8,
    nameZh: "赤纹据点三层-军火库",
    nameEn: "Scarlet Arsenal L3",
    recommendLevel: 18,
    mob1: "红工兵",
    mob2: "红爆破手",
    boss: "红大队长",
    exp: 800,
    gold: 400,
  },
  {
    id: 9,
    nameZh: "赤纹据点四层-训练基地",
    nameEn: "Scarlet Training L4",
    recommendLevel: 20,
    mob1: "红格斗兵",
    mob2: "红超能力兵",
    boss: "赤纹统领",
    exp: 1200,
    gold: 600,
  },
  {
    id: 10,
    nameZh: "赤纹据点五层-杀手据点",
    nameEn: "Assassin Stronghold L5",
    recommendLevel: 25,
    mob1: "杀手杂兵",
    mob2: "杀手刺客",
    boss: "杀手",
    exp: 2000,
    gold: 1000,
    note: "BOSS关，通关后解锁宠物系统",
  },
  {
    id: 11,
    nameZh: "赤纹据点六层-八号械斗官要塞",
    nameEn: "No.8 Arena Fort L6",
    recommendLevel: 30,
    mob1: "八号械斗官卫兵",
    mob2: "八号械斗官法师",
    boss: "八号械斗官",
    exp: 3000,
    gold: 1500,
  },
  {
    id: 12,
    nameZh: "赤纹据点七层-蓝将军基地",
    nameEn: "General Blue Base L7",
    recommendLevel: 35,
    mob1: "蓝将军卫兵",
    mob2: "蓝将军超能力兵",
    boss: "蓝将军",
    exp: 4500,
    gold: 2200,
  },
  {
    id: 13,
    nameZh: "赤纹据点八层-银大佐据点",
    nameEn: "Colonel Silver L8",
    recommendLevel: 40,
    mob1: "银大佐卫兵",
    mob2: "银大佐机械兵",
    boss: "银大佐",
    exp: 6000,
    gold: 3000,
  },
  {
    id: 14,
    nameZh: "赤纹据点九层-紫罗兰上校基地",
    nameEn: "Colonel Violet L9",
    recommendLevel: 45,
    mob1: "紫罗兰卫兵",
    mob2: "紫罗兰特工",
    boss: "紫罗兰上校",
    exp: 8000,
    gold: 4000,
  },
  {
    id: 15,
    nameZh: "赤纹据点十层-红缎带总部",
    nameEn: "Scarlet HQ L10",
    recommendLevel: 50,
    mob1: "红元帅亲卫",
    mob2: "红元帅机械卫队",
    boss: "黑元帅",
    exp: 12000,
    gold: 6000,
    note: "BOSS关，通关后解锁魔笛尊主篇章",
  },
  {
    id: 16,
    nameZh: "武道会场-预选赛",
    nameEn: "Tournament Prelims",
    recommendLevel: 52,
    mob1: "武道选手",
    mob2: "武道家",
    boss: "预选赛冠军",
    exp: 15000,
    gold: 7500,
  },
  {
    id: 17,
    nameZh: "武道会场-正赛",
    nameEn: "Tournament Main",
    recommendLevel: 55,
    mob1: "精英武道家",
    mob2: "格斗大师",
    boss: "正赛四强",
    exp: 20000,
    gold: 10000,
  },
  {
    id: 18,
    nameZh: "武道会场-半决赛",
    nameEn: "Tournament Semis",
    recommendLevel: 58,
    mob1: "武道宗师",
    mob2: "超能力武道家",
    boss: "半决赛冠军",
    exp: 25000,
    gold: 12500,
  },
  {
    id: 19,
    nameZh: "武道会场-总决赛",
    nameEn: "Tournament Finals",
    recommendLevel: 60,
    mob1: "武道大会冠军",
    mob2: "云鹤大师",
    boss: "三眼宗师",
    exp: 30000,
    gold: 15000,
    note: "BOSS关，通关后解锁魔王城地图",
  },
  {
    id: 20,
    nameZh: "魔王城-外围",
    nameEn: "Demon Citadel Outskirts",
    recommendLevel: 65,
    mob1: "魔族杂兵",
    mob2: "魔族战士",
    boss: "魔族队长",
    exp: 40000,
    gold: 20000,
    note: "最终BOSS",
  },
];

export const RUN_MAX_ZONE = ZONES_BATCH1.length;

/** 大关卡篇章（扫图 / 进度 UI 分组） */
export type MapChapter = {
  id: string;
  nameZh: string;
  nameEn: string;
  mapFrom: number;
  mapTo: number;
};

export const MAP_CHAPTERS: MapChapter[] = [
  { id: "starter", nameZh: "新手村", nameEn: "Starter Village", mapFrom: 1, mapTo: 5 },
  { id: "scarlet", nameZh: "赤纹武装团", nameEn: "Scarlet Legion", mapFrom: 6, mapTo: 15 },
  { id: "tournament", nameZh: "武道会场", nameEn: "Tournament", mapFrom: 16, mapTo: 19 },
  { id: "demon", nameZh: "魔王城", nameEn: "Demon Citadel", mapFrom: 20, mapTo: 20 },
];

export function mapChapterForMap(mapId: number): MapChapter | undefined {
  return MAP_CHAPTERS.find((c) => mapId >= c.mapFrom && mapId <= c.mapTo);
}

export function chapterName(ch: MapChapter, locale: string): string {
  return locale === "zh" ? ch.nameZh : ch.nameEn;
}

/** 地图短名（篇章内小关），如「新手村-森林」→「森林」 */
export function mapStageLabel(z: ZoneDef, locale: string): string {
  const name = zoneName(z, locale);
  const parts = name.split(/[-–—]/);
  return parts.length > 1 ? parts[parts.length - 1]!.trim() : name;
}

export function mapsInChapter(ch: MapChapter): number[] {
  const ids: number[] = [];
  for (let id = ch.mapFrom; id <= ch.mapTo; id++) ids.push(id);
  return ids;
}

/** 每张地图的场景战斗次数（第 5 场为 BOSS） */
export const SCENES_PER_MAP = 5;

export function getZone(id: number): ZoneDef | undefined {
  return ZONES_BATCH1.find((z) => z.id === id);
}

export function zoneName(z: ZoneDef, locale: string): string {
  return locale === "zh" ? z.nameZh : z.nameEn;
}

/** 主角等级 → 可挑战最高区域（仅作推荐，实际进度由地图推进决定） */
export function maxZoneForHeroLevel(level: number): number {
  let max = 1;
  for (const z of ZONES_BATCH1) {
    if (level >= z.recommendLevel - 2) max = z.id;
  }
  return Math.min(max, RUN_MAX_ZONE);
}

/** 大厅 · 当前地图与场景进度 */
export function hubWorldSummary(
  worldMap: number,
  worldScene: number,
  locale: string,
): { mapProgress: string; sceneProgress: string; name: string; bossNext: boolean } {
  const mapId = Math.min(Math.max(1, worldMap), RUN_MAX_ZONE);
  const scene = Math.min(Math.max(1, worldScene), SCENES_PER_MAP);
  const z = getZone(mapId);
  return {
    mapProgress: `${mapId}/${RUN_MAX_ZONE}`,
    sceneProgress: `${scene}/${SCENES_PER_MAP}`,
    name: z ? zoneName(z, locale) : `#${mapId}`,
    bossNext: scene >= SCENES_PER_MAP,
  };
}

/** 大厅顶部 · 当前可挑战区域摘要（兼容旧调用） */
export function hubZoneSummary(
  level: number,
  locale: string,
  worldMap = 1,
  worldScene = 1,
): { progress: string; name: string; sceneProgress: string; bossNext: boolean } {
  const w = hubWorldSummary(worldMap, worldScene, locale);
  return {
    progress: w.mapProgress,
    name: w.name,
    sceneProgress: w.sceneProgress,
    bossNext: w.bossNext,
  };
}

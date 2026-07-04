/** 杀怪任务 · 奖励经验与战斗/扫图叠加 */

export type QuestDef = {
  id: string;
  nameZh: string;
  nameEn: string;
  /** 目标怪物名（与 zones 中 mob/boss 一致） */
  monster: string;
  count: number;
  rewardExp: number;
  /** 达到该地图进度后显示 */
  minMap: number;
};

export const TD_QUESTS: QuestDef[] = [
  {
    id: "q_bear_5",
    nameZh: "森林清剿·黑熊",
    nameEn: "Clear black bears",
    monster: "黑熊",
    count: 5,
    rewardExp: 80,
    minMap: 1,
  },
  {
    id: "q_wolf_5",
    nameZh: "森林清剿·野狼",
    nameEn: "Clear wild wolves",
    monster: "野狼",
    count: 5,
    rewardExp: 80,
    minMap: 1,
  },
  {
    id: "q_fish_8",
    nameZh: "河边捕鱼",
    nameEn: "River fishing",
    monster: "大鱼",
    count: 8,
    rewardExp: 120,
    minMap: 2,
  },
  {
    id: "q_crab_8",
    nameZh: "河蟹横行",
    nameEn: "Crab hunt",
    monster: "螃蟹",
    count: 8,
    rewardExp: 120,
    minMap: 2,
  },
  {
    id: "q_pilef_minion_6",
    nameZh: "皮勒夫先锋",
    nameEn: "Pilef minions",
    monster: "皮勒夫手下",
    count: 6,
    rewardExp: 200,
    minMap: 3,
  },
  {
    id: "q_pilef_guard_10",
    nameZh: "城堡卫兵",
    nameEn: "Castle guards",
    monster: "皮勒夫卫兵",
    count: 10,
    rewardExp: 350,
    minMap: 4,
  },
  {
    id: "q_pilef_king_1",
    nameZh: "击败皮勒夫大王",
    nameEn: "Defeat Pilef King",
    monster: "皮勒夫大王",
    count: 1,
    rewardExp: 500,
    minMap: 4,
  },
  {
    id: "q_scarlet_12",
    nameZh: "赤纹清剿",
    nameEn: "Scarlet purge",
    monster: "赤纹步卒",
    count: 12,
    rewardExp: 600,
    minMap: 6,
  },
];

export function questLabel(q: QuestDef, locale: string): string {
  return locale === "zh" ? q.nameZh : q.nameEn;
}

export function visibleQuests(worldMap: number, claimed: string[]): QuestDef[] {
  return TD_QUESTS.filter((q) => q.minMap <= worldMap && !claimed.includes(q.id));
}

/**
 * 难度 / 成长协作填空表
 * 玩家用同一模板反馈；未填时按 DEFAULT_TUNING_PASS 做一小轮调参。
 */

export const PROGRESSION_FEEDBACK_TEMPLATE_ZH = `【卡关位置】地图 __ / 场景 __ ；角色大约 Lv.__ ；战力大约 __
【最难受的一点】（只圈一个）
  A 打不过 / 老挂
  B 能打过但太磨、升级慢
  C 不知道该强化什么（属性/装备/扫图）
  D 操作/按钮/签名等体验烦
  E 其他：____
【期望手感】（只圈一个）
  A 前期轻松能一路推，中后期再难
  B 全程有点挑战但不要卡死
  C 难没关系，但要有清楚变强路径
【今天只想先改】（最多选 2 个）
  1 怪血/伤害（战斗难度）
  2 经验/升级速度
  3 装备掉落/战力成长
  4 界面提示「下一步做什么」
  5 体力/积分消耗节奏
【补充一句】____________________`;

export const PROGRESSION_FEEDBACK_TEMPLATE_EN = `【Stuck】map __ / scene __ ; about Lv.__ ; power ~
【Worst】(pick one)
  A Can't win / keep dying
  B Can win but grind is slow
  C Don't know what to upgrade
  D UX / buttons / signing friction
  E Other: ____
【Feel】(pick one)
  A Easy early, harder later
  B Mild challenge, never soft-locked
  C Hard OK if path to power is clear
【Fix today】(max 2)
  1 Enemy HP/ATK
  2 EXP / leveling
  3 Loot / power growth
  4 UI next-step tips
  5 Stamina / points pacing
【Note】____________________`;

/** 填空选项 → 改哪些杠杆（给调参时对照） */
export const FEEDBACK_LEVERS = {
  1: ["src/lib/td/battle-encounter.ts", "src/config/td/battle-squads.ts"],
  2: ["src/config/td/zones.ts (SCENE_EXP_MULTIPLIER)", "src/config/td/hero-levels.ts"],
  3: ["src/config/td/equipment-catalog.ts", "src/lib/td/rpg-combat.ts loot"],
  4: ["src/components/td/TdHubMain.tsx", "src/messages/zh.json|en.json"],
  5: ["src/config/td/economy.ts", "functions/api/td"],
} as const;

/**
 * 未收到填空时的默认一小轮：期望 A（前期轻松）+ 先改 1+4
 * （打不过 / 不知道下一步）
 */
export const DEFAULT_TUNING_PASS = {
  expectation: "A" as const,
  pain: "A" as const,
  focus: [1, 4] as const,
  /** 前期宽松地图上限（含） */
  earlyMapMax: 5,
  /** 前期怪气血倍率 */
  earlyHpMult: 0.78,
  /** 前期怪攻击倍率 */
  earlyAtkMult: 0.82,
  /** 前期场景经验额外倍率（叠在 SCENE_EXP_MULTIPLIER 上） */
  earlyExpBonus: 1.22,
};

export function earlyMapCombatMult(mapId: number): { hp: number; atk: number } {
  if (mapId < 1 || mapId > DEFAULT_TUNING_PASS.earlyMapMax) {
    return { hp: 1, atk: 1 };
  }
  return {
    hp: DEFAULT_TUNING_PASS.earlyHpMult,
    atk: DEFAULT_TUNING_PASS.earlyAtkMult,
  };
}

export function earlyMapExpMult(mapId: number): number {
  if (mapId < 1 || mapId > DEFAULT_TUNING_PASS.earlyMapMax) return 1;
  return DEFAULT_TUNING_PASS.earlyExpBonus;
}

/** 地图 6–15 额外经验（填表反馈：中期太磨） */
export const MID_GAME_MAP_MAX = 15;
export const MID_GAME_EXP_BONUS = 1.38;

/** 地图 16+ 略增，避免后期又卡 */
export const LATE_GAME_EXP_BONUS = 1.18;

export function mapExpMult(mapId: number): number {
  let m = earlyMapExpMult(mapId);
  if (mapId >= 6 && mapId <= MID_GAME_MAP_MAX) m *= MID_GAME_EXP_BONUS;
  else if (mapId > MID_GAME_MAP_MAX) m *= LATE_GAME_EXP_BONUS;
  return m;
}

/** 普通关掉落概率（BOSS 仍必掉） */
export function normalSceneLootChance(mapId: number): number {
  if (mapId <= 5) return 0.22;
  if (mapId <= MID_GAME_MAP_MAX) return 0.2;
  return 0.12;
}

export type HubProgressTipKind =
  | "underleveled"
  | "allocateStats"
  | "checkEquip"
  | "unlockCompanion"
  | "upgradeCompanion"
  | "pushFight"
  | "trySweep"
  | "buyStamina";

/** 根据存档给出「下一步」提示种类（文案在 i18n） */
export function pickHubProgressTip(input: {
  heroLevel: number;
  recommendLevel: number | null;
  statPoints: number;
  inventoryCount: number;
  stamina: number;
  mapSweepUnlocked: boolean;
  clearedMaps: number;
  alliesInBattle: number;
  maxAllySlots: number;
  companionUpgradeable: boolean;
  companionUnlockable: boolean;
}): HubProgressTipKind {
  if (input.stamina <= 0) return "buyStamina";
  if (input.statPoints > 0) return "allocateStats";
  if (input.companionUnlockable) return "unlockCompanion";
  if (input.companionUpgradeable) return "upgradeCompanion";
  if (
    input.recommendLevel != null &&
    input.heroLevel + 2 < input.recommendLevel
  ) {
    return "underleveled";
  }
  if (input.inventoryCount >= 3) return "checkEquip";
  if (input.mapSweepUnlocked && input.clearedMaps >= 1) return "trySweep";
  return "pushFight";
}

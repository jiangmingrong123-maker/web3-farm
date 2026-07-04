import { advanceWorldProgress, syncHeroLevel, type HeroSave } from "@/config/td/rpg";
import {
  rollZoneLoot,
} from "@/config/td/equipment-catalog";
import { applyRunRewards } from "@/lib/td/rpg-storage";
import {
  BATTLE_TUNING,
  nextWorldScene,
} from "@/config/td/battle-squads";
import {
  getZone,
  RUN_MAX_ZONE,
  SCENES_PER_MAP,
  sceneExpFromZone,
  zoneName,
} from "@/config/td/zones";
import { buildBattleParty, partyPowerScore } from "@/lib/td/battle-party";
import {
  buildSceneEncounter,
  encounterTotalAtk,
  encounterTotalHp,
} from "@/lib/td/battle-encounter";

export type SkippedScene = {
  mapId: number;
  scene: number;
  exp: number;
};

export type FightMetrics = {
  rounds: number;
  canWin: boolean;
  roundsToKill: number;
  roundsToDie: number;
};

export type BattleEntryPlan = {
  fightMapId: number;
  fightScene: number;
  skipped: SkippedScene[];
  skipLog: string[];
  skippedExp: number;
  /** 停下来的原因：合适难度 / 战力不足 / 已到顶 */
  stopReason: "challenge" | "blocked" | "cleared";
  fightMetrics: FightMetrics;
};

function sceneExp(mapId: number, scene: number): number {
  const zone = getZone(mapId);
  if (!zone) return 8;
  return sceneExpFromZone(zone.exp, mapId, scene, SCENES_PER_MAP);
}

/** 估算回合数与能否取胜（用于自动推进 / 一键刷到底） */
export function estimateFightMetrics(
  save: HeroSave,
  mapId: number,
  scene: number,
  buffs: string[] = [],
): FightMetrics {
  const party = buildBattleParty(save, "zh", buffs);
  const power = partyPowerScore(party);
  const enemies = buildSceneEncounter(mapId, scene);
  const hp = encounterTotalHp(enemies);
  const atk = encounterTotalAtk(enemies);
  const hero = party[0]!;
  const roundsToKill = Math.max(1, hp / Math.max(1, power * 0.85));
  const roundsToDie = Math.max(
    1,
    (hero.maxHp * party.length * 0.6) / Math.max(1, atk * 0.7),
  );
  const rounds = Math.round((roundsToKill + roundsToDie) / 2);
  const canWin =
    roundsToKill <= 55 && roundsToDie > roundsToKill * 1.08;
  return { rounds, canWin, roundsToKill, roundsToDie };
}

export function estimateFightRounds(
  save: HeroSave,
  mapId: number,
  scene: number,
  buffs: string[] = [],
): number {
  return estimateFightMetrics(save, mapId, scene, buffs).rounds;
}

function shouldAutoWin(metrics: FightMetrics): boolean {
  const target = BATTLE_TUNING.targetFightRounds;
  return metrics.canWin && metrics.rounds < target;
}

export function planBattleEntry(
  save: HeroSave,
  locale: string,
  buffs: string[] = [],
  opts?: { maxMapAdvance?: number },
): BattleEntryPlan {
  const zh = locale === "zh";
  const startMap = save.worldMap;
  let simSave = save;
  let mapId = save.worldMap;
  let scene = save.worldScene;
  const skipped: SkippedScene[] = [];
  const skipLog: string[] = [];
  let skippedExp = 0;

  for (let i = 0; i < BATTLE_TUNING.maxAutoSkipScenes; i++) {
    if (mapId > RUN_MAX_ZONE) {
      return {
        fightMapId: RUN_MAX_ZONE,
        fightScene: SCENES_PER_MAP,
        skipped,
        skipLog,
        skippedExp,
        stopReason: "cleared",
        fightMetrics: { rounds: 0, canWin: true, roundsToKill: 0, roundsToDie: 0 },
      };
    }

    const metrics = estimateFightMetrics(simSave, mapId, scene, buffs);
    if (!shouldAutoWin(metrics)) break;

    const zone = getZone(mapId);
    const zLabel = zone ? zoneName(zone, locale) : `#${mapId}`;
    const exp = Math.floor(sceneExp(mapId, scene) * BATTLE_TUNING.autoSkipExpRatio);
    skipped.push({ mapId, scene, exp });
    skippedExp += exp;
    skipLog.push(
      zh
        ? `⚡ 自动取胜 · 地图 ${mapId}「${zLabel}」第 ${scene} 场（约 ${metrics.rounds} 回合 · +${exp} 经验）`
        : `⚡ Auto-win · map ${mapId} ${zLabel} scene ${scene} (~${metrics.rounds} rds · +${exp} EXP)`,
    );

    simSave = syncHeroLevel({
      ...advanceWorldProgress(simSave, mapId, scene),
      exp: simSave.exp + exp,
    });

    const next = nextWorldScene(mapId, scene);
    if (next.mapId === mapId && next.scene === scene) break;
    mapId = next.mapId;
    scene = next.scene;

    if (opts?.maxMapAdvance != null && mapId - startMap >= opts.maxMapAdvance) {
      break;
    }
  }

  const fightMetrics = estimateFightMetrics(simSave, mapId, scene, buffs);
  const stopReason: BattleEntryPlan["stopReason"] = fightMetrics.canWin
    ? "challenge"
    : "blocked";

  if (skipped.length > 0) {
    skipLog.unshift(
      zh
        ? `▶ 自动推进 ${skipped.length} 场，直达约 ${BATTLE_TUNING.targetFightRounds} 回合${stopReason === "blocked" ? "且当前难胜" : "的合适关卡"}`
        : `▶ Auto-advanced ${skipped.length} scene(s) toward ~${BATTLE_TUNING.targetFightRounds}-round ${stopReason === "blocked" ? "wall" : "fights"}`,
    );
  }

  return {
    fightMapId: mapId,
    fightScene: scene,
    skipped,
    skipLog,
    skippedExp,
    stopReason,
    fightMetrics,
  };
}

export type FastClearResult = {
  save: HeroSave;
  plan: BattleEntryPlan;
  summary: string;
  /** 是否推进了进度（跳关或自动取胜） */
  didProgress: boolean;
  skippedCount: number;
  skippedExp: number;
  sceneWon: boolean;
  fightExp: number;
  lootCount: number;
  /** 本次快速过图消耗体力（每推进 1 张地图 = 1 体力） */
  staminaCost: number;
};

/** 快速过图体力：每次最多推进 1 张地图 = 1 体力 */
export function fastClearStaminaCost(
  before: Pick<HeroSave, "worldMap" | "worldScene">,
  after: Pick<HeroSave, "worldMap" | "worldScene">,
  didProgress: boolean,
): number {
  if (!didProgress) return 0;
  return 1;
}

/** 估算快速过图体力（与 executeFastClear 一致） */
export function estimateFastClearStaminaCost(
  save: HeroSave,
  locale: string,
  buffs: string[] = [],
): number {
  return executeFastClear(save, locale, buffs).staminaCost;
}

function autoWinSceneExp(mapId: number, scene: number): number {
  const zone = getZone(mapId);
  if (!zone) return 8;
  return sceneExpFromZone(zone.exp, mapId, scene, SCENES_PER_MAP);
}

/** 快速过图：跳过低回合可赢关，并自动取胜当前可打赢的一关（估算为准） */
export function executeFastClear(
  save: HeroSave,
  locale: string,
  buffs: string[] = [],
): FastClearResult {
  const plan = planBattleEntry(save, locale, buffs, { maxMapAdvance: 1 });
  const zh = locale === "zh";
  const before = { worldMap: save.worldMap, worldScene: save.worldScene };
  let next = save;
  let sceneWon = false;
  let fightExp = 0;
  let lootCount = 0;

  if (plan.skipped.length > 0) {
    next = applySkippedProgress(next, plan.skipped);
    next = syncHeroLevel({ ...next, exp: next.exp + plan.skippedExp });
  }

  if (plan.fightMetrics.canWin) {
    const mapId = plan.fightMapId;
    const scene = plan.fightScene;
    const exp = autoWinSceneExp(mapId, scene);
    const lootIds: string[] = [];
    if (scene >= SCENES_PER_MAP) {
      const loot = rollZoneLoot(mapId, next.level);
      if (loot) lootIds.push(loot.id);
    }
    const zone = getZone(mapId);
    const kills: Record<string, number> = {};
    if (zone) {
      if (scene >= SCENES_PER_MAP) kills[zone.boss] = 1;
      else {
        kills[zone.mob1] = 1;
        kills[zone.mob2] = 1;
      }
    }
    const reward = applyRunRewards(next, exp, lootIds, true, mapId, scene, kills, locale);
    next = reward.save;
    sceneWon = true;
    fightExp = exp;
    lootCount = lootIds.length;
  }

  const didProgress = plan.skipped.length > 0 || sceneWon;
  const staminaCost = fastClearStaminaCost(before, next, didProgress);
  const mapsUsed = 1;
  const zone = getZone(plan.fightMapId);
  const zLabel = zone ? zoneName(zone, locale) : `#${plan.fightMapId}`;
  const isBoss = plan.fightScene >= SCENES_PER_MAP;
  const { rounds, canWin } = plan.fightMetrics;
  const totalExp = plan.skippedExp + fightExp;

  let summary: string;
  if (!didProgress) {
    summary = zh
      ? `无法快速过图：地图 ${plan.fightMapId}「${zLabel}」${isBoss ? "BOSS" : `第 ${plan.fightScene} 场`}约 ${rounds} 回合 · 请先升级装备、分配潜力点`
      : `Fast clear blocked at map ${plan.fightMapId} scene ${plan.fightScene} (~${rounds} rds) · upgrade gear & stats first`;
  } else if (sceneWon && plan.skipped.length > 0) {
    summary = zh
      ? `快速过图：推进 ${mapsUsed} 张地图 · 跳过 ${plan.skipped.length} 场 · 共 +${totalExp} 经验${lootCount ? ` · ${lootCount} 件装备` : ""} → 现地图 ${next.worldMap} 第 ${next.worldScene} 场`
      : `Fast clear: ${mapsUsed} map(s) · ${plan.skipped.length} skipped · +${totalExp} EXP → map ${next.worldMap} scene ${next.worldScene}`;
  } else if (sceneWon) {
    summary = zh
      ? `快速过图：推进 1 张地图 · +${fightExp} 经验${lootCount ? ` · ${lootCount} 件装备` : ""} → 现地图 ${next.worldMap} 第 ${next.worldScene} 场（约 ${rounds} 回合）`
      : `Fast clear: 1 map · +${fightExp} EXP → map ${next.worldMap} scene ${next.worldScene}`;
  } else {
    summary = zh
      ? `快速过图：推进 ${mapsUsed} 张地图 · 跳过 ${plan.skipped.length} 场 · +${plan.skippedExp} 经验 → 停在地图 ${plan.fightMapId}「${zLabel}」${isBoss ? "BOSS" : `第 ${plan.fightScene} 场`}`
      : `Fast clear: ${mapsUsed} map(s) · ${plan.skipped.length} skipped · +${plan.skippedExp} EXP → wall at map ${plan.fightMapId}`;
  }

  if (!canWin && plan.skipped.length > 0 && !sceneWon) {
    summary = zh
      ? `快速过图：跳过 ${plan.skipped.length} 场 · +${plan.skippedExp} 经验 → 战力瓶颈（地图 ${plan.fightMapId} 约 ${rounds} 回合）`
      : summary;
  }

  return {
    save: next,
    plan,
    summary,
    didProgress,
    skippedCount: plan.skipped.length,
    skippedExp: plan.skippedExp,
    sceneWon,
    fightExp,
    lootCount,
    staminaCost,
  };
}

/** @deprecated 使用 executeFastClear */
export function applySweepToWall(
  save: HeroSave,
  locale: string,
  buffs: string[] = [],
): { save: HeroSave; plan: BattleEntryPlan; summary: string } {
  const r = executeFastClear(save, locale, buffs);
  return { save: r.save, plan: r.plan, summary: r.summary };
}

export function applySkippedProgress(save: HeroSave, skipped: SkippedScene[]): HeroSave {
  let next = save;
  for (const s of skipped) {
    next = advanceWorldProgress(next, s.mapId, s.scene);
  }
  return next;
}

import { heroCombatStats, type HeroSave, type ZoneEnemy } from "@/config/td/rpg";
import {
  pickEnemySkill,
  pickHeroMagSkill,
  pickHeroPhysSkill,
  skillName,
} from "@/config/td/combat-skills";
import {
  equipItemName,
  rollZoneLoot,
} from "@/config/td/equipment-catalog";
import { protagonistName } from "@/config/td/protagonists";
import {
  getZone,
  RUN_MAX_ZONE,
  sceneExpFromZone,
  SCENES_PER_MAP,
  zoneName,
} from "@/config/td/zones";
import {
  buildBattleParty,
  livingParty,
  pickRandomTarget,
  alliesInBattle,
  type BattleAlly,
} from "@/lib/td/battle-party";
import { buildSceneEncounter } from "@/lib/td/battle-encounter";

export type ClimbRunState = {
  mapId: number;
  scene: number;
  scenesPerMap: number;
  log: string[];
  done: boolean;
  victory: boolean;
  sceneWon: boolean;
  mapCleared: boolean;
  activeMap?: number;
  activeScene?: number;
  runExp: number;
  runLoot: string[];
  monsterKills: Record<string, number>;
  /** 本局开战前自动推进 */
  skipCount?: number;
  skipExp?: number;
};

export type SceneBattleResult = {
  mapId: number;
  scene: number;
  detail: string[];
  summary: string[];
  sceneWon: boolean;
  mapCleared: boolean;
  victory: boolean;
  runExp: number;
  runLoot: string[];
  monsterKills: Record<string, number>;
};

export function createClimbRun(mapId: number, scene: number): ClimbRunState {
  return {
    mapId,
    scene,
    scenesPerMap: SCENES_PER_MAP,
    log: [],
    done: false,
    victory: false,
    sceneWon: false,
    mapCleared: false,
    runExp: 0,
    runLoot: [],
    monsterKills: {},
  };
}

function pickTarget(enemies: ZoneEnemy[]): ZoneEnemy | null {
  if (enemies.length === 0) return null;
  return enemies.reduce((a, b) => (a.hp <= b.hp ? a : b));
}

function sceneExp(zoneExp: number, mapId: number, scene: number): number {
  return sceneExpFromZone(zoneExp, mapId, scene, SCENES_PER_MAP);
}

function allyAttackLine(
  ally: BattleAlly,
  target: ZoneEnemy,
  dmg: number,
  crit: boolean,
  locale: string,
): string {
  const zh = locale === "zh";
  if (ally.isHero) return "";
  return zh
    ? crit
      ? `【${ally.name}】协助攻击 → ${target.name}，暴击 ${dmg} 伤害（剩余 ${Math.max(0, target.hp)}/${target.maxHp}）`
      : `【${ally.name}】协助攻击 → ${target.name}，${dmg} 伤害（剩余 ${Math.max(0, target.hp)}/${target.maxHp}）`
    : crit
      ? `[${ally.name}] assist → ${target.name}, CRIT ${dmg} (${Math.max(0, target.hp)}/${target.maxHp} HP)`
      : `[${ally.name}] assist → ${target.name}, ${dmg} DMG (${Math.max(0, target.hp)}/${target.maxHp} HP)`;
}

/** 模拟单场战斗（主角 + 助手 vs 多怪物） */
export function simulateSceneBattle(
  mapId: number,
  scene: number,
  save: HeroSave,
  buffs: string[],
  locale: string,
): SceneBattleResult {
  const zh = locale === "zh";
  const zone = getZone(mapId);
  const heroName = protagonistName(save.protagonistId, locale);
  const combat = heroCombatStats(save);
  let heroMp = combat.maxMp;
  let runExp = 0;
  const runLoot: string[] = [];
  const monsterKills: Record<string, number> = {};

  const party = buildBattleParty(save, locale, buffs);
  party[0]!.name = heroName;

  let enemies = buildSceneEncounter(mapId, scene).map((e) => ({ ...e }));
  let shieldUsed = false;
  const detail: string[] = [];
  const push = (line: string) => detail.push(line);

  const zLabel = zone ? zoneName(zone, locale) : `#${mapId}`;
  const isBoss = scene >= SCENES_PER_MAP;
  const sceneTag = isBoss
    ? zh
      ? "BOSS 战"
      : "BOSS"
    : zh
      ? `第 ${scene}/${SCENES_PER_MAP} 场`
      : `Scene ${scene}/${SCENES_PER_MAP}`;

  const allies = alliesInBattle(save);
  push(
    zh
      ? `━━ 地图 ${mapId} · ${zLabel} · ${sceneTag} · 我方 ${1 + allies.length} 人 vs 敌方 ${enemies.length} 怪 ━━`
      : `━━ Map ${mapId} · ${zLabel} · ${sceneTag} · ${1 + allies.length} allies vs ${enemies.length} foes ━━`,
  );

  for (const u of party) {
    push(
      zh
        ? `【${u.name}】气血 ${u.hp}/${u.maxHp} · 攻 ${u.atk}${u.mag > 0 ? ` · 法 ${u.mag}` : ""}`
        : `[${u.name}] HP ${u.hp}/${u.maxHp} · ATK ${u.atk}${u.mag > 0 ? ` · MAG ${u.mag}` : ""}`,
    );
  }
  for (const e of enemies) {
    const tag = e.isBoss ? (e.isMiniBoss ? (zh ? "小BOSS" : "mini") : "BOSS") : "";
    push(
      zh
        ? `【${e.name}】${tag ? `[${tag}] ` : ""}气血 ${e.hp}/${e.maxHp} · 攻 ${e.atk}`
        : `[${e.name}] ${tag ? `[${tag}] ` : ""}HP ${e.hp}/${e.maxHp} · ATK ${e.atk}`,
    );
  }
  push(zh ? "—— 战斗开始 ——" : "—— Battle start ——");

  let round = 0;
  const maxRounds = 60;

  while (enemies.length > 0 && livingParty(party).length > 0 && round < maxRounds) {
    round += 1;
    push(zh ? `— 第 ${round} 回合 —` : `— Round ${round} —`);

    for (const unit of livingParty(party)) {
      if (enemies.length === 0) break;
      const target = pickTarget(enemies)!;

      if (unit.isHero) {
        const physSkill = pickHeroPhysSkill(save.protagonistId);
        const physName = skillName(physSkill, locale);
        let physDmg = Math.max(1, unit.atk - Math.floor(target.atk * 0.05));
        const crit = Math.random() < 0.12;
        if (crit) physDmg = Math.round(physDmg * 1.5);
        target.hp = Math.round((target.hp - physDmg) * 10) / 10;
        push(
          zh
            ? crit
              ? `【${heroName}】使出「${physName}」→ ${target.name}，暴击！${physDmg} 伤害（剩 ${Math.max(0, target.hp)}/${target.maxHp}）`
              : `【${heroName}】使出「${physName}」→ ${target.name}，${physDmg} 伤害（剩 ${Math.max(0, target.hp)}/${target.maxHp}）`
            : crit
              ? `[${heroName}] ${physName} → ${target.name}, CRIT ${physDmg} (${Math.max(0, target.hp)}/${target.maxHp})`
              : `[${heroName}] ${physName} → ${target.name}, ${physDmg} (${Math.max(0, target.hp)}/${target.maxHp})`,
        );

        if (unit.mag > 0 && heroMp >= 8 && enemies.some((e) => e.hp > 0)) {
          const magTarget = pickTarget(enemies.filter((e) => e.hp > 0))!;
          const magSkill = pickHeroMagSkill(save.protagonistId);
          const magName = skillName(magSkill, locale);
          const magDmg = Math.max(1, Math.floor(unit.mag * (0.85 + Math.random() * 0.3)));
          heroMp = Math.max(0, heroMp - 8);
          magTarget.hp = Math.round((magTarget.hp - magDmg) * 10) / 10;
          push(
            zh
              ? `【${heroName}】施放「${magName}」→ ${magTarget.name}，法伤 ${magDmg}（魔量 ${heroMp}/${combat.maxMp}）`
              : `[${heroName}] ${magName} → ${magTarget.name}, ${magDmg} spell DMG (MP ${heroMp}/${combat.maxMp})`,
          );
        }
      } else {
        let dmg = Math.max(1, unit.atk - Math.floor(target.atk * 0.08));
        const crit = Math.random() < 0.08;
        if (crit) dmg = Math.round(dmg * 1.4);
        target.hp = Math.round((target.hp - dmg) * 10) / 10;
        push(allyAttackLine(unit, target, dmg, crit, locale));
      }
    }

    enemies = enemies.filter((e) => {
      if (e.hp <= 0) {
        push(zh ? `${e.name} 倒下了！` : `${e.name} defeated!`);
        monsterKills[e.name] = (monsterKills[e.name] ?? 0) + 1;
        return false;
      }
      return true;
    });
    if (enemies.length === 0) break;

    for (const enemy of enemies) {
      if (livingParty(party).length === 0) break;
      const victim = pickRandomTarget(party)!;
      const eSkill = pickEnemySkill(enemy.name, !!enemy.isBoss);
      const eSkillName = skillName(eSkill, locale);

      if (Math.random() * 100 < victim.dodge) {
        push(
          zh
            ? `【${victim.name}】闪避【${enemy.name}」的「${eSkillName}」`
            : `[${victim.name}] dodged [${enemy.name}] ${eSkillName}`,
        );
        continue;
      }

      if (victim.isHero && buffs.includes("shield") && !shieldUsed) {
        shieldUsed = true;
        push(
          zh
            ? `【${heroName}】「护体」抵挡【${enemy.name}」的「${eSkillName}」`
            : `[${heroName}] blocked [${enemy.name}] ${eSkillName}`,
        );
        continue;
      }

      const defReduction = victim.def * 0.28;
      const bossMult = enemy.isBoss ? (enemy.isMiniBoss ? 1.2 : 1.45) : 1;
      const taken = Math.max(1, Math.floor((enemy.atk - defReduction) * bossMult));
      victim.hp = Math.round((victim.hp - taken) * 10) / 10;
      push(
        zh
          ? `【${enemy.name}】「${eSkillName}」→ ${victim.name}，${taken} 伤害（${Math.max(0, victim.hp)}/${victim.maxHp}）`
          : `[${enemy.name}] ${eSkillName} → ${victim.name}, ${taken} DMG (${Math.max(0, victim.hp)}/${victim.maxHp} HP)`,
      );
      if (victim.hp <= 0) {
        push(
          zh
            ? `【${victim.name}】倒下了！`
            : `[${victim.name}] has fallen!`,
        );
      }
    }
  }

  const heroAlive = (party[0]?.hp ?? 0) > 0;
  const sceneWon = enemies.length === 0 && heroAlive;
  const mapCleared = sceneWon && isBoss;
  const allMapsDone = mapCleared && mapId >= RUN_MAX_ZONE;
  const summary: string[] = [];

  if (sceneWon && zone) {
    const expGain = sceneExp(zone.exp, mapId, scene);
    runExp = expGain;
    const rollLoot = isBoss || (mapId <= 5 && Math.random() < 0.22);
    if (rollLoot) {
      const loot = rollZoneLoot(mapId, save.level);
      if (loot) {
        runLoot.push(loot.id);
        push(
          zh
            ? `★ 掉落装备：${equipItemName(loot, locale)}`
            : `★ Loot: ${equipItemName(loot, locale)}`,
        );
      }
    }
    if (mapCleared && mapId < RUN_MAX_ZONE) {
      const next = getZone(mapId + 1);
      summary.push(
        zh
          ? `✓ 地图 ${mapId} 通关！解锁「${next ? zoneName(next, locale) : ""}」（+${expGain} 经验 · ${round} 回合）`
          : `✓ Map ${mapId} cleared! (+${expGain} EXP · ${round} rounds)`,
      );
    } else if (allMapsDone) {
      summary.push(
        zh
          ? `✓ 最终 BOSS 击败！全 ${RUN_MAX_ZONE} 图通关（+${expGain} 经验 · ${round} 回合）`
          : `✓ Final boss down! (+${expGain} EXP · ${round} rounds)`,
      );
    } else {
      summary.push(
        zh
          ? `✓ ${sceneTag} 获胜（+${expGain} 经验 · ${round} 回合）`
          : `✓ ${sceneTag} won (+${expGain} EXP · ${round} rounds)`,
      );
    }
  } else {
    summary.push(
      zh
        ? `✗ ${sceneTag} 战败（${round} 回合）· 进度不变`
        : `✗ ${sceneTag} failed (${round} rounds)`,
    );
  }

  return {
    mapId,
    scene,
    detail,
    summary,
    sceneWon,
    mapCleared,
    victory: allMapsDone,
    runExp,
    runLoot,
    monsterKills,
  };
}

export function finalizeSceneRun(
  run: ClimbRunState,
  sim: SceneBattleResult,
  log: string[],
): ClimbRunState {
  return {
    mapId: sim.mapId,
    scene: sim.scene,
    scenesPerMap: SCENES_PER_MAP,
    log,
    done: true,
    victory: sim.victory,
    sceneWon: sim.sceneWon,
    mapCleared: sim.mapCleared,
    activeMap: undefined,
    activeScene: undefined,
    runExp: sim.runExp,
    runLoot: sim.runLoot,
    monsterKills: sim.monsterKills,
  };
}

export function combatLogDelay(line: string): number {
  if (line.startsWith("━━") || line.startsWith("✓") || line.startsWith("✗")) return 650;
  if (line.startsWith("▶") || line.startsWith("⚡")) return 280;
  if (line.startsWith("—") || line.includes("战斗开始") || line.includes("Battle start")) return 520;
  if (line.startsWith("★")) return 700;
  return 380;
}

export function fightNextScene(
  run: ClimbRunState,
  save: HeroSave,
  buffs: string[],
  locale: string,
): ClimbRunState {
  if (run.done) return run;
  const sim = simulateSceneBattle(run.mapId, run.scene, save, buffs, locale);
  return finalizeSceneRun(run, sim, [...sim.detail, ...sim.summary]);
}

export const fightNextZone = fightNextScene;
export const fightNextFloor = fightNextScene;

export function runProgressScore(run: ClimbRunState): number {
  const base = (run.mapId - 1) * SCENES_PER_MAP;
  if (run.sceneWon) return base + run.scene;
  return base + Math.max(0, run.scene - 1);
}

export function zonesCleared(run: ClimbRunState): number {
  return run.mapCleared ? run.mapId : Math.max(0, run.mapId - 1);
}

export const floorsCleared = zonesCleared;

export {
  planBattleEntry,
  applySkippedProgress,
  applySweepToWall,
  executeFastClear,
  estimateFastClearStaminaCost,
  estimateFightMetrics,
} from "@/lib/td/battle-auto-advance";

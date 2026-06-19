import {
  companionAtk,
  floorEnemies,
  heroCombatStats,
  RUN_MAX_FLOOR,
  type FloorEnemy,
  type HeroSave,
} from "@/config/td/rpg";
import { activeCompanions } from "@/lib/td/rpg-storage";

export type ClimbRunState = {
  floor: number;
  maxFloor: number;
  log: string[];
  done: boolean;
  victory: boolean;
  /** 自动爬塔时正在挑战的层 */
  activeFloor?: number;
};

export function createClimbRun(): ClimbRunState {
  return {
    floor: 0,
    maxFloor: RUN_MAX_FLOOR,
    log: [],
    done: false,
    victory: false,
  };
}

function pickTarget(enemies: FloorEnemy[]): FloorEnemy | null {
  if (enemies.length === 0) return null;
  return enemies.reduce((a, b) => (a.hp <= b.hp ? a : b));
}

function rollCrit(critPct: number): boolean {
  return Math.random() * 100 < critPct;
}

function heroHitsPerRound(atkSpd: number): number {
  return 1 + Math.floor(atkSpd / 25);
}

/** 挑战下一层；战败层或通关层附带详细战报 */
export function fightNextFloor(
  run: ClimbRunState,
  save: HeroSave,
  buffs: string[],
  locale: string,
): ClimbRunState {
  if (run.done) return run;
  const zh = locale === "zh";
  const floor = run.floor + 1;
  const lines = [...run.log];
  const stats = heroCombatStats(save);
  let heroHp = stats.maxHp;
  let heroAtk = stats.atk;
  const heroDef = stats.def;
  const heroCrit = stats.crit;
  const heroAtkSpd = stats.atkSpd;

  if (buffs.includes("pack")) {
    heroAtk += 2;
    heroHp += 10;
  }

  const companions = activeCompanions(save);
  let enemies = floorEnemies(floor).map((e) => ({ ...e }));
  let shieldUsed = false;
  const detail: string[] = [];
  const push = (line: string) => detail.push(line);

  push(
    zh
      ? `▶ 第 ${floor} 层 · 敌人 ${enemies.length} 名`
      : `> Floor ${floor} · ${enemies.length} enemies`,
  );

  let round = 0;
  const maxRounds = 60;
  const exposed = new Set<string>();

  while (enemies.length > 0 && heroHp > 0 && round < maxRounds) {
    round += 1;
    push(zh ? `— 回合 ${round} —` : `— Round ${round} —`);

    const hits = heroHitsPerRound(heroAtkSpd);
    for (let h = 0; h < hits && enemies.length > 0; h++) {
      const target = pickTarget(enemies)!;
      let dmg = Math.max(1, heroAtk - Math.floor(target.atk * 0.08));
      if (exposed.has(target.id)) dmg = Math.round(dmg * 1.3 * 10) / 10;
      const crit = rollCrit(heroCrit);
      if (crit) dmg = Math.round(dmg * 2 * 10) / 10;
      target.hp = Math.round((target.hp - dmg) * 10) / 10;
      push(
        zh
          ? `主角 → ${target.name}，${dmg} 伤害${crit ? "（暴击）" : ""}`
          : `Hero → ${target.name}: ${dmg}${crit ? " CRIT" : ""}`,
      );
    }

    for (const kind of companions) {
      if (enemies.length === 0) break;
      const petTarget = pickTarget(enemies)!;
      let petDmg = companionAtk(kind, save.companionLevel[kind]);
      if (kind === "群") petDmg = Math.round(petDmg * 1.15);
      if (exposed.has(petTarget.id)) petDmg = Math.round(petDmg * 1.3 * 10) / 10;
      petTarget.hp = Math.round((petTarget.hp - petDmg) * 10) / 10;
      if (kind === "编") exposed.add(petTarget.id);
      push(zh ? `配角·${kind} → ${petTarget.name}，${petDmg} 伤害` : `Pet ${kind} → ${petTarget.name}: ${petDmg}`);
    }

    enemies = enemies.filter((e) => {
      if (e.hp <= 0) {
        push(zh ? `${e.name} 被击败` : `${e.name} defeated`);
        return false;
      }
      return true;
    });
    if (enemies.length === 0) break;

    for (const enemy of enemies) {
      if (heroHp <= 0) break;
      const taken = Math.max(1, enemy.atk - heroDef);
      if (buffs.includes("shield") && !shieldUsed) {
        shieldUsed = true;
        push(zh ? "【烂片免疫】抵挡一次伤害" : "[Shield] blocked");
        continue;
      }
      heroHp = Math.round((heroHp - taken) * 10) / 10;
      push(
        zh
          ? `${enemy.name} → 主角，${taken} 伤害，剩 ${Math.max(0, heroHp)} HP`
          : `${enemy.name} → Hero: ${taken}, ${Math.max(0, heroHp)} HP`,
      );
    }
  }

  const cleared = enemies.length === 0 && heroHp > 0;
  const victory = cleared && floor >= run.maxFloor;
  const done = !cleared || victory;

  if (cleared) {
    lines.push(zh ? `✓ 第 ${floor} 层通过` : `✓ Cleared floor ${floor}`);
  } else {
    lines.push(
      zh
        ? `✗ 第 ${floor} 层战败（最高 ${floor - 1} 层）`
        : `✗ Failed floor ${floor} (best ${floor - 1})`,
    );
    lines.push(...detail);
  }

  if (victory) {
    lines.push(zh ? "【通关】红毯塔顶！" : "[Victory] Tower cleared!");
    lines.push(...detail);
  }

  return {
    floor: cleared ? floor : run.floor,
    maxFloor: run.maxFloor,
    log: lines,
    done,
    victory,
    activeFloor: undefined,
  };
}

export function floorsCleared(run: ClimbRunState): number {
  return run.floor;
}

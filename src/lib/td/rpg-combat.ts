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

/** 挑战下一层，返回完整战报 */
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
  let heroMax = stats.maxHp;
  let heroAtk = stats.atk;
  const heroDef = stats.def;

  if (buffs.includes("pack")) {
    heroAtk += 2;
    heroMax += 10;
    heroHp += 10;
  }

  const companions = activeCompanions(save);
  let enemies = floorEnemies(floor).map((e) => ({ ...e }));
  let shieldUsed = false;

  lines.push(
    zh
      ? `\n▶ 第 ${floor} 层 · 敌人 ${enemies.length} 名`
      : `\n> Floor ${floor} · ${enemies.length} enemies`,
  );
  lines.push(
    zh
      ? `【我方】主角 Lv.${save.level} HP ${heroHp}/${heroMax} 攻 ${heroAtk} 防 ${heroDef}`
      : `[Party] Hero Lv.${save.level} HP ${heroHp}/${heroMax} ATK ${heroAtk} DEF ${heroDef}`,
  );
  if (companions.length > 0) {
    lines.push(
      zh
        ? `【配角】${companions.map((k) => `${k} Lv.${save.companionLevel[k]}`).join(" · ")}`
        : `[Pets] ${companions.map((k) => `${k} Lv.${save.companionLevel[k]}`).join(" · ")}`,
    );
  }

  let round = 0;
  const maxRounds = 60;
  const exposed = new Set<string>();

  while (enemies.length > 0 && heroHp > 0 && round < maxRounds) {
    round += 1;
    lines.push(zh ? `— 回合 ${round} —` : `— Round ${round} —`);

    // 主角攻击
    const target = pickTarget(enemies)!;
    let dmg = Math.max(1, heroAtk - Math.floor(target.atk * 0.1));
    if (exposed.has(target.id)) dmg = Math.round(dmg * 1.3 * 10) / 10;
    target.hp = Math.round((target.hp - dmg) * 10) / 10;
    lines.push(
      zh
        ? `主角 → ${target.name}，造成 ${dmg} 伤害，剩余 ${Math.max(0, target.hp)} HP`
        : `Hero → ${target.name}: ${dmg} dmg, ${Math.max(0, target.hp)} HP left`,
    );

    // 配角
    for (const kind of companions) {
      if (enemies.length === 0) break;
      const petTarget = pickTarget(enemies)!;
      let petDmg = companionAtk(kind, save.companionLevel[kind]);
      if (kind === "群") petDmg = Math.round(petDmg * 1.15);
      if (exposed.has(petTarget.id)) petDmg = Math.round(petDmg * 1.3 * 10) / 10;
      petTarget.hp = Math.round((petTarget.hp - petDmg) * 10) / 10;
      let extra = "";
      if (kind === "编") {
        exposed.add(petTarget.id);
        extra = zh ? "，标记破绽" : ", exposed";
      }
      if (kind === "粉") extra = zh ? "，减速" : ", slow";
      lines.push(
        zh
          ? `配角·${kind} → ${petTarget.name}，${petDmg} 伤害${extra}`
          : `Pet ${kind} → ${petTarget.name}: ${petDmg}${extra}`,
      );
    }

    enemies = enemies.filter((e) => {
      if (e.hp <= 0) {
        lines.push(zh ? `${e.name} 被击败` : `${e.name} defeated`);
        return false;
      }
      return true;
    });
    if (enemies.length === 0) break;

    // 敌人反击
    for (const enemy of enemies) {
      if (heroHp <= 0) break;
      const raw = enemy.atk;
      const taken = Math.max(1, raw - heroDef);
      if (buffs.includes("shield") && !shieldUsed) {
        shieldUsed = true;
        lines.push(zh ? "【烂片免疫】抵挡一次伤害" : "[Shield] blocked hit");
        continue;
      }
      heroHp = Math.round((heroHp - taken) * 10) / 10;
      lines.push(
        zh
          ? `${enemy.name} → 主角，造成 ${taken} 伤害，剩余 ${Math.max(0, heroHp)} HP`
          : `${enemy.name} → Hero: ${taken} dmg, ${Math.max(0, heroHp)} HP left`,
      );
    }
  }

  const cleared = enemies.length === 0 && heroHp > 0;
  if (cleared) {
    lines.push(zh ? `【过关】第 ${floor} 层通过` : `[Clear] floor ${floor}`);
  } else {
    lines.push(
      zh
        ? `【战败】第 ${floor} 层失败，主角 HP ${Math.max(0, heroHp)}`
        : `[Fail] floor ${floor}, hero HP ${Math.max(0, heroHp)}`,
    );
  }

  const victory = cleared && floor >= run.maxFloor;
  const done = !cleared || victory;

  return {
    floor: cleared ? floor : run.floor,
    maxFloor: run.maxFloor,
    log: lines,
    done,
    victory,
  };
}

export function floorsCleared(run: ClimbRunState): number {
  return run.floor;
}

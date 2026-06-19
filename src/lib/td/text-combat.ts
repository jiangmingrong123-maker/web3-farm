import type { EnemyKind } from "@/config/td/units";
import { ENEMY_DEFS } from "@/config/td/units";
import { STAGE1_WAVES, WAVE_POPULARITY_BONUS } from "@/config/td/units";
import {
  CROWD_DAMAGE_MUL,
  DIRECTOR_SPLASH_MUL,
  EXPOSE_DAMAGE_MUL,
} from "@/config/td/traits";
import { CREW_MAX_LEVEL } from "@/config/td/xp";
import {
  canMergeCrew,
  isCrewKind,
  towerCombatStats,
  towerDef,
  type TowerKind,
} from "@/lib/td/towers";
import { isBossWave, waveComposition } from "@/lib/td/engine";

export type RosterUnit = {
  id: string;
  kind: TowerKind;
  level: number;
  hp: number;
  maxHp: number;
  kills: number;
};

export type TextBattlePhase = "setup" | "between" | "done";

export type TextBattleState = {
  roster: RosterUnit[];
  popularity: number;
  hearts: number;
  wave: number;
  maxWaves: number;
  phase: TextBattlePhase;
  log: string[];
  shieldUsed: boolean;
  battleStarted: boolean;
};

let uid = 0;
function nextId(prefix: string) {
  uid += 1;
  return `${prefix}_${uid}`;
}

type FightEnemy = {
  id: string;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  slowSkip: boolean;
  exposed: boolean;
};

function crewMaxHp(level: number): number {
  return 8 + level * 4;
}

function enemyAttack(kind: EnemyKind, wave: number): number {
  const base = { 黑: 2, 水: 3, 混: 3, Boss: 7 }[kind];
  return Math.round(base * (1 + wave * 0.06) * 10) / 10;
}

function spawnEnemyHp(kind: EnemyKind, wave: number, nerf: boolean): number {
  const def = ENEMY_DEFS[kind];
  let hp = def.hp * (1 + wave * 0.08);
  if (kind === "Boss") hp = def.hp * (2 + wave * 0.2);
  if (nerf) hp *= 0.8;
  return Math.round(hp * 10) / 10;
}

export function createTextBattle(popularity: number): TextBattleState {
  return {
    roster: [],
    popularity,
    hearts: 3,
    wave: 0,
    maxWaves: STAGE1_WAVES,
    phase: "setup",
    log: [],
    shieldUsed: false,
    battleStarted: false,
  };
}

export function recruitUnit(
  state: TextBattleState,
  kind: TowerKind,
): TextBattleState | null {
  if (state.phase !== "setup" || state.battleStarted) return null;
  const def = towerDef(kind);
  if (!isCrewKind(kind) || state.popularity < def.cost) return null;
  const unit: RosterUnit = {
    id: nextId("u"),
    kind,
    level: 1,
    hp: crewMaxHp(1),
    maxHp: crewMaxHp(1),
    kills: 0,
  };
  return {
    ...state,
    popularity: state.popularity - def.cost,
    roster: [...state.roster, unit],
  };
}

export function mergeRosterUnits(
  state: TextBattleState,
  fromId: string,
  toId: string,
): TextBattleState | null {
  if (state.phase !== "setup") return null;
  const from = state.roster.find((u) => u.id === fromId);
  const to = state.roster.find((u) => u.id === toId);
  if (!from || !to || !canMergeCrew(from, to)) return null;
  const level = to.level + 1;
  if (level > CREW_MAX_LEVEL) return null;
  const maxHp = crewMaxHp(level);
  return {
    ...state,
    roster: state.roster
      .filter((u) => u.id !== fromId)
      .map((u) =>
        u.id === toId ? { ...u, level, hp: maxHp, maxHp } : u,
      ),
  };
}

function labelUnit(u: RosterUnit): string {
  return `${u.kind} Lv.${u.level}`;
}

function labelEnemy(e: FightEnemy): string {
  return ENEMY_DEFS[e.kind].label;
}

function pickTarget(enemies: FightEnemy[]): FightEnemy | null {
  if (enemies.length === 0) return null;
  return enemies.reduce((a, b) => (a.hp <= b.hp ? a : b));
}

function restoreRoster(roster: RosterUnit[]): RosterUnit[] {
  return roster.map((u) => ({ ...u, hp: u.maxHp }));
}

export function isTextVictory(state: TextBattleState): boolean {
  return state.wave >= state.maxWaves && state.hearts > 0 && state.phase === "done";
}

export function isTextDefeat(state: TextBattleState): boolean {
  return state.hearts <= 0;
}

/** 模拟一整波战斗，追加战报文字 */
export function simulateWave(
  state: TextBattleState,
  buffs: string[],
  locale: string,
): TextBattleState {
  const zh = locale === "zh";
  const lines: string[] = [...state.log];
  const nerf = buffs.includes("nerf");
  const wave = state.wave + 1;

  if (state.roster.length === 0) {
    lines.push(zh ? "【错误】剧组为空，无法开战" : "[Error] Empty roster");
    return { ...state, log: lines };
  }

  let roster = restoreRoster(state.roster);
  const kinds = waveComposition(wave);
  let enemies: FightEnemy[] = kinds.map((kind) => {
    const hp = spawnEnemyHp(kind, wave, nerf);
    return {
      id: nextId("e"),
      kind,
      hp,
      maxHp: hp,
      slowSkip: false,
      exposed: false,
    };
  });

  lines.push(
    zh
      ? `\n━━━ 第 ${wave} 波${isBossWave(wave) ? "（BOSS）" : ""} · 敌人 ${enemies.length} ━━━`
      : `\n--- Wave ${wave}${isBossWave(wave) ? " (BOSS)" : ""} · ${enemies.length} enemies ---`,
  );

  let round = 0;
  const maxRounds = 80;

  while (enemies.length > 0 && roster.some((u) => u.hp > 0) && round < maxRounds) {
    round += 1;
    lines.push(zh ? `— 回合 ${round} —` : `— Round ${round} —`);

    const living = roster.filter((u) => u.hp > 0);
    const sorted = [...living].sort(
      (a, b) =>
        towerCombatStats(a.kind, a.level).fireMs -
        towerCombatStats(b.kind, b.level).fireMs,
    );

    for (const unit of sorted) {
      if (enemies.length === 0) break;
      const stats = towerCombatStats(unit.kind, unit.level);
      let dmgMul = unit.kind === "群" ? CROWD_DAMAGE_MUL : 1;
      if (buffs.includes("fan") && unit.kind === "粉") dmgMul *= 1.1;

      if (unit.kind === "导") {
        const primary = pickTarget(enemies)!;
        const splash = enemies.filter((e) => e.id !== primary.id).slice(0, 1);
        for (const target of [primary, ...splash]) {
          let hit = stats.damage * dmgMul * (target.id === primary.id ? 1 : DIRECTOR_SPLASH_MUL);
          if (target.exposed) hit *= EXPOSE_DAMAGE_MUL;
          hit = Math.round(hit * 10) / 10;
          target.hp = Math.round((target.hp - hit) * 10) / 10;
          lines.push(
            zh
              ? `${labelUnit(unit)} → ${labelEnemy(target)}，${target.id === primary.id ? "" : "溅射 "}造成 ${hit} 伤害，剩余 ${Math.max(0, target.hp)} HP`
              : `${labelUnit(unit)} → ${labelEnemy(target)}: ${hit} dmg, ${Math.max(0, target.hp)} HP left`,
          );
        }
      } else {
        const target = pickTarget(enemies)!;
        let hit = stats.damage * dmgMul;
        if (target.exposed) hit *= EXPOSE_DAMAGE_MUL;
        hit = Math.round(hit * 10) / 10;
        target.hp = Math.round((target.hp - hit) * 10) / 10;
        let extra = "";
        if (unit.kind === "粉") {
          target.slowSkip = true;
          extra = zh ? "，附带减速" : ", slow";
        }
        if (unit.kind === "编") {
          target.exposed = true;
          extra = zh ? "，标记破绽" : ", exposed";
        }
        lines.push(
          zh
            ? `${labelUnit(unit)} → ${labelEnemy(target)}，造成 ${hit} 伤害${extra}，剩余 ${Math.max(0, target.hp)} HP`
            : `${labelUnit(unit)} → ${labelEnemy(target)}: ${hit} dmg${extra}, ${Math.max(0, target.hp)} HP`,
        );
      }
    }

    const killed: FightEnemy[] = [];
    enemies = enemies.filter((e) => {
      if (e.hp <= 0) {
        killed.push(e);
        return false;
      }
      return true;
    });
    for (const e of killed) {
      lines.push(zh ? `${labelEnemy(e)} 被击败` : `${labelEnemy(e)} defeated`);
    }

    if (enemies.length === 0) break;

    for (const enemy of enemies) {
      const livingCrew = roster.filter((u) => u.hp > 0);
      if (livingCrew.length === 0) break;
      if (enemy.slowSkip) {
        enemy.slowSkip = false;
        lines.push(
          zh
            ? `${labelEnemy(enemy)} 被减速，本回合未攻击`
            : `${labelEnemy(enemy)} slowed, skips attack`,
        );
        continue;
      }
      const target = livingCrew[Math.floor(Math.random() * livingCrew.length)]!;
      const atk = enemyAttack(enemy.kind, wave);
      const hp = Math.round((target.hp - atk) * 10) / 10;
      roster = roster.map((u) => (u.id === target.id ? { ...u, hp } : u));
      lines.push(
        zh
          ? `${labelEnemy(enemy)} → ${labelUnit(target)}，造成 ${atk} 伤害，剩余 ${Math.max(0, hp)} HP`
          : `${labelEnemy(enemy)} → ${labelUnit(target)}: ${atk} dmg, ${Math.max(0, hp)} HP`,
      );
      if (hp <= 0) {
        lines.push(zh ? `${labelUnit(target)} 倒下` : `${labelUnit(target)} down`);
      }
    }
  }

  let hearts = state.hearts;
  let shieldUsed = state.shieldUsed;
  const crewAlive = roster.some((u) => u.hp > 0);
  const waveCleared = enemies.length === 0 && crewAlive;

  if (enemies.length > 0) {
    const leak = enemies.length;
    let dmg = leak;
    if (buffs.includes("shield") && !shieldUsed) {
      dmg = Math.max(0, dmg - 1);
      shieldUsed = true;
      lines.push(zh ? "【烂片免疫】抵挡 1 点漏怪伤害" : "[Shield] blocked 1 leak");
    }
    hearts = Math.max(0, hearts - dmg);
    lines.push(
      zh
        ? `【失守】${leak} 名敌人突破防线，扣除 ${dmg} 颗心（剩余 ${hearts}）`
        : `[Leak] ${leak} enemies through, -${dmg} hearts (${hearts} left)`,
    );
  } else if (!crewAlive) {
    hearts = Math.max(0, hearts - 1);
    lines.push(
      zh
        ? `【团灭】剧组全员倒下，扣除 1 颗心（剩余 ${hearts}）`
        : `[Wipe] crew down, -1 heart (${hearts} left)`,
    );
  } else {
    lines.push(zh ? `【波次结束】第 ${wave} 波清空` : `[Wave clear] wave ${wave}`);
  }

  roster = roster.filter((u) => u.hp > 0);
  const popularity =
    state.popularity + (waveCleared ? WAVE_POPULARITY_BONUS : 0);
  const done = wave >= state.maxWaves || hearts <= 0;
  const phase: TextBattlePhase = hearts <= 0 || done ? "done" : "between";

  return {
    ...state,
    roster,
    popularity,
    hearts,
    wave,
    shieldUsed,
    battleStarted: true,
    phase,
    log: lines,
  };
}

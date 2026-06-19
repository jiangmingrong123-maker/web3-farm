import type { EnemyKind } from "@/config/td/units";
import { ENEMY_DEFS } from "@/config/td/units";
import {
  TD_INTER_WAVE_MS,
  TD_SPAWN_INTERVAL_MS,
  TD_SUB_WAVE_PREP_MS,
  TD_TICK_MS,
  TD_WAVE_PREP_MS,
} from "@/config/td/pacing";
import { STAGE1_PATH, stage1Buildable } from "@/config/td/stage1";
import {
  CROWD_DAMAGE_MUL,
  DIRECTOR_SPLASH_MUL,
  EXPOSE_DAMAGE_MUL,
  exposeMs,
  fanSlowMs,
} from "@/config/td/traits";
import { CREW_MAX_LEVEL, ENEMY_XP, starLevelFromKills } from "@/config/td/xp";
import {
  canMergeCrew,
  isCrewKind,
  isStarKind,
  towerCombatStats,
  towerDef,
  type TowerKind,
} from "@/lib/td/towers";

export const STAGE1_WAVES = 20;

export type PlacedTower = {
  id: string;
  kind: TowerKind;
  x: number;
  y: number;
  lastFire: number;
  level: number;
  kills: number;
};

export type Enemy = {
  id: string;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  pathIndex: number;
  progress: number;
  slowUntil: number;
  vulnerableUntil: number;
  lastHitBy: string | null;
};

export type RunState = {
  towers: PlacedTower[];
  enemies: Enemy[];
  wave: number;
  waveActive: boolean;
  battleStarted: boolean;
  interWaveTimer: number;
  hearts: number;
  popularity: number;
  tempGold: number;
  spawnQueue: EnemyKind[];
  spawnTimer: number;
  lastTick: number;
  shieldUsed: boolean;
};

let uid = 0;
function nextId(prefix: string) {
  uid += 1;
  return `${prefix}_${uid}`;
}

export function createRunState(popularity: number): RunState {
  return {
    towers: [],
    enemies: [],
    wave: 0,
    waveActive: false,
    battleStarted: false,
    interWaveTimer: 0,
    hearts: 3,
    popularity,
    tempGold: 0,
    spawnQueue: [],
    spawnTimer: 0,
    lastTick: Date.now(),
    shieldUsed: false,
  };
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function enemyPos(e: Enemy): [number, number] {
  const i = Math.min(e.pathIndex, STAGE1_PATH.length - 1);
  const j = Math.min(i + 1, STAGE1_PATH.length - 1);
  const [x0, y0] = STAGE1_PATH[i]!;
  const [x1, y1] = STAGE1_PATH[j]!;
  const t = e.pathIndex >= STAGE1_PATH.length - 1 ? 0 : e.progress;
  return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
}

export function isBossWave(wave: number): boolean {
  return wave > 0 && wave % 5 === 0;
}

export function waveComposition(wave: number): EnemyKind[] {
  const list: EnemyKind[] = [];
  const boss = isBossWave(wave);
  const n = boss ? Math.min(1 + Math.floor(wave / 2), 10) : Math.min(2 + wave, 18);

  for (let i = 0; i < n; i++) {
    if (wave >= 15 && i % 5 === 0) list.push("混");
    else if (wave >= 6 && i % 4 === 0) list.push("水");
    else list.push("黑");
  }
  if (boss) list.push("Boss");
  return list;
}

export function waveEnemyTotal(wave: number): number {
  return waveComposition(wave).length;
}

function spawnHp(kind: EnemyKind, wave: number, nerfWave: boolean): number {
  const def = ENEMY_DEFS[kind];
  let hp = def.hp * (1 + wave * 0.08);
  if (kind === "Boss") {
    hp = def.hp * (2 + wave * 0.2);
  }
  if (nerfWave) hp *= 0.8;
  return hp;
}

function startWaveInternal(state: RunState): RunState {
  if (state.waveActive || state.wave >= STAGE1_WAVES) return state;
  const wave = state.wave + 1;
  const prep = state.wave === 0 ? TD_WAVE_PREP_MS : TD_SUB_WAVE_PREP_MS;
  return {
    ...state,
    wave,
    waveActive: true,
    interWaveTimer: 0,
    spawnQueue: waveComposition(wave),
    spawnTimer: prep,
  };
}

/** 摆放阶段结束 · 点击「开始战斗」 */
export function beginBattle(state: RunState): RunState {
  if (state.battleStarted || state.waveActive) return state;
  return startWaveInternal({ ...state, battleStarted: true });
}


export function canMergePair(a: PlacedTower, b: PlacedTower): boolean {
  return canMergeCrew(a, b);
}

/** 同种群众合成 · level+1（不限距离，拖放/二次点击均可） */
export function mergeCrewTowers(
  state: RunState,
  fromId: string,
  toId: string,
): RunState | null {
  const from = state.towers.find((t) => t.id === fromId);
  const to = state.towers.find((t) => t.id === toId);
  if (!from || !to || fromId === toId) return null;
  if (!canMergeCrew(from, to)) return null;
  return {
    ...state,
    towers: state.towers
      .filter((t) => t.id !== fromId)
      .map((t) => (t.id === toId ? { ...t, level: t.level + 1 } : t)),
  };
}

/** 移动到空场位 */
export function moveTower(
  state: RunState,
  towerId: string,
  x: number,
  y: number,
): RunState | null {
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower || tower.x === x && tower.y === y) return null;
  if (!stage1Buildable(x, y)) return null;
  if (state.towers.some((t) => t.x === x && t.y === y)) return null;
  return {
    ...state,
    towers: state.towers.map((t) => (t.id === towerId ? { ...t, x, y } : t)),
  };
}

/** 拖放：优先相邻合成，否则移到空格 */
export function dropTower(
  state: RunState,
  towerId: string,
  x: number,
  y: number,
): { state: RunState; action: "merge" | "move" } | null {
  const from = state.towers.find((t) => t.id === towerId);
  if (!from) return null;

  const target = state.towers.find((t) => t.x === x && t.y === y && t.id !== towerId);
  if (target) {
    const merged = mergeCrewTowers(state, towerId, target.id);
    if (merged) return { state: merged, action: "merge" };
    return null;
  }

  const moved = moveTower(state, towerId, x, y);
  if (moved) return { state: moved, action: "move" };
  return null;
}

export function canSelectMergeSource(tower: PlacedTower): boolean {
  return isCrewKind(tower.kind) && tower.level < CREW_MAX_LEVEL;
}

export function placeTower(
  state: RunState,
  kind: TowerKind,
  x: number,
  y: number,
): RunState | null {
  const def = towerDef(kind);
  if (state.popularity < def.cost) return null;
  if (state.towers.some((t) => t.x === x && t.y === y)) return null;
  return {
    ...state,
    popularity: state.popularity - def.cost,
    towers: [
      ...state.towers,
      { id: nextId("t"), kind, x, y, lastFire: 0, level: 1, kills: 0 },
    ],
  };
}

export function tickRun(state: RunState, now: number, buffs: string[]): RunState {
  const dt = Math.min(Math.max(now - state.lastTick, 0), TD_TICK_MS * 2);
  if (dt <= 0) return state;

  let s = { ...state, lastTick: now };
  const nerfWave = buffs.includes("nerf") && s.waveActive;

  if (
    !s.waveActive &&
    s.battleStarted &&
    s.interWaveTimer > 0 &&
    s.wave > 0 &&
    s.wave < STAGE1_WAVES
  ) {
    s.interWaveTimer -= dt;
    if (s.interWaveTimer <= 0) {
      s = startWaveInternal({ ...s, interWaveTimer: 0 });
    }
  }

  if (s.waveActive && s.spawnQueue.length > 0) {
    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0) {
      const kind = s.spawnQueue[0]!;
      const hp = spawnHp(kind, s.wave, nerfWave);
      s = {
        ...s,
        spawnQueue: s.spawnQueue.slice(1),
        spawnTimer: kind === "Boss" ? TD_SPAWN_INTERVAL_MS * 1.5 : TD_SPAWN_INTERVAL_MS,
        enemies: [
          ...s.enemies,
          {
            id: nextId("e"),
            kind,
            hp,
            maxHp: hp,
            pathIndex: 0,
            progress: 0,
            slowUntil: 0,
            vulnerableUntil: 0,
            lastHitBy: null,
          },
        ],
      };
    }
  }

  const speedMul = (e: Enemy) => (e.slowUntil > now ? 0.55 : 1);

  s = {
    ...s,
    enemies: s.enemies.map((e) => {
      const def = ENEMY_DEFS[e.kind];
      let pathIndex = e.pathIndex;
      let progress = e.progress;
      let step = (def.speed * speedMul(e) * dt) / 1000;
      while (step > 0 && pathIndex < STAGE1_PATH.length - 1) {
        const need = 1 - progress;
        if (step >= need) {
          step -= need;
          pathIndex += 1;
          progress = 0;
        } else {
          progress += step;
          step = 0;
        }
      }
      return { ...e, pathIndex, progress };
    }),
  };

  const leaked: Enemy[] = [];
  const alive: Enemy[] = [];
  for (const e of s.enemies) {
    if (e.pathIndex >= STAGE1_PATH.length - 1 && e.progress >= 0.99) {
      leaked.push(e);
    } else {
      alive.push(e);
    }
  }

  let hearts = s.hearts;
  let shieldUsed = s.shieldUsed;
  if (leaked.length > 0) {
    let leakDmg = leaked.length;
    if (buffs.includes("shield") && !shieldUsed) {
      leakDmg = Math.max(0, leakDmg - 1);
      shieldUsed = true;
    }
    hearts = Math.max(0, hearts - leakDmg);
  }
  s = { ...s, enemies: alive, hearts, shieldUsed };

  const damaged = new Map<string, number>();
  const slow = new Map<string, number>();
  const expose = new Map<string, number>();
  const lastHit = new Map<string, string>();
  const firedIds = new Set<string>();

  for (const t of s.towers) {
    const stats = towerCombatStats(t.kind, t.level);
    if (now - t.lastFire < stats.fireMs) continue;

    let range = stats.range;
    if (buffs.includes("fan") && t.kind === "粉") range += 1;

    const inRange: Enemy[] = [];
    for (const e of s.enemies) {
      const [ex, ey] = enemyPos(e);
      if (dist(t.x, t.y, ex, ey) <= range) inRange.push(e);
    }
    if (inRange.length === 0) continue;

    firedIds.add(t.id);
    const dmgMul = t.kind === "群" ? CROWD_DAMAGE_MUL : 1;

    if (t.kind === "导") {
      let primary = inRange[0]!;
      let bestD = Infinity;
      for (const e of inRange) {
        const [ex, ey] = enemyPos(e);
        const d = dist(t.x, t.y, ex, ey);
        if (d < bestD) {
          primary = e;
          bestD = d;
        }
      }
      for (const e of inRange) {
        const mul = e.id === primary.id ? 1 : DIRECTOR_SPLASH_MUL;
        let hit = stats.damage * dmgMul * mul;
        if (e.vulnerableUntil > now) hit *= EXPOSE_DAMAGE_MUL;
        damaged.set(e.id, (damaged.get(e.id) ?? 0) + hit);
        lastHit.set(e.id, t.id);
      }
    } else {
      let best = inRange[0]!;
      let bestD = Infinity;
      for (const e of inRange) {
        const [ex, ey] = enemyPos(e);
        const d = dist(t.x, t.y, ex, ey);
        if (d < bestD) {
          best = e;
          bestD = d;
        }
      }
      let hit = stats.damage * dmgMul;
      if (best.vulnerableUntil > now) hit *= EXPOSE_DAMAGE_MUL;
      damaged.set(best.id, (damaged.get(best.id) ?? 0) + hit);
      lastHit.set(best.id, t.id);
      if (t.kind === "粉") slow.set(best.id, now + fanSlowMs(t.level));
      if (t.kind === "编") expose.set(best.id, now + exposeMs(t.level));
      if (t.kind === "water") slow.set(best.id, now + 1200);
    }
  }

  const towersAfterFire = s.towers.map((t) =>
    firedIds.has(t.id) ? { ...t, lastFire: now } : t,
  );

  const died: Enemy[] = [];
  const surviving: Enemy[] = [];
  for (const e of s.enemies) {
    const dmg = damaged.get(e.id) ?? 0;
    const hp = e.hp - dmg;
    const slowUntil = slow.has(e.id) ? Math.max(e.slowUntil, slow.get(e.id)!) : e.slowUntil;
    const vulnerableUntil = expose.has(e.id)
      ? Math.max(e.vulnerableUntil, expose.get(e.id)!)
      : e.vulnerableUntil;
    const hitBy = lastHit.get(e.id) ?? e.lastHitBy;
    if (hp <= 0) {
      died.push({ ...e, hp: 0, slowUntil, vulnerableUntil, lastHitBy: hitBy ?? null });
    } else {
      surviving.push({ ...e, hp, slowUntil, vulnerableUntil, lastHitBy: hitBy ?? e.lastHitBy });
    }
  }

  let towers = towersAfterFire;
  for (const e of died) {
    if (!e.lastHitBy) continue;
    const xp = ENEMY_XP[e.kind];
    towers = towers.map((t) => {
      if (t.id !== e.lastHitBy || !isStarKind(t.kind)) return t;
      const kills = t.kills + xp;
      return { ...t, kills, level: starLevelFromKills(kills) };
    });
  }

  s = { ...s, towers, enemies: surviving };

  if (s.waveActive && s.spawnQueue.length === 0 && s.enemies.length === 0) {
    const done = s.wave;
    s = {
      ...s,
      waveActive: false,
      popularity: s.popularity + 3,
      tempGold: s.tempGold + (done % 5 === 0 ? 2 : 0),
    };
    if (s.battleStarted && done < STAGE1_WAVES) {
      s.interWaveTimer = TD_INTER_WAVE_MS;
    }
  }

  return s;
}

export function isVictory(state: RunState) {
  return (
    state.wave >= STAGE1_WAVES &&
    !state.waveActive &&
    state.enemies.length === 0 &&
    state.interWaveTimer <= 0
  );
}

export function isDefeat(state: RunState) {
  return state.hearts <= 0;
}

export { enemyPos };

import { enemyPos, type Enemy, type PlacedTower, type RunState } from "@/lib/td/engine";
import { isStarKind, towerCombatStats } from "@/lib/td/towers";

export type ProjectileFx = {
  id: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  born: number;
  duration: number;
  star: boolean;
};

export type HitFlashFx = {
  id: number;
  x: number;
  y: number;
  born: number;
};

export type DeathFx = {
  id: number;
  x: number;
  y: number;
  born: number;
};

let fxId = 0;

function nextFxId() {
  fxId += 1;
  return fxId;
}

function nearestEnemy(tower: PlacedTower, enemies: Enemy[]): Enemy | null {
  const stats = towerCombatStats(tower.kind, tower.level);
  let best: Enemy | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    const [ex, ey] = enemyPos(e);
    const d = Math.hypot(tower.x - ex, tower.y - ey);
    if (d <= stats.range && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

export function diffCombatFx(
  prev: RunState | null,
  next: RunState,
  now: number,
): {
  projectiles: ProjectileFx[];
  hits: HitFlashFx[];
  deaths: DeathFx[];
} {
  const projectiles: ProjectileFx[] = [];
  const hits: HitFlashFx[] = [];
  const deaths: DeathFx[] = [];
  if (!prev) return { projectiles, hits, deaths };

  for (const t of next.towers) {
    const old = prev.towers.find((o) => o.id === t.id);
    if (!old || t.lastFire <= old.lastFire) continue;
    const target = nearestEnemy(t, next.enemies);
    if (!target) continue;
    const [x1, y1] = enemyPos(target);
    projectiles.push({
      id: nextFxId(),
      x0: t.x + 0.5,
      y0: t.y + 0.5,
      x1,
      y1,
      born: now,
      duration: 180,
      star: isStarKind(t.kind),
    });
  }

  const prevMap = new Map(prev.enemies.map((e) => [e.id, e]));
  for (const e of next.enemies) {
    const old = prevMap.get(e.id);
    if (old && e.hp < old.hp) {
      const [x, y] = enemyPos(e);
      hits.push({ id: nextFxId(), x, y, born: now });
    }
  }

  const nextIds = new Set(next.enemies.map((e) => e.id));
  for (const e of prev.enemies) {
    if (!nextIds.has(e.id)) {
      const [x, y] = enemyPos(e);
      deaths.push({ id: nextFxId(), x, y, born: now });
    }
  }

  return { projectiles, hits, deaths };
}

export function pruneFx<T extends { born: number }>(list: T[], now: number, maxAge: number): T[] {
  return list.filter((f) => now - f.born < maxAge);
}

import {
  BATTLE_TUNING,
  enemyCountTier,
} from "@/config/td/battle-squads";
import { earlyMapCombatMult } from "@/config/td/progression-feedback";
import type { ZoneEnemy } from "@/config/td/rpg";
import { getZone, SCENES_PER_MAP } from "@/config/td/zones";

function scale(mapId: number): number {
  return 1 + (mapId - 1) * 0.08;
}

function applyEarly(mapId: number, stats: { hp: number; atk: number }) {
  const m = earlyMapCombatMult(mapId);
  return {
    hp: Math.max(1, Math.floor(stats.hp * m.hp)),
    atk: Math.max(1, Math.round(stats.atk * m.atk * 10) / 10),
  };
}

function mobStats(mapId: number, rl: number, scene: number, mult = 1): {
  hp: number;
  atk: number;
} {
  const sc = scale(mapId);
  const hp = Math.floor((26 + rl * 5 + scene * 3) * sc * mult);
  const atk = Math.round((6 + rl * 0.9 + scene * 0.35) * sc * mult * 10) / 10;
  return applyEarly(mapId, { hp, atk });
}

function bossStats(mapId: number, rl: number, mult = 1): { hp: number; atk: number } {
  const bossScale = 1.5 + mapId * 0.035;
  const hp = Math.floor((36 + rl * 9) * bossScale * mult);
  const atk = Math.round((10 + rl * 1.15) * bossScale * mult * 10) / 10;
  return applyEarly(mapId, { hp, atk });
}

function miniBossStats(mapId: number, rl: number): { hp: number; atk: number } {
  const s = bossStats(mapId, rl, 0.72);
  return s;
}

/** 构建遭遇战敌人列表 */
export function buildSceneEncounter(mapId: number, scene: number): ZoneEnemy[] {
  const zone = getZone(mapId);
  if (!zone) return [];
  const rl = zone.recommendLevel;
  const tier = enemyCountTier(mapId);
  const isBoss = scene >= SCENES_PER_MAP;
  const cap = BATTLE_TUNING.maxEnemyCount;
  const enemies: ZoneEnemy[] = [];

  if (isBoss) {
    const main = bossStats(mapId, rl, 1);
    enemies.push({
      id: `z${mapId}_boss_main`,
      name: zone.boss,
      hp: main.hp,
      maxHp: main.hp,
      atk: main.atk,
      isBoss: true,
    });

    for (let i = 0; i < tier.bossMinions && enemies.length < cap; i++) {
      const name = i % 2 === 0 ? zone.mob1 : zone.mob2;
      const st = mobStats(mapId, rl, scene, 0.75);
      enemies.push({
        id: `z${mapId}_boss_m${i}`,
        name,
        hp: st.hp,
        maxHp: st.hp,
        atk: st.atk,
        isBoss: false,
      });
    }

    for (let p = 1; p <= tier.priorBossMini && enemies.length < cap; p++) {
      const prevId = mapId - p;
      const prev = getZone(prevId);
      if (!prev) continue;
      const st = miniBossStats(prevId, prev.recommendLevel);
      enemies.push({
        id: `z${mapId}_mini_${prevId}`,
        name: prev.boss,
        hp: st.hp,
        maxHp: st.hp,
        atk: st.atk,
        isBoss: true,
        isMiniBoss: true,
      } as ZoneEnemy);
    }
    return enemies.slice(0, cap);
  }

  const count = tier.normalMobs;
  const perMult = count <= 2 ? 1 : count <= 4 ? 0.88 : 0.78;
  for (let i = 0; i < count && enemies.length < cap; i++) {
    const name = i % 2 === 0 ? zone.mob1 : zone.mob2;
    const st = mobStats(mapId, rl, scene, perMult);
    enemies.push({
      id: `z${mapId}_s${scene}_m${i}`,
      name,
      hp: st.hp,
      maxHp: st.hp,
      atk: st.atk,
      isBoss: false,
    });
  }
  return enemies;
}

export function encounterTotalHp(enemies: ZoneEnemy[]): number {
  return enemies.reduce((s, e) => s + e.maxHp, 0);
}

export function encounterTotalAtk(enemies: ZoneEnemy[]): number {
  return enemies.reduce((s, e) => s + e.atk, 0);
}

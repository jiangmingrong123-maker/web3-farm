import {
  MAP_SWEEP_BOSS_EXP_RATIO,
  MAP_SWEEP_FULL_EXP_RATIO,
  MAP_SWEEP_RUNS_BATCH,
} from "@/config/td/economy";
import { equipItemName, type EquipRarity } from "@/config/td/equipment-catalog";
import { rollZoneLoot } from "@/config/td/equipment-catalog";
import { syncHeroLevel, type HeroSave } from "@/config/td/rpg";
import { applyMonsterKills, sweepKillCredit } from "@/lib/td/quest-progress";
import { applySweepLoot, type SweepLogEntry } from "@/lib/td/sweep-loot";
import {
  getZone,
  SCENES_PER_MAP,
  sceneExpFromZone,
  zoneName,
} from "@/config/td/zones";

/** 扫图模式：仅 BOSS（默认）或 全图 5 场 */
export type MapSweepMode = "boss" | "full";

export type MapSweepOptions = {
  autoEquip?: boolean;
  recycleRarities?: EquipRarity[];
};

/** 已通关地图（打过 BOSS 并进入下一图） */
export function listClearedMapIds(save: HeroSave): number[] {
  const ids: number[] = [];
  for (let id = 1; id < save.worldMap; id++) ids.push(id);
  return ids;
}

/** 扫图默认目标：最新已通关地图 */
export function bestSweepMapId(save: HeroSave): number | null {
  const cleared = listClearedMapIds(save);
  return cleared.length > 0 ? cleared[cleared.length - 1]! : null;
}

export type MapSweepResult = {
  save: HeroSave;
  mapId: number;
  mode: MapSweepMode;
  runs: number;
  totalExp: number;
  goldGained: number;
  lootCount: number;
  log: SweepLogEntry[];
  summary: string;
};

function bossSceneExp(mapId: number): number {
  const zone = getZone(mapId);
  if (!zone) return 8;
  return sceneExpFromZone(zone.exp, mapId, SCENES_PER_MAP, SCENES_PER_MAP);
}

function fullMapExp(mapId: number): number {
  const zone = getZone(mapId);
  if (!zone) return 20;
  let total = 0;
  for (let s = 1; s <= SCENES_PER_MAP; s++) {
    total += sceneExpFromZone(zone.exp, mapId, s, SCENES_PER_MAP);
  }
  return total;
}

function expPerSweepRun(mapId: number, mode: MapSweepMode): number {
  if (mode === "full") {
    return Math.max(1, Math.floor(fullMapExp(mapId) * MAP_SWEEP_FULL_EXP_RATIO));
  }
  return Math.max(1, Math.floor(bossSceneExp(mapId) * MAP_SWEEP_BOSS_EXP_RATIO));
}

/** 对已通关地图扫图：逐遍结算，产出系统日志 */
export function executeMapSweep(
  save: HeroSave,
  mapId: number,
  locale: string,
  mode: MapSweepMode = "boss",
  runs = MAP_SWEEP_RUNS_BATCH,
  options: MapSweepOptions = {},
): MapSweepResult | null {
  if (!listClearedMapIds(save).includes(mapId)) return null;

  const autoEquip = options.autoEquip !== false;
  const recycleRarities = options.recycleRarities ?? [];
  const zone = getZone(mapId);
  const zLabel = zone ? zoneName(zone, locale) : `#${mapId}`;
  const expPer = expPerSweepRun(mapId, mode);
  const zh = locale === "zh";
  let next = save;
  let totalExp = 0;
  let goldGained = 0;
  let lootCount = 0;
  const log: SweepLogEntry[] = [];

  const modeLabel = zh
    ? mode === "boss"
      ? "仅 BOSS"
      : "全图 5 场"
    : mode === "boss"
      ? "BOSS only"
      : "full map ×5";

  log.push({
    type: "summary",
    text: zh
      ? `── 扫图开始 · 地图 ${mapId}「${zLabel}」${modeLabel} ×${runs} ──`
      : `── Sweep map ${mapId} ${zLabel} (${modeLabel}) ×${runs} ──`,
  });

  for (let i = 0; i < runs; i++) {
    const prevLevel = next.level;
    totalExp += expPer;
    next = syncHeroLevel({ ...next, exp: next.exp + expPer });

    log.push({
      type: "exp",
      text: zh ? `第 ${i + 1} 遍 · +${expPer} 经验` : `Run ${i + 1} · +${expPer} EXP`,
    });

    if (next.level > prevLevel) {
      log.push({
        type: "levelup",
        text: zh ? `★ 升级！Lv.${next.level}` : `★ Level up! Lv.${next.level}`,
      });
    }

    if (zone) {
      const kills = sweepKillCredit(zone.mob1, zone.mob2, zone.boss, mode);
      const lvlBeforeQuest = next.level;
      const qr = applyMonsterKills(next, kills, locale);
      next = qr.save;
      for (const q of qr.logs) {
        log.push({ type: "quest", text: q.text });
      }
      if (qr.save.level > lvlBeforeQuest) {
        log.push({
          type: "levelup",
          text: zh
            ? `★ 任务奖励升级！Lv.${qr.save.level}`
            : `★ Quest level-up! Lv.${qr.save.level}`,
        });
      }
    }

    const loot = rollZoneLoot(mapId, next.level, { sweep: true });
    if (loot) {
      lootCount += 1;
      const r = applySweepLoot(next, loot.id, locale, autoEquip, recycleRarities);
      next = r.save;
      goldGained += r.gold;
      if (r.log) log.push(r.log);
    }
  }

  if (lootCount === 0) {
    const pity = rollZoneLoot(mapId, next.level, { sweep: true, guaranteed: true });
    if (pity) {
      lootCount += 1;
      const r = applySweepLoot(next, pity.id, locale, autoEquip, recycleRarities);
      next = r.save;
      goldGained += r.gold;
      log.push({
        type: "loot",
        text: zh ? `保底掉落「${equipItemName(pity, locale)}」` : `Pity drop: ${equipItemName(pity, locale)}`,
      });
      if (r.log) log.push(r.log);
    }
  }

  log.push({
    type: "summary",
    text: zh
      ? `── 合计 +${totalExp} 经验${goldGained > 0 ? ` · 回收 +${goldGained} 金币` : ""} · 掉落 ${lootCount} 件 ──`
      : `── Total +${totalExp} EXP${goldGained > 0 ? ` · +${goldGained} gold` : ""} · ${lootCount} drops ──`,
  });

  const summary = zh
    ? `扫图 · 地图 ${mapId}「${zLabel}」${modeLabel} ×${runs} · +${totalExp} 经验${goldGained > 0 ? ` · 回收 +${goldGained} 金` : ""} · ${lootCount} 件装备`
    : `Sweep map ${mapId} ${zLabel} (${modeLabel}) ×${runs} · +${totalExp} EXP${goldGained > 0 ? ` · +${goldGained} gold` : ""} · ${lootCount} gear`;

  return {
    save: next,
    mapId,
    mode,
    runs,
    totalExp,
    goldGained,
    lootCount,
    log,
    summary,
  };
}

export type { SweepLogEntry };

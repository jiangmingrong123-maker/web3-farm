"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  STAGE1_COLS,
  STAGE1_ROWS,
  stage1Buildable,
  stage1Cell,
} from "@/config/td/stage1";
import { STAGE1_THEME } from "@/config/td/stage-theme";
import { STAGE1_GOAL, STAGE1_SPAWN } from "@/config/td/stage1";
import { TD_SPAWN_INTERVAL_MS } from "@/config/td/pacing";
import { enemyPos, canMergePair, isBossWave, type RunState } from "@/lib/td/engine";
import { previewStats, towerCombatStats, towerDef, type TowerKind } from "@/lib/td/towers";
import { TowerSprite } from "@/components/td/TdSprites";
import {
  diffCombatFx,
  pruneFx,
  type DeathFx,
  type HitFlashFx,
  type ProjectileFx,
} from "@/lib/td/combat-fx";

const ENEMY_STYLE: Record<string, string> = {
  黑: "bg-zinc-800 border-zinc-500 text-zinc-200",
  水: "bg-sky-900 border-sky-400 text-sky-100",
  混: "bg-violet-900 border-violet-400 text-violet-100",
  Boss: "bg-red-950 border-amber-400 text-amber-200 ring-2 ring-amber-500/60",
};

type Props = {
  run: RunState;
  selectedKind: TowerKind;
  paused: boolean;
  mergeSourceId: string | null;
  inspectedTowerId: string | null;
  onCellClick: (x: number, y: number) => void;
  onTowerClick: (towerId: string) => void;
  onTowerDragStart?: () => void;
  onTowerDrop: (towerId: string, x: number, y: number) => void;
  onFxSound?: (kind: "hit" | "die" | "shoot" | "shoot_star") => void;
};

export function isWavePreparing(run: RunState): boolean {
  if (!run.waveActive) return false;
  if (run.enemies.length > 0) return false;
  return run.spawnTimer > (run.wave <= 1 ? TD_SPAWN_INTERVAL_MS : 0);
}

export function TdBattleGrid({
  run,
  selectedKind,
  paused,
  mergeSourceId,
  inspectedTowerId,
  onCellClick,
  onTowerClick,
  onTowerDragStart,
  onTowerDrop,
  onFxSound,
}: Props) {
  const t = useTranslations("td");
  const prep = isWavePreparing(run);
  const prepSec = Math.ceil(
    run.wave <= 1
      ? (run.spawnTimer - TD_SPAWN_INTERVAL_MS) / 1000
      : run.spawnTimer / 1000,
  );
  const spawning = run.waveActive && !prep;
  const bossWave = run.waveActive && isBossWave(run.wave);
  const remaining = run.spawnQueue.length + run.enemies.length;
  const mobDef = towerDef(selectedKind);
  const canBuild = !paused;
  const canAfford = run.popularity >= mobDef.cost;

  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [dragTowerId, setDragTowerId] = useState<string | null>(null);
  const [dropCell, setDropCell] = useState<[number, number] | null>(null);
  const [projectiles, setProjectiles] = useState<ProjectileFx[]>([]);
  const [hits, setHits] = useState<HitFlashFx[]>([]);
  const [deaths, setDeaths] = useState<DeathFx[]>([]);
  const prevRunRef = useRef<RunState | null>(null);
  const onFxSoundRef = useRef(onFxSound);
  onFxSoundRef.current = onFxSound;

  useEffect(() => {
    const now = Date.now();
    const fx = diffCombatFx(prevRunRef.current, run, now);
    if (fx.projectiles.length) {
      setProjectiles((p) => [...p, ...fx.projectiles]);
      for (const pr of fx.projectiles) {
        onFxSoundRef.current?.(pr.star ? "shoot_star" : "shoot");
      }
    }
    if (fx.hits.length) {
      setHits((h) => [...h, ...fx.hits]);
      onFxSoundRef.current?.("hit");
    }
    if (fx.deaths.length) {
      setDeaths((d) => [...d, ...fx.deaths]);
      onFxSoundRef.current?.("die");
    }
    prevRunRef.current = run;
  }, [run]);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setProjectiles((p) => pruneFx(p, now, 250));
      setHits((h) => pruneFx(h, now, 200));
      setDeaths((d) => pruneFx(d, now, 400));
    }, 80);
    return () => clearInterval(id);
  }, []);

  const inspectedTower = inspectedTowerId
    ? run.towers.find((tw) => tw.id === inspectedTowerId)
    : null;
  const hoverTower = hoverCell
    ? run.towers.find((tw) => tw.x === hoverCell[0] && tw.y === hoverCell[1])
    : null;
  const focusTower = inspectedTower ?? hoverTower;
  const rangeCenter = focusTower ? ([focusTower.x, focusTower.y] as [number, number]) : hoverCell;
  const rangeVal = focusTower
    ? towerCombatStats(focusTower.kind, focusTower.level).range
    : previewStats(selectedKind, 1).range;

  const mergeSource = mergeSourceId
    ? run.towers.find((tw) => tw.id === mergeSourceId)
    : null;

  return (
    <div className="space-y-3">
      {prep && (
        <div className="animate-pulse rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-center text-sm text-gold">
          {bossWave ? t("bossPrep", { sec: Math.max(1, prepSec), wave: run.wave }) : t("wavePrep", { sec: Math.max(1, prepSec) })}
        </div>
      )}

      {bossWave && spawning && run.enemies.some((e) => e.kind === "Boss") && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/15 px-4 py-2 text-center text-sm font-semibold text-red-200">
          {t("bossActive")}
        </div>
      )}

      {spawning && (
        <div className="flex flex-wrap gap-4 text-xs text-white/50">
          <span>{t("enemiesLeft", { count: remaining })}</span>
          {run.spawnQueue.length > 0 && (
            <span>{t("nextSpawn", { sec: Math.ceil(run.spawnTimer / 1000) })}</span>
          )}
        </div>
      )}

      <div className="relative mx-auto w-fit max-w-full overflow-x-auto rounded-xl border-2 border-amber-900/40 bg-black/40 p-1 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-amber-500/10 to-transparent" />
        <div
          className="relative inline-grid gap-1 p-2"
          style={{
            gridTemplateColumns: `repeat(${STAGE1_COLS}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: STAGE1_ROWS }, (_, y) =>
            Array.from({ length: STAGE1_COLS }, (_, x) => {
              const cell = stage1Cell(x, y);
              const theme = STAGE1_THEME[cell];
              const tower = run.towers.find((tw) => tw.x === x && tw.y === y);
              const buildable = stage1Buildable(x, y);
              const slotOpen = buildable && !tower;
              const slotActive = canBuild && slotOpen && canAfford;
              const isSpawn = x === STAGE1_SPAWN[0] && y === STAGE1_SPAWN[1];
              const isGoal = x === STAGE1_GOAL[0] && y === STAGE1_GOAL[1];

              const isInspected = tower && inspectedTowerId === tower.id;
              const isMergeSource = tower && mergeSourceId === tower.id;
              const isMergeTarget =
                mergeSource &&
                tower &&
                tower.id !== mergeSourceId &&
                canMergePair(mergeSource, tower);
              const isDropTarget =
                dragTowerId &&
                dropCell?.[0] === x &&
                dropCell?.[1] === y &&
                (slotOpen || (tower && tower.id !== dragTowerId));

              return (
                <div
                  key={`${x}-${y}`}
                  role="button"
                  tabIndex={slotActive ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && slotActive) onCellClick(x, y);
                  }}
                  onClick={() => {
                    if (!tower && slotActive) onCellClick(x, y);
                  }}
                  onDragOver={(e) => {
                    if (!dragTowerId || paused) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropCell([x, y]);
                  }}
                  onDragLeave={() => {
                    if (dropCell?.[0] === x && dropCell?.[1] === y) setDropCell(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) onTowerDrop(id, x, y);
                    setDragTowerId(null);
                    setDropCell(null);
                  }}
                  onMouseEnter={() => setHoverCell([x, y])}
                  onMouseLeave={() => setHoverCell(null)}
                  title={
                    isSpawn
                      ? t("spawn")
                      : isGoal
                        ? t("goal")
                        : slotOpen && buildable
                          ? t("slotTitle", { mob: mobDef.label, cost: mobDef.cost })
                          : theme.label
                  }
                  className={`relative h-11 w-11 sm:h-12 sm:w-12 ${theme.bg} transition ${
                    isInspected ? "ring-2 ring-cyan-400 brightness-125" : ""
                  } ${
                    isMergeSource ? "ring-2 ring-amber-400 brightness-125" : ""
                  } ${
                    isMergeTarget ? "ring-2 ring-amber-300/80 brightness-110" : ""
                  } ${
                    isDropTarget ? "ring-2 ring-cyan-400 brightness-125" : ""
                  } ${
                    dragTowerId === tower?.id ? "opacity-50" : ""
                  } ${
                    cell === "R"
                      ? "z-[1] shadow-[inset_0_0_10px_rgba(239,68,68,0.5)] ring-1 ring-red-400/40"
                      : slotOpen
                        ? `ring-2 ring-inset ${theme.accent ?? "ring-emerald-500/40"}`
                        : ""
                  } ${
                    slotActive
                      ? "cursor-pointer hover:brightness-125 hover:ring-emerald-300"
                      : slotOpen && canBuild && !canAfford
                        ? "cursor-not-allowed opacity-70"
                        : "cursor-default"
                  } ${cell === "R" ? "" : ""}`}
                >
                  {isSpawn && cell === "R" && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] text-amber-200">
                      ▶
                    </span>
                  )}
                  {isGoal && cell === "R" && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-gold">
                      ★
                    </span>
                  )}
                  {tower && (
                    <div
                      draggable={!paused}
                      className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData("text/plain", tower.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragTowerId(tower.id);
                        onTowerDragStart?.();
                      }}
                      onDragEnd={() => {
                        setDragTowerId(null);
                        setDropCell(null);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTowerClick(tower.id);
                      }}
                    >
                      <TowerSprite tower={tower} />
                    </div>
                  )}
                  {slotOpen && (
                    <span
                      className={`absolute inset-0 flex flex-col items-center justify-center ${
                        slotActive ? "text-emerald-400/90" : "text-white/20"
                      }`}
                    >
                      <span className="text-lg font-light leading-none">+</span>
                      <span className="text-[8px] opacity-70">{theme.label}</span>
                    </span>
                  )}
                </div>
              );
            }),
          )}

          {rangeCenter && (
            <svg
              className="pointer-events-none absolute inset-2 z-[2]"
              viewBox={`0 0 ${STAGE1_COLS} ${STAGE1_ROWS}`}
              preserveAspectRatio="none"
            >
              <circle
                cx={rangeCenter[0] + 0.5}
                cy={rangeCenter[1] + 0.5}
                r={rangeVal}
                fill="rgba(34,211,238,0.08)"
                stroke="rgba(34,211,238,0.55)"
                strokeWidth="0.06"
                strokeDasharray="0.15 0.1"
              />
            </svg>
          )}

          <div className="pointer-events-none absolute inset-2 z-[3]">
            {run.enemies.map((e) => {
              const [ex, ey] = enemyPos(e);
              const left = ((ex + 0.5) / STAGE1_COLS) * 100;
              const top = ((ey + 0.5) / STAGE1_ROWS) * 100;
              const hpPct = Math.max(0, (e.hp / e.maxHp) * 100);
              const isBoss = e.kind === "Boss";
              const flash = hits.some(
                (h) => Math.hypot(h.x - ex, h.y - ey) < 0.5 && Date.now() - h.born < 120,
              );

              return (
                <div
                  key={e.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform ${
                    flash ? "scale-125 brightness-150" : ""
                  }`}
                  style={{ left: `${left}%`, top: `${top}%`, width: isBoss ? "3.5rem" : "2.75rem" }}
                >
                  <div
                    className={`mx-auto flex items-center justify-center rounded-full border-2 font-bold shadow-lg ${ENEMY_STYLE[e.kind] ?? ""} ${
                      isBoss ? "h-10 w-10 text-[10px]" : "h-8 w-8 text-xs"
                    }`}
                  >
                    {isBoss ? "BOSS" : e.kind}
                  </div>
                  <div className={`mt-0.5 overflow-hidden rounded-full bg-black/60 ${isBoss ? "h-2" : "h-1.5"}`}>
                    <div className="h-full bg-red-400" style={{ width: `${hpPct}%` }} />
                  </div>
                </div>
              );
            })}

            {projectiles.map((p) => {
              const prog = Math.min(1, (Date.now() - p.born) / p.duration);
              const x = p.x0 + (p.x1 - p.x0) * prog;
              const y = p.y0 + (p.y1 - p.y0) * prog;
              const left = ((x + 0.5) / STAGE1_COLS) * 100;
              const top = ((y + 0.5) / STAGE1_ROWS) * 100;
              return (
                <div
                  key={p.id}
                  className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                    p.star ? "bg-gold shadow-[0_0_8px_gold]" : "bg-cyan-300 shadow-[0_0_6px_cyan]"
                  }`}
                  style={{ left: `${left}%`, top: `${top}%` }}
                />
              );
            })}

            {deaths.map((d) => {
              const age = Date.now() - d.born;
              const left = ((d.x + 0.5) / STAGE1_COLS) * 100;
              const top = ((d.y + 0.5) / STAGE1_ROWS) * 100;
              return (
                <div
                  key={d.id}
                  className="absolute text-lg"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    transform: `translate(-50%,-${50 + age * 0.15}%) scale(${1 + age * 0.002})`,
                    opacity: 1 - age / 400,
                  }}
                >
                  ✦
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-white/45">
        {mergeSourceId
          ? t("mergeSelectTarget")
          : dragTowerId
            ? t("dragHint")
            : !canAfford
            ? t("needPopularity", { cost: mobDef.cost, have: Math.floor(run.popularity) })
            : t("buildHint", { mob: mobDef.label, cost: mobDef.cost, range: mobDef.range })}
      </p>
    </div>
  );
}

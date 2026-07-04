import { SCENES_PER_MAP } from "@/config/td/zones";
import { createClimbRun, type ClimbRunState } from "@/lib/td/rpg-combat";

const KEY = "td_rpg_run";

export type PendingRunSave = {
  runId: string;
  finishToken: string;
  climb: ClimbRunState;
  updatedAt: number;
};

function migrateClimb(raw: Record<string, unknown>): ClimbRunState {
  if (typeof raw.mapId === "number" && typeof raw.scene === "number") {
    return {
      mapId: raw.mapId,
      scene: raw.scene,
      scenesPerMap:
        typeof raw.scenesPerMap === "number" ? raw.scenesPerMap : SCENES_PER_MAP,
      log: Array.isArray(raw.log) ? (raw.log as string[]) : [],
      done: !!raw.done,
      victory: !!raw.victory,
      sceneWon: !!raw.sceneWon,
      mapCleared: !!raw.mapCleared,
      activeMap:
        typeof raw.activeMap === "number" ? raw.activeMap : undefined,
      activeScene:
        typeof raw.activeScene === "number" ? raw.activeScene : undefined,
      runExp: typeof raw.runExp === "number" ? raw.runExp : 0,
      runLoot: Array.isArray(raw.runLoot) ? (raw.runLoot as string[]) : [],
      monsterKills:
        raw.monsterKills && typeof raw.monsterKills === "object"
          ? (raw.monsterKills as Record<string, number>)
          : {},
    };
  }
  return createClimbRun(1, 1);
}

export function loadPendingRun(wallet: string): PendingRunSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${KEY}:${wallet.toLowerCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingRunSave & { climb: Record<string, unknown> };
    return {
      ...parsed,
      climb: migrateClimb(parsed.climb as Record<string, unknown>),
    };
  } catch {
    return null;
  }
}

export function savePendingRun(wallet: string, save: PendingRunSave) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${KEY}:${wallet.toLowerCase()}`, JSON.stringify(save));
}

export function clearPendingRun(wallet: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${KEY}:${wallet.toLowerCase()}`);
}

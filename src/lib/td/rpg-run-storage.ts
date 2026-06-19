import type { ClimbRunState } from "@/lib/td/rpg-combat";

const KEY = "td_rpg_run";

export type PendingRunSave = {
  runId: string;
  finishToken: string;
  climb: ClimbRunState;
  updatedAt: number;
};

export function loadPendingRun(wallet: string): PendingRunSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${KEY}:${wallet.toLowerCase()}`);
    if (!raw) return null;
    return JSON.parse(raw) as PendingRunSave;
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

import { SEASON0_DAILY_BASE, CLAIM_COOLDOWN_HOURS } from "@/config/slots";

const STORAGE_PREFIX = "web3farm_season0_";

export interface FarmState {
  points: number;
  unlockedSlots: number;
  lastClaimAt: number | null;
  boundSlots: Record<number, { name: string; tier: string } | null>;
}

const DEFAULT_STATE: FarmState = {
  points: 0,
  unlockedSlots: 1,
  lastClaimAt: null,
  boundSlots: {},
};

function key(wallet: string) {
  return `${STORAGE_PREFIX}${wallet.toLowerCase()}`;
}

export function loadFarmState(wallet: string | undefined): FarmState {
  if (!wallet || typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(key(wallet));
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveFarmState(wallet: string, state: FarmState) {
  localStorage.setItem(key(wallet), JSON.stringify(state));
}

export function canClaim(state: FarmState): boolean {
  if (!state.lastClaimAt) return true;
  const elapsed = Date.now() - state.lastClaimAt;
  return elapsed >= CLAIM_COOLDOWN_HOURS * 60 * 60 * 1000;
}

export function claimCooldownLeftMs(state: FarmState): number {
  if (!state.lastClaimAt) return 0;
  const next = state.lastClaimAt + CLAIM_COOLDOWN_HOURS * 60 * 60 * 1000;
  return Math.max(0, next - Date.now());
}

export function performClaim(state: FarmState): FarmState | null {
  if (!canClaim(state)) return null;
  return {
    ...state,
    points: state.points + SEASON0_DAILY_BASE,
    lastClaimAt: Date.now(),
  };
}

export function unlockSlot(state: FarmState, slotIndex: number, cost: number): FarmState | null {
  if (slotIndex > state.unlockedSlots + 1 || slotIndex <= state.unlockedSlots) return null;
  if (state.points < cost) return null;
  return {
    ...state,
    points: state.points - cost,
    unlockedSlots: slotIndex,
  };
}

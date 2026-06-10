import {
  CLAIM_COOLDOWN_HOURS,
  DAILY_POINTS_CAP,
  INITIAL_UNLOCKED_SLOTS,
  MAX_ACCRUAL_HOURS,
  POINTS_PER_BOUND_NFT,
  SEASON0_DAILY_BASE,
} from "@/config/slots";

const STORAGE_PREFIX = "web3farm_season0_";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface BoundNft {
  contract: string;
  tokenId: string;
  name: string;
  imageUrl: string;
  collectionSlug: string;
}

export interface FarmState {
  points: number;
  unlockedSlots: number;
  lastClaimAt: number | null;
  boundSlots: Record<number, BoundNft | null>;
  /** Unclaimed points waiting to be collected. */
  pendingPoints: number;
  /** When the current accrual window started (last claim or first bind). */
  accrualAnchorAt: number | null;
  /** Last time pending was synced from the accrual clock. */
  lastAccrualTickAt: number | null;
}

const DEFAULT_STATE: FarmState = {
  points: 0,
  unlockedSlots: INITIAL_UNLOCKED_SLOTS,
  lastClaimAt: null,
  boundSlots: {},
  pendingPoints: 0,
  accrualAnchorAt: null,
  lastAccrualTickAt: null,
};

function key(wallet: string) {
  return `${STORAGE_PREFIX}${wallet.toLowerCase()}`;
}

function boundCount(state: FarmState): number {
  return Object.values(state.boundSlots).filter(Boolean).length;
}

/** Daily accrual rate (points / day), capped at DAILY_POINTS_CAP. */
export function dailyAccrualRate(state: FarmState): number {
  const n = boundCount(state);
  const raw = n > 0 ? n * POINTS_PER_BOUND_NFT : SEASON0_DAILY_BASE;
  return Math.min(raw, DAILY_POINTS_CAP);
}

/** Max unclaimed pool = 72 hours worth at the current daily rate. */
export function maxPendingPoints(state: FarmState): number {
  return (dailyAccrualRate(state) * MAX_ACCRUAL_HOURS) / 24;
}

export function loadFarmState(wallet: string | undefined): FarmState {
  if (!wallet || typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(key(wallet));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<FarmState>;
    const merged: FarmState = {
      ...DEFAULT_STATE,
      ...parsed,
      boundSlots: parsed.boundSlots ?? {},
      unlockedSlots: Math.max(
        parsed.unlockedSlots ?? INITIAL_UNLOCKED_SLOTS,
        INITIAL_UNLOCKED_SLOTS,
      ),
      pendingPoints: parsed.pendingPoints ?? 0,
      accrualAnchorAt: parsed.accrualAnchorAt ?? null,
      lastAccrualTickAt: parsed.lastAccrualTickAt ?? null,
    };
    return syncAccrual(merged, Date.now());
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveFarmState(wallet: string, state: FarmState) {
  localStorage.setItem(key(wallet), JSON.stringify(state));
}

/** Advance pending points based on elapsed time (stops after 72h from anchor). */
export function syncAccrual(state: FarmState, now: number): FarmState {
  const rate = dailyAccrualRate(state);
  if (rate <= 0) return state;

  let anchor = state.accrualAnchorAt;
  if (anchor == null) {
    if (state.lastClaimAt != null) anchor = state.lastClaimAt;
    else anchor = now;
  }

  const tickFrom = state.lastAccrualTickAt ?? anchor;
  const accrualEndsAt = anchor + MAX_ACCRUAL_HOURS * HOUR_MS;
  if (now <= tickFrom) return state;
  if (tickFrom >= accrualEndsAt) return state;

  const effectiveNow = Math.min(now, accrualEndsAt);
  const elapsedMs = effectiveNow - tickFrom;
  const added = (rate * elapsedMs) / DAY_MS;
  const cap = maxPendingPoints(state);
  const pendingPoints = Math.min(state.pendingPoints + added, cap);

  return {
    ...state,
    pendingPoints,
    accrualAnchorAt: anchor,
    lastAccrualTickAt: effectiveNow,
  };
}

export function canClaim(state: FarmState, now = Date.now()): boolean {
  const synced = syncAccrual(state, now);
  if (synced.pendingPoints < 0.01) return false;
  if (!synced.lastClaimAt) return true;
  return now - synced.lastClaimAt >= CLAIM_COOLDOWN_HOURS * HOUR_MS;
}

export function claimCooldownLeftMs(state: FarmState, now = Date.now()): number {
  if (!state.lastClaimAt) return 0;
  const next = state.lastClaimAt + CLAIM_COOLDOWN_HOURS * HOUR_MS;
  return Math.max(0, next - now);
}

export function accrualStopped(state: FarmState, now = Date.now()): boolean {
  const anchor = state.accrualAnchorAt ?? state.lastClaimAt;
  if (anchor == null) return false;
  return now >= anchor + MAX_ACCRUAL_HOURS * HOUR_MS;
}

export function performClaim(state: FarmState, now = Date.now()): FarmState | null {
  const synced = syncAccrual(state, now);
  if (!canClaim(synced, now)) return null;

  const collected = Math.floor(synced.pendingPoints * 100) / 100;

  return {
    ...synced,
    points: synced.points + collected,
    pendingPoints: 0,
    lastClaimAt: now,
    accrualAnchorAt: now,
    lastAccrualTickAt: now,
  };
}

export function unlockSlot(
  state: FarmState,
  slotIndex: number,
  cost: number,
): FarmState | null {
  if (slotIndex > state.unlockedSlots + 1 || slotIndex <= state.unlockedSlots) {
    return null;
  }
  if (state.points < cost) return null;
  return {
    ...state,
    points: state.points - cost,
    unlockedSlots: slotIndex,
  };
}

export function isNftAlreadyBound(state: FarmState, contract: string, tokenId: string): boolean {
  const c = contract.toLowerCase();
  return Object.values(state.boundSlots).some(
    (b) => b && b.contract.toLowerCase() === c && b.tokenId === tokenId,
  );
}

export function bindNftToSlot(
  state: FarmState,
  slotIndex: number,
  nft: BoundNft,
  now = Date.now(),
): FarmState | null {
  if (slotIndex < 1 || slotIndex > state.unlockedSlots) return null;
  if (state.boundSlots[slotIndex]) return null;
  if (isNftAlreadyBound(state, nft.contract, nft.tokenId)) return null;

  const synced = syncAccrual(state, now);
  const anchor = synced.accrualAnchorAt ?? now;

  return {
    ...synced,
    boundSlots: { ...synced.boundSlots, [slotIndex]: nft },
    accrualAnchorAt: anchor,
    lastAccrualTickAt: synced.lastAccrualTickAt ?? now,
  };
}

export function unbindNftFromSlot(state: FarmState, slotIndex: number): FarmState | null {
  if (!state.boundSlots[slotIndex]) return null;
  const boundSlots = { ...state.boundSlots, [slotIndex]: null };
  return { ...state, boundSlots };
}

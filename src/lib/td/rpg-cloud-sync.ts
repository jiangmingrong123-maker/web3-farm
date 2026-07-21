import type { HeroSave } from "@/config/td/rpg";
import { syncHeroLevel } from "@/config/td/rpg";
import {
  authTdRpgSyncApi,
  saveTdRpgApi,
  type HeroCloudPayload,
  type TdSignFn,
} from "@/lib/td-api";
import {
  HERO_SAVE_VERSION,
  loadHeroSave,
  loadHeroUpdatedAt,
  parseHeroSave,
  pickBetterHeroSave,
  saveHeroSave,
} from "@/lib/td/rpg-storage";

const TOKEN_KEY = "td_rpg_sync_token";

type TokenCache = { syncToken: string; expiresAt: number };

function tokenStorageKey(wallet: string) {
  return `${TOKEN_KEY}:${wallet.toLowerCase()}`;
}

export function loadSyncToken(wallet: string): TokenCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(tokenStorageKey(wallet));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TokenCache;
    if (!parsed.syncToken || !parsed.expiresAt) return null;
    if (Date.now() > parsed.expiresAt - 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSyncToken(wallet: string, cache: TokenCache) {
  if (typeof window === "undefined") return;
  localStorage.setItem(tokenStorageKey(wallet), JSON.stringify(cache));
}

export function toHeroCloudPayload(save: HeroSave, updatedAt = Date.now()): HeroCloudPayload {
  const synced = syncHeroLevel(save);
  return {
    heroSave: { ...synced, saveVersion: HERO_SAVE_VERSION } as HeroSave,
    heroUpdatedAt: updatedAt,
  };
}

function isStarterHero(save: HeroSave): boolean {
  return (
    save.worldMap === 1 &&
    save.worldScene === 1 &&
    save.level === 1 &&
    save.exp === 0
  );
}

/** 合并本机与云端存档，写回本机缓存；若本机更靠前则需要上传 */
export function mergeHeroWithCloud(
  wallet: string,
  cloudHeroRaw: unknown,
  cloudUpdatedAt: number,
): { save: HeroSave; updatedAt: number; needsUpload: boolean } {
  const local = loadHeroSave(wallet);
  const localAt = loadHeroUpdatedAt(wallet);
  const cloud = parseHeroSave(cloudHeroRaw);
  if (!cloud) {
    const updatedAt = localAt || Date.now();
    saveHeroSave(wallet, local, updatedAt);
    return {
      save: local,
      updatedAt,
      needsUpload: !isStarterHero(local),
    };
  }
  const picked = pickBetterHeroSave(local, localAt, cloud, cloudUpdatedAt || 0);
  const updatedAt = picked.updatedAt || Date.now();
  saveHeroSave(wallet, picked.save, updatedAt);
  return {
    save: picked.save,
    updatedAt,
    needsUpload: picked.source === "a",
  };
}

export async function ensureRpgSyncToken(
  wallet: string,
  sign: TdSignFn,
): Promise<string | null> {
  const cached = loadSyncToken(wallet);
  if (cached) return cached.syncToken;
  const auth = await authTdRpgSyncApi(wallet, sign);
  if (!auth) return null;
  saveSyncToken(wallet, auth);
  return auth.syncToken;
}

export async function uploadHeroToCloud(
  wallet: string,
  save: HeroSave,
  updatedAt: number,
  sign: TdSignFn,
): Promise<boolean> {
  try {
    const payload = toHeroCloudPayload(save, updatedAt);
    const token = await ensureRpgSyncToken(wallet, sign);
    if (token) {
      const res = await saveTdRpgApi(wallet, payload, { syncToken: token });
      if (res) return true;
    }
    const signed = await saveTdRpgApi(wallet, payload, { sign });
    return !!signed;
  } catch {
    return false;
  }
}

type Pending = { wallet: string; save: HeroSave; updatedAt: number };

let pending: Pending | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
/** 用户拒签后，避免每次 refresh 反复弹窗；下次本地存档变更再试 */
let syncPausedAfterReject = false;

/** 防抖上传；首次可能需签名一次开通 7 天同步令牌 */
export function queueHeroCloudUpload(
  wallet: string,
  save: HeroSave,
  updatedAt: number,
  sign: TdSignFn,
  opts?: { force?: boolean },
) {
  if (syncPausedAfterReject && !opts?.force) return;
  pending = { wallet, save, updatedAt };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void flushHeroCloudUpload(sign);
  }, 800);
}

export async function flushHeroCloudUpload(sign: TdSignFn) {
  if (flushing) return;
  const job = pending;
  if (!job) return;
  pending = null;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  flushing = true;
  try {
    const ok = await uploadHeroToCloud(job.wallet, job.save, job.updatedAt, sign);
    syncPausedAfterReject = !ok;
  } finally {
    flushing = false;
    if (pending) {
      void flushHeroCloudUpload(sign);
    }
  }
}

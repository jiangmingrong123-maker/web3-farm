/** Shared farm points read/write (farm:${wallet} in SWAP_KV). */

export type FarmKv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

function farmKey(wallet: string) {
  return `farm:${wallet.toLowerCase()}`;
}

export async function loadFarmPoints(kv: FarmKv | undefined, wallet: string): Promise<number> {
  if (!kv) return 0;
  const raw = await kv.get(farmKey(wallet));
  if (!raw) return 0;
  try {
    const p = JSON.parse(raw) as { points?: number };
    return Math.max(0, Number(p.points) || 0);
  } catch {
    return 0;
  }
}

export async function deductFarmPoints(
  kv: FarmKv | undefined,
  wallet: string,
  amount: number,
): Promise<{ ok: true; remaining: number } | { ok: false; have: number; need: number }> {
  if (amount <= 0) {
    const have = await loadFarmPoints(kv, wallet);
    return { ok: true, remaining: have };
  }
  const have = await loadFarmPoints(kv, wallet);
  if (have < amount) return { ok: false, have, need: amount };
  const remaining = have - amount;
  if (kv) {
    const raw = await kv.get(farmKey(wallet));
    const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    await kv.put(farmKey(wallet), JSON.stringify({ ...base, points: remaining }));
  }
  return { ok: true, remaining };
}

import { tickAllRunning } from "./lib/quant/tick";

interface Env {
  SWAP_KV?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
}

/** Cloudflare Pages cron — configure in Dashboard → Cron triggers (e.g. every 5 min) */
export async function onScheduled(
  _event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  await tickAllRunning(env.SWAP_KV);
}

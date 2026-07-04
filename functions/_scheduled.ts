/**
 * NOTE: Cloudflare Pages 不支持 Cron，此文件在 Pages 上不会自动执行。
 * 请用 workers/quant-cron Worker 或 cron-job.org 调用 /api/quant/cron/tick
 * 详见 docs/QUANT-CLOUD-DEPLOY.md
 */
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

/**
 * 定时调用 Pages 上的 /api/quant/cron/tick
 * Pages 本身不支持 Cron，需单独部署此 Worker。
 *
 * 部署：见 docs/QUANT-CLOUD-DEPLOY.md
 */
export interface Env {
  PAGES_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runTick(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/run" && request.method === "POST") {
      const secret = request.headers.get("x-cron-secret") ?? "";
      if (!env.CRON_SECRET || secret !== env.CRON_SECRET) {
        return new Response("unauthorized", { status: 401 });
      }
      const result = await runTick(env);
      return Response.json(result);
    }
    return new Response("quant-cron worker ok", { status: 200 });
  },
};

async function runTick(env: Env): Promise<{ ok: boolean; status?: number; body?: string }> {
  const target = `${env.PAGES_URL.replace(/\/$/, "")}/api/quant/cron/tick`;
  const res = await fetch(target, {
    method: "POST",
    headers: { "x-cron-secret": env.CRON_SECRET },
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

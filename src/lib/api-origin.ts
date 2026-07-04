const PROD_ORIGIN = "https://web3-farm.pages.dev";

/** Cloudflare Functions live on production; localhost static dev has no /api. */
export function resolveApiOrigin(): string {
  const env = process.env.NEXT_PUBLIC_API_ORIGIN?.trim();
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return PROD_ORIGIN;
  }
  return "";
}

export function apiRoot(): string {
  const origin = resolveApiOrigin();
  return origin ? `${origin}/api` : "/api";
}

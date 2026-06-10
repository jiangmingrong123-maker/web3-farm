#!/usr/bin/env node
/**
 * Grant farm points to a wallet (admin only).
 *
 * Usage:
 *   ADMIN_SECRET=xxx node scripts/grant-points.mjs 0xWallet 5000
 *   ADMIN_SECRET=xxx node scripts/grant-points.mjs 0xWallet 5000 --set
 *
 * Env:
 *   FARM_API_URL — default https://web3-farm.pages.dev/api/farm
 */

const wallet = process.argv[2];
const points = Number(process.argv[3]);
const mode = process.argv.includes("--set") ? "set" : "add";
const secret = process.env.ADMIN_SECRET;
const base = (process.env.FARM_API_URL ?? "https://web3-farm.pages.dev/api/farm").replace(
  /\/$/,
  "",
);

if (!secret) {
  console.error("Set ADMIN_SECRET env var (Cloudflare Pages secret).");
  process.exit(1);
}
if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
  console.error("Usage: ADMIN_SECRET=... node scripts/grant-points.mjs 0xWallet <points> [--set]");
  process.exit(1);
}
if (!Number.isFinite(points) || points < 0) {
  console.error("Points must be a non-negative number.");
  process.exit(1);
}

const res = await fetch(`${base}/admin/grant`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Admin-Secret": secret,
  },
  body: JSON.stringify({
    wallet: wallet.toLowerCase(),
    points,
    mode,
  }),
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  data = { raw: text };
}

if (!res.ok) {
  console.error("Grant failed:", res.status, data);
  process.exit(1);
}

console.log("OK:", JSON.stringify(data, null, 2));

/**
 * 量化工具冒烟测试：外部 API + 回测引擎
 * 运行: node scripts/test-quant.mjs
 */

const POOL = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640";

function sma(values, period) {
  const out = [];
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    out.push(sum / period);
  }
  return out;
}

async function fetchKlines(limit = 100) {
  const url = `https://api.geckoterminal.com/api/v2/networks/eth/pools/${POOL}/ohlcv/hour?aggregate=1&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GeckoTerminal ${res.status}`);
  const json = await res.json();
  const list = json.data?.attributes?.ohlcv_list ?? [];
  return list
    .map((row) => ({
      time: row[0] * 1000,
      open: row[1],
      high: row[2],
      low: row[3],
      close: row[4],
      volume: row[5],
    }))
    .sort((a, b) => a.time - b.time);
}

async function fetchPrice() {
  const url = `https://api.dexscreener.com/latest/dex/pairs/ethereum/${POOL}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`DexScreener ${res.status}`);
  const json = await res.json();
  const p = parseFloat(json.pair?.priceUsd ?? "0");
  if (!p) throw new Error("No price");
  return p;
}

function runMaCross(klines, fast = 7, slow = 25, cash = 10000) {
  const closes = klines.map((k) => k.close);
  const f = sma(closes, fast);
  const s = sma(closes, slow);
  let position = 0;
  let balance = cash;
  let trades = 0;
  for (let i = 1; i < klines.length; i++) {
    if (f[i - 1] == null || s[i - 1] == null || f[i] == null || s[i] == null) continue;
    const price = closes[i];
    if (position === 0 && f[i - 1] <= s[i - 1] && f[i] > s[i]) {
      position = balance / price;
      balance = 0;
      trades++;
    } else if (position > 0 && f[i - 1] >= s[i - 1] && f[i] < s[i]) {
      balance = position * price;
      position = 0;
      trades++;
    }
  }
  const equity = balance + position * closes[closes.length - 1];
  return { trades, returnPct: ((equity - cash) / cash) * 100, equity };
}

const checks = [];

async function check(name, fn) {
  try {
    const result = await fn();
    checks.push({ name, ok: true, result });
    console.log(`✓ ${name}`, result !== undefined ? JSON.stringify(result) : "");
  } catch (e) {
    checks.push({ name, ok: false, error: e.message });
    console.log(`✗ ${name}: ${e.message}`);
  }
}

console.log("=== Quant tool smoke test ===\n");

await check("GeckoTerminal K-lines", async () => {
  const k = await fetchKlines(120);
  if (k.length < 30) throw new Error(`Too few bars: ${k.length}`);
  return { bars: k.length, lastClose: k[k.length - 1].close.toFixed(2) };
});

await check("DexScreener spot price", async () => {
  const p = await fetchPrice();
  return { usd: p.toFixed(2) };
});

await check("MA crossover backtest", async () => {
  const k = await fetchKlines(200);
  const r = runMaCross(k);
  return { trades: r.trades, returnPct: r.returnPct.toFixed(2) + "%" };
});

await check("Polymarket removed from codebase", async () => {
  const { readdirSync, existsSync } = await import("fs");
  const { join } = await import("path");
  const root = new URL("../src", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
  const bad = [
    join(root, "lib/quant/polymarket-api.ts"),
    join(root, "components/quant/PolymarketPanel.tsx"),
  ];
  for (const p of bad) {
    if (existsSync(p)) throw new Error(`Still exists: ${p}`);
  }
  return { removed: true };
});

const failed = checks.filter((c) => !c.ok);
console.log(`\n=== ${checks.length - failed.length}/${checks.length} passed ===`);
process.exit(failed.length ? 1 : 0);

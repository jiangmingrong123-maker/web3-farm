# 量化 · 云端模拟（7×24）

**不用买 VPS，也不用 cron-job.org。**  
Pages 存状态 + **GitHub Actions 每 5 分钟调 API**（推荐）或 Cloudflare Worker。

---

## 架构

| 组件 | 作用 |
|------|------|
| **Cloudflare Pages** | 网站 + `/api/quant/...` + KV 存模拟 |
| **GitHub Actions** | 每 5 分钟 POST `/api/quant/cron/tick` |
| **CRON_SECRET** | Pages 与 GitHub 用同一串密钥校验 |

Pages **没有 Cron 菜单**，这是正常的。

---

## 第 1 步：KV（已完成 ✅）

Bindings：**SWAP_KV** → `web3-farm-swap`

---

## 第 2 步：Pages 密钥（已完成 ✅）

Variables and secrets → **CRON_SECRET**（Secret）→ Retry deployment

---

## 第 3 步：GitHub 里存同一个密码（推荐）

1. 打开 [https://github.com/jiangmingrong123-maker/web3-farm/settings/secrets/actions](https://github.com/jiangmingrong123-maker/web3-farm/settings/secrets/actions)
2. **New repository secret**
3. Name: **`CRON_SECRET`**
4. Value: **与 Cloudflare Pages 里完全相同的那串**
5. **Add secret**

仓库里已有工作流：`.github/workflows/quant-cloud-tick.yml`  
推送到 `main` 后，GitHub 会 **每 5 分钟** 自动调用一次。

### 手动试跑（不等 5 分钟）

1. GitHub 仓库 → **Actions**
2. 左侧 **Quant cloud tick**
3. **Run workflow** → **Run workflow**
4. 点开这次运行，看日志里是否有 `HTTP 200` 和 `{"ok":true,...}`

---

## 第 4 步：网页开云端模拟

1. [https://web3-farm.pages.dev/zh/quant/](https://web3-farm.pages.dev/zh/quant/)
2. 连接钱包 → **云端模拟** → 选配置 → **开始云端模拟**
3. 等 5～10 分钟刷新，看 **上次云端检查 / 已检查次数** 是否增加
4. **可关页面**

---

## 备选：Cloudflare Worker（不用 GitHub Actions）

若不想用 GitHub 定时：

```powershell
cd D:\mygame\web3-farm\workers\quant-cron
npm install -g wrangler
wrangler login
wrangler secret put CRON_SECRET
wrangler deploy
```

Dashboard → **Workers & Pages** → **web3-farm-quant-cron** → Settings → Triggers → Cron。

---

## 本机自测 API

```powershell
Invoke-WebRequest -Uri "https://web3-farm.pages.dev/api/quant/cron/tick" -Method POST -Headers @{ "x-cron-secret" = "你的CRON_SECRET" }
```

- `{"ok":true,"ticked":0}` → API 正常（0 = 还没人开云端模拟）
- `401` → 密码不一致或未 Retry deployment

---

## 常见问题

| 现象 | 处理 |
|------|------|
| Actions 报 Missing CRON_SECRET | 完成第 3 步 GitHub Secret |
| ticked 一直是 0 | 网页先点「开始云端模拟」 |
| 长期「观望」 | 行情未触发规则，可换币/回测 |

---

## 费用

GitHub Actions 公开仓库免费额度通常够用；无需 VPS。

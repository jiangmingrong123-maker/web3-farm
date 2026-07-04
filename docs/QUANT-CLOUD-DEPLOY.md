# 量化 · 云端模拟（7×24）

**不用买 VPS。** 用现有 Cloudflare Pages + KV；定时任务需 **额外一个小 Worker** 或 **免费外部 Cron**（见下文）。

---

## 为什么找不到 Functions / Cron？

你截图里的 **Settings** 只有：Build、Variables and secrets、**Bindings**、Runtime、General。

**Cloudflare Pages 没有 Cron 定时任务功能**（官方对比表里 Pages = ❌，Workers = ✅）。  
所以 **不会有「Functions → Cron triggers」** 这一项；这不是你漏配了。

当前架构：

| 组件 | 作用 |
|------|------|
| **Pages** | 网站 + API（`/api/quant/...`）+ KV 存模拟状态 |
| **Worker 或外部 Cron** | 每 5 分钟 **调用一次** API，触发公式计算 |

---

## 第 1 步：KV（你已完成 ✅）

Bindings 里已有 **SWAP_KV** → `web3-farm-swap`，无需再改。

---

## 第 2 步：设置密钥 CRON_SECRET

1. **Pages 项目** → Settings → **Variables and secrets**
2. **Add** → Type: **Secret**
3. Name: `CRON_SECRET`  
   Value: 自拟一串随机密码（例如 `MyFarmQuant2026_xK9p`）
4. Environment: **Production**（Preview 也可加同一个）
5. 保存后 **Deployments → Retry deployment**

---

## 第 3 步：选一种定时方式（二选一）

### 方案 A · 免费外部 Cron（最简单，推荐先试）

不用 Wrangler，5 分钟搞定：

1. 打开 [https://cron-job.org](https://cron-job.org) 注册（免费）
2. **Create cron job**
   - **URL**: `https://web3-farm.pages.dev/api/quant/cron/tick`
   - **Method**: POST
   - **Headers** 添加一行：  
     `x-cron-secret` = 你在第 2 步设的 `CRON_SECRET`
   - **Schedule**: 每 5 分钟（或选 `*/5 * * * *`）
3. 保存并启用

**手动测试**（PowerShell，把密钥换成你的）：

```powershell
Invoke-WebRequest -Uri "https://web3-farm.pages.dev/api/quant/cron/tick" -Method POST -Headers @{ "x-cron-secret" = "你的CRON_SECRET" }
```

返回类似 `{"ok":true,"ticked":0}` 即 API 正常（ticked=0 表示当前没有人在跑云端模拟）。

---

### 方案 B · Cloudflare Worker（长期用，在 Dashboard 里能看到 Cron）

1. 安装 Wrangler（本机一次）：

```powershell
cd D:\mygame\web3-farm\workers\quant-cron
npm install -g wrangler
wrangler login
```

2. 上传密钥（与 Pages 里 **相同** 的 CRON_SECRET）：

```powershell
wrangler secret put CRON_SECRET
```

3. 部署 Worker：

```powershell
wrangler deploy
```

4. 在 Dashboard 验证：  
   **Workers & Pages** → 列表里出现 **web3-farm-quant-cron**（类型是 **Worker**，不是 Pages）  
   → 点进去 → **Settings** → **Triggers** → **Cron Triggers**  
   应看到 `*/5 * * * *`

> Worker 的 Cron 入口在 **Worker 项目**里，不在 web3-farm Pages 项目里。

---

## 第 4 步：网页上使用

1. [https://web3-farm.pages.dev/zh/quant/](https://web3-farm.pages.dev/zh/quant/)
2. **连接钱包** + 签名登录
3. 选 **「云端模拟」** → 选币/策略/参数
4. **开始云端模拟**（钱包再签一次）
5. 等 5～10 分钟刷新，看 **「上次云端检查」「已检查次数」** 是否增加
6. **可关页面**，定时任务会继续跑

---

## 常见问题

| 现象 | 原因 | 处理 |
|------|------|------|
| 找不到 Functions/Cron | Pages 不支持 | 用方案 A 或 B |
| API 401 | CRON_SECRET 不对或未部署 | 检查 Pages 变量并 Retry deployment |
| ticked 一直是 0 | 没人开云端模拟 | 先在网页点「开始云端模拟」 |
| 长期只有「观望」 | 行情未触发规则 | 正常，可换币或回测 |

---

## 费用

- Pages + KV + Worker 免费额度对个人项目通常够用
- **无需单独云服务器月租**

---

## 与实盘

云端模拟跑通后，实盘在同一套 Cron + KV 上增加 **钱包签名下单** 即可。

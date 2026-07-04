# 量化 · 云端模拟（7×24）

不用单独买 VPS。沿用 **Cloudflare Pages + 已有 KV（SWAP_KV）+ 定时 Cron**，公式在云端每约 5 分钟跑一轮。

---

## 第 1 步：确认 KV 已绑定（多半已完成）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Workers & Pages** → **web3-farm** → **Settings** → **Bindings**
3. 确认已有 **`SWAP_KV`** → 命名空间 `web3-farm-swap`（与 SWAP 功能相同）
4. 若没有：按 [SWAP-DEPLOY.md](./SWAP-DEPLOY.md) 第 1 步创建并绑定

---

## 第 2 步：添加 Cron 定时触发（必做）

1. 同一项目 **Settings** → **Functions**
2. 找到 **Cron triggers** → **Add Cron Trigger**
3. 填写：

| 字段 | 值 |
|------|-----|
| Cron expression | `*/5 * * * *`（每 5 分钟） |
| Target | 默认 Scheduled handler |

4. 保存后 **Deployments** → 对最新部署点 **Retry deployment**（或等 Git 自动部署完成）

> 代码里已有 `functions/_scheduled.ts`，Cron 到点会自动对所有「云端运行中」的模拟账户执行一轮检查。

---

## 第 3 步（可选）：手动触发 / 调试密钥

若需手动跑一轮云端 tick（测试用）：

1. **Settings** → **Variables and Secrets** → **Add**
2. Name: `CRON_SECRET`，Value: 自拟一串随机密码
3. 部署后执行：

```powershell
curl -X POST "https://web3-farm.pages.dev/api/quant/cron/tick" -H "x-cron-secret: 你的密钥"
```

返回 `{ "ok": true, "ticked": N }` 表示成功。

---

## 第 4 步：网页上使用

1. 打开 [https://web3-farm.pages.dev/zh/quant/](https://web3-farm.pages.dev/zh/quant/)
2. **右上角连接钱包** 并 **签名登录**（与展馆相同）
3. 模拟区选择 **「云端模拟」**（默认推荐）
4. 选链、选币、选策略、选参数 → **开始云端模拟**
5. 钱包签名一次确认 → 之后 **可关闭页面**，云端仍会按 Cron 继续

回到页面可看到：上次检查时间、检查次数、信号、模拟盈亏、成交日志。

---

## 常见问题

| 现象 | 原因 | 处理 |
|------|------|------|
| 提示 KV 未配置 | 未绑定 SWAP_KV | 完成第 1 步并重新部署 |
| 云端开了但不更新 | Cron 未配 | 完成第 2 步 |
| 开始失败 / 403 | 未签名或签名过期 | 重新连接钱包并签名 |
| 长期只有「观望」 | 行情未触发规则 | 正常；可换币/换策略/回测查看 |
| 本机模拟 | 旧模式 | 切「本机模拟」须保持标签页打开 |

---

## 与实盘的关系

| | 云端模拟（当前） | 实盘（规划） |
|--|----------------|--------------|
| 算力 | Cloudflare Cron + KV | 同上 + 下单模块 |
| 资金 | 虚拟 $10,000 | 真钱包 / 交易所 API |
| 关页 | 可关 | 可关 |
| AI | 不需要 | 可选（用户自备） |

云端模拟跑通后，实盘只需在同样 Cron 链路上 **增加「满足信号 → 发 swap / API 下单」**，架构可复用。

---

## 费用参考

- **Cloudflare Pages + Functions + KV**：个人项目通常免费额度内够用
- Cron 每 5 分钟 ≈ 288 次/天；用户少时远低于免费限额
- **无需额外云服务器月租**

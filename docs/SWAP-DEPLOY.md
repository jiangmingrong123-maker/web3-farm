# NFT 互换 · 后端与合约部署

## 1. Cloudflare KV（房间同步 + 聊天）

1. Cloudflare Dashboard → **Workers & Pages** → **KV**
2. **Create namespace** → 名称如 `web3-farm-swap`
3. 进入 **web3-farm** Pages 项目 → **Settings** → **Functions** → **KV namespace bindings**
4. 添加绑定：
   - Variable name: `SWAP_KV`
   - KV namespace: `web3-farm-swap`
5. 重新部署（push 到 main 或 Retry deployment）

API 路由（Pages Functions）：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/rooms` | 创建房间 |
| GET | `/api/rooms/:id` | 拉取房间（含双方格子、聊天） |
| PATCH | `/api/rooms/:id` | 更新本方格子 / 确认 |
| POST | `/api/rooms/:id/messages` | 发送聊天 |

前端每 3 秒轮询 GET 房间，双方可实时看到对方格子。

## 2. 托管合约（一键成交）

### 部署

```bash
cd web3-farm
npm install --save-dev solc
# .env 中设置 DEPLOYER_PRIVATE_KEY（勿提交 Git）
node scripts/deploy-swap.mjs
```

需要主网 ETH 支付 gas。

### 配置前端

Cloudflare Pages → **Environment variables**：

```
NEXT_PUBLIC_SWAP_CONTRACT=0x部署得到的地址
```

重新部署后，双方确认本方会出现 **「一键成交」** 按钮。

### 成交流程（链上）

1. 甲方（房间创建者）点击 → 授权 NFT → `createOrder`
2. 乙方点击 → 授权 NFT → `acceptOrder`
3. 双方各点一次 → `confirm`（第二次 confirm 触发原子过户）

## 3. 本地开发

`next dev` 下 `/api/rooms` 不可用，自动降级为 **localStorage**（仅本机测试）。

要测跨设备同步，需部署到 Cloudflare 并绑定 KV。

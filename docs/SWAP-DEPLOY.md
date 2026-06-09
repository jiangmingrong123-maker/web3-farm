# NFT 互换 · 完整上线清单

按顺序做完下面 **4 步**，互换功能即全部可用。

---

## ✅ 第 1 步：Cloudflare KV（房间同步 + 聊天 + 倒计时）

1. **Storage & databases** → **KV** → Create → 名称 `web3-farm-swap`
2. **Workers & Pages** → **web3-farm** → **Settings** → **Bindings**
3. Add binding：`SWAP_KV` → `web3-farm-swap`
4. **Deployments** → Retry 最新部署

验证：两台设备打开同一房间链接，聊天互通。

---

## ✅ 第 2 步：部署托管合约（以太坊主网）

### 准备

- 部署钱包内有 **≥ 0.01 ETH**（视 gas 而定）
- Nobody NFT 在该钱包（测试用）

### 命令

```powershell
cd D:\mygame\web3-farm
npm install
# 创建 .env（不要提交 Git），填入：
# DEPLOYER_PRIVATE_KEY=0x你的私钥
# ETH_RPC_URL=https://eth.llamarpc.com

npm run deploy:swap
```

成功后会输出：

```
NFTSwapEscrow deployed at: 0x...
Whitelisted Nobody: 0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a
NEXT_PUBLIC_SWAP_CONTRACT=0x...
```

记录合约地址，在 [Etherscan](https://etherscan.io) 验证源码（可选但建议）。

---

## ✅ 第 3 步：Cloudflare 环境变量

**web3-farm** → **Settings** → **Environment variables** → **Production**：

| 变量 | 值 |
|------|-----|
| `NEXT_PUBLIC_SWAP_CONTRACT` | 第 2 步输出的 `0x...` |
| `NODE_VERSION` | `20` |

⚠️ 静态站点在 **构建时** 写入 env，改完后必须 **重新部署**。

---

## ✅ 第 4 步：端到端测试

1. 打开 https://web3-farm.pages.dev/zh/swap/
2. 连接 MetaMask（以太坊主网）
3. A 创建房间 → 复制链接给 B
4. 双方放 Nobody NFT → **确认本方**
5. A 点 **存入 NFT 并等待成交**（创建链上订单 + 存入）
6. B 在 **10 分钟倒计时** 内也点存入
7. 应显示 **交换已完成**
8. 测超时：仅 A 存入 → 等 10 分钟 → **取回我的 NFT**

---

## 链上流程（方案 B · 存入式）

| 步骤 | 操作 | 需要授权整个集合？ |
|------|------|-------------------|
| 1 | 双方网页确认 | 否 |
| 2 | A `createOrder` + `deposit` | 否，只转指定 NFT |
| 3 | B `deposit` | 否 |
| 4 | 合约自动互转 | — |
| 超时 | `withdraw` 取回 | 否 |

倒计时：**10 分钟**，网页按秒刷新。

---

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/rooms` | 创建房间 |
| GET | `/api/rooms/:id` | 拉取房间 |
| PATCH | `/api/rooms/:id` | 更新格子 / `depositStarted` / `swapExecuted` / `swapReset` |
| POST | `/api/rooms/:id/messages` | 聊天 |

---

## 本地开发

`npm run dev` 下 API 不可用，自动降级 localStorage（仅本机）。

跨设备测试请用已部署的 Cloudflare 站点。

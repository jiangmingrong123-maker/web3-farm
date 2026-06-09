# NFT 互换（Swap）· 安全设计

## 产品目标

两名用户各自把要交换的 NFT 放入格子，双方确认后 **原子交换** — 要么两边 NFT 同时到账，要么都不转。

## 防骗核心（必须链上验证）

| 风险 | 对策 |
|------|------|
| 假图 / 假 NFT | **禁止用户上传图片**；只展示 `tokenURI` 拉取的链上元数据 |
| 错误合约地址 | 仅允许 **白名单合约**（`collections.ts` 已登记集合） |
| 不属于自己的 NFT | `ownerOf(tokenId)` 必须等于当前连接钱包 |
| 一方确认后另一方跑路 | **托管合约原子执行**：双方 `confirm` 后同一笔交易完成双向 `safeTransferFrom` |
| 合约未授权就转走 | 执行前检查 `isApprovedForAll` 或 `getApproved` 指向托管合约 |

## 用户流程

1. 连接钱包（Ethereum 主网）
2. 创建交换房间 → 复制链接给对方
3. 各自在格子中添加 NFT：选集合 + Token ID → **链上校验**通过后入格
4. 双方点击「确认本方」锁定格子
5. 授权托管合约（`setApprovalForAll`）
6. 双方链上 `confirm` → 合约 `execute` 同时过户

## 当前实现状态

| 模块 | 状态 |
|------|------|
| 交换页 UI（双栏 4 格） | ✅ |
| 白名单 + ownerOf 校验 | ✅ |
| 链上元数据图片 | ✅（ipfs/https） |
| 无钱包创建房间 | ✅ |
| 房间链接分享 | ✅ |
| 跨用户房间同步 | ✅（Cloudflare KV + `/api/rooms`） |
| 房间聊天 | ✅ |
| 原子交换执行 | ⏳ 部署合约 + `NEXT_PUBLIC_SWAP_CONTRACT` |

部署合约后，在 Cloudflare / `.env` 设置：

```
NEXT_PUBLIC_SWAP_CONTRACT=0x你的托管合约地址
```

## 合约部署后

1. `setCollectionWhitelist(NOBODY_CONTRACT, true)`
2. 前端读取 `orders(orderId)` 展示对方挂单
3. Maker `createOrder` → 分享 `orderId`
4. Taker `acceptOrder` → 双方 `confirm` → 自动执行

## 扩展

- 多集合：在 `collections.ts` 登记并加入合约白名单
- ERC-1155：需单独策略与合约分支
- 手续费：可在 `_execute` 前加入平台 fee 地址

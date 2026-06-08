# Web3 Farm

多集合 NFT 绑定产分平台 · **Nobody** 首个接入 · ETH 验资产 → 后期 BSC 代币/空投

## 文档

- [产品 PRD](./docs/PRD.md)
- [数据库设计](./docs/DATABASE.md)
- [**省钱上线指南（Vercel + Cloudflare）**](./docs/DEPLOY-BUDGET.md)
- [**GitHub + Cloudflare Pages 逐步操作**](./docs/GITHUB-CLOUDFLARE.md)

## 档位倍率（已定）

| 档位 | 倍率 | Nobody 判定 |
|------|------|-------------|
| SPECIAL | 50× | 有 `special` trait |
| TOP | 20× | 8 属性 + 平均 trait 占比 ≤ 5% |
| FULL | 10× | 8 属性 |
| RICH | 2× | 7 属性 |
| BASIC | 1.5× | 6 属性 |
| MINIMUM | 1× | 其他 |

日产积分 = `base_points_per_day × 倍率`（**base 待定**，开发默认 10 仅作试算）

## 快速开始

```bash
cd web3-farm
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)（默认跳转 `/zh`）

## 项目结构

```
web3-farm/
├── docs/              PRD + 数据库
├── data/trait-rarity/ trait 占比样本（全量需脚本生成）
├── src/
│   ├── config/        集合、档位、槽位
│   ├── lib/rarity/    稀有度引擎（nobody_v1）
│   ├── messages/      中英 i18n
│   └── app/[locale]/  页面
```

## 环境变量（可选）

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=   # WalletConnect 二维码（可选）
```

## 后续开发

- [ ] NFT 列表 Indexer（Alchemy / Moralis / Reservoir）
- [ ] 签名登录 API + PostgreSQL
- [ ] 绑定 / 领取 / 槽位
- [ ] 全系列 `trait_rarity_stats` 生成脚本
- [ ] BSC 代币与快照 claim

## 与 mygame 主站

本目录独立于 `index.html` 小游戏矩阵，后期可在 Nobody 收藏馆增加入口链接至此。

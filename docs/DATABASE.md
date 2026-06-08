# Web3 Farm · 数据库设计

> PostgreSQL · v0.1  
> 对应 PRD：`docs/PRD.md`

---

## 1. ER 关系概览

```
users ─────────────┬──────────── nft_bindings
                   │
                   ├──────────── user_points
                   │
                   └──────────── points_ledger

collections ───────┬──────────── nft_bindings
                   │
                   ├──────────── rarity_strategy_configs
                   │
                   └──────────── trait_rarity_stats

token_overrides ─── (collection_id, token_id)

metadata_cache ──── (collection_id, token_id)

slot_config ─────── 平台槽位解锁表

user_sessions ───── 签名登录会话（可选）
```

---

## 2. 表定义

### 2.1 `users`

| 列 | 类型 | 说明 |
|----|------|------|
| `wallet_address` | `CHAR(42) PK` | 小写 checksum 或统一 lowercase |
| `locale` | `VARCHAR(8)` | `zh` / `en` |
| `max_slots` | `INT` | 当前可用槽位数，默认 1 |
| `created_at` | `TIMESTAMPTZ` | |
| `updated_at` | `TIMESTAMPTZ` | |

```sql
CREATE TABLE users (
  wallet_address CHAR(42) PRIMARY KEY,
  locale VARCHAR(8) NOT NULL DEFAULT 'zh',
  max_slots INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 2.2 `collections`

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | `UUID PK` | |
| `slug` | `VARCHAR(64) UNIQUE` | 如 `nobody` |
| `name` | `VARCHAR(128)` | 展示名 |
| `chain_id` | `INT` | 1 = ETH |
| `contract_address` | `CHAR(42)` | |
| `standard` | `VARCHAR(16)` | `erc721` |
| `rarity_strategy` | `VARCHAR(64)` | `nobody_v1` |
| `trait_rarity_table_id` | `VARCHAR(64)` | 如 `nobody_stats_v1` |
| `enabled` | `BOOLEAN` | |
| `max_bindings_per_wallet` | `INT` | 单集合上限 |
| `slot_scope` | `VARCHAR(16)` | `global` / `per_collection` |
| `created_at` | `TIMESTAMPTZ` | |

```sql
CREATE UNIQUE INDEX idx_collections_chain_contract
  ON collections (chain_id, contract_address);
```

**Nobody 种子数据：**

```sql
INSERT INTO collections (
  id, slug, name, chain_id, contract_address,
  standard, rarity_strategy, trait_rarity_table_id,
  enabled, max_bindings_per_wallet, slot_scope
) VALUES (
  gen_random_uuid(),
  'nobody',
  'Nobody',
  1,
  '0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a',
  'erc721',
  'nobody_v1',
  'nobody_stats_v1',
  true,
  5,
  'global'
);
```

---

### 2.3 `rarity_strategy_configs`

按集合或全局存储 **可热更新** 的倍率与阈值。

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | `UUID PK` | |
| `collection_id` | `UUID FK` | NULL = 平台默认 |
| `strategy` | `VARCHAR(64)` | |
| `config_json` | `JSONB` | 见下方示例 |
| `version` | `INT` | |
| `active` | `BOOLEAN` | |
| `created_at` | `TIMESTAMPTZ` | |

**`config_json` 示例（nobody_v1）：**

```json
{
  "tierMultipliers": {
    "SPECIAL": 50,
    "TOP": 20,
    "FULL": 10,
    "RICH": 2,
    "BASIC": 1.5,
    "MINIMUM": 1
  },
  "topTierMaxAvgPercent": 5,
  "standardTraits": [
    "background", "body", "earrings", "face",
    "glasses", "handheld", "head", "skin"
  ],
  "tierFlagTrait": "special",
  "basePointsPerDay": null
}
```

> `basePointsPerDay: null` 表示尚未定稿，API 返回 `--` 或仅展示倍率。

---

### 2.4 `trait_rarity_stats`

离线扫描生成的 trait 占比表。

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | `BIGSERIAL PK` | |
| `table_id` | `VARCHAR(64)` | 如 `nobody_stats_v1` |
| `trait_type` | `VARCHAR(64)` | 小写归一化 |
| `trait_value` | `VARCHAR(256)` | |
| `token_count` | `INT` | |
| `total_supply` | `INT` | 通常 10000 |
| `percent` | `NUMERIC(6,3)` | 如 3.430 |
| `updated_at` | `TIMESTAMPTZ` | |

```sql
CREATE UNIQUE INDEX idx_trait_stats_lookup
  ON trait_rarity_stats (table_id, trait_type, trait_value);
```

---

### 2.5 `token_overrides`

单枚 NFT 人工校正，**优先级最高**。

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | `UUID PK` | |
| `collection_id` | `UUID FK` | |
| `token_id` | `VARCHAR(78)` | 大整数用字符串 |
| `tier_code` | `VARCHAR(16)` | 可选，直接指定档 |
| `multiplier` | `NUMERIC(10,4)` | 可选，直接指定倍率 |
| `note` | `TEXT` | |
| `updated_by` | `VARCHAR(64)` | |
| `updated_at` | `TIMESTAMPTZ` | |

```sql
CREATE UNIQUE INDEX idx_token_overrides_unique
  ON token_overrides (collection_id, token_id);
```

---

### 2.6 `metadata_cache`

| 列 | 类型 | 说明 |
|----|------|------|
| `collection_id` | `UUID FK` | |
| `token_id` | `VARCHAR(78)` | |
| `raw_json` | `JSONB` | |
| `parsed_tier` | `VARCHAR(16)` | 缓存档位 |
| `parsed_multiplier` | `NUMERIC(10,4)` | |
| `trait_count` | `INT` | |
| `avg_percent` | `NUMERIC(6,3)` | |
| `fetched_at` | `TIMESTAMPTZ` | |

```sql
CREATE PRIMARY KEY (collection_id, token_id);
```

---

### 2.7 `nft_bindings`

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | `UUID PK` | |
| `wallet_address` | `CHAR(42) FK` | |
| `collection_id` | `UUID FK` | |
| `token_id` | `VARCHAR(78)` | |
| `slot_index` | `INT` | 1-based |
| `tier_code` | `VARCHAR(16)` | 绑定时快照 |
| `multiplier` | `NUMERIC(10,4)` | 绑定时快照 |
| `status` | `VARCHAR(16)` | `active` / `unbound` / `lost_ownership` |
| `bound_at` | `TIMESTAMPTZ` | |
| `unbound_at` | `TIMESTAMPTZ` | |
| `last_chain_check_at` | `TIMESTAMPTZ` | |
| `last_claim_at` | `TIMESTAMPTZ` | |

**约束：**

```sql
-- 同一 token 全局仅一条 active 绑定
CREATE UNIQUE INDEX idx_bindings_active_token
  ON nft_bindings (collection_id, token_id)
  WHERE status = 'active';

CREATE INDEX idx_bindings_wallet_active
  ON nft_bindings (wallet_address)
  WHERE status = 'active';
```

---

### 2.8 `user_points`

| 列 | 类型 | 说明 |
|----|------|------|
| `wallet_address` | `CHAR(42) PK FK` | |
| `balance` | `NUMERIC(20,4)` | 当前余额 |
| `total_earned` | `NUMERIC(20,4)` | 累计获得 |
| `total_spent` | `NUMERIC(20,4)` | 累计消耗 |
| `updated_at` | `TIMESTAMPTZ` | |

---

### 2.9 `points_ledger`

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | `UUID PK` | |
| `wallet_address` | `CHAR(42) FK` | |
| `amount` | `NUMERIC(20,4)` | 正为获得，负为消耗 |
| `reason` | `VARCHAR(32)` | 见枚举 |
| `collection_id` | `UUID FK` | 可 NULL |
| `binding_id` | `UUID FK` | 可 NULL |
| `tier_code` | `VARCHAR(16)` | |
| `multiplier` | `NUMERIC(10,4)` | |
| `base_points` | `NUMERIC(10,4)` | 领取时的 base 快照 |
| `ref_id` | `VARCHAR(64)` | 幂等键 |
| `created_at` | `TIMESTAMPTZ` | |

**`reason` 枚举：**

| 值 | 说明 |
|----|------|
| `daily_claim` | 每日领取 |
| `unlock_slot` | 解锁槽位 |
| `admin_adjust` | 人工调整 |
| `airdrop_snapshot` | 后期 BSC 快照扣减 |
| `phase2_steal` | 第二期偷积分 |

```sql
CREATE UNIQUE INDEX idx_ledger_idempotent
  ON points_ledger (wallet_address, ref_id);
```

**领取幂等 `ref_id` 示例：**

```
claim:{binding_id}:{claim_window_start_iso}
```

---

### 2.10 `slot_config`

| 列 | 类型 | 说明 |
|----|------|------|
| `slot_index` | `INT PK` | |
| `unlock_cost` | `NUMERIC(20,4)` | 解锁该槽所需积分 |
| `scope` | `VARCHAR(16)` | `global` |
| `active` | `BOOLEAN` | |

**种子数据（TBD，可改）：**

```sql
INSERT INTO slot_config (slot_index, unlock_cost, scope, active) VALUES
  (1, 0, 'global', true),
  (2, 300, 'global', true),
  (3, 900, 'global', true),
  (4, 2400, 'global', true),
  (5, 6000, 'global', true);
```

---

### 2.11 `user_sessions`（可选）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | `UUID PK` | |
| `wallet_address` | `CHAR(42)` | |
| `nonce` | `VARCHAR(64)` | |
| `expires_at` | `TIMESTAMPTZ` | |
| `created_at` | `TIMESTAMPTZ` | |

---

## 3. 核心流程与 SQL 伪逻辑

### 3.1 每日领取（24h Claim）

```text
1. SELECT binding WHERE id = ? AND wallet = ? AND status = 'active'
2. 读链 ownerOf(tokenId) == wallet
3. IF last_claim_at + 24h > NOW() → 拒绝
4. base = config.basePointsPerDay; IF null → 拒绝或仅记录倍率
5. points = base × binding.multiplier
6. INSERT points_ledger (ref_id 幂等)
7. UPDATE user_points.balance += points
8. UPDATE binding.last_claim_at = NOW()
```

### 3.2 绑定时快照档位

```text
1. 读 metadata + trait_rarity_stats
2. rarity_engine.evaluate() → tier_code, multiplier
3. 应用 token_overrides
4. INSERT nft_bindings (tier_code, multiplier 快照)
```

### 3.3 定时校验持有

```text
CRON: 对 active bindings 批量 ownerOf
  → 不匹配则 status = 'lost_ownership'，停止产分
```

---

## 4. 索引与分区建议

| 表 | 索引 |
|----|------|
| `points_ledger` | `(wallet_address, created_at DESC)` |
| `nft_bindings` | `(wallet_address, status)` |
| `metadata_cache` | `(fetched_at)` 便于过期刷新 |

数据量大时 `points_ledger` 可按月分区。

---

## 5. 迁移工具建议

- [Prisma](https://www.prisma.io/) 或 [Drizzle ORM](https://orm.drizzle.team/) + SQL migrations  
- 种子脚本：`scripts/seed-nobody.ts`  
- trait 统计：`scripts/build-trait-stats.ts`（扫 0..9999 tokenURI）

---

## 6. 与 BSC 后期衔接

新增表（第二期）：

### `bsc_reward_snapshots`

| 列 | 说明 |
|----|------|
| `id` | 快照 id |
| `merkle_root` | |
| `token_address` | BSC ERC-20 |
| `snapshot_at` | |
| `rules_json` | 权重规则 |

### `bsc_claims`

| 列 | 说明 |
|----|------|
| `wallet_address` | |
| `snapshot_id` | |
| `amount` | |
| `claimed_at` | |
| `tx_hash` | |

第一期 **无需** 建表，仅在 PRD 预留。

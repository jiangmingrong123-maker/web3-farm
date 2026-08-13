# Shopify 首页装修指南

张洪明紫砂工作室：`zhang-hongming-zisha-studio`

- 店铺前台：https://zhang-hongming-zisha-studio.myshopify.com
- 后台：https://admin.shopify.com/store/zhang-hongming-zisha-studio
- 主题编辑器：**線上商店 → 編輯器**（或 **Online Store → Customize**）

当前店铺已上架约 160 件商品、PayPal 已接通，但首页仍是 Dawn 默认的 “Browse our latest products”。本指南完成首页品牌化装修。

---

## 方案 A：一键脚本（推荐）

### 1. 配置 API 凭证

在 PowerShell / 终端设置（与商品上传脚本相同）：

```bash
export SHOPIFY_STORE=zhang-hongming-zisha-studio
export SHOPIFY_CLIENT_ID=你的ClientID
export SHOPIFY_CLIENT_SECRET=你的ClientSecret
# 或者 legacy token:
# export SHOPIFY_ADMIN_TOKEN=shpat_...
```

Dev Dashboard → 应用 → **版本** → 添加 scopes 后 **重新安装**：

| Scope | 用途 |
|-------|------|
| `read_products`, `write_products` | 智能专辑 |
| `read_content`, `write_content` | About Us 页面 |
| `read_themes`, `write_themes` | 首页 index.json |
| `read_online_store_navigation`, `write_online_store_navigation` | 主导航菜单 |

### 2. 预览（不写入）

```bash
python scripts/shopify-homepage-setup.py --dry-run
```

### 3. 正式应用

```bash
python scripts/shopify-homepage-setup.py
```

脚本会自动：

1. 创建 4 个匠人智能专辑（张洪明 / 杨俊英 / 郁佳骅 / 张赵阳）
2. 创建 **About Us** 页面（中英双语）
3. 更新主导航：Home · All Products · Master Collection · About Us · Contact
4. 将 `data/shopify-homepage/index.json` 写入 Dawn 主题的 `templates/index.json`

### 4. 手动补 Banner 图片

脚本会尝试用标题含 “Zhang Hongming” 的商品主图作横幅；若未匹配到，请在编辑器中：

**編輯器 → 首页 → 图片横幅 → 图片 → 选择文件或商品图**

推荐尺寸：**1920×800** 或 **1600×600**，壶身特写或茶席场景。

---

## 方案 B：纯手动（主题编辑器）

若 API 无 `write_themes` 权限，按以下步骤在编辑器操作。

### 首页结构

| 区块 | 内容 |
|------|------|
| **图片横幅** | 标题：宜兴紫砂 · 张洪明工作室；副标题：手工紫砂壶，宜兴直发，香港及全球配送；按钮：浏览全部商品 |
| **富文本** | Authentic Yixing Zisha Teapots + 中英简介 + About us 按钮 |
| **特色产品系列** | 专辑：Zhang Hongming Master，显示 4 件 |
| **多列** | 四位匠人简介（张洪明 / 杨俊英 / 郁佳骅 / 张赵阳） |
| **特色产品系列** | 专辑：All，显示 8 件 |

完整 JSON 见 `data/shopify-homepage/index.json`，可复制到 **編輯器 → … → 编辑代码 → templates/index.json**。

### 创建智能专辑

**商品 → 专辑 → 创建专辑 → 智能专辑**

| 专辑名 | Handle | 条件 |
|--------|--------|------|
| Zhang Hongming Master | `zhang-hongming-master` | 标题 包含 `Zhang Hongming` |
| Yang Junying | `yang-junying` | 标题 包含 `Yang Junying` |
| Yu Jiahua | `yu-jiahua` | 标题 包含 `Yu Jiahua` |
| Zhang Zhaoyang | `zhang-zhaoyang` | 标题 包含 `Zhang Zhaoyang` |

### About Us 页面

**線上商店 → 页面 → 添加页面**

- 标题：`About Us`
- Handle：`about-us`
- 正文：见 `data/shopify-homepage/content.json` → `about_page.body_html`

### 导航菜单

**線上商店 → 導覽 → Main menu**

| 菜单项 | 链接 |
|--------|------|
| Home | `/` |
| All Products | `/collections/all` |
| Master Collection | `/collections/zhang-hongming-master` |
| About Us | `/pages/about-us` |
| Contact | `/policies/contact-information` |

---

## 文案速查

### Hero

- **标题**：宜兴紫砂 · 张洪明工作室
- **副标题**：手工紫砂壶，宜兴直发，香港及全球配送
- **按钮**：浏览全部商品 → `/collections/all`

### 简介（富文本）

> Authentic Yixing Zisha Teapots
>
> 正高级工艺美术师**张洪明**及家族匠人手工制作。每一把壶均从**江苏宜兴**直发，支持香港、东南亚、欧美配送。
>
> Master **Zhang Hongming** (Senior Arts & Crafts Artist) and family artisans craft each teapot in **Yixing, Jiangsu**. Shipped worldwide with care.

### 匠人四列

见 `data/shopify-homepage/content.json` → `artisans.columns`

---

## 装修后检查清单

- [ ] 首页 Hero 有横幅图（非灰色占位图）
- [ ] 点击「浏览全部商品」进入商品列表
- [ ] 「大师臻品」显示张洪明作品
- [ ] 四位匠人专栏链接到对应专辑
- [ ] About Us 页面可打开
- [ ] 主导航 5 项齐全
- [ ] 手机端预览正常（編輯器右上角手机图标）
- [ ] 用 PayPal 测试下单一次

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `data/shopify-homepage/content.json` | 全部文案、专辑规则、导航、About 页面 |
| `data/shopify-homepage/index.json` | Dawn 主题首页 section 配置 |
| `scripts/shopify-homepage-setup.py` | 自动应用脚本 |
| `scripts/shopify_auth.py` | API 认证（token 或 client credentials） |
| `scripts/shopify_api.py` | REST / GraphQL 请求封装 |

---

## 常见问题

**403 on theme update**

应用缺少 `write_themes` scope，或未重新安装。用手动方案 B 粘贴 `index.json`。

**专辑为空**

商品标题须含英文匠人名（如 `Zhang Hongming`）。若标题只有中文，先运行 `scripts/shopify-fix-titles.py`（在 `cursor/shopify-set-inventory-7d4d` 分支）。

**菜单更新失败**

在 **線上商店 → 導覽** 手动添加，见上文表格。

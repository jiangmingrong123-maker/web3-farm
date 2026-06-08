# Web3 Farm · 省钱上线指南

> 目标：**尽量 \$0 试运行**，有需要再加域名。  
> 栈：**Vercel（免费）→ 以后 Cloudflare（免费 DNS）→ 以后 Supabase（免费 DB）**

---

## 费用一览

| 阶段 | 花什么钱 | 大约费用 |
|------|----------|----------|
| **A. 现在（试运行）** | 仅 Vercel 免费子域名 | **\$0** |
| **B. 有正式网址** | 域名 + Cloudflare DNS | **~\$10–15/年**（域名） |
| **C. 要绑定/积分/登录** | Supabase 或 Railway 免费档 | **\$0 起** |
| **D. 读链 NFT 列表** | Alchemy 免费 API | **\$0 起** |

**现在先做阶段 A**，够给团队看 UI、连钱包、试算档位。

---

## 阶段 A：\$0 部署到 Vercel（推荐先做）

### 你需要

- GitHub 账号（免费）
- Vercel 账号（免费，用 GitHub 登录即可）
- 项目已在本地能 `npm run build` 通过

### 步骤 1：代码放进 GitHub

**方式 1 — 整个 mygame 仓库里只有 web3-farm 要部署（常见）**

1. 在 GitHub 新建仓库，或 push 现有 `mygame` 仓库  
2. 确保 `web3-farm` 文件夹已提交（不要提交 `node_modules`、`.next`）

**方式 2 — 只要 web3-farm 单独一个仓库**

```powershell
cd D:\mygame\web3-farm
git init
git add .
git commit -m "Initial Web3 Farm"
# 在 GitHub 建空仓库后：
git remote add origin https://github.com/你的用户名/web3-farm.git
git push -u origin main
```

### 步骤 2：Vercel 导入项目

1. 打开 [https://vercel.com](https://vercel.com) → **Sign Up** → 用 GitHub 登录  
2. **Add New… → Project**  
3. 选中你的仓库 → **Import**  
4. **重要：若仓库根目录是 `mygame`，不是 `web3-farm`：**
   - **Root Directory** 点 Edit → 选 **`web3-farm`**
5. **Framework Preset**：Next.js（一般自动识别）  
6. **Build Command**：`npm run build`（默认）  
7. **Output Directory**：默认留空  
8. **Environment Variables**：现阶段 **可不填**  
9. 点 **Deploy**

### 步骤 3：访问线上地址

部署成功后会有类似：

```
https://web3-farm-xxxxx.vercel.app
```

- 中文：`https://你的地址.vercel.app/zh`  
- 英文：`https://你的地址.vercel.app/en`  

以后每次 `git push`，Vercel 会自动重新部署。

### 常见问题

| 问题 | 处理 |
|------|------|
| Build 失败 | 本地先 `npm run build`，报错修完再 push |
| 404 | 确认访问 `/zh` 或 `/en`，不要只访问根路径（会由 middleware 跳转） |
| 钱包连不上 | 线上需 **HTTPS**，Vercel 自带；用户需 MetaMask |

---

## 阶段 B：买域名 + Cloudflare（仍很省）

**等有满意的名字再买**，不必第一天就买。

### 1. 买域名（二选一）

| 注册商 | 说明 |
|--------|------|
| **Cloudflare Registrar** | 常接近成本价，和 DNS 一家，推荐 |
| Namecheap / Porkbun | 也常便宜 |

`.com` 大约 **\$10–15/年**。

### 2. DNS 放在 Cloudflare（免费）

1. 注册 [https://dash.cloudflare.com](https://dash.cloudflare.com)  
2. **Add a site** → 输入你的域名  
3. 按提示把域名的 **Nameservers** 改成 Cloudflare 给的两条（在注册商那里改）  
4. 免费计划 **Free** 即可  

### 3. 域名指到 Vercel

在 Cloudflare → **DNS → Records**：

| 类型 | 名称 | 内容 | 代理 |
|------|------|------|------|
| **CNAME** | `@` 或 `www` | `cname.vercel-dns.com` | 可先开橙色云（Proxied） |

然后在 **Vercel 项目 → Settings → Domains**：

- 添加 `你的域名.com` 和 `www.你的域名.com`  
- 按 Vercel 提示验证（有时要加一条 TXT）  

HTTPS 由 **Vercel + Cloudflare** 自动处理，不用买证书。

---

## 阶段 C：以后要数据库时（仍从免费开始）

当前版本 **只有前端 + 试算**，不需要数据库。

要做 **绑定 NFT、积分、登录** 时再加：

| 服务 | 免费档 | 用途 |
|------|--------|------|
| **Supabase** | 有 | PostgreSQL + 以后 Auth |
| **Railway** | 有限免费额度 | Node API + Postgres |
| **Alchemy** | 有 | 读 ETH 上 Nobody NFT |

建议顺序：**Supabase（数据库）+ Vercel API Routes（后端）**，月费 \$0 能撑很久。

---

## 现阶段「不要买」的东西

- ❌ 阿里云 / 腾讯云 ECS  
- ❌ 独立香港 VPS  
- ❌ WalletConnect 付费（MetaMask 够用可先不填）  
- ❌ 大陆 ICP 备案（服务器不在大陆）  

---

## 检查清单（阶段 A 完成标准）

- [ ] GitHub 上有 `web3-farm` 代码  
- [ ] Vercel 部署成功，Build 绿色  
- [ ] `https://xxx.vercel.app/zh` 能打开深色页面  
- [ ] `/en` 英文正常  
- [ ] MetaMask 能点「连接钱包」  

---

## 和本地开发的关系

| 环境 | 地址 |
|------|------|
| 本地 | `http://localhost:3000` 或 `3001` → `npm run dev` |
| 线上试运行 | `https://xxx.vercel.app/zh` |
| 正式域名（以后） | `https://你的域名.com/zh` |

本地改代码 → push → Vercel 自动更新，**不用自己买服务器运维**。

---

## 下一步（你准备好时）

1. 你 push 到 GitHub 后，把 Vercel 部署链接发我，我可以帮你看有没有问题  
2. 要买域名时，告诉我域名，我帮你对一下 Cloudflare DNS 记录  
3. 要做绑定/积分时，再加 Supabase + API（仍走免费档）

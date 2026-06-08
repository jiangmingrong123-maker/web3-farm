# Cloudflare Pages + GitHub 部署说明

> 仓库里 **只有 web3-farm 这一个网站**，根目录就是项目根，Cloudflare 不用填子目录。

---

## 第一步：把代码放到 GitHub（你要做的）

### 1. 在 GitHub 网站新建空仓库

1. 打开 [https://github.com/new](https://github.com/new)
2. **Repository name**：例如 `web3-farm`
3. 选 **Private**（建议，Web3 项目未公开前）
4. **不要**勾选 "Add a README"（保持空仓库）
5. 点 **Create repository**
6. 记下页面上的地址，例如：  
   `https://github.com/你的用户名/web3-farm.git`

### 2. 在本机 PowerShell 执行（复制后改你的用户名）

```powershell
cd D:\mygame\web3-farm

git init
git add .
git commit -m "Initial Web3 Farm - Next.js site"

git branch -M main
git remote add origin https://github.com/你的用户名/web3-farm.git
git push -u origin main
```

第一次 `git push` 会弹出 **GitHub 登录**（浏览器或 Personal Access Token）。

**若提示要 Token：** GitHub → Settings → Developer settings → Personal access tokens → 生成有 `repo` 权限的 token，密码处粘贴 token。

### 3. 确认

刷新 GitHub 仓库页面，应能看到 `src/`、`docs/`、`package.json` 等，**没有** `node_modules` 和 `.next`。

---

## 第二步：Cloudflare Pages 连接 GitHub

1. 登录 [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. 左侧 **Workers & Pages**
3. **Create application** → **Pages** → **Connect to GitHub**
4. 授权 Cloudflare 访问 GitHub，选中 **web3-farm** 仓库
5. **Build settings**（重要）：

| 项 | 填什么 |
|----|--------|
| Production branch | `main` |
| Framework preset | **Next.js** |
| Framework preset | **None**（无） |
| Build command | `npm run build` |
| Build output directory | `out` |
| Root directory | 留空（仓库根就是项目） |

6. **Environment variables**（展开高级设置，建议添加）：

| 变量名 | 值 |
|--------|-----|
| `NODE_VERSION` | `20` |

7. **Save and Deploy**

### 若构建失败（npm error / Exit code 1）

1. 确认 GitHub 上已拉取最新代码（含 `.npmrc`、`.node-version`）
2. Cloudflare 项目 → **Settings** → **Environment variables** → 添加 `NODE_VERSION` = `20`
3. **Deployments** → 失败的那次 → **Retry deployment**

### 若 Cloudflare 构建失败

本项目用了 **Next.js 14 + 中间件 + 钱包 SSR**，Cloudflare 有时需额外适配。可选：

- **方案 A**：Cloudflare 构建页改用官方 **Next.js on Pages** 文档里的 `@cloudflare/next-on-pages`（以后可再改）
- **方案 B（更省事）**：网站仍部署在 **Vercel**，Cloudflare **只买域名 + DNS** 指过去（见 `DEPLOY-BUDGET.md`）

试运行优先：**先完成 GitHub 上传**，再在 Cloudflare 点 Deploy 看结果。

---

## 第三步：绑定自己的域名（以后，可选）

1. 在 Cloudflare **Registrar** 买域名，或把已有域名 **Nameserver** 迁到 Cloudflare  
2. Pages 项目 → **Custom domains** → 添加 `你的域名.com`  
3. Cloudflare 会自动加 DNS 记录  

免费 Pages 地址形如：`https://web3-farm.pages.dev`

---

## 流程图

```
本地 web3-farm
    │  git push
    ▼
GitHub 仓库
    │  Cloudflare Pages 连接 GitHub
    ▼
https://xxx.pages.dev/zh
    │  （可选）Custom domain
    ▼
https://你的域名.com/zh
```

---

## 检查清单

- [ ] GitHub 上能看到代码，无 node_modules
- [ ] Cloudflare Pages 第一次 Deploy 成功
- [ ] 打开 `xxx.pages.dev/zh` 是深色 Web3 Farm 页面
- [ ] `/en` 英文正常

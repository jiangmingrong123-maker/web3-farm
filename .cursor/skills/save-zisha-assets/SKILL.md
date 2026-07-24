---
name: save-zisha-assets
description: Save user-uploaded images, videos, and documents from Cursor chat into 张赵阳紫砂文件1/ with structured Chinese filenames. Use when the user asks to save/store/储存 photos, certificates, videos, or other media for the Zhang Hongming Zisha Shopify store.
---

# 保存紫砂店铺素材

当用户在聊天里上传图片、视频、PDF 等文件，并要求保存到项目时，按本 Skill 执行。

## 路径

| 用途 | 云端路径 | 用户本地对应路径 |
|------|----------|------------------|
| 素材目录 | `/workspace/张赵阳紫砂文件1/` | `D:\mygame\web3-farm\张赵阳紫砂文件1\` |
| 聊天上传暂存 | `/home/ubuntu/.cursor/projects/workspace/uploads/` | （Cursor 自动管理，勿提交 git） |

## 执行步骤

1. 列出 `uploads/` 目录，找到用户本次上传的文件（按修改时间判断最新文件）。
2. 若目录不存在，创建 `/workspace/张赵阳紫砂文件1/`。
3. 用 `cp` 复制文件（保留二进制，不要用文本工具读写）。
4. 按命名规则重命名后保存。
5. 向用户确认：最终文件名、完整路径、文件大小。
6. 若用户需要同步到本地，提醒执行 `git pull`（仅当文件已 commit 并 push 时）。

## 命名规则

格式：`{匠人名}-{用途}.{扩展名}`

| 匠人 | 匠人名前缀 |
|------|------------|
| 张洪明 | `张洪明` |
| 张赵阳 | `张赵阳` |
| 杨俊英 | `杨俊英` |
| 郁佳骅 | `郁佳骅` |

| 用途 | 后缀示例 |
|------|----------|
| 肖像照 | `-肖像` |
| 资质证书 | `-证书` |
| 首页视频 | `-首页视频` |
| 介绍页扫描 | `-介绍页` |
| 其他 | 用户指定中文简称 |

示例：
- `张洪明-肖像.jpg`
- `张赵阳-证书.jpg`
- `bb9ded03...mp4` → `张洪明-首页视频.mp4`（若用户确认是张洪明工作室视频）

## 冲突处理

- 目标路径已存在同名文件：**不要覆盖**，在扩展名前加 `-2`、`-3`（如 `张洪明-肖像-2.jpg`）。
- 用户未说明匠人/用途：根据对话上下文推断；无法推断时询问用户。

## 禁止事项

- 不要覆盖已有文件（除非用户明确要求）。
- 不要把 `uploads/` 里的银行对账单、OAuth token、`.env` 等敏感文件复制到项目目录。
- 不要把大尺寸媒体批量 commit 进 git，除非用户明确要求；默认只复制到工作区并告知用户。

## 快捷命令

```bash
# 列出最新上传
ls -lt /home/ubuntu/.cursor/projects/workspace/uploads/

# 复制并重命名（示例）
cp "/home/ubuntu/.cursor/projects/workspace/uploads/xxx.jpg" \
   "/workspace/张赵阳紫砂文件1/张洪明-肖像.jpg"
```

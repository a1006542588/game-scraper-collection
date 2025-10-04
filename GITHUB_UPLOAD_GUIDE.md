# GitHub 上传完整步骤指南

> 从创建仓库到上传代码的详细教程，适合新手 👨‍💻

---

## 📋 准备工作

### 1. 安装 Git

**Windows 用户**：
1. 访问 [git-scm.com](https://git-scm.com/download/win)
2. 下载并安装 Git for Windows
3. 安装时全部选择默认选项即可

**验证安装**：
```powershell
git --version
```
应该看到类似 `git version 2.x.x` 的输出

### 2. 配置 Git

首次使用需要配置用户名和邮箱：

```powershell
git config --global user.name "a1006542588"
git config --global user.email "your_email@example.com"
```

> 💡 提示：邮箱建议使用你 GitHub 账号绑定的邮箱

---

## 🚀 第一步：创建 GitHub 仓库

### 1.1 登录 GitHub

访问 [github.com](https://github.com) 并登录你的账号（a1006542588）

### 1.2 创建新仓库

1. 点击右上角的 **+** 号
2. 选择 **New repository**
3. 填写仓库信息：

| 字段 | 填写内容 |
|------|----------|
| **Repository name** | `z2u-scraper` |
| **Description** | `Z2U 订单爬虫脚本 - Tampermonkey 用户脚本，支持 Cloudflare 验证自动绕过` |
| **Public/Private** | 选择 **Public**（公开，其他人可访问）|
| **Initialize this repository** | ❌ 不勾选任何选项（重要！）|

4. 点击 **Create repository** 按钮

### 1.3 记录仓库地址

创建后会看到仓库地址，格式为：
```
https://github.com/a1006542588/z2u-scraper.git
```

> 💡 保持这个页面打开，后面会用到

---

## 📦 第二步：初始化本地仓库

### 2.1 打开 PowerShell

1. 按 `Win + X`
2. 选择 **Windows PowerShell** 或 **终端**

### 2.2 进入项目目录

```powershell
cd C:\Users\XOS\Desktop\PA
```

### 2.3 初始化 Git 仓库

```powershell
git init
```

你会看到提示：`Initialized empty Git repository in C:/Users/XOS/Desktop/PA/.git/`

---

## 📄 第三步：添加文件到仓库

### 3.1 查看当前文件

```powershell
dir
```

应该看到：
- `main.user.js`
- `README.md`
- `LICENSE`

### 3.2 添加所有文件到暂存区

```powershell
git add .
```

> 💡 `.` 表示添加当前目录所有文件

### 3.3 查看状态（可选）

```powershell
git status
```

应该看到三个文件显示为 `new file`（绿色）

### 3.4 提交文件

```powershell
git commit -m "feat: Initial commit - Z2U Order Scraper v7.4.1"
```

提示信息会显示：
```
[master (root-commit) xxxxxxx] feat: Initial commit - Z2U Order Scraper v7.4.1
 3 files changed, xxxx insertions(+)
 create mode 100644 LICENSE
 create mode 100644 README.md
 create mode 100644 main.user.js
```

---

## 🔗 第四步：关联远程仓库

### 4.1 添加远程仓库地址

```powershell
git remote add origin https://github.com/a1006542588/z2u-scraper.git
```

### 4.2 验证远程仓库（可选）

```powershell
git remote -v
```

应该看到：
```
origin  https://github.com/a1006542588/z2u-scraper.git (fetch)
origin  https://github.com/a1006542588/z2u-scraper.git (push)
```

---

## ⬆️ 第五步：推送到 GitHub

### 5.1 推送代码

```powershell
git push -u origin master
```

或者（如果 GitHub 默认分支是 main）：
```powershell
git push -u origin main
```

> 💡 首次推送会要求登录 GitHub

### 5.2 GitHub 登录方式

**方法一：使用 Personal Access Token（推荐）**

1. 访问 [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. 点击 **Generate new token** → **Generate new token (classic)**
3. 填写信息：
   - **Note**: `z2u-scraper-upload`
   - **Expiration**: 选择 **90 days** 或更长
   - **Select scopes**: 勾选 `repo`（全部子选项）
4. 点击 **Generate token**
5. **立即复制并保存 Token**（只显示一次！）
6. 在 PowerShell 推送时，用户名输入：`a1006542588`，密码输入：`刚才复制的 Token`

**方法二：使用 GitHub Desktop**
1. 下载并安装 [GitHub Desktop](https://desktop.github.com/)
2. 登录后可以直接推送，无需输入密码

### 5.3 推送成功

推送成功后会看到：
```
Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Delta compression using up to 8 threads
Compressing objects: 100% (4/4), done.
Writing objects: 100% (5/5), xxx KiB | xxx MiB/s, done.
Total 5 (delta 0), reused 0 (delta 0), pack-reused 0
To https://github.com/a1006542588/z2u-scraper.git
 * [new branch]      master -> master
Branch 'master' set up to track remote branch 'master' from 'origin'.
```

---

## ✅ 第六步：验证上传

### 6.1 访问仓库页面

打开浏览器访问：
```
https://github.com/a1006542588/z2u-scraper
```

### 6.2 检查文件

你应该看到：
- ✅ `main.user.js` - 脚本文件
- ✅ `README.md` - 说明文档（自动显示在页面下方）
- ✅ `LICENSE` - 许可证文件

### 6.3 检查 README 显示

向下滚动，应该能看到格式化后的 README 文档，包含：
- 功能特性列表
- 安装使用步骤
- Cloudflare 配置说明
- 常见问题等

---

## 🎨 第七步：完善仓库信息

### 7.1 添加仓库描述

1. 在仓库页面点击右上角的 **⚙️ Settings**
2. 在 **About** 区域（页面右侧）点击 **⚙️ 编辑**
3. 填写：
   - **Description**: `Z2U 订单爬虫脚本 - 支持 Cloudflare 验证自动绕过`
   - **Website**: `https://www.z2u.com`
   - **Topics**: 添加标签（每输入一个按回车）：
     - `tampermonkey`
     - `userscript`
     - `scraper`
     - `cloudflare`
     - `z2u`
     - `captcha`
4. 点击 **Save changes**

### 7.2 创建 Release（可选）

1. 在仓库页面点击右侧 **Releases** → **Create a new release**
2. 填写信息：
   - **Tag version**: `v7.4.1`
   - **Release title**: `v7.4.1 - Cloudflare PAT 支持`
   - **Description**: 
     ```
     ## 主要更新
     - ✨ 支持 PAT (Private Access Token) 挑战自动处理
     - 🔧 增强 Cloudflare 检测逻辑
     - 🐛 修复 Turnstile 挑战识别错误
     
     ## 安装方法
     点击下方 `main.user.js` 文件直接安装
     ```
   - **Attach binaries**: 上传 `main.user.js` 文件
3. 点击 **Publish release**

---

## 🔄 后续更新流程

当你修改了代码需要更新到 GitHub：

### 更新步骤（简化版）

```powershell
# 1. 进入项目目录
cd C:\Users\XOS\Desktop\PA

# 2. 查看修改的文件
git status

# 3. 添加修改的文件
git add .

# 4. 提交修改
git commit -m "fix: 修复某某问题"

# 5. 推送到 GitHub
git push
```

### 常用 commit 消息格式

- `feat: 添加新功能` - 新增功能
- `fix: 修复 Bug` - 修复问题
- `docs: 更新文档` - 文档更新
- `style: 代码格式调整` - 样式调整
- `refactor: 代码重构` - 重构代码
- `perf: 性能优化` - 性能提升
- `chore: 其他修改` - 其他变更

---

## 📝 直接安装链接

上传成功后，用户可以通过以下链接直接安装脚本：

```
https://github.com/a1006542588/z2u-scraper/raw/master/main.user.js
```

或者（如果你用的是 main 分支）：
```
https://github.com/a1006542588/z2u-scraper/raw/main/main.user.js
```

> 💡 把这个链接更新到 README.md 的「安装使用」章节

---

## ❓ 常见问题

### Q1: git push 时提示 "Permission denied"

**A:** 
1. 确认你已登录 GitHub 账号
2. 使用 Personal Access Token 而不是密码
3. 检查 Token 是否有 `repo` 权限

### Q2: 推送时提示 "rejected"

**A:** 
```powershell
# 先拉取远程代码
git pull origin master --allow-unrelated-histories

# 再推送
git push -u origin master
```

### Q3: 如何删除远程仓库的文件？

**A:** 
```powershell
# 删除本地文件
rm 文件名

# 提交删除
git add .
git commit -m "chore: 删除某文件"
git push
```

### Q4: 如何修改 commit 消息？

**A:** 
```powershell
# 修改最后一次 commit
git commit --amend -m "新的消息"
git push --force
```

### Q5: 分支是 master 还是 main？

**A:** 
```powershell
# 查看当前分支
git branch

# 如果是 master 但 GitHub 要求 main，改名：
git branch -M main
git push -u origin main
```

---

## 🎉 完成！

现在你的项目已经成功上传到 GitHub：

✅ 仓库地址：`https://github.com/a1006542588/z2u-scraper`  
✅ 直接安装：`https://github.com/a1006542588/z2u-scraper/raw/master/main.user.js`  
✅ 分享链接给其他人使用

---

## 📚 推荐资源

- [Git 官方文档（中文）](https://git-scm.com/book/zh/v2)
- [GitHub 帮助文档](https://docs.github.com/cn)
- [Markdown 语法指南](https://markdown.com.cn/)
- [如何写好 Git Commit 消息](https://www.conventionalcommits.org/zh-hans/)

---

<div align="center">

**祝你使用愉快！有问题随时在 Issues 中提问。** 🚀

</div>

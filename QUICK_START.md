# 🚀 GitHub 上传快速参考

## 一、创建 GitHub 仓库

1. 访问 https://github.com
2. 点击右上角 **+** → **New repository**
3. 填写信息：
   - Repository name: `z2u-scraper`
   - Description: `Z2U 订单爬虫脚本 - Tampermonkey 用户脚本，支持 Cloudflare 验证自动绕过`
   - 选择 **Public**
   - ❌ 不勾选任何初始化选项
4. 点击 **Create repository**

## 二、上传代码（PowerShell）

```powershell
# 1. 进入项目目录
cd C:\Users\XOS\Desktop\PA

# 2. 初始化 Git
git init

# 3. 添加文件
git add .

# 4. 提交
git commit -m "feat: Initial commit - Z2U Order Scraper v7.4.1"

# 5. 关联远程仓库
git remote add origin https://github.com/a1006542588/z2u-scraper.git

# 6. 推送（首次推送）
git push -u origin master
```

## 三、GitHub 登录

**推荐方式：Personal Access Token**

1. 访问 https://github.com/settings/tokens
2. **Generate new token (classic)**
3. 勾选 `repo` 权限
4. 复制生成的 Token
5. 推送时输入：
   - Username: `a1006542588`
   - Password: `粘贴你的 Token`

## 四、验证上传

访问：https://github.com/a1006542588/z2u-scraper

应该看到：
- ✅ main.user.js
- ✅ README.md
- ✅ LICENSE

## 五、后续更新

```powershell
cd C:\Users\XOS\Desktop\PA
git add .
git commit -m "描述你的修改"
git push
```

---

## 📌 重要链接

- 仓库地址：https://github.com/a1006542588/z2u-scraper
- 直接安装：https://github.com/a1006542588/z2u-scraper/raw/master/main.user.js
- Token 设置：https://github.com/settings/tokens

---

## 🆘 遇到问题？

查看详细教程：`GITHUB_UPLOAD_GUIDE.md`

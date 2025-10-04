# Z2U 订单爬虫脚本

> Tampermonkey 用户脚本，用于自动化抓取 Z2U.com 游戏交易订单数据，支持 Cloudflare 验证自动绕过。

[![Version](https://img.shields.io/badge/version-7.4.1-blue.svg)](https://github.com/a1006542588/z2u-scraper)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-compatible-orange.svg)](https://www.tampermonkey.net/)

## 📋 目录

- [功能特性](#-功能特性)
- [安装使用](#-安装使用)
- [Cloudflare 配置](#-cloudflare-配置)
- [常见问题](#-常见问题)
- [更新日志](#-更新日志)

---

## ✨ 功能特性

- 🎮 **游戏列表抓取**：自动抓取 Z2U 平台所有游戏类目数据
- 📦 **订单批量抓取**：支持按游戏批量抓取订单信息
- 🔄 **增量更新**：智能识别新增订单，避免重复抓取
- 💾 **数据导出**：支持导出为 Excel (XLSX) 格式
- �️ **Cloudflare 绕过**：自动检测并绕过 CF 验证（支持 PAT、Turnstile、Managed Challenge）
- 🎨 **美观界面**：悬浮按钮 + 控制面板，简洁易用

---

## 🚀 安装使用

### 1. 安装 Tampermonkey

首先在浏览器中安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展。

### 2. 安装脚本

**方法一：直接安装（推荐）**

点击下方链接直接安装：
```
https://github.com/a1006542588/z2u-scraper/main.user.js
```

**方法二：手动安装**

1. 下载 `main.user.js` 文件
2. 打开 Tampermonkey 管理面板
3. 点击「+」创建新脚本
4. 复制粘贴文件内容并保存

### 3. 使用步骤

1. **访问 Z2U 网站**：打开 https://www.z2u.com/
2. **打开控制面板**：点击页面右侧的「🎮」悬浮按钮
3. **抓取游戏列表**：点击「抓取游戏列表」按钮，等待完成
4. **抓取订单数据**：点击「开始抓取订单」按钮，自动抓取所有订单
5. **导出数据**：点击「导出 Excel」保存数据

### 4. 脚本配置（可选）

如需修改配置，编辑脚本中的参数：

```javascript
const CONFIG = {
    requestDelay: 2000,    // 请求间隔（毫秒）
    maxRetries: 3,         // 失败重试次数
    pageSize: 20,          // 每页订单数
};
```

---

## 🛡️ Cloudflare 配置

### 支持的验证类型

| 类型 | 处理方式 | 是否需要配置 |
|------|----------|--------------|
| PAT / Managed Challenge | 自动等待完成 | ❌ 不需要 |
| Turnstile | 调用 API 自动求解 | ✅ 需要配置 |

### Turnstile 配置步骤

如果遇到 Turnstile 验证，需要配置 YesCaptcha API：

1. **注册 YesCaptcha**：访问 [yescaptcha.com](https://yescaptcha.com/) 注册账号
2. **充值积分**：Turnstile 任务 25 积分/次，建议充值 500-1000 积分
3. **获取密钥**：在控制台复制你的 Client Key
4. **配置脚本**：
   - 在 Z2U 页面点击「CF 配置」按钮
   - 粘贴 Client Key 并保存
5. **自动处理**：脚本会自动检测并求解 Turnstile 验证

---

## ❓ 常见问题

### Q1: 遇到 Cloudflare 验证怎么办？

**A:** 脚本会自动处理：
- PAT/Managed 类型：自动等待，无需配置
- Turnstile 类型：需要配置 YesCaptcha API（见上方配置步骤）

### Q2: 数据保存在哪里？

**A:** 数据存储在浏览器 localStorage 中，建议定期点击「导出 Excel」备份。

### Q3: 如何加快抓取速度？

**A:** 可以修改脚本中的 `requestDelay` 参数，但不建议低于 1000ms。

### Q4: 遇到错误怎么办？

**A:** 
1. 按 F12 打开控制台查看错误信息
2. 刷新页面重试
3. 在 [GitHub Issues](https://github.com/a1006542588/z2u-scraper/issues) 提交问题

---

## 📝 更新日志

### v7.4.1 (2025-10-05)
- ✨ 支持 PAT (Private Access Token) 挑战自动处理
- 🔧 增强 Cloudflare 检测逻辑
-  修复 Turnstile 挑战识别错误

### v7.4.0 (2025-10-04)
- ✨ 完整的 Cloudflare 验证绕过模块
- ✨ YesCaptcha API 集成
- ✨ CF 配置界面和状态显示

---

## � 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## ⚠️ 免责声明

本脚本仅供学习研究使用，请遵守网站服务条款，合理使用。使用本脚本产生的任何后果由使用者自行承担。

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star！⭐**

[报告问题](https://github.com/a1006542588/z2u-scraper/issues) · [功能建议](https://github.com/a1006542588/z2u-scraper/issues)

</div>

# 🎮 Game Trading Platform Scrapers# 🎮 G2G Scraper - 完整使用说明



[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)[![Version](https://img.shields.io/badge/version-1.1.4-blue.svg)](https://github.com/a1006542588/g2g-scraper)

[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-compatible-orange.svg)](https://www.tampermonkey.net/)[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[![Platform](https://img.shields.io/badge/platform-Tampermonkey-orange.svg)](https://www.tampermonkey.net/)

> 游戏交易平台数据采集工具集 - 支持 Z2U、G2G、PA 等多个平台的自动化数据采集

> 一个功能强大的 Tampermonkey 用户脚本，专为 G2G.com 平台设计，支持自动化采集游戏列表、产品订单等数据，提供CSV/JSON导出功能。

[English](#english) | [中文](#中文)

---

---

## 📋 目录

## 📋 目录

- [功能概览](#-功能概览)

- [项目概览](#-项目概览)- [快速开始](#-快速开始)

- [快速开始](#-快速开始)- [详细使用教程](#-详细使用教程)

- [项目详情](#-项目详情)- [数据格式说明](#-数据格式说明)

  - [Z2U Scraper](#1-z2u-scraper)- [常见问题](#-常见问题)

  - [G2G Scraper](#2-g2g-scraper)- [更新日志](#-更新日志)

  - [PA Scraper](#3-pa-scraper)- [技术说明](#-技术说明)

- [安装说明](#-安装说明)

- [功能对比](#-功能对比)---

- [常见问题](#-常见问题)

- [许可证](#-许可证)## ✨ 功能概览



---### 核心功能



## 🎯 项目概览| 功能模块 | 说明 | 状态 |

|---------|------|------|

本仓库包含三个独立的 Tampermonkey 用户脚本，分别用于不同游戏交易平台的数据采集：| 🎮 游戏列表采集 | 自动爬取所有游戏，支持7种服务类型 | ✅ |

| 🛍️ 产品订单采集 | 三种模式（单页/多页/全部），支持关键字筛选 | ✅ |

| 项目 | 平台 | 版本 | 状态 || 💾 数据导出 | CSV/JSON格式，Excel完美兼容 | ✅ |

|------|------|------|------|| 🔍 关键字筛选 | 标题关键词过滤 | ✅ |

| **Z2U Scraper** | [Z2U.com](https://www.z2u.com) | v7.4.1 | ✅ 稳定 || 📊 实时统计 | 游戏数量、订单数量、当前页面 | ✅ |

| **G2G Scraper** | [G2G.com](https://www.g2g.com) | v1.1.4 | ✅ 稳定 || 🗑️ 数据管理 | 独立清除游戏/订单，互不影响 | ✅ |

| **PA Scraper** | PA 平台 | v1.0.0 | ✅ 稳定 || 🎨 美观界面 | 侧边栏浮动面板，响应式设计 | ✅ |

| 🛡️ 超时保护 | 网络慢速下自动重试（20秒） | ✅ |

---

### 支持的服务类型

## 🚀 快速开始

1. 🪙 **Game Coins** - 游戏金币

### 前置要求2. 📦 **Items** - 游戏物品

3. 👤 **Accounts** - 游戏账号

1. 安装浏览器扩展 [Tampermonkey](https://www.tampermonkey.net/)4. 🚀 **Boosting** - 代练服务

   - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)5. 💳 **Top-up** - 充值服务

   - [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)6. 🎓 **Coaching** - 教练服务

   - [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)7. 🎁 **Gift Cards** - 礼品卡/皮肤



### 安装脚本---



选择你需要的平台脚本点击安装：## 🚀 快速开始



| 平台 | 安装链接 |### 步骤 1: 安装 Tampermonkey

|------|---------|

| **Z2U** | [安装 Z2U Scraper](https://github.com/a1006542588/game-scraper-collection/raw/master/Z2U-Project/Z2U-scraper.user.js) |根据你的浏览器选择对应的扩展：

| **G2G** | [安装 G2G Scraper](https://github.com/a1006542588/game-scraper-collection/raw/master/G2G-Project/g2g-scraper.user.js) |

| **PA** | [安装 PA Scraper](https://github.com/a1006542588/game-scraper-collection/raw/master/PA-Project/pa-scraper.user.js) || 浏览器 | 下载链接 |

|-------|---------|

---| Chrome | [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |

| Firefox | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) |

## 📖 项目详情| Edge | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |

| Safari | [Safari Extensions](https://www.tampermonkey.net/?browser=safari) |

### 1. Z2U Scraper| Opera | [Opera Add-ons](https://addons.opera.com/extensions/details/tampermonkey-beta/) |



**平台**: [Z2U.com](https://www.z2u.com)  ### 步骤 2: 安装脚本

**版本**: v7.4.1

**方法一：直接安装（推荐）**

#### ✨ 核心功能

1. 点击这个链接: [g2g-scraper.user.js](https://github.com/a1006542588/g2g-scraper/raw/master/g2g-scraper.user.js)

- 🎮 **游戏列表抓取** - 自动抓取 Z2U 平台所有游戏类目数据2. Tampermonkey 会自动识别并弹出安装页面

- 📦 **订单批量抓取** - 支持按游戏批量抓取订单信息3. 点击 **"安装"** 按钮

- 🔄 **增量更新** - 智能识别新增订单，避免重复抓取

- 💾 **数据导出** - 支持导出为 Excel (XLSX) 格式**方法二：手动安装**

- 🛡️ **Cloudflare 绕过** - 自动检测并绕过 CF 验证

- 🎨 **美观界面** - 悬浮按钮 + 控制面板1. 下载 `g2g-scraper.user.js` 文件

2. 打开 Tampermonkey 管理面板

#### 📊 数据字段3. 点击 **"+"** 创建新脚本

4. 复制粘贴文件内容

- 游戏名称、服务类型、价格区间5. 按 `Ctrl + S` 保存

- 卖家信息、库存状态、交付时间

- 订单详情、更新时间### 步骤 3: 验证安装



#### 📁 文件位置1. 访问 [G2G.com](https://www.g2g.com)

2. 页面右侧应该出现一个侧边栏面板

```3. 如果没有出现，刷新页面或检查 Tampermonkey 是否启用

Z2U-Project/

├── Z2U-scraper.user.js    - 主脚本---

└── docs/                   - 技术文档

```## 📖 详细使用教程



---### 场景一: 爬取游戏列表



### 2. G2G Scraper**目标**: 获取 G2G 平台所有游戏数据



**平台**: [G2G.com](https://www.g2g.com)  #### 操作步骤

**版本**: v1.1.4

1. **访问 Trending 页面**

#### ✨ 核心功能   ```

   https://www.g2g.com/trending/game-coins

- 🎮 **游戏列表采集** - 自动爬取所有游戏，支持7种服务类型   ```

  - 🪙 Game Coins（游戏金币）   （或任意 Trending 服务页面）

  - 📦 Items（游戏物品）

  - 👤 Accounts（游戏账号）2. **启动爬取**

  - 🚀 Boosting（代练服务）   ```

  - 💳 Top-up（充值服务）   在侧边栏中:

  - 🎓 Coaching（教练服务）   📊 数据采集

  - 🎁 Gift Cards（礼品卡）   └─ 点击 "🚀 一键爬取所有游戏"

   ```

- 🛍️ **产品订单采集** - 三种模式

  - 单页模式 - 快速测试3. **等待完成**

  - 多页模式 - 指定页数   - 脚本会自动翻页

  - 全部模式 - 完整采集   - 实时显示进度

   - 自动去重合并

- 💾 **数据导出** - CSV/JSON 格式，Excel 完美兼容

- 🔍 **关键字筛选** - 标题关键词过滤4. **查看结果**

- 📊 **实时统计** - 游戏数量、订单数量、当前页面   ```

- 🗑️ **数据管理** - 独立清除游戏/订单   统计信息:

   📦 游戏数量: 450+

#### 📊 数据字段   ```



**产品订单**:#### 预期结果

- 产品链接、标题、卖家名称、卖家等级

- 价格、货币、Offers数量、库存- 采集时间: 约 2-5 分钟（取决于网络速度）

- 交付时间、页码、爬取时间- 数据量: 通常 400-500 个游戏

- 自动处理: 

#### 📁 文件位置  - ✅ 相同游戏的不同服务类型自动合并

  - ✅ 去重处理

```  - ✅ 分类标记

G2G-Project/

├── g2g-scraper.user.js    - 主脚本### 场景二: 爬取产品订单（单页模式）

├── README.md               - 完整使用说明

└── docs/                   - 开发文档**目标**: 快速测试或采集少量数据

```

#### 操作步骤

#### 🎯 使用场景

1. **选择游戏**

1. **爬取游戏列表** → 访问 Trending 页面 → 点击"一键爬取所有游戏"   ```

2. **爬取产品订单** → 选择游戏 → 选择服务 → 选择模式 → 开始爬取   🎮 游戏选择

3. **导出数据** → CSV（Excel）或 JSON 格式   ├─ 搜索框: 输入 "diablo" 或其他游戏名

   └─ 点击选择游戏

---   ```



### 3. PA Scraper2. **选择服务**

   ```

**平台**: PA 平台     点击对应的服务按钮:

**版本**: v1.0.0   ✓ 金币  - 该游戏确认支持此服务

   ? 物品  - 可能支持此服务（需验证）

#### ✨ 核心功能   ```



- 📦 **数据采集** - PA 平台特定数据采集3. **配置爬取**

- 💾 **数据导出** - 标准格式导出   ```

- 🎨 **界面友好** - 简洁易用   🛍️ 产品订单采集

   ├─ 爬取模式: 单页模式

#### 📁 文件位置   ├─ 关键字筛选: (可选，如 "gold")

   └─ 点击 "🛒 开始爬取产品订单"

```   ```

PA-Project/

└── pa-scraper.user.js     - 主脚本4. **查看结果**

```   ```

   📋 产品订单: 24

---   ```



## 🔧 安装说明#### 预期结果



### 方法一：直接安装（推荐）- 采集时间: 约 3-5 秒

- 数据量: 24 个产品订单（一页）

1. 确保已安装 Tampermonkey- 包含字段: 链接、标题、卖家、价格、交付时间等

2. 点击上方表格中的安装链接

3. Tampermonkey 会自动识别并弹出安装页面### 场景三: 爬取产品订单（多页模式）

4. 点击"安装"按钮

**目标**: 采集中等数量数据

### 方法二：手动安装

#### 操作步骤

1. 下载对应的 `.user.js` 文件

2. 打开 Tampermonkey 管理面板1. **选择游戏和服务**（同场景二）

3. 点击 "+" 创建新脚本

4. 复制粘贴文件内容2. **配置多页爬取**

5. 按 `Ctrl + S` 保存   ```

   🛍️ 产品订单采集

### 验证安装   ├─ 爬取模式: 多页模式

   ├─ 最大页数: 5

1. 访问对应的平台网站   ├─ 关键字筛选: (可选)

2. 页面应该出现脚本的操作界面   └─ 点击 "🛒 开始爬取产品订单"

3. 如果没有出现，刷新页面或检查 Tampermonkey 是否启用   ```



---3. **监控进度**

   - 实时显示当前页码

## 📊 功能对比   - 显示已爬取数量

   - 进度条提示

| 功能 | Z2U | G2G | PA |

|------|-----|-----|-----|4. **确认对话框**

| 游戏列表采集 | ✅ | ✅ | ✅ |   ```

| 订单批量采集 | ✅ | ✅ | ✅ |   即将开始爬取产品订单

| 多种服务类型 | ✅ | ✅ (7种) | ✅ |   

| CSV 导出 | ❌ | ✅ | ✅ |   模式: 多页模式 (最多 5 页)

| XLSX 导出 | ✅ | ❌ | ❌ |   关键字: (无)

| JSON 导出 | ✅ | ✅ | ✅ |   

| 关键字筛选 | ✅ | ✅ | ✅ |   确定继续吗?

| 增量更新 | ✅ | ❌ | ❌ |   ```

| Cloudflare 绕过 | ✅ | ❌ | ❌ |

| 实时统计 | ✅ | ✅ | ✅ |#### 预期结果

| 悬浮面板 | ✅ | ✅ | ✅ |

- 采集时间: 约 15-30 秒（5页）

---- 数据量: 约 120 个订单（24/页 × 5）

- 自动翻页: 无需手动操作

## ❓ 常见问题

### 场景四: 爬取产品订单（全部模式）

### Q1: 脚本无法运行？

**目标**: 采集完整数据集

**解决方案**:

1. 检查 Tampermonkey 是否已启用#### 操作步骤

2. 检查脚本是否启用

3. 刷新页面（F5）1. **选择游戏和服务**（同场景二）

4. 清除浏览器缓存

2. **配置全部爬取**

### Q2: 如何更新脚本？   ```

   🛍️ 产品订单采集

**自动更新**:   ├─ 爬取模式: 全部模式

- Tampermonkey 会定期检查更新   ├─ 关键字筛选: (可选)

- 有更新时会自动提示   └─ 点击 "🛒 开始爬取产品订单"

   ```

**手动更新**:

1. 删除旧版本脚本3. **耐心等待**

2. 重新安装最新版本   - 自动爬取所有页面

   - 直到没有更多数据

### Q3: 导出的数据在哪里？

#### 预期结果

- CSV/XLSX/JSON 文件会自动下载到浏览器默认下载目录

- 文件名格式: `平台_类型_时间戳.格式`- 采集时间: 1-10 分钟（取决于总页数）

- 数据量: 数百至数千条

### Q4: 可以同时使用多个脚本吗？- **注意**: 请确保网络稳定



- 可以，三个脚本互不干扰### 场景五: 使用关键字筛选

- 每个脚本只在对应的平台网站上运行

**目标**: 只采集包含特定关键词的产品

### Q5: 数据采集速度慢？

#### 操作步骤

**优化建议**:

- 使用单页或多页模式代替全部模式1. **输入关键字**

- 避免在网络高峰期采集   ```

- 检查网络连接速度   关键字筛选: gold

   ```

### Q6: CSV 在 Excel 中乱码？

2. **开始爬取**

**解决方案**:   - 脚本会自动过滤标题

- G2G Scraper 使用 UTF-8 with BOM 编码，Excel 应该能直接打开   - 只保存包含 "gold" 的产品

- 如果仍然乱码，使用 Excel 的导入功能，选择 UTF-8 编码

#### 示例

---

**关键字**: `legendary`

## 🤝 贡献

**结果**:

欢迎提交 Issue 和 Pull Request！- ✅ "Legendary Sword +5"

- ✅ "Full Legendary Gear Set"

### 贡献指南- ❌ "Epic Item Bundle"



1. Fork 本仓库### 场景六: 导出数据

2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)

3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)#### CSV 导出（推荐用于 Excel）

4. 推送到分支 (`git push origin feature/AmazingFeature`)

5. 开启 Pull Request```

💾 数据导出

---└─ 点击 "📊 导出 CSV"

```

## 📄 许可证

**特点**:

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件- ✅ UTF-8 with BOM 编码（中文不乱码）

- ✅ Excel 可直接打开

---- ✅ 包含所有字段

- ✅ 价格千位分隔符已处理

## ⚠️ 免责声明- ✅ 双引号正确转义



本工具仅供学习和研究使用。请遵守各平台的服务条款和使用规则。**文件名格式**:

```

**注意事项**:g2g_productOrders_1759689669445.csv

- ⚠️ 请勿过度频繁地爬取数据```

- ⚠️ 请勿用于商业目的

- ⚠️ 请尊重网站的服务条款#### JSON 导出（推荐用于程序处理）

- ⚠️ 作者不对使用本工具产生的任何后果负责

```

---💾 数据导出

└─ 点击 "📄 导出 JSON"

## 📞 支持与反馈```



### 问题反馈**特点**:

- ✅ 完整的数据结构

如果遇到问题，请在 [Issues](https://github.com/a1006542588/game-scraper-collection/issues) 中反馈，并提供：- ✅ 可直接用于程序

- ✅ 包含所有元数据

1. 脚本名称和版本

2. 浏览器版本**文件名格式**:

3. 页面 URL```

4. 错误信息（F12 控制台）g2g_productOrders_1759689669445.json

5. 复现步骤```



### 功能建议#### 复制到剪贴板



欢迎提出新功能建议！```

💾 数据导出

---└─ 点击 "📋 复制数据"

```

## 🙏 致谢

**特点**:

感谢所有使用者的支持和反馈！- ✅ 快速分享

- ✅ JSON 格式

---- ✅ 可粘贴到任何地方



## 📚 相关链接---



- [Tampermonkey 官网](https://www.tampermonkey.net/)## 📊 数据格式说明

- [Z2U.com](https://www.z2u.com)

- [G2G.com](https://www.g2g.com)### CSV 格式（产品订单）



---#### 表头



**最后更新**: 2025-10-06  ```csv

**作者**: [a1006542588](https://github.com/a1006542588)产品链接,标题,卖家名称,卖家等级,价格,货币,Offers数量,库存,交付时间,页码,爬取时间

```

⭐ 如果这些工具对你有帮助，请给项目一个 Star！

#### 字段说明

---

| 字段名 | 类型 | 说明 | 示例 | 必填 |

<div id="english"></div>|-------|------|------|------|------|

| 产品链接 | URL | 产品详情页链接 | https://www.g2g.com/offer/... | ✅ |

# 🎮 Game Trading Platform Scrapers| 标题 | 文本 | 产品标题 | Diablo 4 Gold 1000M | ✅ |

| 卖家名称 | 文本 | 卖家用户名 | SellerName 或 N/A（金币） | ✅ |

> Collection of Tampermonkey userscripts for automated data collection from Z2U, G2G, and PA gaming platforms| 卖家等级 | 数字 | 卖家信誉等级 | 150 | ❌ |

| 价格 | 数字 | 产品价格（无逗号） | 1443.86 | ✅ |

## 🌟 Features| 货币 | 文本 | 货币代码 | USD | ✅ |

| Offers数量 | 数字 | Offers数（仅金币） | 73 | ❌ |

- **Multi-Platform Support**: Z2U, G2G, and PA platforms| 库存 | 数字 | 库存数量 | 50 | ❌ |

- **Comprehensive Data Collection**: Games, orders, prices, and more| 交付时间 | 文本 | 预计交付时间 | 15-30 min | ❌ |

- **Multiple Export Formats**: CSV, XLSX, JSON| 页码 | 数字 | 爬取的页码 | 1 | ✅ |

- **User-Friendly Interface**: Floating panels with real-time stats| 爬取时间 | ISO8601 | 爬取时间戳 | 2025-10-06T18:40:46.349Z | ✅ |

- **Smart Features**: Auto-update, keyword filtering, Cloudflare bypass

#### 数据示例

## 🚀 Quick Start

**代练/物品/账号页面**:

1. Install [Tampermonkey](https://www.tampermonkey.net/)```csv

2. Click install links abovehttps://www.g2g.com/offer/G1234,"Diablo 4 Account","SellerName",150,26.99,USD,,,15-30 min,1,2025-10-06T12:00:00.000Z

3. Visit the platform website```

4. Start scraping!

**金币页面**:

## 📖 Documentation```csv

https://www.g2g.com/categories/wow-gold/offer/group?...,"Gehennas [EU] - Horde",N/A,,0.318943,USD,73,,,1,2025-10-06T12:00:00.000Z

Each project includes detailed documentation in its respective folder.```



---### JSON 格式



**Version**: Multi-project v1.0  #### 游戏对象

**License**: MIT  

**Author**: [a1006542588](https://github.com/a1006542588)```json

{
  "id": "diablo-4-gold",
  "name": "Diablo 4",
  "url": "https://www.g2g.com/categories/diablo-4-gold",
  "offers": "1234",
  "category": "Game coins",
  "categories": ["Game coins", "Items", "Accounts"],
  "scrapedAt": "2025-10-06T12:00:00.000Z"
}
```

#### 产品订单对象

```json
{
  "link": "https://www.g2g.com/offer/G1234",
  "title": "Diablo 4 Gold 1000M",
  "sellerName": "SellerName",
  "sellerLevel": "150",
  "price": "26.99",
  "currency": "USD",
  "offersCount": "",
  "stock": "50",
  "deliveryTime": "15-30 min",
  "pageNumber": 1,
  "scrapedAt": "2025-10-06T12:00:00.000Z"
}
```

---

## 🎯 最佳实践

### 1. 采集效率优化

**推荐流程**:
```
1. 先爬取游戏列表（一次即可）
   └─ 获取所有可用游戏

2. 按需爬取产品订单
   ├─ 测试: 单页模式
   ├─ 中量: 多页模式（5-10页）
   └─ 完整: 全部模式

3. 定期更新
   └─ 只需重新爬取产品订单
```

### 2. 数据管理建议

**清除策略**:
```
❌ 不推荐: 经常清除游戏列表
   └─ 游戏列表相对稳定，无需频繁更新

✅ 推荐: 定期清除产品订单
   └─ 产品订单变化快，建议定期清空后重新爬取
```

**示例工作流**:
```
第一天:
└─ 爬取游戏列表（450个游戏）
└─ 爬取 Diablo 4 金币订单（100条）

第二天:
└─ 清除产品订单
└─ 重新爬取 Diablo 4 金币订单（获取最新数据）

一周后:
└─ 清除游戏列表
└─ 重新爬取游戏列表（可能有新游戏）
```

### 3. 网络问题处理

**慢速网络**:
- ✅ 脚本已内置 20 秒超时保护
- ✅ 自动重试机制
- ✅ 如果仍然超时，尝试单页模式

**网络中断**:
- ✅ 已采集的数据会自动保存
- ✅ 可以继续从中断处开始

### 4. 关键字筛选技巧

**单个关键词**:
```
gold  - 匹配所有包含 "gold" 的产品
```

**多个关键词（OR 逻辑）**:
```
暂不支持，建议分次爬取:
1. 关键字: gold
2. 关键字: coin
3. 手动合并数据
```

**忽略大小写**:
```
关键字匹配是大小写不敏感的:
"Gold" = "gold" = "GOLD"
```

---

## ❓ 常见问题

### Q1: 侧边栏没有显示？

**解决方案**:
1. 检查 Tampermonkey 是否启用
2. 检查脚本是否安装并启用
3. 刷新页面（F5）
4. 清除浏览器缓存

### Q2: 爬取停止或卡住？

**可能原因**:
- 网络速度慢
- 页面加载超时
- G2G 页面结构变化

**解决方案**:
1. 查看浏览器控制台（F12）的错误信息
2. 尝试单页模式测试
3. 检查网络连接
4. 更新脚本到最新版本

### Q3: CSV 在 Excel 中乱码？

**原因**: 编码问题（但本脚本已处理）

**验证**:
- 脚本使用 UTF-8 with BOM 编码
- Excel 应该能直接打开

**如果仍然乱码**:
1. 使用 Excel 导入功能
2. 选择文件类型: CSV
3. 选择编码: UTF-8
4. 点击导入

### Q4: 价格显示为两列？

**已修复**: v1.1.4 版本已修复此问题

**原因**: 价格包含千位分隔符（如 1,443.86）

**解决**: 更新到最新版本

### Q5: 无法翻页或翻页失败？

**检查**:
1. 是否已经是最后一页
2. 查看控制台错误信息
3. 手动点击下一页测试

**解决**:
- 使用多页模式，设置合理的最大页数
- 避免使用全部模式（如果页面太多）

### Q6: 数据不完整或缺失？

**检查字段**:
- 金币页面: 没有卖家信息（正常）
- 某些页面: 可能没有库存/交付时间（正常）

**不同页面的数据完整性**:

| 页面类型 | 卖家信息 | 价格 | Offers | 库存 | 交付时间 |
|---------|---------|------|--------|------|---------|
| 金币 | ❌ (N/A) | ✅ | ✅ | ❌ | ❌ |
| 代练 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 物品 | ✅ | ✅ | ❌ | ✅ | ✅ |
| 账号 | ✅ | ✅ | ❌ | ✅ | ✅ |

### Q7: 如何更新脚本？

**方法一**: Tampermonkey 自动更新
- Tampermonkey 会定期检查更新
- 有更新时会自动提示

**方法二**: 手动更新
1. 删除旧版本脚本
2. 重新安装最新版本

**检查版本**:
```javascript
// 脚本开头的版本号
// @version      1.1.4
```

---

## 📝 更新日志

### v1.1.4 (2025-10-06)

**🐛 Bug修复**:
- 修复 CSV 数据串行问题（价格千位分隔符导致列错位）
- 修复金币页面价格、Offers数量、交付时间提取失败
- 修复代练页面交付时间提取失败
- 修复游戏数量不显示问题
- 修复清除产品订单后 CSV 仍导出旧数据

**✨ 新功能**:
- 优化清除按钮布局（分离到各功能区域，防止误操作）
- 增强 CSV 双引号转义（符合 RFC 4180 标准）
- 实现双存储系统同步（新旧系统数据一致性）

**🔧 改进**:
- CSV 导出改为实时读取数据
- 价格字段自动移除千位分隔符
- 统计面板实时显示最新数据

### v1.1.3 (2025-10-06)

- 添加清除游戏列表和清除产品订单功能
- 优化统计面板显示逻辑
- 修复数据持久化问题

### v1.1.0 (2025-10-05)

- 完整的产品订单采集功能
- 三种爬取模式（单页/多页/全部）
- 关键字筛选
- CSV/JSON 导出
- 服务按钮区分（确认/可能）

---

## 🔧 技术说明

### 支持的页面 URL

**Trending 页面**（用于爬取游戏列表）:
```
https://www.g2g.com/trending/game-coins
https://www.g2g.com/trending/items
https://www.g2g.com/trending/accounts
https://www.g2g.com/trending/boosting
https://www.g2g.com/trending/mobile-recharge
https://www.g2g.com/trending/coaching
https://www.g2g.com/trending/skins
```

**产品页面**（用于爬取产品订单）:
```
https://www.g2g.com/categories/{game}-gold
https://www.g2g.com/categories/{game}-item-buy
https://www.g2g.com/categories/{game}-account
https://www.g2g.com/categories/{game}-boosting-service
https://www.g2g.com/categories/{game}-top-up
https://www.g2g.com/categories/{game}-coaching
https://www.g2g.com/categories/{game}-gift-cards
```

### 数据存储

**存储位置**: Tampermonkey 本地存储

**存储键**:
- `games` - 游戏列表
- `productOrders` - 产品订单
- `products` - 产品数据（兼容）

**数据大小限制**: 
- 取决于浏览器（通常 5-10 MB）
- 建议定期导出并清除

### 性能优化

**虚拟滚动**: 
- 游戏列表使用虚拟滚动
- 每次只渲染 50 个项目
- 支持数千个游戏不卡顿

**去重机制**:
- 游戏列表: 按名称去重，合并服务类型
- 产品订单: 按链接去重

**超时保护**:
```javascript
初始等待: 3 秒
元素等待: 20 次 × 1 秒 = 20 秒
产品卡片: 10 次 × 2 秒 = 20 秒
```

---

## 📞 支持与反馈

### 问题反馈

如果遇到问题，请提供以下信息：

1. **脚本版本**: v1.1.4
2. **浏览器**: Chrome/Firefox/Edge
3. **页面 URL**: 出问题的页面地址
4. **错误信息**: 浏览器控制台（F12）的错误
5. **复现步骤**: 详细的操作步骤

### GitHub Issues

提交问题: [GitHub Issues](https://github.com/a1006542588/g2g-scraper/issues)

### 功能建议

欢迎提出新功能建议！

---

## 📄 许可证

MIT License - 自由使用，但请保留版权信息

## ⚠️ 免责声明

本工具仅供学习和研究使用。请遵守 G2G.com 的服务条款和使用规则。

**注意事项**:
- ⚠️ 请勿过度频繁地爬取数据
- ⚠️ 请勿用于商业目的
- ⚠️ 请尊重网站的服务条款
- ⚠️ 作者不对使用本工具产生的任何后果负责

---

## 🙏 致谢

感谢所有使用者的支持和反馈！

---

**版本**: v1.1.4  
**最后更新**: 2025-10-06  
**作者**: [a1006542588](https://github.com/a1006542588)

⭐ 如果这个工具对你有帮助，请给项目一个 Star！

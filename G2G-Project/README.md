# G2G Scraper - 使用说明

[![Version](https://img.shields.io/badge/version-1.1.4-blue.svg)](https://github.com/a1006542588/game-scraper-collection)
[![Platform](https://img.shields.io/badge/platform-G2G.com-orange.svg)](https://www.g2g.com)

> G2G.com 游戏交易平台数据采集工具

---

##  快速安装

**点击安装**: [g2g-scraper.user.js](https://github.com/a1006542588/game-scraper-collection/raw/main/G2G-Project/g2g-scraper.user.js)

---

##  主要功能

-  **爬取游戏列表** - 自动采集所有游戏（7种服务类型）
-  **产品订单采集** - 单页/多页/全部三种模式
-  **关键字筛选** - 按标题关键词过滤产品
-  **CSV/JSON 导出** - 双格式导出，Excel 兼容
-  **实时统计** - 游戏数量、订单数量实时显示

---

##  使用教程

### 第一步：爬取游戏列表

```
1. 访问 G2G Trending 页面
   https://www.g2g.com/trending/game-coins

2. 右侧会出现侧边栏面板

3. 点击" 一键爬取所有游戏"按钮

4. 等待自动爬取完成（约 3-5 分钟）
```

**支持的服务类型**:
- Game Coins (游戏币)
- Items (游戏物品)
- Accounts (游戏账号)
- Boosting (代练服务)
- Top Up (充值服务)
- Other (其他服务)
- Gift Card (礼品卡)

### 第二步：爬取产品订单

```
1. 在游戏列表中选择一个游戏

2. 进入游戏的产品页面

3. 在侧边栏选择爬取模式:
    单页 - 只爬当前页
    多页 - 输入页数（如 5 页）
    全部 - 爬取所有页面

4. 点击"开始爬取"按钮

5. 可选：输入关键字过滤（如 "gold"）
```

### 第三步：导出数据

```
1. 爬取完成后，点击"导出 CSV"或"导出 JSON"

2. 文件会自动下载到本地

3. CSV 文件可用 Excel 打开查看
```

---

##  数据字段说明

**游戏列表数据**:
- 游戏名称
- 服务类型（Coins/Items/Accounts 等）
- 游戏链接

**产品订单数据**:
- 产品标题
- 产品链接
- 卖家名称
- 价格
- 发货时间
- 在线状态

---

##  常见问题

**Q: 爬取速度慢？**  
A: 为避免触发反爬机制，脚本会自动控制请求速度（每页间隔 3-5 秒）

**Q: 关键字筛选怎么用？**  
A: 输入关键词（如 "gold" 或 "cheap"），只会爬取标题包含该关键词的订单

**Q: 能爬取多少条数据？**  
A: 取决于页面实际数据量。单页约 20-30 条，多页按页数计算

**Q: 导出的 CSV 乱码？**  
A: 用 Excel 打开时选择"UTF-8"编码，或用 WPS 直接打开

---

##  更新日志

### v1.1.4 (最新版)
- 优化侧边栏样式
- 修复部分页面元素定位问题
- 改进关键字筛选功能

### v1.1.3
- 新增关键字过滤功能
- 支持 7 种服务类型
- 优化数据导出格式

### v1.1.0
- 新增游戏列表一键爬取
- 支持 CSV/JSON 双格式导出
- 添加实时统计显示

---

<div align="center">

** 提示**: 使用过程中遇到问题，可查看 [常见问题](#-常见问题) 或提交 Issue

</div>

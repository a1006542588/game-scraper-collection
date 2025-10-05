// ==UserScript==
// @name         G2G 商品爬取助手
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  G2G.com 商品信息爬取工具 - 支持游戏列表、商品价格、卖家信息等数据采集
// @author       Your Name
// @match        https://www.g2g.com/*
// @match        https://g2g.com/*
// @icon         https://www.g2g.com/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @connect      g2g.com
// @connect      www.g2g.com
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // 配置区域
    // ============================================
    const CONFIG = {
        // 调试模式
        DEBUG: true,
        
        // 数据存储键名
        STORAGE_KEY: 'g2g_scraper_data',
        
        // 爬取延迟 (毫秒)
        SCRAPE_DELAY: 1000,
        
        // 页面切换延迟 (毫秒)
        PAGE_SWITCH_DELAY: 2000,
        
        // 翻页延迟 (毫秒)
        PAGINATION_DELAY: 1500,
        
        // 最大重试次数
        MAX_RETRIES: 3,
        
        // 每页最大翻页次数 (防止无限循环)
        MAX_PAGES_PER_CATEGORY: 50,
        
        // 游戏选择器虚拟滚动配置
        GAMES_PER_PAGE: 50,
        
        // 要爬取的页面列表
        SCRAPE_URLS: [
            'https://www.g2g.com/trending/game-coins',
            'https://www.g2g.com/trending/items',
            'https://www.g2g.com/trending/accounts',
            'https://www.g2g.com/trending/boosting',
            'https://www.g2g.com/trending/mobile-recharge',
            'https://www.g2g.com/trending/coaching',
            'https://www.g2g.com/trending/skins'
        ],
        
        // API 端点 (如果需要)
        API_BASE: 'https://www.g2g.com/api',
        
        // 导出格式
        EXPORT_FORMATS: ['JSON', 'CSV', 'Excel']
    };

    // ============================================
    // 全局变量
    // ============================================
    let scraperData = {
        games: [],           // 游戏列表
        products: [],        // 商品列表
        productOrders: [],   // 产品订单 (新增)
        sellers: [],         // 卖家信息
        prices: [],          // 价格历史
        categories: [],      // 分类信息
        serviceTypes: [],    // 服务类型 (Game coins, Items, Accounts, Boosting, Telco, Coaching, Skins)
        statistics: {
            totalGames: 0,
            totalProducts: 0,
            totalProductOrders: 0,  // 新增
            totalSellers: 0,
            totalServiceTypes: 0,
            lastUpdate: null
        }
    };

    let selectedGame = null;  // 当前选中的游戏

    let isScraperActive = false;
    let scrapingProgress = {
        current: 0,
        total: 0,
        currentPage: 0,
        totalPages: 0,
        currentCategory: '',
        stage: 'idle'
    };
    
    // 产品订单爬取配置
    let productScrapingConfig = {
        mode: 'single',        // 'single', 'multi', 'all'
        maxPages: 5,           // 多页模式时的最大页数
        keyword: '',           // 关键字筛选
        currentPage: 0,        // 当前页数
        totalScraped: 0        // 已爬取数量
    };
    
    // 虚拟滚动状态
    let gameListState = {
        currentPage: 0,
        filteredGames: [],
        searchTerm: ''
    };

    // ============================================
    // 工具函数
    // ============================================
    
    /**
     * 日志输出
     */
    function log(message, type = 'info') {
        if (!CONFIG.DEBUG && type === 'debug') return;
        
        const prefix = '[G2G Scraper]';
        const styles = {
            info: 'color: #17A2B8',
            success: 'color: #28A745',
            warning: 'color: #FFC107',
            error: 'color: #DC3545',
            debug: 'color: #6C757D'
        };
        
        console.log(`%c${prefix} ${message}`, styles[type] || styles.info);
    }

    /**
     * 延迟函数
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取存储的数据
     */
    function loadData() {
        try {
            const saved = GM_getValue(CONFIG.STORAGE_KEY, null);
            if (saved) {
                scraperData = JSON.parse(saved);
                
                // 确保所有必需的字段都存在
                if (!scraperData.serviceTypes) {
                    scraperData.serviceTypes = [];
                }
                if (!scraperData.statistics) {
                    scraperData.statistics = {
                        totalGames: 0,
                        totalProducts: 0,
                        totalSellers: 0,
                        totalServiceTypes: 0,
                        lastUpdate: null
                    };
                }
                
                log(`已加载 ${scraperData.games.length} 个游戏, ${scraperData.products.length} 个商品`, 'success');
                return true;
            }
        } catch (error) {
            log(`加载数据失败: ${error.message}`, 'error');
        }
        return false;
    }

    /**
     * 保存数据到存储
     */
    function saveData() {
        try {
            scraperData.statistics.lastUpdate = new Date().toISOString();
            
            // 保存到旧的存储系统
            GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(scraperData));
            
            // 同时保存到新的独立存储系统(用于统计显示)
            GM_setValue('games', scraperData.games || []);
            GM_setValue('productOrders', scraperData.productOrders || []);
            GM_setValue('products', scraperData.products || []);
            
            log('数据已保存', 'success');
            return true;
        } catch (error) {
            log(`保存数据失败: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * 清空所有数据
     */
    function clearData() {
        scraperData = {
            games: [],
            products: [],
            productOrders: [],
            sellers: [],
            prices: [],
            categories: [],
            serviceTypes: [],
            statistics: {
                totalGames: 0,
                totalProducts: 0,
                totalProductOrders: 0,
                totalSellers: 0,
                totalServiceTypes: 0,
                lastUpdate: null
            }
        };
        GM_deleteValue(CONFIG.STORAGE_KEY);
        // 同时清除爬取进度,允许重新开始
        GM_deleteValue('scraping_progress');
        log('所有数据已清空(包括爬取进度)', 'warning');
    }

    /**
     * HTTP 请求封装
     */
    function makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: options.method || 'GET',
                url: url,
                headers: options.headers || {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                },
                data: options.data,
                timeout: options.timeout || 30000,
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response);
                    } else {
                        reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
                    }
                },
                onerror: (error) => reject(error),
                ontimeout: () => reject(new Error('Request timeout'))
            });
        });
    }

    // ============================================
    // 数据爬取功能
    // ============================================

    /**
     * 从当前页面爬取游戏列表 (单页)
     */
    function scrapeCurrentPageGames() {
        const games = [];
        
        try {
            // 选择器: 兼容多种页面布局
            // data-v-2c68e894 用于 game-coins, items, accounts, boosting, skins, coaching
            // data-v-40aa2ee8 用于 mobile-recharge (Telco)
            let gameElements = document.querySelectorAll('a[data-v-2c68e894][href*="/categories/"]');
            let selectorType = 'standard';
            
            // 如果第一种选择器没找到元素,尝试第二种(Telco页面)
            if (gameElements.length === 0) {
                gameElements = document.querySelectorAll('a[data-v-40aa2ee8][href*="/categories/"]');
                selectorType = 'telco';
                log(`使用 Telco 页面选择器,找到 ${gameElements.length} 个元素`, 'debug');
            } else {
                log(`使用标准选择器,找到 ${gameElements.length} 个元素`, 'debug');
            }
            
            gameElements.forEach((element, index) => {
                try {
                    // 提取游戏名称
                    const nameElement = element.querySelector('.ellipsis-2-lines');
                    const name = nameElement ? nameElement.textContent.trim() : '';
                    
                    // 提取链接
                    const url = element.href || '';
                    
                    // 提取游戏ID
                    const urlMatch = url.match(/\/categories\/([^/?]+)/);
                    const gameId = urlMatch ? urlMatch[1] : null;
                    
                    // 提取订单数量
                    const offersElement = element.querySelector('.g-chip-counter');
                    const offers = offersElement ? offersElement.textContent.trim() : '0';
                    
                    // 提取分类 (从URL判断)
                    let category = 'unknown';
                    if (window.location.href.includes('/game-coins')) category = 'Game coins';
                    else if (window.location.href.includes('/items')) category = 'Items';
                    else if (window.location.href.includes('/accounts')) category = 'Accounts';
                    else if (window.location.href.includes('/boosting')) category = 'Boosting';
                    else if (window.location.href.includes('/mobile-recharge')) category = 'Telco';
                    else if (window.location.href.includes('/coaching')) category = 'Coaching';
                    else if (window.location.href.includes('/skins')) category = 'Skins';
                    
                    if (name && url && gameId) {
                        games.push({
                            id: gameId,
                            name: name,
                            url: url,
                            offers: offers,
                            category: category,
                            categories: [category],  // 初始化时就创建数组
                            scrapedAt: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    log(`提取游戏信息失败: ${err.message}`, 'debug');
                }
            });
            
        } catch (error) {
            log(`爬取当前页游戏失败: ${error.message}`, 'error');
        }
        
        return games;
    }

    /**
     * 查找并点击下一页按钮
     * @returns {boolean} 是否成功找到并点击下一页
     */
    function clickNextPageButton() {
        try {
            // 查找包含右箭头图标的按钮
            const buttons = document.querySelectorAll('button.q-btn');
            
            for (let button of buttons) {
                const icon = button.querySelector('i.material-icons');
                if (icon && icon.textContent.trim() === 'keyboard_arrow_right') {
                    // 检查按钮是否可点击 (非禁用状态)
                    if (!button.disabled && !button.classList.contains('disabled')) {
                        log('找到下一页按钮,准备点击...', 'debug');
                        button.click();
                        return true;
                    } else {
                        log('下一页按钮已禁用,可能已到最后一页', 'debug');
                        return false;
                    }
                }
            }
            
            log('未找到下一页按钮', 'debug');
            return false;
            
        } catch (error) {
            log(`点击下一页失败: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * 爬取单个分类的所有页面
     * @param {string} categoryUrl 分类URL
     * @returns {Promise<Array>} 爬取到的游戏列表
     */
    async function scrapeCategoryAllPages(categoryUrl) {
        const categoryName = categoryUrl.split('/').pop();
        log(`开始爬取分类: ${categoryName}`, 'info');
        scrapingProgress.currentCategory = categoryName;
        
        const allGames = [];
        let currentPage = 1;
        let hasNextPage = true;
        
        // 如果当前不在目标页面,先跳转
        if (!window.location.href.startsWith(categoryUrl)) {
            log(`跳转到: ${categoryUrl}`, 'info');
            window.location.href = categoryUrl;
            return null; // 返回null表示需要等待页面加载
        }
        
        // 等待页面加载
        await sleep(CONFIG.PAGINATION_DELAY);
        
        // 循环爬取所有页面
        while (hasNextPage && currentPage <= CONFIG.MAX_PAGES_PER_CATEGORY) {
            scrapingProgress.currentPage = currentPage;
            log(`爬取 ${categoryName} 第 ${currentPage} 页...`, 'info');
            updateProgressDisplay();
            
            // 爬取当前页
            const pageGames = scrapeCurrentPageGames();
            log(`第 ${currentPage} 页找到 ${pageGames.length} 个游戏`, 'debug');
            
            if (pageGames.length === 0) {
                log('当前页未找到游戏,可能已到末页', 'warning');
                break;
            }
            
            allGames.push(...pageGames);
            
            // 尝试点击下一页
            hasNextPage = clickNextPageButton();
            
            if (hasNextPage) {
                // 等待页面加载
                await sleep(CONFIG.PAGINATION_DELAY);
                currentPage++;
            } else {
                log(`${categoryName} 分类爬取完成,共 ${currentPage} 页`, 'success');
            }
        }
        
        if (currentPage > CONFIG.MAX_PAGES_PER_CATEGORY) {
            log(`达到最大页数限制 (${CONFIG.MAX_PAGES_PER_CATEGORY}),停止爬取`, 'warning');
        }
        
        return allGames;
    }

    /**
     * 一键爬取所有分类的游戏列表
     */
    async function scrapeAllCategories() {
        if (isScraperActive) {
            showNotification('提示', '爬取任务正在进行中...', 'warning');
            return;
        }
        
        // 检查是否有断点续传的进度
        const savedProgress = GM_getValue('scraping_progress', null);
        let startIndex = 0;
        
        if (savedProgress && Date.now() - savedProgress.timestamp < 600000) {
            // 10分钟内的进度有效
            startIndex = savedProgress.currentIndex;
            log(`从断点继续: 第 ${startIndex + 1} 个分类`, 'info');
        }
        
        isScraperActive = true;
        scrapingProgress.stage = 'games';
        scrapingProgress.current = startIndex;
        scrapingProgress.total = CONFIG.SCRAPE_URLS.length;
        
        log('========== 开始一键爬取所有游戏 ==========', 'info');
        showNotification('开始爬取', `准备爬取 ${CONFIG.SCRAPE_URLS.length} 个分类 (从第 ${startIndex + 1} 个开始)`, 'info');
        
        const startTime = Date.now();
        
        try {
            for (let i = startIndex; i < CONFIG.SCRAPE_URLS.length; i++) {
                const url = CONFIG.SCRAPE_URLS[i];
                scrapingProgress.current = i + 1;
                
                log(`\n[${i + 1}/${CONFIG.SCRAPE_URLS.length}] 处理分类: ${url}`, 'info');
                updateProgressDisplay();
                
                // 爬取该分类的所有页面
                const categoryGames = await scrapeCategoryAllPages(url);
                
                if (categoryGames === null) {
                    // 需要跳转,保存进度并等待下次执行
                    log('页面跳转中,保存进度...', 'info');
                    GM_setValue('scraping_progress', {
                        currentIndex: i,
                        timestamp: Date.now(),
                        totalCategories: CONFIG.SCRAPE_URLS.length
                    });
                    showNotification('页面跳转', '正在跳转,请勿关闭页面', 'info');
                    return;
                }
                
                if (categoryGames && categoryGames.length > 0) {
                    // 实时保存每个分类的数据
                    log(`分类 ${url.split('/').pop()} 完成,获得 ${categoryGames.length} 个游戏`, 'success');
                    
                    // 去重并合并到已有数据
                    const uniqueGamesMap = new Map(scraperData.games.map(g => [g.id, g]));
                    
                    categoryGames.forEach(game => {
                        if (!uniqueGamesMap.has(game.id)) {
                            // 新游戏,直接添加
                            uniqueGamesMap.set(game.id, game);
                            log(`[新游戏] ${game.name} (${game.id}) - 服务: ${game.category}`, 'debug');
                        } else {
                            // 游戏已存在,合并分类信息
                            const existing = uniqueGamesMap.get(game.id);
                            
                            // 确保existing有categories数组
                            if (!existing.categories) {
                                existing.categories = [existing.category];
                            }
                            
                            // 记录合并前的状态
                            const beforeCategories = [...existing.categories];
                            
                            // 添加新游戏的category
                            if (game.category && !existing.categories.includes(game.category)) {
                                existing.categories.push(game.category);
                            }
                            
                            // 如果新游戏也有categories数组,合并它们
                            if (game.categories && Array.isArray(game.categories)) {
                                game.categories.forEach(cat => {
                                    if (cat && !existing.categories.includes(cat)) {
                                        existing.categories.push(cat);
                                    }
                                });
                            }
                            
                            // 只在有新增时才打印日志
                            if (existing.categories.length > beforeCategories.length) {
                                const newCategories = existing.categories.filter(c => !beforeCategories.includes(c));
                                log(`[合并] ${game.name} 新增服务: ${newCategories.join(', ')} (总计: ${existing.categories.join(', ')})`, 'debug');
                            }
                        }
                    });
                    
                    scraperData.games = Array.from(uniqueGamesMap.values());
                    scraperData.statistics.totalGames = scraperData.games.length;
                    saveData();
                    
                    log(`当前总游戏数: ${scraperData.games.length}`, 'info');
                }
                
                // 更新进度(指向下一个分类)
                const nextIndex = i + 1;
                GM_setValue('scraping_progress', {
                    currentIndex: nextIndex,
                    timestamp: Date.now(),
                    totalCategories: CONFIG.SCRAPE_URLS.length
                });
                
                // 如果不是最后一个分类,跳转到下一个
                if (nextIndex < CONFIG.SCRAPE_URLS.length) {
                    const nextUrl = CONFIG.SCRAPE_URLS[nextIndex];
                    log(`\n准备跳转到下一个分类: ${nextUrl}`, 'info');
                    log(`已保存进度: 索引=${nextIndex}, 总数=${CONFIG.SCRAPE_URLS.length}`, 'debug');
                    
                    showNotification('正在跳转', `即将跳转到第 ${nextIndex + 1} 个分类`, 'info');
                    
                    await sleep(CONFIG.PAGE_SWITCH_DELAY);
                    
                    log(`执行跳转: ${nextUrl}`, 'info');
                    window.location.href = nextUrl;
                    return; // 等待页面加载后自动继续
                }
            }
            
            // 所有分类爬取完成
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            log(`\n========== 爬取完成 ==========`, 'success');
            log(`总耗时: ${elapsed} 秒`, 'success');
            log(`总游戏数: ${scraperData.games.length}`, 'success');
            log(`==============================\n`, 'success');
            
            showNotification('爬取完成', `成功爬取所有游戏,共 ${scraperData.games.length} 个`, 'success');
            updatePanelDisplay();
            
            // 清除进度
            GM_deleteValue('scraping_progress');
            
            // 自动停止爬取
            isScraperActive = false;
            scrapingProgress.stage = 'idle';
            const scrapeAllBtn = document.getElementById('g2g-scrape-all-games');
            const cancelBtn = document.getElementById('g2g-cancel-scraping');
            if (scrapeAllBtn && cancelBtn) {
                scrapeAllBtn.style.display = 'block';
                cancelBtn.style.display = 'none';
            }
            updateProgressDisplay();
            
        } catch (error) {
            log(`爬取失败: ${error.message}`, 'error');
            showNotification('爬取失败', error.message, 'error');
            
            // 发生错误也要停止
            isScraperActive = false;
            scrapingProgress.stage = 'idle';
            const scrapeAllBtn = document.getElementById('g2g-scrape-all-games');
            const cancelBtn = document.getElementById('g2g-cancel-scraping');
            if (scrapeAllBtn && cancelBtn) {
                scrapeAllBtn.style.display = 'block';
                cancelBtn.style.display = 'none';
            }
            updateProgressDisplay();
        }
    }

    /**
     * 等待页面元素加载完成
     */
    async function waitForPageElements(selector, maxAttempts = 20, delay = 1000) {
        for (let i = 0; i < maxAttempts; i++) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                log(`页面元素已加载 (找到 ${elements.length} 个元素)`, 'debug');
                return true;
            }
            
            if (i < maxAttempts - 1) {
                log(`等待页面元素加载... (${i + 1}/${maxAttempts}) - 还有 ${(maxAttempts - i - 1) * delay / 1000} 秒`, 'debug');
            }
            await sleep(delay);
        }
        log(`页面元素加载超时 (等待了 ${maxAttempts * delay / 1000} 秒)`, 'warning');
        showNotification('⚠️ 页面加载超时', `无法找到元素: ${selector}`, 'warning');
        return false;
    }

    /**
     * 自动继续未完成的爬取任务
     */
    async function autoResumeScraping() {
        const progress = GM_getValue('scraping_progress', null);
        if (!progress) {
            log('没有未完成的爬取任务', 'debug');
            return;
        }
        
        // 检查是否超时 (超过10分钟)
        if (Date.now() - progress.timestamp > 600000) {
            log('爬取任务已超时,已清除', 'warning');
            GM_deleteValue('scraping_progress');
            return;
        }
        
        // 检查当前页面是否是需要爬取的分类页面
        const currentCategoryIndex = progress.currentIndex;
        if (currentCategoryIndex >= 0 && currentCategoryIndex < CONFIG.SCRAPE_URLS.length) {
            const targetUrl = CONFIG.SCRAPE_URLS[currentCategoryIndex];
            const currentUrl = window.location.href;
            
            log(`检查页面匹配: 当前=${currentUrl}, 目标=${targetUrl}`, 'debug');
            
            // 如果当前页面匹配目标URL,自动继续爬取
            if (currentUrl.startsWith(targetUrl.split('?')[0])) {
                log(`✓ 页面匹配成功! 准备继续爬取第 ${currentCategoryIndex + 1}/${progress.totalCategories} 个分类`, 'info');
                showNotification('自动继续', `检测到断点,正在恢复爬取...`, 'info');
                
                // 等待游戏列表元素加载 (兼容多种选择器)
                log('等待游戏列表加载...', 'info');
                let elementsLoaded = await waitForPageElements('a[data-v-2c68e894][href*="/categories/"]', 10, 1000);
                
                // 如果第一种选择器没找到,尝试 Telco 页面的选择器
                if (!elementsLoaded) {
                    log('尝试 Telco 页面选择器...', 'debug');
                    elementsLoaded = await waitForPageElements('a[data-v-40aa2ee8][href*="/categories/"]', 10, 1000);
                }
                
                if (elementsLoaded) {
                    log('页面加载完成,开始爬取', 'success');
                    // 显示停止按钮
                    const scrapeAllBtn = document.getElementById('g2g-scrape-all-games');
                    const cancelBtn = document.getElementById('g2g-cancel-scraping');
                    if (scrapeAllBtn && cancelBtn) {
                        scrapeAllBtn.style.display = 'none';
                        cancelBtn.style.display = 'block';
                    }
                    
                    // 延迟1秒后继续爬取
                    setTimeout(() => {
                        scrapeAllCategories();
                    }, 1000);
                } else {
                    log('页面元素未加载,可能不在正确的页面', 'warning');
                    showNotification('加载失败', '页面元素未找到,请手动重试', 'error');
                }
            } else {
                log(`页面不匹配,等待跳转... 当前索引: ${currentCategoryIndex}`, 'debug');
            }
        }
    }

    /**
     * 爬取商品列表
     */
    async function scrapeProductsList(gameId = null) {
        log('开始爬取商品列表...', 'info');
        scrapingProgress.stage = 'products';
        
        try {
            // TODO: 实现商品列表爬取逻辑
            // 1. 找到商品列表容器
            // 2. 遍历所有商品卡片
            // 3. 提取价格、标题、卖家、库存等信息
            
            const productElements = document.querySelectorAll('[data-product], .product-item, .offer-item');
            log(`找到 ${productElements.length} 个商品元素`, 'debug');
            
            // 示例数据结构
            const products = [];
            productElements.forEach((element, index) => {
                const product = {
                    id: element.dataset.productId || `product_${index}`,
                    gameId: gameId,
                    title: element.querySelector('.product-title, .offer-title')?.textContent.trim() || '',
                    price: element.querySelector('.price, .product-price')?.textContent.trim() || '',
                    currency: 'USD',
                    seller: {
                        id: '',
                        name: element.querySelector('.seller-name')?.textContent.trim() || '',
                        rating: '',
                        orderCount: ''
                    },
                    stock: element.querySelector('.stock, .quantity')?.textContent.trim() || '',
                    delivery: element.querySelector('.delivery-time')?.textContent.trim() || '',
                    url: element.querySelector('a')?.href || '',
                    scrapedAt: new Date().toISOString()
                };
                products.push(product);
            });
            
            // 合并到已有数据
            scraperData.products.push(...products);
            scraperData.statistics.totalProducts = scraperData.products.length;
            saveData();
            
            log(`商品列表爬取完成: ${products.length} 个商品`, 'success');
            return products;
            
        } catch (error) {
            log(`爬取商品列表失败: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 爬取产品订单 (新功能)
     * 从产品页面提取订单信息: 链接、标题、卖家名称、卖家等级、价格
     */
    async function scrapeProductOrders() {
        log('开始爬取产品订单...', 'info');
        scrapingProgress.stage = 'product-orders';
        
        try {
            // 等待页面加载,增加等待时间以应对慢速网络
            log('等待页面完全加载...', 'debug');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 尝试等待产品卡片元素加载
            const cardsLoaded = await waitForPageElements('.col-sm-6.col-md-3.col-xs-12', 10, 2000);
            if (!cardsLoaded) {
                log('产品卡片加载超时,尝试继续...', 'warning');
            }
            
            // 产品卡片选择器: .col-sm-6.col-md-3.col-xs-12
            const productCards = document.querySelectorAll('.col-sm-6.col-md-3.col-xs-12');
            log(`找到 ${productCards.length} 个产品卡片`, 'debug');
            
            const orders = [];
            
            productCards.forEach((card, index) => {
                try {
                    // 提取产品链接和标题
                    const linkElement = card.querySelector('a[href*="/offer/"]');
                    if (!linkElement) {
                        log(`卡片 ${index} 未找到产品链接`, 'debug');
                        return;
                    }
                    
                    const productUrl = linkElement.href;
                    
                    // 标题在 .ellipsis-2-lines 内的 span
                    const titleElement = linkElement.querySelector('.ellipsis-2-lines span');
                    const title = titleElement ? titleElement.textContent.trim() : '';
                    
                    // 卖家信息在底部区域 (金币页面可能没有)
                    const sellerElement = card.querySelector('.text-body2.ellipsis');
                    const sellerName = sellerElement ? sellerElement.textContent.trim() : 'N/A';
                    
                    // 卖家等级 (金币页面可能没有)
                    const levelElement = card.querySelector('.text-caption.text-font-2nd');
                    let sellerLevel = '';
                    if (levelElement) {
                        const levelMatch = levelElement.textContent.match(/Level\s+(\d+)/i);
                        sellerLevel = levelMatch ? levelMatch[1] : levelElement.textContent.trim();
                    }
                    
                    // 价格 - 根据页面类型使用不同选择器
                    let price = '';
                    let currency = '';
                    
                    // 方法1: 代练/物品/账号页面 - .text-body1.text-weight-medium
                    let priceElement = card.querySelector('.text-body1.text-weight-medium');
                    if (priceElement) {
                        price = priceElement.textContent.trim();
                        // 货币在相邻的 .text-caption 元素中
                        const currencyElement = priceElement.nextElementSibling;
                        if (currencyElement && currencyElement.classList.contains('text-caption')) {
                            currency = currencyElement.textContent.trim();
                        }
                    } else {
                        // 方法2: 金币页面 - .row.items-baseline 内的 span
                        const priceContainer = card.querySelector('.row.items-baseline.q-gutter-xs');
                        if (priceContainer) {
                            const priceSpans = priceContainer.querySelectorAll('span');
                            // 第二个 span 是价格, 第三个 span 是货币
                            if (priceSpans.length >= 2) {
                                price = priceSpans[1].textContent.trim();
                            }
                            if (priceSpans.length >= 3) {
                                currency = priceSpans[2].textContent.trim();
                            }
                        }
                    }
                    
                    // Offers 数量 (金币页面特有)
                    let offersCount = '';
                    const offersElement = card.querySelector('.g-chip-counter.g-chip-counter--dark');
                    if (offersElement) {
                        const offersMatch = offersElement.textContent.match(/(\d+)\s*offers?/i);
                        if (offersMatch) {
                            offersCount = offersMatch[1];
                        }
                    }
                    
                    // 库存数量
                    let stock = '';
                    const stockElement = card.querySelector('.text-caption:not(.text-font-2nd)');
                    if (stockElement) {
                        const stockMatch = stockElement.textContent.match(/Stock[:\s]*(\d+)/i);
                        if (stockMatch) {
                            stock = stockMatch[1];
                        }
                    }
                    
                    // 交付时间
                    let deliveryTime = '';
                    // 方法1: 代练页面 - .g-chip-counter.row.items-center 内的 div
                    const timeContainer = card.querySelector('.g-chip-counter.row.items-center');
                    if (timeContainer) {
                        const timeDiv = timeContainer.querySelector('div');
                        if (timeDiv) {
                            deliveryTime = timeDiv.textContent.trim();
                        }
                    } else {
                        // 方法2: 其他页面 - 查找包含时间关键词的文本
                        const allElements = card.querySelectorAll('.text-caption, .text-body2, .g-chip-counter');
                        allElements.forEach(el => {
                            const text = el.textContent.trim();
                            if (text.match(/\d+\s*(min|hour|day|h|m|d|分钟|小时|天)/i)) {
                                deliveryTime = text;
                            }
                        });
                    }
                    
                    // 应用关键字筛选
                    if (productScrapingConfig.keyword) {
                        const keyword = productScrapingConfig.keyword.toLowerCase();
                        if (!title.toLowerCase().includes(keyword)) {
                            log(`产品 "${title}" 不包含关键字 "${productScrapingConfig.keyword}", 跳过`, 'debug');
                            return;
                        }
                    }
                    
                    const order = {
                        link: productUrl,
                        title: title,
                        sellerName: sellerName,
                        sellerLevel: sellerLevel,
                        price: price,
                        currency: currency,
                        offersCount: offersCount,
                        stock: stock,
                        deliveryTime: deliveryTime,
                        scrapedAt: new Date().toISOString(),
                        pageNumber: productScrapingConfig.currentPage
                    };
                    
                    orders.push(order);
                    
                    // 详细日志
                    let logMsg = `提取订单 [${index + 1}]: ${title}`;
                    if (offersCount) logMsg += ` - ${offersCount} offers`;
                    if (sellerName !== 'N/A') logMsg += ` - ${sellerName}`;
                    if (sellerLevel) logMsg += ` (Level ${sellerLevel})`;
                    if (price) logMsg += ` - ${price} ${currency}`;
                    if (stock) logMsg += ` - Stock: ${stock}`;
                    if (deliveryTime) logMsg += ` - ${deliveryTime}`;
                    log(logMsg, 'debug');
                    
                } catch (err) {
                    log(`处理卡片 ${index} 时出错: ${err.message}`, 'error');
                }
            });
            
            // 合并到已有数据 (去重)
            orders.forEach(order => {
                const exists = scraperData.productOrders.find(o => o.link === order.link);
                if (!exists) {
                    scraperData.productOrders.push(order);
                } else {
                    log(`产品订单已存在: ${order.title}`, 'debug');
                }
            });
            
            productScrapingConfig.totalScraped += orders.length;
            scraperData.statistics.totalProductOrders = scraperData.productOrders.length;
            saveData();
            
            log(`本页爬取完成: ${orders.length} 个产品订单 (总计: ${scraperData.productOrders.length})`, 'success');
            return orders;
            
        } catch (error) {
            log(`爬取产品订单失败: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 产品订单翻页
     */
    async function goToNextProductPage() {
        log('尝试翻到下一页...', 'info');
        
        try {
            // 查找下一页按钮 (keyboard_arrow_right 图标)
            const nextButtons = Array.from(document.querySelectorAll('button i.material-icons'))
                .filter(icon => icon.textContent.trim() === 'keyboard_arrow_right')
                .map(icon => icon.closest('button'));
            
            if (nextButtons.length === 0) {
                log('未找到下一页按钮', 'warning');
                return false;
            }
            
            const nextButton = nextButtons[0];
            
            // 检查按钮是否禁用
            if (nextButton.disabled || nextButton.classList.contains('disabled')) {
                log('下一页按钮已禁用,已到最后一页', 'info');
                return false;
            }
            
            // 点击按钮
            nextButton.click();
            log('已点击下一页按钮,等待页面加载...', 'info');
            
            // 等待页面加载
            await new Promise(resolve => setTimeout(resolve, CONFIG.PAGINATION_DELAY));
            
            productScrapingConfig.currentPage++;
            return true;
            
        } catch (error) {
            log(`翻页失败: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * 启动产品订单爬取 (支持单页/多页/全部模式)
     */
    async function startProductOrderScraping() {
        if (isScraperActive) {
            showNotification('⚠️ 爬取中', '已有爬取任务在进行中', 'warning');
            return;
        }
        
        isScraperActive = true;
        productScrapingConfig.currentPage = 1;
        productScrapingConfig.totalScraped = 0;
        
        log(`开始产品订单爬取 - 模式: ${productScrapingConfig.mode}`, 'info');
        showNotification('🚀 开始爬取', `模式: ${productScrapingConfig.mode === 'single' ? '单页' : productScrapingConfig.mode === 'multi' ? '多页' : '全部'}`, 'info');
        
        try {
            let pageCount = 0;
            let hasNextPage = true;
            
            while (hasNextPage) {
                pageCount++;
                log(`正在爬取第 ${pageCount} 页...`, 'info');
                
                // 爬取当前页
                await scrapeProductOrders();
                
                // 根据模式判断是否继续
                if (productScrapingConfig.mode === 'single') {
                    log('单页模式,爬取完成', 'success');
                    break;
                }
                
                if (productScrapingConfig.mode === 'multi' && pageCount >= productScrapingConfig.maxPages) {
                    log(`已达到最大页数 (${productScrapingConfig.maxPages}), 停止爬取`, 'success');
                    break;
                }
                
                // 尝试翻页
                hasNextPage = await goToNextProductPage();
                
                if (!hasNextPage) {
                    log('没有更多页面,爬取完成', 'success');
                    break;
                }
            }
            
            const totalCount = productScrapingConfig.totalScraped;
            log(`产品订单爬取完成! 共爬取 ${totalCount} 个订单`, 'success');
            showNotification('✅ 爬取完成', `已爬取 ${totalCount} 个产品订单`, 'success');
            updatePanelDisplay();
            
        } catch (error) {
            log(`产品订单爬取失败: ${error.message}`, 'error');
            showNotification('❌ 爬取失败', error.message, 'error');
        } finally {
            isScraperActive = false;
            scrapingProgress.stage = 'idle';
        }
    }

    /**
     * 爬取游戏服务类型 - 自动检测当前游戏页面的服务类型
     */
    async function scrapeServiceTypes() {
        log('开始爬取服务类型...', 'info');
        
        try {
            // 检查是否在游戏页面 (URL包含 /categories/)
            const urlMatch = window.location.href.match(/\/categories\/([^/?]+)/);
            if (!urlMatch) {
                log('当前不在游戏页面,无法获取服务类型', 'warning');
                return [];
            }
            
            const gameId = urlMatch[1];
            log(`检测到游戏页面: ${gameId}`, 'debug');
            
            // 等待服务类型元素加载
            await sleep(1000);
            
            // 根据文档中的元素结构爬取服务类型
            // 选择器: .swiper-slide a[data-v-7ccc8d04][href*="/categories/"]
            const serviceElements = document.querySelectorAll('.swiper-slide a[data-v-7ccc8d04][href*="/categories/"]');
            log(`找到 ${serviceElements.length} 个服务类型元素`, 'debug');
            
            const serviceTypes = [];
            serviceElements.forEach((element, index) => {
                try {
                    // 提取服务类型名称
                    const nameElements = element.querySelectorAll('.text-center .text-weight-medium > div');
                    const name = nameElements[0] ? nameElements[0].textContent.trim() : '';
                    
                    // 提取数量 (例如: "(30,756)")
                    const countText = nameElements[1] ? nameElements[1].textContent.trim() : '';
                    const countMatch = countText.match(/\(([0-9,]+)\)/);
                    const count = countMatch ? countMatch[1] : '0';
                    
                    // 提取链接
                    const url = element.href || '';
                    
                    // 提取服务类型ID (从URL中提取)
                    const urlMatch = url.match(/\/categories\/([^/?]+)/);
                    const serviceId = urlMatch ? urlMatch[1] : `service_${index}`;
                    
                    // 提取图标
                    const iconElement = element.querySelector('.q-img__image');
                    const icon = iconElement ? iconElement.style.backgroundImage.match(/url\("(.+?)"\)/)?.[1] : '';
                    
                    // 判断服务类型
                    let type = 'Other';
                    const nameLower = name.toLowerCase();
                    if (nameLower.includes('coin') || nameLower.includes('gold') || nameLower.includes('currency')) {
                        type = 'Game coins';
                    } else if (nameLower.includes('item')) {
                        type = 'Items';
                    } else if (nameLower.includes('account')) {
                        type = 'Accounts';
                    } else if (nameLower.includes('boost')) {
                        type = 'Boosting';
                    } else if (nameLower.includes('telco') || nameLower.includes('pin') || nameLower.includes('card')) {
                        type = 'Telco';
                    } else if (nameLower.includes('coach')) {
                        type = 'Coaching';
                    } else if (nameLower.includes('skin')) {
                        type = 'Skins';
                    }
                    
                    if (name && url) {
                        const service = {
                            id: serviceId,
                            gameId: gameId,
                            name: name,
                            type: type,
                            count: count,
                            url: url,
                            icon: icon,
                            scrapedAt: new Date().toISOString()
                        };
                        serviceTypes.push(service);
                        log(`提取服务类型: ${name} (${type}) - ${count} offers`, 'debug');
                    }
                } catch (err) {
                    log(`提取服务类型失败: ${err.message}`, 'warning');
                }
            });
            
            if (serviceTypes.length > 0) {
                // 保存到数据中
                scraperData.serviceTypes.push(...serviceTypes);
                
                // 更新游戏的服务类型信息
                const game = scraperData.games.find(g => g.id === gameId || g.url.includes(gameId));
                if (game) {
                    game.serviceTypes = serviceTypes.map(s => s.type);
                    log(`已更新游戏 ${game.name} 的服务类型`, 'success');
                }
                
                scraperData.statistics.totalServiceTypes = scraperData.serviceTypes.length;
                saveData();
                
                log(`服务类型爬取完成: ${serviceTypes.length} 个服务类型`, 'success');
                showNotification('爬取完成', `成功获取 ${serviceTypes.length} 个服务类型`, 'success');
            } else {
                log('未找到服务类型元素', 'warning');
                showNotification('提示', '未找到服务类型,请确保在游戏详情页', 'warning');
            }
            
            return serviceTypes;
            
        } catch (error) {
            log(`爬取服务类型失败: ${error.message}`, 'error');
            showNotification('爬取失败', error.message, 'error');
            throw error;
        }
    }

    /**
     * 自动检测并爬取服务类型 (在游戏页面自动运行)
     */
    function autoDetectServiceTypes() {
        // 检查是否在游戏页面
        if (window.location.href.includes('/categories/')) {
            log('检测到游戏页面,准备自动获取服务类型...', 'info');
            setTimeout(() => {
                scrapeServiceTypes();
            }, 2000); // 延迟2秒等待页面加载
        }
    }

    /**
     * 爬取卖家信息
     */
    async function scrapeSellerInfo(sellerId) {
        log(`开始爬取卖家信息: ${sellerId}...`, 'info');
        
        try {
            // TODO: 实现卖家信息爬取逻辑
            const seller = {
                id: sellerId,
                name: '',
                rating: '',
                totalOrders: '',
                responseTime: '',
                memberSince: '',
                country: '',
                scrapedAt: new Date().toISOString()
            };
            
            return seller;
            
        } catch (error) {
            log(`爬取卖家信息失败: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 批量爬取
     */
    async function startBatchScraping(options = {}) {
        if (isScraperActive) {
            log('爬取任务正在进行中...', 'warning');
            return;
        }
        
        isScraperActive = true;
        log('开始批量爬取任务...', 'info');
        
        try {
            // 1. 爬取游戏列表
            if (options.scrapeGames !== false) {
                await scrapeGamesList();
                await sleep(CONFIG.SCRAPE_DELAY);
            }
            
            // 2. 爬取商品列表
            if (options.scrapeProducts !== false) {
                await scrapeProductsList();
                await sleep(CONFIG.SCRAPE_DELAY);
            }
            
            // 3. 更新统计信息
            updateStatistics();
            
            log('批量爬取任务完成!', 'success');
            showNotification('爬取完成', `成功爬取 ${scraperData.games.length} 个游戏, ${scraperData.products.length} 个商品`, 'success');
            
        } catch (error) {
            log(`批量爬取失败: ${error.message}`, 'error');
            showNotification('爬取失败', error.message, 'error');
        } finally {
            isScraperActive = false;
            scrapingProgress.stage = 'idle';
        }
    }

    /**
     * 更新统计信息
     */
    function updateStatistics() {
        scraperData.statistics = {
            totalGames: scraperData.games.length,
            totalProducts: scraperData.products.length,
            totalSellers: new Set(scraperData.products.map(p => p.seller.id)).size,
            lastUpdate: new Date().toISOString()
        };
        saveData();
    }

    // ============================================
    // 数据导出功能
    // ============================================

    /**
     * 导出为 JSON (只导出产品订单)
     */
    function exportToJSON() {
        // 只导出产品订单数据
        const exportData = {
            productOrders: scraperData.productOrders,
            statistics: {
                totalProductOrders: scraperData.productOrders.length,
                exportTime: new Date().toISOString()
            }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `g2g_product_orders_${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        log('产品订单数据已导出为 JSON', 'success');
        showNotification('✅ 导出成功', `已导出 ${scraperData.productOrders.length} 个产品订单`, 'success');
    }

    /**
     * 导出为 CSV (只导出产品订单)
     */
    function exportToCSV(type = 'productOrders') {
        let csvContent = '';
        
        if (type === 'productOrders') {
            // 从新存储系统读取实时数据
            const productOrders = GM_getValue('productOrders', []);
            
            // CSV 表头
            csvContent = '产品链接,标题,卖家名称,卖家等级,价格,货币,Offers数量,库存,交付时间,页码,爬取时间\n';
            
            // CSV 数据行
            productOrders.forEach(order => {
                // 移除价格中的逗号(千位分隔符),避免CSV解析错误
                const cleanPrice = (order.price || '').toString().replace(/,/g, '');
                
                const row = [
                    order.link,
                    `"${(order.title || '').replace(/"/g, '""')}"`,  // 转义双引号
                    `"${(order.sellerName || 'N/A').replace(/"/g, '""')}"`,
                    order.sellerLevel || '',
                    cleanPrice,
                    order.currency || '',
                    order.offersCount || '',
                    order.stock || '',
                    `"${(order.deliveryTime || '').replace(/"/g, '""')}"`,
                    order.pageNumber || '',
                    order.scrapedAt
                ].join(',');
                csvContent += row + '\n';
            });
        } else if (type === 'products') {
            // 从新存储系统读取实时数据
            const products = GM_getValue('products', []);
            
            // CSV 表头
            csvContent = 'ID,游戏,商品标题,价格,货币,卖家,库存,交付时间,URL,爬取时间\n';
            
            // CSV 数据行
            products.forEach(product => {
                // 移除价格中的逗号(千位分隔符),避免CSV解析错误
                const cleanPrice = (product.price || '').toString().replace(/,/g, '');
                
                const row = [
                    product.id,
                    product.gameId,
                    `"${(product.title || '').replace(/"/g, '""')}"`,
                    cleanPrice,
                    product.currency,
                    `"${(product.seller.name || '').replace(/"/g, '""')}"`,
                    product.stock,
                    `"${(product.delivery || '').replace(/"/g, '""')}"`,
                    product.url,
                    product.scrapedAt
                ].join(',');
                csvContent += row + '\n';
            });
        } else if (type === 'games') {
            // 从新存储系统读取实时数据
            const games = GM_getValue('games', []);
            
            csvContent = 'ID,游戏名称,分类,URL,爬取时间\n';
            games.forEach(game => {
                const row = [
                    game.id,
                    `"${(game.name || '').replace(/"/g, '""')}"`,  // 转义双引号
                    game.category,
                    game.url,
                    game.scrapedAt
                ].join(',');
                csvContent += row + '\n';
            });
        }
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `g2g_${type}_${Date.now()}.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        if (type === 'productOrders') {
            const productOrders = GM_getValue('productOrders', []);
            log(`产品订单数据已导出为 CSV`, 'success');
            showNotification('✅ 导出成功', `已导出 ${productOrders.length} 个产品订单`, 'success');
        } else if (type === 'games') {
            const games = GM_getValue('games', []);
            log(`游戏数据已导出为 CSV`, 'success');
            showNotification('✅ 导出成功', `已导出 ${games.length} 个游戏`, 'success');
        } else {
            log(`数据已导出为 CSV (${type})`, 'success');
        }
    }

    /**
     * 复制到剪贴板 (只复制产品订单数据)
     */
    function copyToClipboard(type = 'json') {
        let content = '';
        
        if (type === 'json') {
            // 只复制产品订单数据
            const exportData = {
                productOrders: scraperData.productOrders,
                statistics: {
                    totalProductOrders: scraperData.productOrders.length,
                    exportTime: new Date().toISOString()
                }
            };
            content = JSON.stringify(exportData, null, 2);
        } else if (type === 'summary') {
            content = `G2G 产品订单数据摘要
====================
产品订单数量: ${scraperData.productOrders.length}
游戏数量: ${scraperData.statistics.totalGames}
最后更新: ${scraperData.statistics.lastUpdate}
`;
        }
        
        GM_setClipboard(content);
        showNotification('✅ 复制成功', `已复制 ${scraperData.productOrders.length} 个产品订单数据到剪贴板`, 'success');
    }

    // ============================================
    // UI 界面
    // ============================================

    /**
     * 创建主控制面板
     */
    function createControlPanel() {
        // 添加样式 - 完全适配G2G网站浅色风格
        GM_addStyle(`
            .g2g-scraper-panel {
                position: fixed;
                top: 0;
                right: 0;
                width: 360px;
                height: 100vh;
                background: #ffffff;
                box-shadow: -2px 0 16px rgba(0,0,0,0.1);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #333333;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                transition: transform 0.3s ease;
                border-left: 1px solid #e5e5e5;
            }
            
            .g2g-scraper-panel.collapsed {
                transform: translateX(360px);
            }
            
            .g2g-toggle-sidebar {
                position: fixed;
                top: 50%;
                right: 360px;
                transform: translateY(-50%);
                background: #ff6b6b;
                color: white;
                border: none;
                width: 36px;
                height: 72px;
                border-radius: 6px 0 0 6px;
                cursor: pointer;
                z-index: 999998;
                font-size: 18px;
                box-shadow: -2px 0 12px rgba(0,0,0,0.15);
                transition: all 0.25s;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            }
            
            .g2g-toggle-sidebar:hover {
                background: #ff5252;
                width: 40px;
                box-shadow: -4px 0 16px rgba(255,82,82,0.3);
            }
            
            .g2g-scraper-panel.collapsed + .g2g-toggle-sidebar {
                right: 0;
            }
            
            .g2g-panel-header {
                padding: 24px 20px;
                background: #ffffff;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
                border-bottom: 2px solid #f0f0f0;
            }
            
            .g2g-panel-title {
                font-size: 20px;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 10px;
                color: #333333;
            }
            
            .g2g-panel-content {
                padding: 20px;
                flex: 1;
                overflow-y: auto;
                background: #fafafa;
            }
            
            .g2g-panel-content::-webkit-scrollbar {
                width: 6px;
            }
            
            .g2g-panel-content::-webkit-scrollbar-track {
                background: #f0f0f0;
            }
            
            .g2g-panel-content::-webkit-scrollbar-thumb {
                background: #ff6b6b;
                border-radius: 3px;
            }
            
            .g2g-panel-content::-webkit-scrollbar-thumb:hover {
                background: #ff5252;
            }
            
            .g2g-stats-box {
                background: #ffffff;
                border-radius: 12px;
                padding: 18px;
                margin-bottom: 16px;
                border: 1px solid #e5e5e5;
                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            }
            
            .g2g-stat-item {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                font-size: 14px;
                border-bottom: 1px solid #f5f5f5;
            }
            
            .g2g-stat-item:last-child {
                border-bottom: none;
            }
            
            .g2g-stat-label {
                color: #666666;
                font-weight: 500;
            }
            
            .g2g-stat-value {
                font-weight: 700;
                color: #ff6b6b;
                font-size: 16px;
            }
            
            .g2g-button {
                width: 100%;
                padding: 12px 18px;
                margin: 8px 0;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                position: relative;
                overflow: hidden;
            }
            
            .g2g-button-primary {
                background: #ffffff;
                color: #333333;
                border: 1px solid #e5e5e5;
                box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            }
            
            .g2g-button-primary:hover {
                background: #f9f9f9;
                border-color: #d0d0d0;
                box-shadow: 0 2px 6px rgba(0,0,0,0.12);
            }
            
            .g2g-button-success {
                background: #ff6b6b;
                color: white;
                border: none;
                box-shadow: 0 2px 8px rgba(255,107,107,0.25);
            }
            
            .g2g-button-success:hover {
                background: #ff5252;
                box-shadow: 0 4px 12px rgba(255,82,82,0.35);
                transform: translateY(-1px);
            }
            
            .g2g-button-warning {
                background: #ffffff;
                color: #ff6b6b;
                border: 2px solid #ff6b6b;
            }
            
            .g2g-button-warning:hover {
                background: #ff6b6b;
                color: white;
            }
            
            .g2g-button-danger {
                background: #ffd43b;
                color: #333333;
                border: none;
            }
            
            .g2g-button-danger:hover {
                background: #fcc419;
                transform: translateY(-1px);
            }
            
            .g2g-button:active {
                transform: translateY(0);
            }
            
            .g2g-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            .g2g-progress-bar {
                width: 100%;
                height: 6px;
                background: #e9ecef;
                border-radius: 10px;
                overflow: hidden;
                margin: 16px 0;
            }
            
            .g2g-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #ff6b6b 0%, #ffd43b 100%);
                width: 0%;
                transition: width 0.3s;
                box-shadow: 0 0 8px rgba(255,107,107,0.3);
            }
            
            #g2g-progress-text {
                font-size: 12px;
                color: #666666;
                text-align: center;
                margin-top: 8px;
                font-weight: 500;
            }
            
            .g2g-notification {
                position: fixed;
                top: 20px;
                right: 380px;
                background: #ffffff;
                color: #333333;
                padding: 16px 20px;
                border-radius: 10px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                z-index: 1000000;
                min-width: 300px;
                border: 1px solid #e5e5e5;
                animation: slideInRight 0.3s;
            }
            
            .g2g-notification-title {
                font-weight: 700;
                margin-bottom: 6px;
                font-size: 15px;
            }
            
            .g2g-notification-message {
                font-size: 13px;
                color: #666666;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .g2g-section-title {
                font-size: 12px;
                color: #999999;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin: 24px 0 12px 0;
                font-weight: 700;
                padding-bottom: 8px;
                border-bottom: 1px solid #e5e5e5;
            }
            
            .g2g-game-selector {
                position: relative;
                margin-bottom: 12px;
            }
            
            .g2g-game-input {
                width: 100%;
                padding: 10px 14px;
                background: #ffffff;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                color: #333333;
                font-size: 14px;
                outline: none;
                transition: all 0.25s;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            }
            
            .g2g-game-input::placeholder {
                color: #999999;
            }
            
            .g2g-game-input:focus {
                border-color: #ff6b6b;
                box-shadow: 0 0 0 3px rgba(255,107,107,0.1);
            }
            
            .g2g-service-filter {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .g2g-service-chip {
                padding: 6px 14px;
                background: #ffffff;
                border: 1px solid #e5e5e5;
                border-radius: 20px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                color: #666666;
                font-weight: 500;
            }
            
            .g2g-service-chip:hover {
                border-color: #ff6b6b;
                color: #ff6b6b;
                background: #fff5f5;
            }
            
            .g2g-service-chip.active {
                background: #ff6b6b;
                border-color: #ff6b6b;
                color: white;
                box-shadow: 0 2px 6px rgba(255,107,107,0.25);
            }
            
            .g2g-games-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                max-height: 350px;
                overflow-y: auto;
                background: #ffffff;
                border-radius: 8px;
                margin-top: 8px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                z-index: 1000;
                display: none;
                border: 1px solid #e5e5e5;
            }
            
            .g2g-games-dropdown.show {
                display: block;
            }
            
            .g2g-games-dropdown::-webkit-scrollbar {
                width: 6px;
            }
            
            .g2g-games-dropdown::-webkit-scrollbar-track {
                background: #f5f5f5;
            }
            
            .g2g-games-dropdown::-webkit-scrollbar-thumb {
                background: #ff6b6b;
                border-radius: 3px;
            }
            
            .g2g-game-item {
                padding: 12px 14px;
                cursor: pointer;
                border-bottom: 1px solid #f5f5f5;
                transition: all 0.2s;
            }
            
            .g2g-game-item:hover {
                background: #fff5f5;
            }
            
            .g2g-game-item.selected {
                background: #ffebeb;
                border-left: 3px solid #ff6b6b;
            }
            
            .g2g-game-item:last-child {
                border-bottom: none;
            }
            
            .g2g-game-name {
                font-size: 14px;
                font-weight: 600;
                color: #333333;
                margin-bottom: 4px;
            }
            
            .g2g-game-offers {
                font-size: 12px;
                color: #999999;
            }
            
            .g2g-selected-game {
                background: #ffffff;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                border: 2px solid #ff6b6b;
                box-shadow: 0 4px 12px rgba(255,107,107,0.15);
            }
            
            .g2g-selected-game-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .g2g-selected-game-name {
                font-size: 15px;
                font-weight: 700;
                color: #ff6b6b;
            }
            
            .g2g-clear-selection {
                background: #ffffff;
                border: 1px solid #e5e5e5;
                color: #666666;
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                transition: all 0.2s;
            }
            
            .g2g-clear-selection:hover {
                background: #f5f5f5;
                border-color: #ff6b6b;
                color: #ff6b6b;
            }
            
            .g2g-service-selector {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .g2g-service-btn {
                padding: 8px 12px;
                background: #ffffff;
                border: 1px solid #e5e5e5;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                color: #666666;
                font-weight: 500;
            }
            
            .g2g-service-btn:hover {
                background: #ff6b6b;
                border-color: #ff6b6b;
                color: white;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(255,107,107,0.25);
            }
        `);

        // 创建面板 HTML
        const panel = document.createElement('div');
        panel.className = 'g2g-scraper-panel';
        panel.innerHTML = `
            <div class="g2g-panel-header">
                <div class="g2g-panel-title">
                    🎮 G2G 数据助手
                </div>
            </div>
            <div class="g2g-panel-content" id="g2g-panel-content">
                <!-- 游戏选择器 -->
                <div class="g2g-section-title">🎮 游戏选择</div>
                
                <!-- 已选游戏显示 -->
                <div id="g2g-selected-game-box" style="display: none;">
                    <div class="g2g-selected-game">
                        <div class="g2g-selected-game-header">
                            <span class="g2g-selected-game-name" id="g2g-selected-game-name">未选择</span>
                            <button class="g2g-clear-selection" id="g2g-clear-game">✕ 清除</button>
                        </div>
                        <div id="g2g-service-selector" class="g2g-service-selector"></div>
                    </div>
                </div>
                
                <!-- 服务类型筛选 -->
                <div class="g2g-service-filter" id="g2g-service-filter">
                    <div class="g2g-service-chip active" data-service="all">全部</div>
                    <div class="g2g-service-chip" data-service="Game coins">金币</div>
                    <div class="g2g-service-chip" data-service="Items">物品</div>
                    <div class="g2g-service-chip" data-service="Accounts">账号</div>
                    <div class="g2g-service-chip" data-service="Boosting">代练</div>
                    <div class="g2g-service-chip" data-service="Telco">充值</div>
                    <div class="g2g-service-chip" data-service="Coaching">教练</div>
                    <div class="g2g-service-chip" data-service="Skins">皮肤</div>
                </div>
                
                <!-- 游戏搜索输入框 -->
                <div class="g2g-game-selector">
                    <input 
                        type="text" 
                        class="g2g-game-input" 
                        id="g2g-game-search" 
                        placeholder="🔍 搜索游戏名称..."
                    />
                    <div class="g2g-games-dropdown" id="g2g-games-dropdown"></div>
                </div>
                
                <!-- 统计信息 -->
                <div class="g2g-stats-box">
                    <div class="g2g-stat-item">
                        <span class="g2g-stat-label">� 当前页面</span>
                        <span class="g2g-stat-value" id="g2g-current-page">未检测</span>
                    </div>
                    <div class="g2g-stat-item">
                        <span class="g2g-stat-label">📦 游戏数量</span>
                        <span class="g2g-stat-value" id="g2g-games-count">0</span>
                    </div>
                    <div class="g2g-stat-item">
                        <span class="g2g-stat-label">📋 产品订单</span>
                        <span class="g2g-stat-value" id="g2g-orders-count">0</span>
                    </div>
                    <div class="g2g-stat-item">
                        <span class="g2g-stat-label">🕐 最后更新</span>
                        <span class="g2g-stat-value" id="g2g-last-update">从未</span>
                    </div>
                </div>
                
                <!-- 进度条 -->
                <div id="g2g-progress-container" style="display: none; margin-bottom: 16px;">
                    <div class="g2g-progress-bar" id="g2g-progress-bar">
                        <div class="g2g-progress-fill" id="g2g-progress-fill"></div>
                    </div>
                    <div id="g2g-progress-text">准备中...</div>
                </div>
                
                <!-- 爬取控制 -->
                <div class="g2g-section-title">📊 数据采集</div>
                <button class="g2g-button g2g-button-success" id="g2g-scrape-all-games">
                    🚀 一键爬取所有游戏
                </button>
                <button class="g2g-button g2g-button-danger" id="g2g-cancel-scraping" style="display: none;">
                    ⏹️ 停止爬取任务
                </button>
                <button class="g2g-button g2g-button-danger" id="g2g-clear-games" style="margin-top: 8px; opacity: 0.7;">
                    🗑️ 清除游戏列表
                </button>

                <!-- 产品订单爬取 -->
                <div class="g2g-section-title">🛍️ 产品订单采集</div>
                
                <!-- 爬取模式选择 -->
                <div style="margin-bottom: 12px;">
                    <label style="display: block; color: #666; font-size: 12px; margin-bottom: 6px;">爬取模式:</label>
                    <select class="g2g-game-input" id="g2g-scrape-mode" style="width: 100%; padding: 8px;">
                        <option value="single">单页模式</option>
                        <option value="multi">多页模式</option>
                        <option value="all">全部模式</option>
                    </select>
                </div>
                
                <!-- 多页模式 - 最大页数 -->
                <div style="margin-bottom: 12px; display: none;" id="g2g-max-pages-container">
                    <label style="display: block; color: #666; font-size: 12px; margin-bottom: 6px;">最大页数:</label>
                    <input type="number" class="g2g-game-input" id="g2g-max-pages" value="5" min="1" max="100" style="width: 100%; padding: 8px;" />
                </div>
                
                <!-- 关键字筛选 -->
                <div style="margin-bottom: 12px;">
                    <label style="display: block; color: #666; font-size: 12px; margin-bottom: 6px;">关键字筛选 (可选):</label>
                    <input type="text" class="g2g-game-input" id="g2g-keyword-filter" placeholder="例如: gold, coins" style="width: 100%; padding: 8px;" />
                </div>
                
                <button class="g2g-button g2g-button-success" id="g2g-scrape-products">
                    🛒 开始爬取产品订单
                </button>
                <button class="g2g-button g2g-button-danger" id="g2g-clear-orders" style="margin-top: 8px; opacity: 0.7;">
                    🗑️ 清除产品订单
                </button>

                
                <!-- 数据导出 -->
                <div class="g2g-section-title">💾 数据导出</div>
                <button class="g2g-button g2g-button-warning" id="g2g-export-json">
                    📄 导出 JSON
                </button>
                <button class="g2g-button g2g-button-warning" id="g2g-export-csv">
                    📊 导出 CSV
                </button>
                <button class="g2g-button g2g-button-warning" id="g2g-copy-data">
                    📋 复制数据
                </button>
                
                <!-- 数据管理 -->
                <div class="g2g-section-title">🔧 数据管理</div>
                <button class="g2g-button g2g-button-primary" id="g2g-show-debug">
                    🐛 查看调试信息
                </button>
            </div>
        `;

        document.body.appendChild(panel);
        
        // 创建切换按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'g2g-toggle-sidebar';
        toggleBtn.innerHTML = '◀';
        toggleBtn.id = 'g2g-sidebar-toggle';
        document.body.appendChild(toggleBtn);

        // 绑定事件
        bindPanelEvents();
        
        // 更新显示
        updatePanelDisplay();
        
        log('控制面板已创建', 'success');
    }

    // 当前选中的服务类型筛选
    let selectedServiceFilter = 'all';
    
    /**
     * 绑定面板事件
     */
    function bindPanelEvents() {
        // 侧边栏折叠/展开
        const toggleBtn = document.getElementById('g2g-sidebar-toggle');
        const panel = document.querySelector('.g2g-scraper-panel');
        
        toggleBtn.onclick = () => {
            panel.classList.toggle('collapsed');
            toggleBtn.innerHTML = panel.classList.contains('collapsed') ? '▶' : '◀';
        };
        
        // 服务类型筛选
        document.querySelectorAll('.g2g-service-chip').forEach(chip => {
            chip.onclick = () => {
                // 移除所有active状态
                document.querySelectorAll('.g2g-service-chip').forEach(c => c.classList.remove('active'));
                // 添加active到当前
                chip.classList.add('active');
                // 更新筛选
                selectedServiceFilter = chip.dataset.service;
                log(`筛选服务类型: ${selectedServiceFilter}`, 'debug');
            };
        });

        // 游戏搜索输入
        const searchInput = document.getElementById('g2g-game-search');
        const dropdown = document.getElementById('g2g-games-dropdown');
        
        searchInput.onfocus = () => {
            if (scraperData.games.length > 0) {
                renderGamesList('', true, selectedServiceFilter);
                dropdown.classList.add('show');
            } else {
                showNotification('提示', '请先爬取游戏列表', 'warning');
            }
        };
        
        searchInput.oninput = (e) => {
            const searchTerm = e.target.value;
            if (scraperData.games.length > 0) {
                renderGamesList(searchTerm, true, selectedServiceFilter);
                dropdown.classList.add('show');
            }
        };
        
        // 点击外部关闭下拉框
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });

        // 清除选中的游戏
        document.getElementById('g2g-clear-game').onclick = () => {
            selectedGame = null;
            updateGameSelection();
        };

        // 一键爬取所有游戏
        const scrapeAllBtn = document.getElementById('g2g-scrape-all-games');
        const cancelBtn = document.getElementById('g2g-cancel-scraping');
        
        scrapeAllBtn.onclick = async () => {
            if (confirm('即将爬取7个分类的所有游戏(可能需要几分钟),确定继续吗?\n\n提示: 页面会自动跳转,请勿手动操作')) {
                scrapeAllBtn.style.display = 'none';
                cancelBtn.style.display = 'block';
                await scrapeAllCategories();
                scrapeAllBtn.style.display = 'block';
                cancelBtn.style.display = 'none';
                updatePanelDisplay();
            }
        };
        
        // 取消爬取任务
        cancelBtn.onclick = () => {
            if (confirm('确定要停止当前的爬取任务吗?')) {
                GM_deleteValue('scraping_progress');
                isScraperActive = false;
                scrapingProgress.stage = 'idle';
                scrapeAllBtn.style.display = 'block';
                cancelBtn.style.display = 'none';
                updateProgressDisplay();
                showNotification('已停止', '爬取任务已取消', 'warning');
                log('用户取消了爬取任务', 'warning');
            }
        };



        // 导出 JSON
        document.getElementById('g2g-export-json').onclick = () => {
            exportToJSON();
        };

        // 导出 CSV
        document.getElementById('g2g-export-csv').onclick = () => {
            exportToCSV('productOrders');
        };

        // 复制数据
        document.getElementById('g2g-copy-data').onclick = () => {
            copyToClipboard('json');
        };

        // 查看调试信息
        document.getElementById('g2g-show-debug').onclick = () => {
            const progress = GM_getValue('scraping_progress', null);
            let debugInfo = `=== G2G 爬取助手调试信息 ===\n\n`;
            debugInfo += `当前页面: ${window.location.href}\n\n`;
            debugInfo += `爬取状态: ${isScraperActive ? '进行中' : '空闲'}\n`;
            debugInfo += `爬取阶段: ${scrapingProgress.stage}\n\n`;
            
            if (progress) {
                const elapsed = ((Date.now() - progress.timestamp) / 1000).toFixed(0);
                debugInfo += `=== 断点信息 ===\n`;
                debugInfo += `当前索引: ${progress.currentIndex}\n`;
                debugInfo += `总分类数: ${progress.totalCategories}\n`;
                debugInfo += `进度时间: ${elapsed}秒前\n`;
                debugInfo += `是否超时: ${Date.now() - progress.timestamp > 600000 ? '是' : '否'}\n`;
                
                if (progress.currentIndex < CONFIG.SCRAPE_URLS.length) {
                    const targetUrl = CONFIG.SCRAPE_URLS[progress.currentIndex];
                    const isMatch = window.location.href.startsWith(targetUrl.split('?')[0]);
                    debugInfo += `\n目标URL: ${targetUrl}\n`;
                    debugInfo += `页面匹配: ${isMatch ? '✓ 是' : '✗ 否'}\n`;
                }
            } else {
                debugInfo += `=== 断点信息 ===\n`;
                debugInfo += `无断点数据\n`;
            }
            
            debugInfo += `\n=== 数据统计 ===\n`;
            debugInfo += `游戏数量: ${scraperData.games.length}\n`;
            debugInfo += `商品数量: ${scraperData.products.length}\n`;
            debugInfo += `服务类型: ${scraperData.serviceTypes.length}\n`;
            
            debugInfo += `\n=== 配置信息 ===\n`;
            debugInfo += `分类总数: ${CONFIG.SCRAPE_URLS.length}\n`;
            debugInfo += `翻页延迟: ${CONFIG.PAGINATION_DELAY}ms\n`;
            debugInfo += `切换延迟: ${CONFIG.PAGE_SWITCH_DELAY}ms\n`;
            
            alert(debugInfo);
            console.log(debugInfo);
        };

        // 产品订单爬取模式切换
        const scrapeModeSelect = document.getElementById('g2g-scrape-mode');
        const maxPagesContainer = document.getElementById('g2g-max-pages-container');
        
        scrapeModeSelect.onchange = () => {
            const mode = scrapeModeSelect.value;
            productScrapingConfig.mode = mode;
            
            // 显示/隐藏最大页数输入
            if (mode === 'multi') {
                maxPagesContainer.style.display = 'block';
            } else {
                maxPagesContainer.style.display = 'none';
            }
        };
        
        // 最大页数输入
        document.getElementById('g2g-max-pages').oninput = (e) => {
            productScrapingConfig.maxPages = parseInt(e.target.value) || 5;
        };
        
        // 关键字筛选输入
        document.getElementById('g2g-keyword-filter').oninput = (e) => {
            productScrapingConfig.keyword = e.target.value.trim();
        };
        
        // 开始爬取产品订单
        document.getElementById('g2g-scrape-products').onclick = async () => {
            const mode = productScrapingConfig.mode;
            const modeText = mode === 'single' ? '单页' : mode === 'multi' ? `多页(${productScrapingConfig.maxPages}页)` : '全部';
            const keywordText = productScrapingConfig.keyword ? `\n关键字: ${productScrapingConfig.keyword}` : '';
            
            if (confirm(`即将开始爬取产品订单\n\n模式: ${modeText}${keywordText}\n\n确定继续吗?`)) {
                await startProductOrderScraping();
            }
        };

        // 清除游戏列表
        document.getElementById('g2g-clear-games').onclick = () => {
            if (confirm('确定要清除游戏列表吗?\n\n这将删除:\n- 所有游戏列表数据\n- 爬取进度(可重新开始)\n\n产品订单数据不会被删除\n\n此操作不可撤销!')) {
                const productOrders = GM_getValue('productOrders', []);
                const products = GM_getValue('products', []);
                
                // 清除游戏相关数据 - 新存储系统
                GM_setValue('games', []);
                GM_setValue('scrapedServiceTypes', []);
                GM_setValue('scrapingProgress', { isRunning: false, current: 0, total: 0 });
                
                // 保留产品订单数据
                GM_setValue('productOrders', productOrders);
                GM_setValue('products', products);
                
                // 同时清除旧的存储系统
                if (scraperData) {
                    scraperData.games = [];
                    if (scraperData.statistics) {
                        scraperData.statistics.totalGames = 0;
                        scraperData.statistics.lastUpdate = new Date().toISOString();
                    }
                    // 保存更新后的 scraperData
                    GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(scraperData));
                }
                
                // 重置选择状态并更新显示
                selectedGame = null;
                updateGameSelection();
                updatePanelDisplay();
                showNotification('已清除', '游戏列表已清除,产品订单数据已保留', 'success');
            }
        };

        // 清除产品订单
        document.getElementById('g2g-clear-orders').onclick = () => {
            if (confirm('确定要清除产品订单数据吗?\n\n这将删除:\n- 所有产品订单数据\n- 所有商品数据\n\n游戏列表不会被删除\n\n此操作不可撤销!')) {
                const games = GM_getValue('games', []);
                const scrapedServiceTypes = GM_getValue('scrapedServiceTypes', []);
                const scrapingProgress = GM_getValue('scrapingProgress', { isRunning: false, current: 0, total: 0 });
                
                // 清除产品订单数据 - 新存储系统
                GM_setValue('productOrders', []);
                GM_setValue('products', []);
                
                // 保留游戏列表数据
                GM_setValue('games', games);
                GM_setValue('scrapedServiceTypes', scrapedServiceTypes);
                GM_setValue('scrapingProgress', scrapingProgress);
                
                // 同时清除旧的存储系统
                if (scraperData) {
                    scraperData.productOrders = [];
                    scraperData.products = [];
                    if (scraperData.statistics) {
                        scraperData.statistics.totalProductOrders = 0;
                        scraperData.statistics.totalProducts = 0;
                        scraperData.statistics.lastUpdate = new Date().toISOString();
                    }
                    // 保存更新后的 scraperData
                    GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(scraperData));
                }
                
                // 更新显示
                updatePanelDisplay();
                showNotification('已清除', '产品订单已清除,游戏列表已保留', 'success');
            }
        };
    }

    /**
     * 渲染游戏列表下拉框 (带虚拟滚动优化和服务类型筛选)
     */
    function renderGamesList(searchTerm = '', reset = true, serviceFilter = 'all') {
        const dropdown = document.getElementById('g2g-games-dropdown');
        
        if (reset) {
            // 重置状态
            dropdown.innerHTML = '';
            gameListState.currentPage = 0;
            gameListState.searchTerm = searchTerm;
            
            // 过滤游戏 (根据名称和服务类型)
            let filteredGames = scraperData.games.filter(game => {
                const matchName = game.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchService = serviceFilter === 'all' || 
                                   game.category === serviceFilter ||
                                   (game.categories && game.categories.includes(serviceFilter));
                return matchName && matchService;
            });
            
            // 去重: 同名游戏只保留一个,合并服务类型
            const gameMap = new Map();
            filteredGames.forEach(game => {
                if (!gameMap.has(game.name)) {
                    // 首次遇到这个游戏名
                    gameMap.set(game.name, {
                        ...game,
                        categories: game.categories || (game.category ? [game.category] : [])
                    });
                } else {
                    // 游戏名重复,合并服务类型
                    const existing = gameMap.get(game.name);
                    const newCategories = game.categories || (game.category ? [game.category] : []);
                    newCategories.forEach(cat => {
                        if (!existing.categories.includes(cat)) {
                            existing.categories.push(cat);
                        }
                    });
                }
            });
            
            // 转换回数组
            gameListState.filteredGames = Array.from(gameMap.values());
            
            if (gameListState.filteredGames.length === 0) {
                dropdown.innerHTML = '<div style="padding: 12px; color: rgba(255,255,255,0.6); text-align: center;">未找到匹配的游戏</div>';
                return;
            }
            
            // 显示统计信息
            const statsDiv = document.createElement('div');
            statsDiv.style.cssText = 'padding: 8px 12px; background: rgba(102,126,234,0.2); color: rgba(255,255,255,0.9); font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); position: sticky; top: 0; z-index: 10;';
            statsDiv.innerHTML = `📊 找到 <b>${gameListState.filteredGames.length}</b> 个游戏 <span style="color: rgba(255,255,255,0.6); font-size: 11px;">(已去重)</span>`;
            dropdown.appendChild(statsDiv);
        }
        
        // 计算当前页范围
        const start = gameListState.currentPage * CONFIG.GAMES_PER_PAGE;
        const end = Math.min(start + CONFIG.GAMES_PER_PAGE, gameListState.filteredGames.length);
        const displayGames = gameListState.filteredGames.slice(start, end);
        
        // 渲染当前页游戏
        displayGames.forEach(game => {
            const item = document.createElement('div');
            item.className = 'g2g-game-item';
            if (selectedGame && selectedGame.id === game.id) {
                item.classList.add('selected');
            }
            
            // 显示分类标签
            const categoryBadge = game.categories 
                ? `<span style="font-size: 10px; color: #17A2B8;">🏷️ ${game.categories.join(', ')}</span>`
                : `<span style="font-size: 10px; color: #6C757D;">🏷️ ${game.category}</span>`;
            
            item.innerHTML = `
                <div class="g2g-game-name">${game.name}</div>
                <div class="g2g-game-offers">${game.offers || '0 offers'} ${categoryBadge}</div>
            `;
            
            item.onclick = () => {
                selectedGame = game;
                document.getElementById('g2g-game-search').value = game.name;
                dropdown.classList.remove('show');
                updateGameSelection();
                log(`已选择游戏: ${game.name}`, 'success');
            };
            
            dropdown.appendChild(item);
        });
        
        // 增加页码
        gameListState.currentPage++;
        
        // 如果还有更多游戏,添加"加载更多"按钮
        if (end < gameListState.filteredGames.length) {
            const loadMoreBtn = document.createElement('div');
            loadMoreBtn.style.cssText = 'padding: 12px; text-align: center; color: #17A2B8; cursor: pointer; background: rgba(23,162,184,0.15); border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; font-weight: 600; transition: background 0.2s;';
            loadMoreBtn.innerHTML = `⬇️ 加载更多 (还有 ${gameListState.filteredGames.length - end} 个游戏)`;
            
            loadMoreBtn.onmouseover = () => {
                loadMoreBtn.style.background = 'rgba(23,162,184,0.3)';
            };
            loadMoreBtn.onmouseout = () => {
                loadMoreBtn.style.background = 'rgba(23,162,184,0.15)';
            };
            
            loadMoreBtn.onclick = (e) => {
                e.stopPropagation();
                loadMoreBtn.remove();
                renderGamesList(searchTerm, false, serviceFilter); // 加载下一页
            };
            
            dropdown.appendChild(loadMoreBtn);
        } else if (gameListState.filteredGames.length > CONFIG.GAMES_PER_PAGE) {
            // 显示已全部加载提示
            const endInfo = document.createElement('div');
            endInfo.style.cssText = 'padding: 8px 12px; text-align: center; color: rgba(255,255,255,0.4); font-size: 11px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.1);';
            endInfo.textContent = `✓ 已加载全部 ${gameListState.filteredGames.length} 个游戏`;
            dropdown.appendChild(endInfo);
        }
    }

    /**
     * 更新游戏选择显示
     */
    function updateGameSelection() {
        const selectedBox = document.getElementById('g2g-selected-game-box');
        const selectedNameEl = document.getElementById('g2g-selected-game-name');
        const serviceSelector = document.getElementById('g2g-service-selector');
        
        if (selectedGame) {
            const categoriesStr = selectedGame.categories 
                ? selectedGame.categories.join(', ') 
                : selectedGame.category || '无';
            log(`选中游戏: ${selectedGame.name}, ID: ${selectedGame.id}`, 'debug');
            log(`  - Category: ${selectedGame.category || '无'}`, 'debug');
            log(`  - Categories: [${categoriesStr}]`, 'debug');
            
            selectedBox.style.display = 'block';
            selectedNameEl.textContent = selectedGame.name;
            
            // 生成服务类型按钮
            serviceSelector.innerHTML = '';
            
            // 确保游戏ID存在
            if (!selectedGame.id) {
                log('警告: 游戏ID不存在,无法生成服务按钮', 'warning');
                serviceSelector.innerHTML = '<span style="color: #ff6b6b; font-size: 12px;">⚠️ 该游戏缺少ID信息,无法跳转</span>';
                return;
            }
            
            // 获取该游戏的服务类型及其URL后缀
            const serviceTypes = [
                { name: '金币', value: 'game-coins', match: 'Game coins', suffix: 'gold' },
                { name: '物品', value: 'items', match: 'Items', suffix: 'item-buy' },
                { name: '账号', value: 'accounts', match: 'Accounts', suffix: 'account' },
                { name: '代练', value: 'boosting', match: 'Boosting', suffix: 'boosting-service' },
                { name: '充值', value: 'mobile-recharge', match: 'Telco', suffix: 'top-up' },
                { name: '教练', value: 'coaching', match: 'Coaching', suffix: 'coaching' },
                { name: '皮肤', value: 'skins', match: 'Skins', suffix: 'gift-cards' }
            ];
            
            // 提取游戏的基础ID (移除服务后缀)
            let baseGameId = selectedGame.id;
            
            // 尝试从已知的URL中移除服务后缀
            const serviceSuffixes = ['-gold', '-item-buy', '-account', '-boosting-service', '-top-up', '-coaching', '-gift-cards', '-skins'];
            for (const suffix of serviceSuffixes) {
                if (baseGameId.endsWith(suffix)) {
                    baseGameId = baseGameId.slice(0, -suffix.length);
                    log(`提取基础游戏ID: ${selectedGame.id} → ${baseGameId}`, 'debug');
                    break;
                }
            }
            
            // 优先使用 categories 数组,如果不存在则使用 category
            const gameCategories = selectedGame.categories || 
                                  (selectedGame.category ? [selectedGame.category] : []);
            
            log(`游戏支持的服务: [${gameCategories.join(', ')}]`, 'debug');
            log(`可用的服务类型: [${serviceTypes.map(s => s.match).join(', ')}]`, 'debug');
            
            // 检查是否有匹配的服务类型
            let confirmedServices = [];  // 确认支持的服务
            let possibleServices = [];   // 可能支持的服务
            
            serviceTypes.forEach(service => {
                const isMatched = gameCategories.includes(service.match);
                if (isMatched) {
                    confirmedServices.push(service);
                    log(`  ✓ 确认支持: ${service.name} (${service.match})`, 'debug');
                } else {
                    possibleServices.push(service);
                    log(`  ? 可能支持: ${service.name} (${service.match})`, 'debug');
                }
            });
            
            log(`确认的服务: ${confirmedServices.length} 个,可能的服务: ${possibleServices.length} 个`, 'debug');
            
            // 生成服务按钮 - 显示所有服务,区分确认和可能
            if (confirmedServices.length === 0) {
                // 如果没有确认的服务,显示警告
                serviceSelector.innerHTML = '<span style="color: #ffa500; font-size: 12px;">⚠️ 该游戏暂无已知服务类型,以下为可能的服务</span>';
                log('警告: 该游戏没有确认的服务类型', 'warning');
            }
            
            let buttonCount = 0;
            
            // 先显示确认支持的服务
            confirmedServices.forEach(service => {
                const btn = document.createElement('button');
                btn.className = 'g2g-service-btn';
                btn.textContent = `✓ ${service.name}`;
                btn.title = `确认支持 - 跳转到 ${selectedGame.name} 的${service.name}页面`;
                // 使用更明亮的绿色渐变,文字清晰
                btn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
                btn.style.color = '#ffffff';
                btn.style.fontWeight = '600';
                btn.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
                
                btn.onclick = () => {
                    const url = `https://www.g2g.com/categories/${baseGameId}-${service.suffix}`;
                    log(`[确认] 跳转到: ${selectedGame.name} - ${service.name} (${url})`, 'info');
                    showNotification('🔗 页面跳转', `正在打开 ${selectedGame.name} - ${service.name}`, 'info');
                    window.location.href = url;
                };
                serviceSelector.appendChild(btn);
                buttonCount++;
            });
            
            // 再显示可能支持的服务
            possibleServices.forEach(service => {
                const btn = document.createElement('button');
                btn.className = 'g2g-service-btn';
                btn.textContent = `? ${service.name}`;
                btn.title = `可能支持 - 该服务未在trending中出现,但可以尝试\n点击跳转到 ${selectedGame.name} 的${service.name}页面`;
                // 使用浅色背景,深色文字,提升对比度
                btn.style.background = 'rgba(226, 232, 240, 0.2)';
                btn.style.color = '#e2e8f0';
                btn.style.border = '1px dashed rgba(226, 232, 240, 0.5)';
                btn.style.fontWeight = '400';
                
                btn.onmouseover = () => {
                    btn.style.background = 'rgba(226, 232, 240, 0.3)';
                    btn.style.color = '#ffffff';
                    btn.style.border = '1px dashed rgba(226, 232, 240, 0.8)';
                };
                btn.onmouseout = () => {
                    btn.style.background = 'rgba(226, 232, 240, 0.2)';
                    btn.style.color = '#e2e8f0';
                    btn.style.border = '1px dashed rgba(226, 232, 240, 0.5)';
                };
                
                btn.onclick = () => {
                    const url = `https://www.g2g.com/categories/${baseGameId}-${service.suffix}`;
                    log(`[尝试] 跳转到: ${selectedGame.name} - ${service.name} (${url})`, 'info');
                    showNotification('🔗 尝试跳转', `正在打开 ${selectedGame.name} - ${service.name} (可能不存在)`, 'warning');
                    window.location.href = url;
                };
                serviceSelector.appendChild(btn);
                buttonCount++;
            });
            
            log(`已生成 ${buttonCount} 个服务按钮 (${confirmedServices.length} 个确认, ${possibleServices.length} 个可能)`, 'debug');
            
            // 添加提示信息
            const hint = document.createElement('div');
            hint.style.cssText = 'margin-top: 8px; font-size: 11px; color: #999; line-height: 1.4;';
            if (confirmedServices.length > 0 && possibleServices.length > 0) {
                hint.innerHTML = `✓ <b>${confirmedServices.length}</b> 个确认服务 &nbsp;|&nbsp; ? <b>${possibleServices.length}</b> 个可能服务 (可尝试)`;
            } else if (confirmedServices.length > 0) {
                hint.innerHTML = `✅ 该游戏支持 <b>${confirmedServices.length}</b> 种服务类型`;
            } else {
                hint.innerHTML = `⚠️ 显示 <b>${possibleServices.length}</b> 个可能的服务类型供尝试`;
            }
            serviceSelector.appendChild(hint);
            
        } else {
            selectedBox.style.display = 'none';
        }
    }

    /**
     * 更新进度条显示
     */
    function updateProgressDisplay() {
        const progressContainer = document.getElementById('g2g-progress-container');
        const progressBar = document.getElementById('g2g-progress-fill');
        const progressText = document.getElementById('g2g-progress-text');
        
        if (isScraperActive && scrapingProgress.stage === 'games') {
            progressContainer.style.display = 'block';
            
            // 计算进度百分比
            let percentage = 0;
            if (scrapingProgress.total > 0) {
                percentage = (scrapingProgress.current / scrapingProgress.total) * 100;
            }
            
            progressBar.style.width = percentage + '%';
            
            // 更新文本
            const categoryName = scrapingProgress.currentCategory || '未知';
            const pageInfo = scrapingProgress.currentPage > 0 ? ` (第${scrapingProgress.currentPage}页)` : '';
            progressText.textContent = `[${scrapingProgress.current}/${scrapingProgress.total}] ${categoryName}${pageInfo}`;
            
        } else {
            progressContainer.style.display = 'none';
        }
    }

    /**
     * 更新面板显示
     */
    function updatePanelDisplay() {
        // 检测当前页面类型
        const currentUrl = window.location.href;
        let pageType = '未知';
        
        if (currentUrl.includes('/trending/')) {
            if (currentUrl.includes('/game-coins')) pageType = 'Trending - 金币';
            else if (currentUrl.includes('/items')) pageType = 'Trending - 物品';
            else if (currentUrl.includes('/accounts')) pageType = 'Trending - 账号';
            else if (currentUrl.includes('/boosting')) pageType = 'Trending - 代练';
            else if (currentUrl.includes('/mobile-recharge')) pageType = 'Trending - 充值';
            else if (currentUrl.includes('/coaching')) pageType = 'Trending - 教练';
            else if (currentUrl.includes('/skins')) pageType = 'Trending - 皮肤';
            else pageType = 'Trending';
        } else if (currentUrl.includes('/categories/')) {
            const match = currentUrl.match(/\/categories\/([^/?]+)/);
            if (match) {
                const gamePath = match[1];
                // 提取游戏名和服务类型
                if (gamePath.includes('-gold')) pageType = '商品页 - 金币';
                else if (gamePath.includes('-item-buy')) pageType = '商品页 - 物品';
                else if (gamePath.includes('-account')) pageType = '商品页 - 账号';
                else if (gamePath.includes('-boosting-service')) pageType = '商品页 - 代练';
                else if (gamePath.includes('-top-up')) pageType = '商品页 - 充值';
                else if (gamePath.includes('-coaching')) pageType = '商品页 - 教练';
                else if (gamePath.includes('-gift-cards')) pageType = '商品页 - 皮肤';
                else pageType = '商品页';
            }
        } else if (currentUrl.includes('g2g.com')) {
            pageType = 'G2G 首页';
        }
        
        document.getElementById('g2g-current-page').textContent = pageType;
        
        // 实时读取游戏数量
        const games = GM_getValue('games', []);
        document.getElementById('g2g-games-count').textContent = games.length;
        
        // 实时读取产品订单数量
        const productOrders = GM_getValue('productOrders', []);
        const ordersCountEl = document.getElementById('g2g-orders-count');
        if (ordersCountEl) {
            ordersCountEl.textContent = productOrders.length;
        }
        
        // 获取最后更新时间(优先从 scraperData,否则从游戏或订单数据判断)
        let lastUpdate = scraperData?.statistics?.lastUpdate;
        if (lastUpdate) {
            const date = new Date(lastUpdate);
            const timeStr = date.toLocaleString('zh-CN', { 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            document.getElementById('g2g-last-update').textContent = timeStr;
        } else {
            document.getElementById('g2g-last-update').textContent = '从未';
        }
        
        // 更新游戏选择显示
        updateGameSelection();
    }

    /**
     * 显示通知
     */
    function showNotification(title, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'g2g-notification';
        
        const colors = {
            success: '#51cf66',
            error: '#ff6b6b',
            warning: '#ffd43b',
            info: '#74c0fc'
        };
        
        notification.style.borderLeft = `4px solid ${colors[type] || colors.info}`;
        notification.innerHTML = `
            <div class="g2g-notification-title" style="color: ${colors[type] || colors.info}">${title}</div>
            <div class="g2g-notification-message">${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }



    // ============================================
    // 初始化
    // ============================================

    /**
     * 启动脚本
     */
    function init() {
        log('G2G 爬取助手启动中...', 'info');
        log(`当前页面: ${window.location.href}`, 'debug');
        
        // 加载已保存的数据
        loadData();
        
        // 创建控制面板
        createControlPanel();
        
        // 自动检测并爬取服务类型 (如果在游戏页面)
        autoDetectServiceTypes();
        
        // 检查是否有未完成的爬取任务
        const progress = GM_getValue('scraping_progress', null);
        if (progress) {
            const elapsed = ((Date.now() - progress.timestamp) / 1000).toFixed(0);
            log(`检测到爬取进度: 索引=${progress.currentIndex}, 总数=${progress.totalCategories}, 已过时间=${elapsed}秒`, 'info');
            
            if (Date.now() - progress.timestamp < 600000) {
                log('进度有效,准备自动继续...', 'info');
                
                // 显示进度信息
                if (progress.currentIndex < CONFIG.SCRAPE_URLS.length) {
                    const targetUrl = CONFIG.SCRAPE_URLS[progress.currentIndex];
                    log(`下一个目标: [${progress.currentIndex + 1}/${progress.totalCategories}] ${targetUrl}`, 'info');
                }
                
                // 自动继续
                autoResumeScraping();
            } else {
                log('进度已超时(>10分钟),已清除', 'warning');
                GM_deleteValue('scraping_progress');
            }
        } else {
            log('没有未完成的爬取任务', 'debug');
        }
        
        log('G2G 爬取助手已就绪!', 'success');
        
        // 显示欢迎信息
        const totalGames = scraperData.games.length;
        let welcomeMsg = totalGames > 0 
            ? `已加载 ${totalGames} 个游戏` 
            : '点击"一键爬取所有游戏"开始';
        
        if (progress && Date.now() - progress.timestamp < 600000) {
            welcomeMsg = `检测到断点,正在恢复爬取...`;
        }
        
        showNotification('🎮 G2G 爬取助手', welcomeMsg, 'success');
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

// ==UserScript==
// @name         Z2U 订单抓取器
// @namespace    http://tampermonkey.net/
// @version      7.4.3
// @description  Z2U.com 订单数据抓取工具 - 抓取产品订单详细信息(标题/链接/交付时间/卖家/价格) + 关键字筛选 + Cloudflare自动验证(优先处理Turnstile)
// @author       You
// @match        https://www.z2u.com/*
// @match        https://*.z2u.com/*
// @match        http://www.z2u.com/*
// @match        http://*.z2u.com/*
// @match        *://challenges.cloudflare.com/*
// @icon         https://www.z2u.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      z2u.com
// @connect      api.yescaptcha.com
// @connect      challenges.cloudflare.com
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('%c[Z2U抓取器] 🚀 v7.4.2 脚本加载中...', 'color: #FF6B35; font-weight: bold; font-size: 14px;');
    console.log('%c[Z2U抓取器] 📍 当前URL:', 'color: #0066CC', window.location.href);
    console.log('%c[Z2U抓取器] 📄 页面标题:', 'color: #0066CC', document.title);

    // Cloudflare 验证配置
    const CF_CONFIG = {
        enabled: true,
        clientKey: GM_getValue('z2u_cf_client_key', ''),
        apiUrl: 'https://api.yescaptcha.com',
        checkInterval: 3000,
        maxAttempts: 40
    };

    // 数据存储 - 新结构: 游戏包含服务列表
    const scraperData = {
        games: [],         // 游戏列表,每个游戏包含 services 数组
        timestamp: new Date().toISOString(),
        pageType: '',
        currentUrl: window.location.href,
        selectedGame: null,      // 用户选择的游戏
        selectedService: null,   // 用户选择的服务
        orders: [],              // 抓取的订单列表
        autoFetched: false       // 是否已自动抓取
    };

    // 从存储加载数据
    function loadData() {
        try {
            const saved = GM_getValue('z2u_games_data', null);
            if (saved) {
                const parsed = JSON.parse(saved);
                scraperData.games = parsed.games || [];
                scraperData.timestamp = parsed.timestamp || new Date().toISOString();
                console.log(`%c[Z2U抓取器] ✓ 从存储加载了 ${scraperData.games.length} 个游戏`, 'color: #28A745; font-weight: bold');
                return true;
            }
        } catch (e) {
            console.error('%c[Z2U抓取器] 加载数据失败:', 'color: #DC3545', e);
        }
        return false;
    }

    // 保存数据到存储
    function saveData() {
        try {
            const data = {
                games: scraperData.games,
                timestamp: scraperData.timestamp,
                version: '7.4.1'
            };
            GM_setValue('z2u_games_data', JSON.stringify(data));
            console.log(`%c[Z2U抓取器] ✓ 已保存 ${scraperData.games.length} 个游戏到存储`, 'color: #28A745; font-weight: bold');
        } catch (e) {
            console.error('%c[Z2U抓取器] 保存数据失败:', 'color: #DC3545', e);
        }
    }

    // ==================== Cloudflare 验证模块 ====================

    // 检测 Cloudflare 验证页面
    function checkForCloudflare() {
        // 多指标检测
        const indicators = {
            iframe: document.querySelector('iframe[src*="challenges.cloudflare.com"]'),
            widget: document.querySelector('#cf-chl-widget, .cf-challenge-form'),
            turnstile: document.querySelector('[data-sitekey]'),
            title: document.title.toLowerCase().includes('just a moment'),
            body: document.body?.textContent?.toLowerCase().includes('checking your browser'),
            // 新增: 检测 PAT 挑战 (Private Access Token)
            patChallenge: document.querySelector('script[src*="challenges.cloudflare.com/cdn-cgi/challenge-platform"]'),
            // 检测 Cloudflare 加载脚本
            cfScript: document.querySelector('script[src*="cloudflare.com"]'),
            // 检测 meta 标签
            cfMeta: document.querySelector('meta[name="cf-2fa-verify"]'),
            // 检测 URL 包含 CF 挑战参数
            urlHasChallenge: window.location.href.includes('__cf_chl_')
        };

        const detected = indicators.iframe || indicators.widget || indicators.turnstile || 
                        indicators.title || indicators.body || indicators.patChallenge ||
                        indicators.urlHasChallenge;

        if (detected) {
            console.log('%c[Z2U-CF] 🛡️ 检测到 Cloudflare 验证页面', 'color: #FFC107; font-weight: bold');
            console.log('%c[Z2U-CF] 检测指标:', 'color: #FFC107', {
                iframe: !!indicators.iframe,
                widget: !!indicators.widget,
                turnstile: !!indicators.turnstile,
                title: !!indicators.title,
                body: !!indicators.body,
                patChallenge: !!indicators.patChallenge,
                urlHasChallenge: !!indicators.urlHasChallenge
            });
            return detected;
        }
        return false;
    }

    // 提取 sitekey
    function extractSitekey() {
        console.log('%c[Z2U-CF] 开始提取 sitekey...', 'color: #17A2B8');
        
        // 方法1: 从 data-sitekey 属性提取
        const turnstileEl = document.querySelector('[data-sitekey]');
        if (turnstileEl) {
            const sitekey = turnstileEl.getAttribute('data-sitekey');
            console.log('%c[Z2U-CF] ✓ 从 data-sitekey 属性提取成功:', 'color: #28A745', sitekey);
            return sitekey;
        }

        // 方法2: 查找其他可能的 Turnstile 元素
        const cfElements = document.querySelectorAll('[class*="turnstile"], [id*="turnstile"], [class*="cf-"], [id*="cf-"]');
        for (const el of cfElements) {
            const sitekey = el.getAttribute('data-sitekey') || el.getAttribute('sitekey');
            if (sitekey) {
                console.log('%c[Z2U-CF] ✓ 从元素属性提取成功:', 'color: #28A745', sitekey);
                return sitekey;
            }
        }

        // 方法3: 从 iframe 提取
        const iframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
        if (iframe) {
            const match = iframe.src.match(/sitekey=([^&]+)/);
            if (match) {
                console.log('%c[Z2U-CF] ✓ 从 iframe 提取成功:', 'color: #28A745', match[1]);
                return match[1];
            }
        }

        // 方法4: 从页面源代码提取
        const bodyText = document.body.innerHTML;
        const match = bodyText.match(/sitekey['":\s]+['"]([a-zA-Z0-9_-]+)['"]/);
        if (match) {
            console.log('%c[Z2U-CF] ✓ 从页面源码提取成功:', 'color: #28A745', match[1]);
            return match[1];
        }

        console.log('%c[Z2U-CF] ✗ 未能提取 sitekey', 'color: #DC3545');

        return null;
    }

    // 更新 CF 状态显示
    function updateCfStatus(message, type = 'info') {
        const statusBox = document.getElementById('z2u-cf-status');
        const statusText = document.getElementById('z2u-cf-status-text');
        
        if (statusBox && statusText) {
            statusBox.style.display = 'block';
            statusText.textContent = message;
            statusText.className = `z2u-cf-status-text z2u-cf-${type}`;
        }

        console.log(`%c[Z2U-CF] ${message}`, `color: ${type === 'error' ? '#DC3545' : type === 'success' ? '#28A745' : '#FFC107'}`);
    }

    // 更新进度条
    function updateCfProgress(percent, text) {
        const progressBar = document.getElementById('z2u-cf-progress');
        const progressFill = document.getElementById('z2u-cf-progress-fill');
        const progressText = document.getElementById('z2u-cf-progress-text');

        if (progressBar && progressFill && progressText) {
            progressBar.style.display = 'block';
            progressFill.style.width = `${percent}%`;
            progressText.textContent = text || `${percent}%`;
        }
    }

    // 添加日志
    function addCfLog(message) {
        const logBox = document.getElementById('z2u-cf-log');
        if (logBox) {
            logBox.style.display = 'block';
            const time = new Date().toLocaleTimeString();
            logBox.innerHTML += `<div>[${time}] ${message}</div>`;
            logBox.scrollTop = logBox.scrollHeight;
        }
    }

    // 创建验证任务
    function createCfTask(sitekey, pageUrl) {
        return new Promise((resolve, reject) => {
            const taskData = {
                clientKey: CF_CONFIG.clientKey,
                task: {
                    type: 'TurnstileTaskProxyless',
                    websiteURL: pageUrl,
                    websiteKey: sitekey
                }
            };

            // 调试日志
            console.log('%c[Z2U-CF] 创建任务请求:', 'color: #17A2B8', {
                url: `${CF_CONFIG.apiUrl}/createTask`,
                sitekey: sitekey,
                pageUrl: pageUrl
            });

            GM_xmlhttpRequest({
                method: 'POST',
                url: `${CF_CONFIG.apiUrl}/createTask`,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(taskData),
                timeout: 30000,
                onload: (response) => {
                    try {
                        const result = JSON.parse(response.responseText);
                        console.log('%c[Z2U-CF] 创建任务响应:', 'color: #17A2B8', result);
                        
                        if (result.errorId === 0 && result.taskId) {
                            addCfLog(`✓ 任务已创建: ${result.taskId}`);
                            resolve(result.taskId);
                        } else {
                            const errorMsg = `${result.errorCode || 'ERROR'}: ${result.errorDescription || '创建任务失败'}`;
                            addCfLog(`❌ 创建失败: ${errorMsg}`);
                            reject(new Error(errorMsg));
                        }
                    } catch (e) {
                        addCfLog(`❌ 解析响应失败: ${e.message}`);
                        reject(e);
                    }
                },
                onerror: (e) => {
                    addCfLog('❌ 网络请求失败');
                    reject(new Error('网络请求失败'));
                },
                ontimeout: () => {
                    addCfLog('❌ 请求超时');
                    reject(new Error('请求超时'));
                }
            });
        });
    }

    // 查询任务结果
    function getCfTaskResult(taskId) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${CF_CONFIG.apiUrl}/getTaskResult`,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    clientKey: CF_CONFIG.clientKey,
                    taskId: taskId
                }),
                timeout: 30000,
                onload: (response) => {
                    try {
                        const result = JSON.parse(response.responseText);
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: (e) => reject(new Error('网络请求失败')),
                ontimeout: () => reject(new Error('请求超时'))
            });
        });
    }

    // 等待任务完成
    async function waitForCfResult(taskId) {
        const startTime = Date.now();
        let attempts = 0;

        while (attempts < CF_CONFIG.maxAttempts) {
            attempts++;
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const percent = Math.min(95, Math.floor((attempts / CF_CONFIG.maxAttempts) * 100));

            updateCfProgress(percent, `${percent}% (${elapsed}s)`);
            addCfLog(`查询结果 (${attempts}/${CF_CONFIG.maxAttempts})...`);

            try {
                const result = await getCfTaskResult(taskId);

                // 调试日志
                console.log('%c[Z2U-CF] API 响应:', 'color: #17A2B8', result);

                if (result.errorId !== 0) {
                    const errorMsg = `${result.errorCode || 'ERROR'}: ${result.errorDescription || '查询失败'}`;
                    addCfLog(`❌ API 错误: ${errorMsg}`);
                    throw new Error(errorMsg);
                }

                if (result.status === 'ready' && result.solution?.token) {
                    updateCfProgress(100, '100% ✓');
                    addCfLog('✓ 验证码已获取');
                    console.log('%c[Z2U-CF] Token:', 'color: #28A745', result.solution.token.substring(0, 50) + '...');
                    return result.solution.token;
                }

                if (result.status === 'processing') {
                    addCfLog(`⏳ 正在处理中... (${elapsed}s)`);
                }

                if (result.status === 'failed') {
                    throw new Error('验证失败');
                }

                // 等待后继续查询
                await new Promise(resolve => setTimeout(resolve, CF_CONFIG.checkInterval));

            } catch (e) {
                throw e;
            }
        }

        throw new Error('验证超时');
    }

    // 应用验证 token
    function applyCfToken(token) {
        // 查找 Turnstile 响应输入框
        const responseInput = document.querySelector('input[name="cf-turnstile-response"]');
        if (responseInput) {
            responseInput.value = token;
            addCfLog('✓ Token 已注入到表单');
        }

        // 触发表单提交
        const form = document.querySelector('form.cf-challenge-form, form#challenge-form');
        if (form) {
            addCfLog('✓ 正在提交表单...');
            form.submit();
            return;
        }

        // 如果没有表单,尝试重新加载页面
        addCfLog('✓ 正在重新加载页面...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    // 检测 CF 挑战类型
    function detectChallengeType() {
        console.log('%c[Z2U-CF] 开始检测挑战类型...', 'color: #17A2B8');
        
        // 优先检测 Turnstile 挑战（最重要，需要 API 处理）
        const turnstile = document.querySelector('[data-sitekey]');
        const checkbox = document.querySelector('input[type="checkbox"][id*="cf"]');
        const cfTurnstile = document.querySelector('.cf-turnstile, #cf-turnstile');
        
        if (turnstile || checkbox || cfTurnstile) {
            console.log('%c[Z2U-CF] ✓ 检测到 Turnstile 挑战', 'color: #FF9800; font-weight: bold', {
                hasSitekey: !!turnstile,
                hasCheckbox: !!checkbox,
                hasTurnstileDiv: !!cfTurnstile
            });
            return 'Turnstile';
        }

        // 检测传统 JS 挑战
        const jsChallenge = document.querySelector('#cf-chl-widget, .cf-challenge-form');
        if (jsChallenge) {
            console.log('%c[Z2U-CF] ✓ 检测到 JS 挑战', 'color: #FFC107');
            return 'JSChallenge';
        }

        // 检测 Managed Challenge
        const managedChallenge = document.querySelector('script[src*="challenge-platform/h/b/cmg"]');
        if (managedChallenge) {
            console.log('%c[Z2U-CF] ✓ 检测到 Managed 挑战', 'color: #FFC107');
            return 'Managed';
        }

        // 最后检测 PAT (Private Access Token) 挑战
        const patScript = document.querySelector('script[src*="challenge-platform/h/b/pat"]');
        if (patScript) {
            console.log('%c[Z2U-CF] ✓ 检测到 PAT 挑战', 'color: #FFC107');
            return 'PAT';
        }

        console.log('%c[Z2U-CF] ⚠️ 未识别的挑战类型', 'color: #DC3545');
        return 'Unknown';
    }

    // 等待 PAT 挑战自动完成
    async function waitForPATCompletion() {
        updateCfStatus('检测到 PAT 挑战,等待自动完成...', 'checking');
        addCfLog('🔍 检测到 Private Access Token 挑战');
        addCfLog('⏳ 等待页面自动验证...');

        let attempts = 0;
        const maxWait = 30; // 最多等待 30 秒

        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                attempts++;
                const percent = Math.min(95, (attempts / maxWait) * 100);
                updateCfProgress(percent, `等待中 ${attempts}s / ${maxWait}s`);

                // 检查是否已经跳转或完成
                if (!checkForCloudflare()) {
                    clearInterval(checkInterval);
                    updateCfProgress(100, '100% ✓');
                    addCfLog('✓ PAT 挑战已自动完成');
                    updateCfStatus('验证完成', 'success');
                    resolve(true);
                    return;
                }

                // 超时
                if (attempts >= maxWait) {
                    clearInterval(checkInterval);
                    addCfLog('⚠️ PAT 挑战未自动完成,尝试刷新页面...');
                    updateCfStatus('等待超时,刷新页面', 'checking');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                    resolve(false);
                }
            }, 1000);
        });
    }

    // 主验证流程
    async function handleCloudflareTurnstile() {
        try {
            console.log('%c[Z2U-CF] ========================================', 'color: #00BCD4; font-weight: bold');
            console.log('%c[Z2U-CF] 🚀 开始执行 Cloudflare 验证流程', 'color: #00BCD4; font-weight: bold');
            console.log('%c[Z2U-CF] ========================================', 'color: #00BCD4; font-weight: bold');
            
            updateCfStatus('检测验证类型...', 'checking');
            addCfLog('🔍 开始检测验证类型...');

            const challengeType = detectChallengeType();
            addCfLog(`✓ 检测到挑战类型: ${challengeType}`);
            console.log('%c[Z2U-CF] ✓ 挑战类型: ' + challengeType, 'color: #FF9800; font-weight: bold; font-size: 14px');

            // 根据挑战类型采取不同策略
            if (challengeType === 'PAT' || challengeType === 'Managed') {
                // PAT 和 Managed 挑战通常自动完成,我们只需等待
                addCfLog('ℹ️ 该挑战类型通常自动完成,无需手动处理');
                await waitForPATCompletion();
                return;
            }

            // Turnstile 挑战需要 API 处理
            if (challengeType === 'Turnstile') {
                if (!CF_CONFIG.enabled || !CF_CONFIG.clientKey) {
                    updateCfStatus('未配置 API Key', 'error');
                    addCfLog('❌ Turnstile 挑战需要配置 YesCaptcha API Key');
                    addCfLog('💡 点击"🛡️ Cloudflare 配置"按钮进行配置');
                    return;
                }

                updateCfStatus('检测验证信息...', 'checking');
                const sitekey = extractSitekey();
                if (!sitekey) {
                    throw new Error('无法提取 sitekey');
                }

                addCfLog(`✓ Sitekey: ${sitekey}`);
                document.getElementById('z2u-cf-sitekey').textContent = `Sitekey: ${sitekey}`;
                document.getElementById('z2u-cf-sitekey').style.display = 'block';

                updateCfStatus('创建验证任务...', 'checking');
                const taskId = await createCfTask(sitekey, window.location.href);

                updateCfStatus('等待验证结果...', 'checking');
                const token = await waitForCfResult(taskId);

                updateCfStatus('应用验证结果...', 'checking');
                applyCfToken(token);

                updateCfStatus('验证成功,页面即将刷新', 'success');
                return;
            }

            // 其他类型的挑战,尝试等待或刷新
            addCfLog('⚠️ 未知挑战类型,尝试等待自动完成...');
            await waitForPATCompletion();

            updateCfStatus('验证成功,页面即将刷新', 'success');

        } catch (error) {
            updateCfStatus(`验证失败: ${error.message}`, 'error');
            addCfLog(`❌ 错误: ${error.message}`);
            console.error('%c[Z2U-CF] 验证失败:', 'color: #DC3545', error);
        }
    }

    // Cloudflare 配置对话框
    function showCfConfig() {
        const currentKey = CF_CONFIG.clientKey;
        const newKey = prompt(
            '请输入 YesCaptcha API Key:\n\n' +
            '1. 访问 https://yescaptcha.com/\n' +
            '2. 注册并获取 Client Key\n' +
            '3. 将 Key 粘贴到下方\n\n' +
            '当前配置: ' + (currentKey ? `${currentKey.substring(0, 20)}...` : '未配置'),
            currentKey
        );

        if (newKey !== null) {
            if (newKey.trim()) {
                GM_setValue('z2u_cf_client_key', newKey.trim());
                CF_CONFIG.clientKey = newKey.trim();
                alert('✓ API Key 已保存!\n\n下次遇到 Cloudflare 验证时将自动处理。');
            } else {
                GM_setValue('z2u_cf_client_key', '');
                CF_CONFIG.clientKey = '';
                alert('✓ API Key 已清除');
            }
        }
    }

    // ==================== 样式和界面 ====================

    // Z2U 网站配色 - 橙色主题
    const Z2U_COLORS = {
        primary: '#FF6B35',      // Z2U 橙色
        primaryDark: '#E55A2B',
        secondary: '#004E89',    // Z2U 蓝色
        dark: '#1A1A1A',
        darkGray: '#2A2A2A',
        mediumGray: '#3A3A3A',
        lightGray: '#4A4A4A',
        text: '#FFFFFF',
        textSecondary: '#B0B0B0',
        success: '#28A745',
        warning: '#FFC107',
        danger: '#DC3545',
        info: '#17A2B8'
    };

    // 添加样式 - 完全匹配 Z2U 设计
    GM_addStyle(`
        /* 主面板容器 */
        #z2u-scraper-panel {
            position: fixed;
            top: 0;
            right: 0;
            width: 380px;
            height: 100vh;
            background: ${Z2U_COLORS.dark};
            box-shadow: -4px 0 30px rgba(0,0,0,0.6);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
            overflow-y: auto;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            color: ${Z2U_COLORS.text};
            border-left: 2px solid ${Z2U_COLORS.primary};
        }

        #z2u-scraper-panel.collapsed {
            transform: translateX(380px);
        }

        /* 滚动条样式 - Z2U 风格 */
        #z2u-scraper-panel::-webkit-scrollbar {
            width: 10px;
        }

        #z2u-scraper-panel::-webkit-scrollbar-track {
            background: ${Z2U_COLORS.darkGray};
        }

        #z2u-scraper-panel::-webkit-scrollbar-thumb {
            background: ${Z2U_COLORS.primary};
            border-radius: 5px;
        }

        #z2u-scraper-panel::-webkit-scrollbar-thumb:hover {
            background: ${Z2U_COLORS.primaryDark};
        }

        /* 折叠按钮 - Z2U 橙色主题 */
        .z2u-toggle-btn {
            position: absolute;
            left: -45px;
            top: 50%;
            transform: translateY(-50%);
            width: 45px;
            height: 90px;
            background: ${Z2U_COLORS.primary};
            color: white;
            border: none;
            border-radius: 8px 0 0 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: -4px 0 15px rgba(255, 107, 53, 0.4);
            transition: all 0.3s;
            font-weight: bold;
        }

        .z2u-toggle-btn:hover {
            background: ${Z2U_COLORS.primaryDark};
            left: -48px;
            box-shadow: -6px 0 20px rgba(255, 107, 53, 0.6);
        }

        /* 头部 - Z2U 橙色渐变 */
        .z2u-header {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, ${Z2U_COLORS.primary} 0%, ${Z2U_COLORS.primaryDark} 100%);
            color: ${Z2U_COLORS.text};
            font-size: 18px;
            font-weight: 700;
            position: sticky;
            top: 0;
            z-index: 10;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            text-align: center;
            letter-spacing: 0.5px;
        }

        .z2u-header-subtitle {
            font-size: 11px;
            opacity: 0.9;
            margin-top: 5px;
            font-weight: 400;
            letter-spacing: 1px;
        }

        /* 内容区域 */
        .z2u-content {
            padding: 20px;
        }

        /* 信息卡片 - Z2U 风格 */
        .z2u-info-box {
            background: ${Z2U_COLORS.darkGray};
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 12px;
            border-left: 4px solid ${Z2U_COLORS.primary};
            transition: all 0.2s;
        }

        .z2u-info-box:hover {
            background: ${Z2U_COLORS.mediumGray};
            border-left-width: 6px;
        }

        .z2u-info-label {
            color: ${Z2U_COLORS.textSecondary};
            font-size: 11px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }

        .z2u-info-value {
            color: ${Z2U_COLORS.text};
            font-size: 20px;
            font-weight: 700;
        }

        /* 统计网格 */
        .z2u-stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }

        .z2u-stat-card {
            background: ${Z2U_COLORS.darkGray};
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid ${Z2U_COLORS.lightGray};
        }

        .z2u-stat-card .label {
            color: ${Z2U_COLORS.textSecondary};
            font-size: 10px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }

        .z2u-stat-card .value {
            color: ${Z2U_COLORS.primary};
            font-size: 24px;
            font-weight: 700;
        }

        /* 按钮组 */
        .z2u-button-group {
            margin-bottom: 15px;
        }

        .z2u-button-group-title {
            color: ${Z2U_COLORS.textSecondary};
            font-size: 12px;
            margin-bottom: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* 按钮 - Z2U 风格 */
        .z2u-btn {
            width: 100%;
            padding: 14px;
            margin-bottom: 10px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .z2u-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }

        .z2u-btn:active {
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .z2u-btn-primary {
            background: ${Z2U_COLORS.primary};
            color: white;
        }

        .z2u-btn-primary:hover {
            background: ${Z2U_COLORS.primaryDark};
        }

        .z2u-btn-success {
            background: ${Z2U_COLORS.success};
            color: white;
        }

        .z2u-btn-success:hover {
            background: #218838;
        }

        .z2u-btn-info {
            background: ${Z2U_COLORS.info};
            color: white;
        }

        .z2u-btn-info:hover {
            background: #138496;
        }

        .z2u-btn-warning {
            background: ${Z2U_COLORS.warning};
            color: #000;
        }

        .z2u-btn-warning:hover {
            background: #E0A800;
        }

        .z2u-btn-danger {
            background: ${Z2U_COLORS.danger};
            color: white;
        }

        .z2u-btn-danger:hover {
            background: #C82333;
        }

        .z2u-btn-secondary {
            background: ${Z2U_COLORS.darkGray};
            color: ${Z2U_COLORS.text};
            border: 2px solid ${Z2U_COLORS.lightGray};
        }

        .z2u-btn-secondary:hover {
            background: ${Z2U_COLORS.mediumGray};
            border-color: ${Z2U_COLORS.primary};
        }

        /* 分割线 */
        .z2u-divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, ${Z2U_COLORS.primary}, transparent);
            margin: 20px 0;
            opacity: 0.3;
        }

        /* 通知 - Z2U 风格 */
        .z2u-notification {
            position: fixed;
            top: 20px;
            right: 400px;
            background: ${Z2U_COLORS.primary};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5);
            font-size: 14px;
            font-weight: 600;
            z-index: 10000000;
            animation: z2uSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        @keyframes z2uSlideIn {
            from {
                transform: translateX(150px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        /* 徽章 */
        .z2u-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            background: ${Z2U_COLORS.primary};
            color: white;
            margin-left: 8px;
        }

        /* 进度条 */
        .z2u-progress {
            width: 100%;
            height: 6px;
            background: ${Z2U_COLORS.darkGray};
            border-radius: 3px;
            overflow: hidden;
            margin-top: 8px;
        }

        .z2u-progress-bar {
            height: 100%;
            background: ${Z2U_COLORS.primary};
            transition: width 0.3s;
            border-radius: 3px;
        }

        /* 选择器样式 */
        .z2u-select {
            width: 100%;
            padding: 12px;
            margin-bottom: 10px;
            border: 2px solid ${Z2U_COLORS.lightGray};
            border-radius: 8px;
            background: ${Z2U_COLORS.darkGray};
            color: ${Z2U_COLORS.text};
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .z2u-select:hover {
            border-color: ${Z2U_COLORS.primary};
            background: ${Z2U_COLORS.mediumGray};
        }

        .z2u-select:focus {
            outline: none;
            border-color: ${Z2U_COLORS.primary};
            box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.2);
        }

        .z2u-select option {
            background: ${Z2U_COLORS.darkGray};
            color: ${Z2U_COLORS.text};
            padding: 10px;
        }

        /* 搜索输入框 */
        .z2u-search-input {
            width: 100%;
            padding: 12px;
            margin-bottom: 10px;
            border: 2px solid ${Z2U_COLORS.lightGray};
            border-radius: 8px;
            background: ${Z2U_COLORS.darkGray};
            color: ${Z2U_COLORS.text};
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
        }

        .z2u-search-input:hover {
            border-color: ${Z2U_COLORS.primary};
            background: ${Z2U_COLORS.mediumGray};
        }

        .z2u-search-input:focus {
            outline: none;
            border-color: ${Z2U_COLORS.primary};
            box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.2);
        }

        .z2u-search-input::placeholder {
            color: ${Z2U_COLORS.textSecondary};
        }

        /* 游戏列表容器 */
        .z2u-games-list {
            max-height: 300px;
            overflow-y: auto;
            border: 2px solid ${Z2U_COLORS.lightGray};
            border-radius: 8px;
            background: ${Z2U_COLORS.darkGray};
            margin-bottom: 10px;
        }

        .z2u-games-list::-webkit-scrollbar {
            width: 8px;
        }

        .z2u-games-list::-webkit-scrollbar-track {
            background: ${Z2U_COLORS.darkGray};
        }

        .z2u-games-list::-webkit-scrollbar-thumb {
            background: ${Z2U_COLORS.primary};
            border-radius: 4px;
        }

        /* 游戏项 */
        .z2u-game-item {
            padding: 12px;
            border-bottom: 1px solid ${Z2U_COLORS.lightGray};
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .z2u-game-item:hover {
            background: ${Z2U_COLORS.mediumGray};
            border-left: 4px solid ${Z2U_COLORS.primary};
        }

        .z2u-game-item.selected {
            background: ${Z2U_COLORS.mediumGray};
            border-left: 4px solid ${Z2U_COLORS.primary};
        }

        .z2u-game-item:last-child {
            border-bottom: none;
        }

        .z2u-game-name {
            color: ${Z2U_COLORS.text};
            font-weight: 600;
            flex: 1;
        }

        .z2u-game-count {
            color: ${Z2U_COLORS.primary};
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }
        
        /* Cloudflare 状态区 */
        .z2u-cf-status {
            background: ${Z2U_COLORS.darkGray};
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 12px;
            border-left: 4px solid #17A2B8;
            display: none;
        }
        
        .z2u-cf-status.active {
            display: block;
        }
        
        .z2u-cf-status.checking {
            border-left-color: #FFC107;
            animation: cfPulse 2s ease-in-out infinite;
        }
        
        .z2u-cf-status.success {
            border-left-color: ${Z2U_COLORS.success};
        }
        
        .z2u-cf-status.error {
            border-left-color: ${Z2U_COLORS.danger};
        }
        
        @keyframes cfPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
        
        .z2u-cf-log {
            background: ${Z2U_COLORS.mediumGray};
            padding: 8px;
            border-radius: 4px;
            margin-top: 8px;
            max-height: 150px;
            overflow-y: auto;
            font-size: 11px;
            font-family: 'Courier New', monospace;
        }
        
        .z2u-cf-log::-webkit-scrollbar {
            width: 6px;
        }
        
        .z2u-cf-log::-webkit-scrollbar-thumb {
            background: ${Z2U_COLORS.primary};
            border-radius: 3px;
        }
        
        .z2u-cf-log-item {
            padding: 4px 0;
            border-bottom: 1px solid ${Z2U_COLORS.lightGray};
        }
        
        .z2u-cf-log-item:last-child {
            border-bottom: none;
        }
        
        .z2u-cf-log-time {
            color: ${Z2U_COLORS.textSecondary};
            margin-right: 8px;
        }
        
        .z2u-cf-log-info {
            color: #17A2B8;
        }
        
        .z2u-cf-log-success {
            color: ${Z2U_COLORS.success};
        }
        
        .z2u-cf-log-error {
            color: ${Z2U_COLORS.danger};
        }
    `);

    // 创建面板
    function createPanel() {
        console.log('%c[Z2U抓取器] 创建控制面板...', 'color: #FF6B35; font-weight: bold');

        if (document.getElementById('z2u-scraper-panel')) {
            console.log('%c[Z2U抓取器] 面板已存在', 'color: #FFC107');
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'z2u-scraper-panel';
        panel.innerHTML = `
            <button class="z2u-toggle-btn" id="z2u-toggle">◀</button>
            <div class="z2u-header">
                <div>� Z2U 订单抓取器</div>
                <div class="z2u-header-subtitle">v7.3 智能筛选版</div>
            </div>
            <div class="z2u-content">
                <!-- 页面类型 -->
                <div class="z2u-info-box">
                    <div class="z2u-info-label">📍 当前页面</div>
                    <div class="z2u-info-value" id="z2u-page-type" style="color: #FFC107;">检测中...</div>
                </div>

                <!-- Cloudflare 验证状态 -->
                <div class="z2u-cf-status" id="z2u-cf-status" style="display: none;">
                    <div class="z2u-info-label">🛡️ Cloudflare 验证</div>
                    <div class="z2u-cf-content">
                        <div class="z2u-cf-status-text" id="z2u-cf-status-text">未检测到验证</div>
                        <div class="z2u-cf-progress" id="z2u-cf-progress" style="display: none;">
                            <div class="z2u-cf-progress-bar">
                                <div class="z2u-cf-progress-fill" id="z2u-cf-progress-fill"></div>
                            </div>
                            <div class="z2u-cf-progress-text" id="z2u-cf-progress-text">0%</div>
                        </div>
                        <div class="z2u-cf-sitekey" id="z2u-cf-sitekey" style="display: none;"></div>
                        <div class="z2u-cf-log" id="z2u-cf-log" style="display: none;"></div>
                    </div>
                </div>

                <!-- 统计信息 -->
                <div class="z2u-stats-grid">
                    <div class="z2u-stat-card">
                        <div class="label">游戏总数</div>
                        <div class="value" id="z2u-game-count">0</div>
                    </div>
                    <div class="z2u-stat-card">
                        <div class="label">服务总数</div>
                        <div class="value" id="z2u-service-count">0</div>
                    </div>
                </div>

                <div class="z2u-divider"></div>

                <!-- 抓取操作 -->
                <div class="z2u-button-group">
                    <div class="z2u-button-group-title">🚀 数据抓取</div>
                    <button class="z2u-btn z2u-btn-primary" id="z2u-scrape-games">
                        <span>🎮</span>
                        <span>抓取游戏列表</span>
                    </button>
                </div>

                <div class="z2u-divider"></div>

                <!-- 游戏选择 -->
                <div class="z2u-button-group">
                    <div class="z2u-button-group-title">🎮 选择游戏</div>
                    <input type="text" class="z2u-search-input" id="z2u-game-search" placeholder="🔍 搜索游戏名称...">
                    <div class="z2u-games-list" id="z2u-games-list" style="display: none;"></div>
                </div>

                <!-- 游戏服务列表 -->
                <div class="z2u-button-group" id="z2u-services-container" style="display: none;">
                    <div class="z2u-button-group-title">📋 可用服务类型</div>
                    <div id="z2u-services-list"></div>
                </div>

                <div class="z2u-divider"></div>

                <!-- 产品订单抓取 -->
                <div class="z2u-button-group" id="z2u-orders-container" style="display: none;">
                    <div class="z2u-button-group-title">📦 产品订单抓取</div>

                    <!-- 订单统计 -->
                    <div class="z2u-info-box">
                        <div class="z2u-info-label">📊 订单统计</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
                            <div>
                                <div style="color: #B0B0B0; font-size: 11px;">总订单数</div>
                                <div style="color: #FF6B35; font-size: 18px; font-weight: 700;" id="z2u-total-orders">0</div>
                            </div>
                            <div>
                                <div style="color: #B0B0B0; font-size: 11px;">总页数</div>
                                <div style="color: #17A2B8; font-size: 18px; font-weight: 700;" id="z2u-total-pages">0</div>
                            </div>
                            <div>
                                <div style="color: #B0B0B0; font-size: 11px;">当前页码</div>
                                <div style="color: #28A745; font-size: 18px; font-weight: 700;" id="z2u-current-page">1</div>
                            </div>
                            <div>
                                <div style="color: #B0B0B0; font-size: 11px;">本页订单</div>
                                <div style="color: #FFC107; font-size: 18px; font-weight: 700;" id="z2u-current-page-orders">0</div>
                            </div>
                        </div>
                    </div>

                    <!-- 抓取模式选择 -->
                    <div style="margin-bottom: 10px;">
                        <div style="color: #B0B0B0; font-size: 11px; margin-bottom: 5px;">抓取模式</div>
                        <select class="z2u-select" id="z2u-scrape-mode">
                            <option value="single">单页抓取 (当前页)</option>
                            <option value="multiple">多页抓取 (自定义页数)</option>
                            <option value="all">全部抓取 (所有页面)</option>
                        </select>
                    </div>

                    <!-- 多页抓取设置 -->
                    <div id="z2u-multiple-pages-setting" style="display: none; margin-bottom: 10px;">
                        <div style="color: #B0B0B0; font-size: 11px; margin-bottom: 5px;">抓取页数</div>
                        <input type="number" class="z2u-search-input" id="z2u-pages-count" min="1" value="5" placeholder="输入要抓取的页数...">
                    </div>
                    
                    <!-- 关键字筛选 -->
                    <div style="margin-bottom: 10px;">
                        <div style="color: #B0B0B0; font-size: 11px; margin-bottom: 5px;">🔍 关键字筛选 (可选)</div>
                        <input type="text" class="z2u-search-input" id="z2u-order-keyword" placeholder="输入关键字筛选订单标题...">
                        <div style="color: #B0B0B0; font-size: 10px; margin-top: 5px;">💡 留空则抓取全部订单</div>
                    </div>

                    <!-- 抓取按钮 -->
                    <button class="z2u-btn z2u-btn-primary" id="z2u-scrape-orders">
                        <span>🚀</span>
                        <span>开始抓取订单</span>
                    </button>

                    <!-- 进度条 -->
                    <div id="z2u-scrape-progress" style="display: none; margin-top: 10px;">
                        <div style="color: #B0B0B0; font-size: 11px; margin-bottom: 5px;">抓取进度</div>
                        <div class="z2u-progress">
                            <div class="z2u-progress-bar" id="z2u-progress-bar" style="width: 0%;"></div>
                        </div>
                        <div style="color: #B0B0B0; font-size: 11px; margin-top: 5px; text-align: center;" id="z2u-progress-text">0%</div>
                    </div>

                    <!-- 已抓取订单统计 -->
                    <div class="z2u-info-box" id="z2u-scraped-stats" style="display: none; margin-top: 10px;">
                        <div class="z2u-info-label">✅ 抓取完成</div>
                        <div style="color: #28A745; font-size: 18px; font-weight: 700;" id="z2u-scraped-count">0 个订单</div>
                    </div>
                </div>

                <div class="z2u-divider"></div>

                <!-- 数据导出 -->
                <div class="z2u-button-group">
                    <div class="z2u-button-group-title">💾 数据导出</div>
                    <button class="z2u-btn z2u-btn-success" id="z2u-export-json">
                        <span>📄</span>
                        <span>导出 JSON</span>
                    </button>
                    <button class="z2u-btn z2u-btn-success" id="z2u-export-csv">
                        <span>📊</span>
                        <span>导出 CSV</span>
                    </button>
                    <button class="z2u-btn z2u-btn-warning" id="z2u-copy">
                        <span>📋</span>
                        <span>复制到剪贴板</span>
                    </button>
                </div>

                <div class="z2u-divider"></div>

                <!-- 其他操作 -->
                <div class="z2u-button-group">
                    <div class="z2u-button-group-title">🔧 其他操作</div>
                    <button class="z2u-btn z2u-btn-warning" id="z2u-cf-config">
                        <span>🛡️</span>
                        <span>Cloudflare 配置</span>
                    </button>
                    <button class="z2u-btn z2u-btn-info" id="z2u-view">
                        <span>👁️</span>
                        <span>查看数据</span>
                    </button>
                    <button class="z2u-btn z2u-btn-danger" id="z2u-clear">
                        <span>🗑️</span>
                        <span>清空数据</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        console.log('%c[Z2U抓取器] ✓ 面板创建完成', 'color: #28A745; font-weight: bold');

        bindEvents();
        updatePageType();
        showNotification('🎉 Z2U 抓取器已就绪!');
    }

    // 绑定事件
    function bindEvents() {
        // 折叠/展开
        document.getElementById('z2u-toggle').onclick = () => {
            const panel = document.getElementById('z2u-scraper-panel');
            const btn = document.getElementById('z2u-toggle');
            panel.classList.toggle('collapsed');
            btn.textContent = panel.classList.contains('collapsed') ? '▶' : '◀';
        };

        // 抓取按钮事件
        document.getElementById('z2u-scrape-games').onclick = scrapeGames;
        document.getElementById('z2u-scrape-orders').onclick = startScrapeOrders;

        // 导出按钮事件
        document.getElementById('z2u-export-json').onclick = exportJSON;
        document.getElementById('z2u-export-csv').onclick = exportCSV;
        document.getElementById('z2u-copy').onclick = copyData;
        document.getElementById('z2u-view').onclick = viewData;
        document.getElementById('z2u-clear').onclick = clearData;
        
        // Cloudflare 配置按钮事件
        document.getElementById('z2u-cf-config').onclick = showCfConfig;

        // 抓取模式切换事件
        document.getElementById('z2u-scrape-mode').onchange = (e) => {
            const mode = e.target.value;
            const multiplePagesSetting = document.getElementById('z2u-multiple-pages-setting');
            if (mode === 'multiple') {
                multiplePagesSetting.style.display = 'block';
            } else {
                multiplePagesSetting.style.display = 'none';
            }
        };

        // 游戏搜索事件
        const searchInput = document.getElementById('z2u-game-search');
        const gamesList = document.getElementById('z2u-games-list');

        searchInput.onfocus = () => {
            if (scraperData.games.length > 0) {
                gamesList.style.display = 'block';
                renderGamesList('');
            }
        };

        searchInput.oninput = (e) => {
            const searchTerm = e.target.value;
            if (scraperData.games.length > 0) {
                gamesList.style.display = 'block';
                renderGamesList(searchTerm);
            }
        };

        // 点击外部关闭列表
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !gamesList.contains(e.target)) {
                gamesList.style.display = 'none';
            }
        });
    }

    // 更新页面类型
    function updatePageType() {
        const path = window.location.pathname;
        let type = '其他页面';

        if (path === '/' || path === '/zh-CN' || path === '/zh-CN/') {
            type = '🏠 首页';
        } else if (path.includes('/catalog/')) {
            type = '📂 服务目录页';
        } else if (path.includes('/gamelist')) {
            type = '🎮 游戏列表页';
        } else if (path.includes('/Gold-1-') || path.includes('/gold-1-')) {
            type = '💰 游戏币页面';
        } else if (path.includes('/items-3-') || path.includes('/Items-3-')) {
            type = '🎮 游戏物品页面';
        } else if (path.includes('/accounts-5-') || path.includes('/account-5-') || path.includes('/Accounts-5-') || path.includes('/Account-5-')) {
            type = '👤 游戏账号页面';
        } else if (path.includes('/gift-card-10-') || path.includes('/Gift-Card-10-')) {
            type = '🎁 礼品卡页面';
        } else if (path.includes('/Top-Up-2-') || path.includes('/topup-2-') || path.includes('/top-up-2-')) {
            type = '💳 充值服务页面';
        } else if (path.includes('/boosting-service-4-') || path.includes('/Boosting-service-4-') || path.includes('/boosting-4-') || path.includes('/Boosting-4-')) {
            type = '🚀 代练服务页面';
        } else if (path.includes('/power-leveling-service-6-') || path.includes('/Power-Leveling-service-6-') || path.includes('/power-leveling-6-') || path.includes('/Power-Leveling-6-')) {
            type = '⬆️ 升级服务页面';
        } else if (path.includes('/coaching-service-7-') || path.includes('/Coaching-service-7-') || path.includes('/coaching-7-') || path.includes('/Coaching-7-')) {
            type = '🎓 教学服务页面';
        } else if (path.includes('/offer/')) {
            type = '📦 商品详情页';
        }

        scraperData.pageType = type;
        document.getElementById('z2u-page-type').textContent = type;
        console.log('%c[Z2U抓取器] 页面类型:', 'color: #17A2B8', type);
    }

    // 更新计数
    function updateCounts() {
        document.getElementById('z2u-game-count').textContent = scraperData.games.length;

        // 统计所有服务总数
        let totalServices = 0;
        scraperData.games.forEach(game => {
            if (game.services) {
                totalServices += game.services.length;
            }
        });
        document.getElementById('z2u-service-count').textContent = totalServices;
    }

    // 渲染游戏列表
    function renderGamesList(searchTerm = '') {
        const gamesList = document.getElementById('z2u-games-list');
        gamesList.innerHTML = '';

        // 过滤游戏
        const filtered = scraperData.games.filter(game =>
            game.名称.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filtered.length === 0) {
            gamesList.innerHTML = '<div style="padding: 12px; color: #B0B0B0; text-align: center;">未找到匹配的游戏</div>';
            return;
        }

        filtered.forEach((game, index) => {
            const item = document.createElement('div');
            item.className = 'z2u-game-item';
            item.innerHTML = `
                <span class="z2u-game-name">${game.名称}</span>
                <span class="z2u-game-count">${game.services ? game.services.length : 0}个服务</span>
            `;

            item.onclick = () => {
                onGameSelected(game);
                document.getElementById('z2u-game-search').value = game.名称;
                gamesList.style.display = 'none';

                // 高亮选中的项
                document.querySelectorAll('.z2u-game-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
            };

            gamesList.appendChild(item);
        });
    }

    // 当游戏被选中时
    function onGameSelected(game) {
        if (!game || !game.services || game.services.length === 0) {
            showNotification('⚠️ 该游戏没有可用服务', Z2U_COLORS.warning);
            document.getElementById('z2u-services-container').style.display = 'none';
            document.getElementById('z2u-orders-container').style.display = 'none';
            return;
        }

        scraperData.selectedGame = game;
        scraperData.selectedService = null;

        // 隐藏订单容器
        document.getElementById('z2u-orders-container').style.display = 'none';

        // 显示服务列表
        const servicesContainer = document.getElementById('z2u-services-container');
        const servicesList = document.getElementById('z2u-services-list');
        servicesList.innerHTML = '';

        game.services.forEach((service) => {
            const btn = document.createElement('button');
            btn.className = 'z2u-btn z2u-btn-secondary';
            btn.style.marginBottom = '8px';
            btn.innerHTML = `
                <span>${getServiceIcon(service.type)}</span>
                <span>${service.name}</span>
                <span style="margin-left: auto; color: ${Z2U_COLORS.primary}; font-weight: 700;">(${service.orderCount})</span>
            `;
            btn.onclick = () => {
                onServiceSelected(game, service);
            };
            servicesList.appendChild(btn);
        });

        servicesContainer.style.display = 'block';
        console.log(`%c[Z2U抓取器] 显示游戏 "${game.名称}" 的 ${game.services.length} 个服务`, 'color: #17A2B8; font-weight: bold');
    }

    // 当服务被选中时
    function onServiceSelected(game, service) {
        scraperData.selectedService = service;

        console.log(`%c[Z2U抓取器] 选择服务: ${game.名称} - ${service.name}`, 'color: #17A2B8; font-weight: bold');

        // 打开服务页面并显示订单抓取选项
        window.open(service.url, '_blank');
        showNotification(`🚀 打开: ${game.名称} - ${service.name}`, Z2U_COLORS.success);

        // 显示订单抓取容器
        setTimeout(() => {
            document.getElementById('z2u-orders-container').style.display = 'block';

            // 尝试自动获取订单统计
            fetchOrderStats();
        }, 1000);
    }

    // 获取服务图标
    function getServiceIcon(serviceType) {
        const icons = {
            'Gold': '💰',
            'Currency': '💰',
            'Items': '🎮',
            'Accounts': '👤',
            'Top Up': '💳',
            'Gift Card': '🎁',
            'Boosting': '🚀',
            'Power Leveling': '⬆️',
            'Coaching': '🎓',
            'Service': '🔧'
        };
        return icons[serviceType] || '📋';
    }

    // 显示通知
    function showNotification(message, color = Z2U_COLORS.primary) {
        const notify = document.createElement('div');
        notify.className = 'z2u-notification';
        notify.innerHTML = `<span>${message}</span>`;
        notify.style.background = color;
        document.body.appendChild(notify);

        setTimeout(() => {
            if (notify.parentNode) {
                notify.parentNode.removeChild(notify);
            }
        }, 3000);
    }

    // ==================== 抓取功能 ====================

    // 抓取游戏列表及其服务
    function scrapeGames() {
        console.log('%c[Z2U抓取器] 🎮 开始抓取游戏及服务列表...', 'color: #FF6B35; font-weight: bold; font-size: 14px;');

        const games = [];

        // 查找所有游戏容器 (.az-GameName 的父元素)
        const gameContainers = document.querySelectorAll('.az-GameName');

        if (gameContainers.length === 0) {
            console.log('%c[Z2U抓取器] ⚠️ 未找到游戏列表 (.az-GameName)', 'color: #FFC107; font-weight: bold');
            showNotification('⚠️ 当前页面没有找到游戏列表', Z2U_COLORS.warning);
            return [];
        }

        console.log(`✓ 找到 ${gameContainers.length} 个游戏`);

        // 遍历每个游戏
        gameContainers.forEach((gameNameEl, index) => {
            try {
                // 从 .az-GameName 元素中提取完整游戏名称
                const fullGameName = gameNameEl.textContent.trim();

                // 查找该游戏的服务列表 (同级的 .subCategory)
                const parent = gameNameEl.parentElement;
                const subCategoryList = parent.querySelector('.subCategory');

                if (!subCategoryList) {
                    console.warn(`%c[Z2U抓取器] 游戏 "${fullGameName}" 没有找到 .subCategory`, 'color: #FFC107');
                    return;
                }

                // 提取所有服务
                const services = [];
                const serviceLinks = subCategoryList.querySelectorAll('li a');

                let gameId = '';
                let gameSlug = '';
                let hasNonZeroOrders = false; // 是否有非零订单的服务

                serviceLinks.forEach((link) => {
                    const href = link.href;
                    const text = link.textContent.trim();

                    // 提取订单数 (如 "Gold (197)" -> 197)
                    const orderMatch = text.match(/\((\d+)\)/);
                    const orderCount = orderMatch ? parseInt(orderMatch[1]) : 0;

                    // 如果有任何服务订单数 > 0, 标记为有效游戏
                    if (orderCount > 0) {
                        hasNonZeroOrders = true;
                    }

                    // 提取服务名称 (去掉数字,如 "Gold (197)" -> "Gold")
                    const serviceName = text.replace(/\s*\(\d+\)\s*$/, '').trim();

                    // 从URL提取信息: /game-slug/service-pattern-game-id
                    const match = href.match(/\/([^\/]+)\/([\w-]+)-(\d+)$/);
                    if (match) {
                        gameSlug = match[1];
                        const urlPattern = match[2];
                        gameId = match[3];

                        // 解析服务类型
                        let serviceType = serviceName;

                        // 标准化服务类型
                        if (urlPattern.toLowerCase().includes('gold')) {
                            serviceType = 'Gold';
                        } else if (urlPattern.toLowerCase().includes('items')) {
                            serviceType = 'Items';
                        } else if (urlPattern.toLowerCase().includes('accounts')) {
                            serviceType = 'Accounts';
                        } else if (urlPattern.toLowerCase().includes('top') || urlPattern.toLowerCase().includes('topup')) {
                            serviceType = 'Top Up';
                        } else if (urlPattern.toLowerCase().includes('gift')) {
                            serviceType = 'Gift Card';
                        } else if (urlPattern.toLowerCase().includes('boost')) {
                            serviceType = 'Boosting';
                        } else if (urlPattern.toLowerCase().includes('power')) {
                            serviceType = 'Power Leveling';
                        } else if (urlPattern.toLowerCase().includes('coach')) {
                            serviceType = 'Coaching';
                        }

                        services.push({
                            type: serviceType,
                            name: serviceName,
                            urlPattern: urlPattern,
                            url: href,
                            orderCount: orderCount
                        });
                    }
                });

                // 过滤条件: 必须有游戏ID、slug、服务,且至少有一个服务订单数>0
                if (!gameId || !gameSlug || services.length === 0) {
                    return;
                }

                if (!hasNonZeroOrders) {
                    console.log(`  ⊗ 跳过 ${fullGameName}: 所有服务订单数为0`);
                    return;
                }

                games.push({
                    序号: games.length + 1,
                    id: gameId,
                    名称: fullGameName,
                    slug: gameSlug,
                    services: services,
                    抓取时间: new Date().toISOString()
                });

                console.log(`  ✓ ${fullGameName}: ${services.length} 个服务 (${services.map(s => `${s.name}(${s.orderCount})`).join(', ')})`);

            } catch (e) {
                console.warn('%c[Z2U抓取器] 处理游戏出错:', 'color: #FFC107', e);
            }
        });

        if (games.length > 0) {
            scraperData.games = games;
            scraperData.timestamp = new Date().toISOString();
            scraperData.autoFetched = true;

            // 保存到存储
            saveData();

            updateCounts();

            console.log('%c[Z2U抓取器] ✓ 游戏列表抓取完成', 'color: #28A745; font-weight: bold');
            console.log(`%c找到 ${games.length} 个游戏`, 'color: #17A2B8; font-weight: bold');

            // 统计服务
            let totalServices = 0;
            games.forEach(game => {
                totalServices += game.services.length;
            });

            console.table(games.map(g => ({
                游戏: g.名称,
                ID: g.id,
                Slug: g.slug,
                服务数: g.services.length,
                服务列表: g.services.map(s => s.name).join(', ')
            })));

            showNotification(`✅ 成功抓取 ${games.length} 个游戏, ${totalServices} 个服务!`, Z2U_COLORS.success);
        } else {
            console.log('%c[Z2U抓取器] ⚠️ 未找到有效的游戏数据', 'color: #FFC107; font-weight: bold');
            showNotification('⚠️ 未找到有效的游戏数据', Z2U_COLORS.warning);
        }

        return games;
    }

    // 导出 JSON
    function exportJSON() {
        if (scraperData.orders.length === 0) {
            showNotification('❌ 没有订单数据可导出!', Z2U_COLORS.danger);
            return;
        }

        const exportData = {
            订单列表: scraperData.orders,
            统计: {
                订单总数: scraperData.orders.length,
                导出时间: new Date().toISOString()
            },
            游戏信息: scraperData.selectedGame ? {
                游戏名称: scraperData.selectedGame.名称,
                游戏ID: scraperData.selectedGame.id,
                游戏Slug: scraperData.selectedGame.slug
            } : null,
            服务信息: scraperData.selectedService ? {
                服务名称: scraperData.selectedService.name,
                服务类型: scraperData.selectedService.type,
                服务URL: scraperData.selectedService.url
            } : null
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = scraperData.selectedGame ?
            `z2u_orders_${scraperData.selectedGame.名称}_${Date.now()}.json` :
            `z2u_orders_${Date.now()}.json`;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        console.log('%c[Z2U抓取器] ✓ JSON 导出成功', 'color: #28A745; font-weight: bold');
        showNotification(`✅ 已导出 ${scraperData.orders.length} 个订单!`, Z2U_COLORS.success);
    }

    // 导出 CSV
    function exportCSV() {
        if (scraperData.orders.length === 0) {
            showNotification('❌ 没有订单数据可导出!', Z2U_COLORS.danger);
            return;
        }

        let csv = '';

        // 添加汇总信息
        csv = `=== Z2U 订单数据导出 ===\n`;
        csv += `导出时间,${new Date().toISOString()}\n`;
        csv += `订单总数,${scraperData.orders.length}\n`;

        if (scraperData.selectedGame) {
            csv += `游戏名称,${scraperData.selectedGame.名称}\n`;
            csv += `游戏ID,${scraperData.selectedGame.id}\n`;
        }

        if (scraperData.selectedService) {
            csv += `服务类型,${scraperData.selectedService.name}\n`;
            csv += `服务URL,${scraperData.selectedService.url}\n`;
        }

        csv += '\n';

        // 订单详细列表
        csv += `=== 订单详细列表 ===\n`;
        csv += `序号,标题,链接,交付时间,卖家,卖家等级,价格,抓取时间\n`;

        scraperData.orders.forEach(order => {
            // 处理标题中的引号和逗号
            const safeTitle = order.标题.replace(/"/g, '""');
            const safeSeller = order.卖家.replace(/"/g, '""');

            csv += `${order.序号},"${safeTitle}","${order.链接}","${order.交付时间}","${safeSeller}",${order.卖家等级},"${order.价格}","${order.抓取时间}"\n`;
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = scraperData.selectedGame ?
            `z2u_orders_${scraperData.selectedGame.名称}_${Date.now()}.csv` :
            `z2u_orders_${Date.now()}.csv`;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        console.log('%c[Z2U抓取器] ✓ CSV 导出成功', 'color: #28A745; font-weight: bold');
        showNotification(`✅ CSV 导出成功! ${scraperData.orders.length} 个订单`, Z2U_COLORS.success);
    }

    // 复制数据
    function copyData() {
        if (scraperData.orders.length === 0) {
            showNotification('❌ 没有订单数据可复制!', Z2U_COLORS.danger);
            return;
        }

        const exportData = {
            订单列表: scraperData.orders,
            统计: {
                订单总数: scraperData.orders.length,
                导出时间: new Date().toISOString()
            },
            游戏信息: scraperData.selectedGame ? {
                游戏名称: scraperData.selectedGame.名称,
                游戏ID: scraperData.selectedGame.id
            } : null,
            服务信息: scraperData.selectedService ? {
                服务名称: scraperData.selectedService.name,
                服务类型: scraperData.selectedService.type
            } : null
        };

        const text = JSON.stringify(exportData, null, 2);

        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text);
            showNotification(`✅ 已复制 ${scraperData.orders.length} 个订单到剪贴板!`, Z2U_COLORS.success);
        } else {
            // 备用方法
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showNotification(`✅ 已复制 ${scraperData.orders.length} 个订单到剪贴板!`, Z2U_COLORS.success);
            } catch (e) {
                showNotification('❌ 复制失败，请手动复制!', Z2U_COLORS.danger);
            }
            document.body.removeChild(textarea);
        }
    }

    // 查看数据
    function viewData() {
        if (scraperData.orders.length === 0) {
            showNotification('ℹ️ 暂无订单数据!', Z2U_COLORS.info);
            return;
        }

        console.log('%c╔════════════════════════════════════════╗', 'color: #FF6B35; font-weight: bold; font-size: 14px;');
        console.log('%c║      Z2U 订单抓取器 - 订单数据汇总     ║', 'color: #FF6B35; font-weight: bold; font-size: 14px;');
        console.log('%c╚════════════════════════════════════════╝', 'color: #FF6B35; font-weight: bold; font-size: 14px;');

        console.log('%c📊 统计信息:', 'color: #17A2B8; font-weight: bold; font-size: 13px;');
        console.log('  - 订单总数:', scraperData.orders.length);
        console.log('  - 抓取时间:', new Date().toISOString());

        if (scraperData.selectedGame) {
            console.log('%c\n🎮 游戏信息:', 'color: #28A745; font-weight: bold; font-size: 13px;');
            console.log('  - 游戏名称:', scraperData.selectedGame.名称);
            console.log('  - 游戏ID:', scraperData.selectedGame.id);
            console.log('  - 游戏Slug:', scraperData.selectedGame.slug);
        }

        if (scraperData.selectedService) {
            console.log('%c\n📋 服务信息:', 'color: #17A2B8; font-weight: bold; font-size: 13px;');
            console.log('  - 服务名称:', scraperData.selectedService.name);
            console.log('  - 服务类型:', scraperData.selectedService.type);
            console.log('  - 服务URL:', scraperData.selectedService.url);
            console.log('  - 订单数量:', scraperData.selectedService.orderCount);
        }

        console.log('%c\n📦 订单详细列表:', 'color: #FFC107; font-weight: bold; font-size: 13px;');
        console.log(`共 ${scraperData.orders.length} 个订单`);

        // 显示完整的订单表格
        console.table(scraperData.orders.map(o => ({
            序号: o.序号,
            标题: o.标题.substring(0, 60) + (o.标题.length > 60 ? '...' : ''),
            交付时间: o.交付时间,
            卖家: o.卖家,
            等级: '💎'.repeat(o.卖家等级),
            价格: o.价格
        })));

        // 显示前5个订单的完整信息
        console.log('%c\n� 订单详情 (前5个):', 'color: #28A745; font-weight: bold; font-size: 13px;');
        scraperData.orders.slice(0, 5).forEach((order, index) => {
            console.log(`%c[${order.序号}] ${order.标题}`, 'color: #FF6B35; font-weight: bold;');
            console.log(`    链接: ${order.链接}`);
            console.log(`    交付时间: ${order.交付时间}`);
            console.log(`    卖家: ${order.卖家} (${'💎'.repeat(order.卖家等级)})`);
            console.log(`    价格: ${order.价格}`);
            console.log(`    抓取时间: ${order.抓取时间}`);
        });

        console.log('%c════════════════════════════════════════', 'color: #FF6B35; font-weight: bold;');

        showNotification('✅ 订单数据已输出到控制台 (F12)', Z2U_COLORS.info);
    }

    // 清空数据
    function clearData() {
        if (confirm('⚠️ 确定要清空所有数据吗？此操作不可恢复！')) {
            scraperData.games = [];
            scraperData.orders = [];
            scraperData.timestamp = new Date().toISOString();
            scraperData.selectedGame = null;
            scraperData.selectedService = null;
            scraperData.autoFetched = false;

            // 清空存储
            GM_setValue('z2u_games_data', '');

            updateCounts();
            document.getElementById('z2u-game-search').value = '';
            document.getElementById('z2u-games-list').innerHTML = '';
            document.getElementById('z2u-games-list').style.display = 'none';
            document.getElementById('z2u-services-container').style.display = 'none';
            document.getElementById('z2u-orders-container').style.display = 'none';
            console.log('%c[Z2U抓取器] 🗑️ 数据已清空', 'color: #DC3545; font-weight: bold');
            showNotification('✅ 数据已清空!', Z2U_COLORS.danger);
        }
    }

    // ==================== 订单抓取功能 ====================

    // 获取订单统计信息
    function fetchOrderStats() {
        console.log('%c[Z2U抓取器] 🔍 获取订单统计信息...', 'color: #17A2B8; font-weight: bold');

        // 查找订单统计元素
        const resultsNumber = document.querySelector('.resultsNumber');
        if (!resultsNumber) {
            console.log('%c[Z2U抓取器] ⚠️ 未找到订单统计信息', 'color: #FFC107');
            return;
        }

        // 提取总订单数
        const totalOrdersEl = resultsNumber.querySelector('.to_num');
        const totalOrders = totalOrdersEl ? parseInt(totalOrdersEl.textContent.trim()) : 0;

        // 获取当前页订单数 (实际检测页面中的订单数量)
        const currentPageOrders = scrapeSinglePage().length;

        // 如果有当前页订单数,使用它来计算总页数,否则使用默认20个/页
        const ordersPerPage = currentPageOrders > 0 ? currentPageOrders : 20;
        const totalPages = Math.ceil(totalOrders / ordersPerPage);

        // 更新UI
        document.getElementById('z2u-total-orders').textContent = totalOrders;
        document.getElementById('z2u-total-pages').textContent = totalPages;
        document.getElementById('z2u-current-page-orders').textContent = currentPageOrders;

        console.log(`%c[Z2U抓取器] ✓ 订单统计: ${totalOrders} 个订单, 当前页 ${currentPageOrders} 个, 预计 ${totalPages} 页 (${ordersPerPage}个/页)`, 'color: #28A745; font-weight: bold');
        showNotification(`📊 找到 ${totalOrders} 个订单 (${totalPages} 页)`, Z2U_COLORS.success);
    }

    // 获取当前页码
    function getCurrentPage() {
        const activePage = document.querySelector('.m-style .active');
        if (activePage) {
            return parseInt(activePage.textContent.trim());
        }
        return 1;
    }

    // 抓取单页订单
    function scrapeSinglePage(keyword = '') {
        console.log('%c[Z2U抓取器] 📄 抓取当前页订单...', 'color: #FF6B35; font-weight: bold');
        if (keyword) {
            console.log(`%c[Z2U抓取器] 🔍 筛选关键字: "${keyword}"`, 'color: #FFC107; font-weight: bold');
        }

        const orders = [];

        // 尝试多种选择器查找产品项
        let productItems = document.querySelectorAll('.product-item');

        if (productItems.length === 0) {
            console.log('%c[Z2U抓取器] 尝试其他选择器...', 'color: #FFC107');

            // 尝试通过 productName 链接找到父容器
            const productLinks = document.querySelectorAll('a.productName');
            if (productLinks.length > 0) {
                console.log(`✓ 找到 ${productLinks.length} 个 productName 链接`);

                // 查找这些链接的共同父容器
                const containers = new Set();
                productLinks.forEach(link => {
                    // 向上查找包含所有订单信息的容器
                    let parent = link.parentElement;
                    let maxDepth = 5;
                    while (parent && maxDepth > 0) {
                        // 检查这个父元素是否包含价格和卖家信息
                        if (parent.querySelector('.priceWrap') && parent.querySelector('.userInfo')) {
                            containers.add(parent);
                            break;
                        }
                        parent = parent.parentElement;
                        maxDepth--;
                    }
                });

                productItems = Array.from(containers);
                console.log(`✓ 通过 productName 找到 ${productItems.length} 个产品容器`);
            }
        }

        if (productItems.length === 0) {
            console.log('%c[Z2U抓取器] ⚠️ 未找到产品订单', 'color: #FFC107');
            console.log('%c尝试的选择器: .product-item, a.productName的父容器', 'color: #FFC107');

            // 调试信息
            console.log('页面中的 productName 数量:', document.querySelectorAll('a.productName').length);
            console.log('页面中的 priceWrap 数量:', document.querySelectorAll('.priceWrap').length);
            console.log('页面中的 userInfo 数量:', document.querySelectorAll('.userInfo').length);

            showNotification('⚠️ 当前页面没有找到产品订单', Z2U_COLORS.warning);
            return [];
        }

        console.log(`✓ 找到 ${productItems.length} 个产品订单`);

        productItems.forEach((item, index) => {
            try {
                // 1. 提取链接和标题
                const productNameLink = item.querySelector('a.productName');
                if (!productNameLink) {
                    console.warn(`  ⚠️ 订单 ${index + 1}: 未找到 a.productName`);
                    return;
                }

                const url = productNameLink.href || '';
                const titleEl = productNameLink.querySelector('.title, span.title');

                if (!titleEl) {
                    console.warn(`  ⚠️ 订单 ${index + 1}: 未找到 .title`);
                    // 尝试直接获取链接文本
                    const title = productNameLink.textContent.trim();
                    if (!title) return;
                }

                const title = titleEl ? titleEl.textContent.trim() : productNameLink.textContent.trim();

                // 2. 提取交付时间
                const deliveryTimeEl = item.querySelector('.deliveryTimeLabel');
                const deliveryTime = deliveryTimeEl ? deliveryTimeEl.textContent.trim() : '';

                // 3. 提取卖家信息
                const userInfoEl = item.querySelector('.userInfo');
                let sellerName = '';
                let sellerLevel = 0;

                if (userInfoEl) {
                    const nameEl = userInfoEl.querySelector('.name');
                    sellerName = nameEl ? nameEl.textContent.trim() : '';

                    // 计算卖家等级 (钻石图标数量)
                    const levelIcons = userInfoEl.querySelectorAll('.imgboxdengji');
                    sellerLevel = levelIcons.length;
                } else {
                    console.warn(`  ⚠️ 订单 ${index + 1}: 未找到 .userInfo`);
                }

                // 4. 提取价格
                const priceWrapEl = item.querySelector('.priceWrap');
                let price = '';

                if (priceWrapEl) {
                    const priceTxtEl = priceWrapEl.querySelector('.priceTxt');
                    price = priceTxtEl ? priceTxtEl.textContent.trim() : '';
                } else {
                    console.warn(`  ⚠️ 订单 ${index + 1}: 未找到 .priceWrap`);
                }

                // 只添加有效订单 (至少要有链接和标题)
                if (url && title) {
                    // 如果设置了关键字筛选,检查标题是否包含关键字
                    if (keyword && !title.toLowerCase().includes(keyword.toLowerCase())) {
                        console.log(`  ⊗ [跳过] ${title.substring(0, 50)}... (不包含关键字: ${keyword})`);
                        return;
                    }

                    orders.push({
                        序号: orders.length + 1,
                        标题: title,
                        链接: url,
                        交付时间: deliveryTime,
                        卖家: sellerName,
                        卖家等级: sellerLevel,
                        价格: price,
                        抓取时间: new Date().toISOString()
                    });

                    const keywordTag = keyword ? ` [匹配: ${keyword}]` : '';
                    console.log(`  ✓ [${orders.length}] ${title.substring(0, 50)}... - ${price || '无价格'}${keywordTag}`);
                } else {
                    console.warn(`  ⊗ 订单 ${index + 1}: 缺少必要信息 (url: ${!!url}, title: ${!!title})`);
                }

            } catch (e) {
                console.error('%c[Z2U抓取器] 处理订单出错:', 'color: #DC3545', e);
                console.error('错误的元素:', item);
            }
        });

        console.log(`%c[Z2U抓取器] ✓ 单页抓取完成: ${orders.length} 个订单`, 'color: #28A745; font-weight: bold');
        return orders;
    }

    // 翻页函数
    async function gotoPage(pageNum) {
        console.log(`%c[Z2U抓取器] 📖 翻页到第 ${pageNum} 页...`, 'color: #17A2B8; font-weight: bold');

        return new Promise((resolve, reject) => {
            try {
                // 查找翻页按钮
                const pageLinks = document.querySelectorAll('.m-style a[data-page]');
                let targetLink = null;

                pageLinks.forEach(link => {
                    if (parseInt(link.getAttribute('data-page')) === pageNum) {
                        targetLink = link;
                    }
                });

                if (targetLink) {
                    // 点击翻页
                    targetLink.click();

                    // 等待页面加载
                    setTimeout(() => {
                        console.log(`%c[Z2U抓取器] ✓ 已翻到第 ${pageNum} 页`, 'color: #28A745');
                        resolve();
                    }, 2000);
                } else {
                    // 使用输入框翻页
                    const jumpInput = document.querySelector('.m-style .jump-ipt');
                    const jumpBtn = document.querySelector('.m-style .jump-btn');

                    if (jumpInput && jumpBtn) {
                        jumpInput.value = pageNum;
                        jumpBtn.click();

                        setTimeout(() => {
                            console.log(`%c[Z2U抓取器] ✓ 已翻到第 ${pageNum} 页 (输入框)`, 'color: #28A745');
                            resolve();
                        }, 2000);
                    } else {
                        // 使用 pagechange 函数
                        if (typeof window.pagechange === 'function') {
                            window.pagechange(pageNum);
                            setTimeout(() => {
                                console.log(`%c[Z2U抓取器] ✓ 已翻到第 ${pageNum} 页 (函数)`, 'color: #28A745');
                                resolve();
                            }, 2000);
                        } else {
                            reject(new Error('无法找到翻页方法'));
                        }
                    }
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    // 开始抓取订单
    async function startScrapeOrders() {
        const mode = document.getElementById('z2u-scrape-mode').value;
        const totalPagesEl = document.getElementById('z2u-total-pages');
        const totalPages = parseInt(totalPagesEl.textContent);
        const keyword = document.getElementById('z2u-order-keyword').value.trim();

        if (totalPages === 0) {
            showNotification('⚠️ 请先选择游戏服务', Z2U_COLORS.warning);
            return;
        }

        console.log('%c[Z2U抓取器] 🚀 开始抓取订单...', 'color: #FF6B35; font-weight: bold; font-size: 14px;');
        console.log(`模式: ${mode}`);
        if (keyword) {
            console.log(`%c🔍 关键字筛选: "${keyword}"`, 'color: #FFC107; font-weight: bold');
        }

        // 显示进度条
        document.getElementById('z2u-scrape-progress').style.display = 'block';
        document.getElementById('z2u-scraped-stats').style.display = 'none';

        const allOrders = [];
        let pagesToScrape = [];

        if (mode === 'single') {
            // 单页抓取
            pagesToScrape = [getCurrentPage()];
        } else if (mode === 'multiple') {
            // 多页抓取
            const pagesCount = parseInt(document.getElementById('z2u-pages-count').value) || 5;
            const currentPage = getCurrentPage();
            const maxPage = Math.min(currentPage + pagesCount - 1, totalPages);

            for (let i = currentPage; i <= maxPage; i++) {
                pagesToScrape.push(i);
            }
        } else if (mode === 'all') {
            // 全部抓取
            for (let i = 1; i <= totalPages; i++) {
                pagesToScrape.push(i);
            }
        }

        console.log(`将抓取 ${pagesToScrape.length} 个页面: ${pagesToScrape.join(', ')}`);

        // 抓取每一页
        for (let i = 0; i < pagesToScrape.length; i++) {
            const pageNum = pagesToScrape[i];

            // 更新进度
            const progress = Math.round((i / pagesToScrape.length) * 100);
            document.getElementById('z2u-progress-bar').style.width = progress + '%';
            document.getElementById('z2u-progress-text').textContent = `${progress}% (第 ${i + 1}/${pagesToScrape.length} 页)`;
            document.getElementById('z2u-current-page').textContent = pageNum;

            // 如果不是当前页,需要翻页
            if (pageNum !== getCurrentPage()) {
                try {
                    await gotoPage(pageNum);
                } catch (e) {
                    console.error(`%c[Z2U抓取器] 翻页失败:`, 'color: #DC3545', e);
                    showNotification(`❌ 翻页到第 ${pageNum} 页失败`, Z2U_COLORS.danger);
                    continue;
                }
            }

            // 抓取当前页 (传入关键字)
            const pageOrders = scrapeSinglePage(keyword);
            allOrders.push(...pageOrders);

            // 更新当前页订单数显示
            document.getElementById('z2u-current-page-orders').textContent = pageOrders.length;

            // 等待一下,避免请求过快
            if (i < pagesToScrape.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // 更新进度为100%
        document.getElementById('z2u-progress-bar').style.width = '100%';
        document.getElementById('z2u-progress-text').textContent = '100% (完成)';

        // 保存订单数据
        scraperData.orders = allOrders;

        // 显示统计
        document.getElementById('z2u-scraped-stats').style.display = 'block';
        document.getElementById('z2u-scraped-count').textContent = `${allOrders.length} 个订单`;

        console.log('%c[Z2U抓取器] ✅ 订单抓取完成!', 'color: #28A745; font-weight: bold; font-size: 14px;');
        console.log(`共抓取 ${allOrders.length} 个订单`);
        if (keyword) {
            console.log(`%c🔍 关键字筛选: "${keyword}"`, 'color: #FFC107; font-weight: bold');
        }
        console.table(allOrders.slice(0, 10));

        const keywordMsg = keyword ? ` (关键字: ${keyword})` : '';
        showNotification(`✅ 成功抓取 ${allOrders.length} 个订单!${keywordMsg}`, Z2U_COLORS.success);
    }

    // ==================== 初始化 ====================

    function init() {
        console.log('%c[Z2U抓取器] 🚀 初始化开始...', 'color: #FF6B35; font-weight: bold; font-size: 14px;');

        // 检测 Cloudflare 验证页面
        if (checkForCloudflare()) {
            console.log('%c[Z2U-CF] 🛡️ 检测到 Cloudflare 验证,准备处理...', 'color: #FFC107; font-weight: bold');
            setTimeout(() => {
                handleCloudflareTurnstile();
            }, 2000);
        }

        // 加载已保存的数据
        const hasData = loadData();

        createPanel();

        // 如果有数据,更新显示
        if (hasData) {
            updateCounts();
            showNotification(`✅ 已加载 ${scraperData.games.length} 个游戏`, Z2U_COLORS.success);
        }

        // 检查是否需要自动抓取游戏列表
        if (!hasData && !scraperData.autoFetched) {
            // 如果不在英文游戏列表页面,则跳转到英文页面
            if (!window.location.href.includes('/gamelist.html')) {
                console.log('%c[Z2U抓取器] 🌐 重定向到英文游戏列表页...', 'color: #17A2B8; font-weight: bold');
                showNotification('🌐 正在跳转到游戏列表页...', Z2U_COLORS.info);
                setTimeout(() => {
                    window.location.href = 'https://www.z2u.com/gamelist.html';
                }, 1500);
                return;
            }

            const gameContainers = document.querySelectorAll('.az-GameName');
            if (gameContainers.length > 0) {
                console.log('%c[Z2U抓取器] 🤖 检测到游戏列表,开始自动抓取...', 'color: #17A2B8; font-weight: bold');
                setTimeout(() => {
                    scrapeGames();
                }, 1000);
            }
        }

        // 检查是否在服务页面,自动获取订单统计
        setTimeout(() => {
            const resultsNumber = document.querySelector('.resultsNumber');
            if (resultsNumber) {
                console.log('%c[Z2U抓取器] 🤖 检测到服务页面,获取订单统计...', 'color: #17A2B8; font-weight: bold');
                document.getElementById('z2u-orders-container').style.display = 'block';
                fetchOrderStats();

                // 更新当前页码显示
                const currentPage = getCurrentPage();
                document.getElementById('z2u-current-page').textContent = currentPage;
            }
        }, 2000);

        // 全局访问接口
        window.Z2U_Scraper = {
            version: '7.4.1',
            scrapeGames,
            startScrapeOrders,
            scrapeSinglePage,
            fetchOrderStats,
            exportJSON,
            exportCSV,
            viewData,
            clearData,
            updatePageType,
            loadData,
            saveData,
            data: scraperData,
            // Cloudflare 验证
            cf: {
                check: checkForCloudflare,
                handle: handleCloudflareTurnstile,
                config: showCfConfig,
                extractSitekey: extractSitekey
            },
            // 调试工具
            debug: {
                // 显示页面中的关键元素数量
                checkElements: () => {
                    console.log('%c=== Z2U 页面元素检查 ===', 'color: #FF6B35; font-weight: bold');
                    console.log('productName 链接:', document.querySelectorAll('a.productName').length);
                    console.log('title 元素:', document.querySelectorAll('.title').length);
                    console.log('priceWrap 元素:', document.querySelectorAll('.priceWrap').length);
                    console.log('priceTxt 元素:', document.querySelectorAll('.priceTxt').length);
                    console.log('userInfo 元素:', document.querySelectorAll('.userInfo').length);
                    console.log('deliveryTimeLabel 元素:', document.querySelectorAll('.deliveryTimeLabel').length);
                    console.log('resultsNumber 元素:', document.querySelectorAll('.resultsNumber').length);

                    // 显示第一个产品的结构
                    const firstProduct = document.querySelector('a.productName');
                    if (firstProduct) {
                        console.log('%c第一个产品元素:', 'color: #17A2B8; font-weight: bold');
                        console.log(firstProduct.parentElement);
                        console.log('父容器 HTML:', firstProduct.parentElement.outerHTML.substring(0, 500));
                    }
                },
                // 测试抓取第一个订单
                testFirst: () => {
                    const link = document.querySelector('a.productName');
                    if (!link) {
                        console.error('未找到任何 a.productName 元素');
                        return;
                    }

                    console.log('%c=== 测试第一个订单 ===', 'color: #FF6B35; font-weight: bold');

                    let parent = link.parentElement;
                    let depth = 0;
                    while (parent && depth < 5) {
                        console.log(`深度 ${depth}:`, parent.className);

                        const hasPrice = parent.querySelector('.priceWrap');
                        const hasUser = parent.querySelector('.userInfo');
                        const hasDelivery = parent.querySelector('.deliveryTimeLabel');

                        console.log(`  - 价格: ${!!hasPrice}, 卖家: ${!!hasUser}, 交付: ${!!hasDelivery}`);

                        if (hasPrice && hasUser) {
                            console.log('%c找到完整容器!', 'color: #28A745; font-weight: bold');
                            console.log('容器元素:', parent);
                            break;
                        }

                        parent = parent.parentElement;
                        depth++;
                    }
                }
            }
        };

        // 监听动态 Cloudflare 验证页面
        const cfObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    if (checkForCloudflare()) {
                        console.log('%c[Z2U-CF] 🛡️ 动态检测到 Cloudflare 验证', 'color: #FFC107; font-weight: bold');
                        cfObserver.disconnect();
                        setTimeout(() => {
                            handleCloudflareTurnstile();
                        }, 2000);
                        break;
                    }
                }
            }
        });

        cfObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('%c[Z2U抓取器] ✓ 初始化完成!', 'color: #28A745; font-weight: bold; font-size: 14px;');
        console.log('%c提示: 可在控制台使用 window.Z2U_Scraper 访问所有功能', 'color: #17A2B8;');
    }

    // 启动 - 优先检查 CF 页面
    function startup() {
        console.log('%c[Z2U抓取器] 🔍 检查页面状态...', 'color: #17A2B8');
        
        // 等待 body 加载
        if (!document.body) {
            console.log('%c[Z2U抓取器] ⏳ 等待 body 元素...', 'color: #FFC107');
            setTimeout(startup, 100);
            return;
        }
        
        // 优先检查是否为 CF 验证页面
        const isCFPage = window.location.href.includes('challenges.cloudflare.com') ||
                        document.title.toLowerCase().includes('just a moment') ||
                        document.title.includes('请稍候') ||
                        checkForCloudflare();
        
        if (isCFPage) {
            console.log('%c[Z2U-CF] 🛡️ 检测到 Cloudflare 验证页面，启动 CF 处理模块', 'color: #FFC107; font-weight: bold');
            console.log('%c[Z2U-CF] 📍 页面URL:', 'color: #17A2B8', window.location.href);
            console.log('%c[Z2U-CF] 📄 页面标题:', 'color: #17A2B8', document.title);
            
            // 等待页面元素完全加载
            let waitCount = 0;
            const waitForElements = setInterval(() => {
                waitCount++;
                console.log(`%c[Z2U-CF] ⏳ 等待页面元素加载... (${waitCount}/5)`, 'color: #FFC107');
                
                // 检查关键元素是否存在
                const hasElements = document.querySelector('[data-sitekey]') || 
                                   document.querySelector('input[type="checkbox"]') ||
                                   document.querySelector('.cf-turnstile') ||
                                   document.querySelector('script[src*="challenge-platform"]');
                
                if (hasElements || waitCount >= 5) {
                    clearInterval(waitForElements);
                    console.log('%c[Z2U-CF] ✓ 页面元素已加载，开始处理验证', 'color: #28A745; font-weight: bold');
                    
                    if (typeof handleCloudflareTurnstile === 'function') {
                        handleCloudflareTurnstile();
                    } else {
                        console.error('%c[Z2U-CF] ✗ handleCloudflareTurnstile 函数未定义！', 'color: #DC3545; font-weight: bold');
                    }
                }
            }, 500);
        } else {
            console.log('%c[Z2U抓取器] ✓ 正常页面，加载完整功能', 'color: #28A745');
            init();
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startup);
    } else {
        setTimeout(startup, 100);
    }

})();

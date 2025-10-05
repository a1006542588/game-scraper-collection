// ==UserScript==
// @name         PlayerAuctions 商品爬取工具
// @name:en      PlayerAuctions Game Scraper
// @namespace    https://github.com/a1006542588/pa-game-scraper
// @version      8.7.0
// @description  PlayerAuctions 游戏商品数据爬取工具，支持多游戏多服务类型，智能分页，URL去重，Cloudflare验证，一键导出CSV/JSON
// @description:en Advanced scraper for PlayerAuctions - Multi-game support, smart pagination, URL deduplication, Cloudflare verification, CSV/JSON export
// @author       a1006542588
// @license      MIT
// @homepage     https://github.com/a1006542588/pa-game-scraper
// @supportURL   https://github.com/a1006542588/pa-game-scraper/issues
// @match        https://www.playerauctions.com/*
// @match        http://www.playerauctions.com/*
// @icon         https://www.playerauctions.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      playerauctions.com
// @connect      api.yescaptcha.com
// @run-at       document-end
// @compatible   chrome 最新版
// @compatible   firefox 最新版
// @compatible   edge 最新版
// ==/UserScript==

(function() {
    'use strict';

    // YesCaptcha 配置
    const YESCAPTCHA_CONFIG = {
        clientKey: 'e355c8cfd6070fdbd8f94b1c65e5bf063a0f941d47380',
        apiUrl: 'https://api.yescaptcha.com',
        checkInterval: 3000, // 检查间隔（毫秒）
        maxAttempts: 40 // 最大尝试次数（40 * 3秒 = 2分钟）
    };

    // 添加主面板样式(包含 Cloudflare 集成状态区) - PlayerAuctions 官方风格
    GM_addStyle(`
        /* 主面板样式 - PA 深色主题 */
        #pa-scraper-panel {
            position: fixed;
            top: 0;
            right: 0;
            width: 360px;
            height: 100vh;
            background: #1a1d29;
            box-shadow: -4px 0 20px rgba(0,0,0,0.5);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 13px;
            overflow-y: auto;
            transition: transform 0.3s ease;
            color: #e0e0e0;
        }
        
        #pa-scraper-panel.collapsed {
            transform: translateX(320px);
        }
        
        #pa-scraper-panel.minimized .pa-panel-content {
            display: none;
        }
        
        /* 滚动条样式 */
        #pa-scraper-panel::-webkit-scrollbar {
            width: 8px;
        }
        
        #pa-scraper-panel::-webkit-scrollbar-track {
            background: #0f1117;
        }
        
        #pa-scraper-panel::-webkit-scrollbar-thumb {
            background: #2d3142;
            border-radius: 4px;
        }
        
        #pa-scraper-panel::-webkit-scrollbar-thumb:hover {
            background: #3d4152;
        }
        
        .pa-toggle-btn {
            position: absolute;
            left: -35px;
            top: 50%;
            transform: translateY(-50%);
            width: 35px;
            height: 70px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px 0 0 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: -3px 0 10px rgba(0,0,0,0.4);
            transition: all 0.3s;
        }
        
        .pa-toggle-btn:hover {
            background: linear-gradient(135deg, #5568d3 0%, #6a3e8f 100%);
            left: -38px;
        }
        
        #pa-scraper-panel h3 {
            margin: 0;
            padding: 12px 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            font-size: 15px;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 1;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        .pa-close-btn, .pa-minimize-btn {
            cursor: pointer;
            padding: 0 6px;
            font-size: 18px;
            font-weight: bold;
            transition: all 0.2s;
            opacity: 0.9;
        }
        
        .pa-close-btn:hover, .pa-minimize-btn:hover {
            transform: scale(1.2);
            opacity: 1;
        }
        
        .pa-panel-content {
            padding: 10px;
            background: #1a1d29;
        }
        
        /* 信息卡片样式 - 紧凑版 */
        .pa-info-box {
            background: #242736;
            padding: 8px 10px;
            border-radius: 6px;
            margin-bottom: 8px;
            font-size: 11px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            border-left: 3px solid #667eea;
        }
        
        .pa-info-box strong {
            color: #ffffff;
            font-weight: 600;
        }
        
        .pa-info-box span {
            color: #b8b8b8;
        }
        
        .pa-section-divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #2d3142, transparent);
            margin: 12px 0;
        }
        
        #pa-scraper-panel label {
            display: block;
            margin-top: 8px;
            margin-bottom: 4px;
            font-weight: 600;
            color: #e0e0e0;
            font-size: 11px;
        }
        
        #pa-scraper-panel input[type="text"],
        #pa-scraper-panel input[type="number"],
        #pa-scraper-panel select {
            width: 100%;
            padding: 7px 10px;
            border: 1px solid #2d3142;
            border-radius: 5px;
            box-sizing: border-box;
            font-size: 11px;
            background: #242736;
            transition: all 0.3s;
            color: #e0e0e0;
        }
        
        #pa-scraper-panel input[type="text"]:focus,
        #pa-scraper-panel input[type="number"]:focus,
        #pa-scraper-panel select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
            background: #2d3142;
        }
        
        #pa-scraper-panel button {
            width: 100%;
            padding: 8px 12px;
            margin-top: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.3s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        #pa-scraper-panel button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            background: linear-gradient(135deg, #5568d3 0%, #6a3e8f 100%);
        }
        
        #pa-scraper-panel button:active:not(:disabled) {
            transform: translateY(0);
        }
        
        #pa-scraper-panel button:disabled {
            background: #3d4152;
            cursor: not-allowed;
            box-shadow: none;
            opacity: 0.5;
        }
        
        .pa-button-group {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
            margin-top: 8px;
        }
        
        .pa-button-group button {
            margin-top: 0;
            font-size: 10px;
            padding: 7px 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        #pa-scraper-progress {
            margin-top: 10px;
            padding: 8px 10px;
            background: #242736;
            border: 1px solid #2d3142;
            border-left: 3px solid #667eea;
            border-radius: 6px;
            font-size: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        #pa-scraper-progress div {
            margin: 3px 0;
            color: #e0e0e0;
        }
        
        #pa-scraper-progress strong {
            color: #ffffff;
            font-weight: 600;
        }
        
        #pa-scraper-log {
            margin-top: 10px;
            max-height: 100px;
            overflow-y: auto;
            padding: 8px;
            background: #242736;
            border: 1px solid #2d3142;
            border-radius: 6px;
            font-size: 10px;
            font-family: 'Consolas', 'Monaco', monospace;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .pa-log-item {
            margin: 2px 0;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            line-height: 1.3;
        }
        
        .pa-log-item.success {
            color: #a8e6a1;
            background: #1e4620;
            border-left: 3px solid #28a745;
        }
        
        .pa-log-item.error {
            color: #f8b4b4;
            background: #4a1c1c;
            border-left: 3px solid #dc3545;
        }
        
        .pa-log-item.warning {
            color: #ffd89b;
            background: #4a3c1c;
            border-left: 3px solid #ffc107;
        }
        
        .pa-log-item.info {
            color: #a8d5ff;
            background: #1c2d4a;
            border-left: 3px solid #667eea;
        }
        
        #pa-data-preview {
            margin-top: 8px;
            max-height: 120px;
            overflow-y: auto;
            border: 1px solid #2d3142;
            border-radius: 6px;
            background: #242736;
            padding: 8px 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        #pa-data-preview strong {
            font-size: 10px;
            color: #ffffff;
            font-weight: 600;
            display: block;
            margin-bottom: 6px;
        }
        
        #pa-preview-content {
            font-size: 9px;
        }
        
        .pa-preview-item {
            padding: 5px 8px;
            border-bottom: 1px solid #2d3142;
            transition: all 0.2s;
            color: #b8b8b8;
            background: #242736;
            line-height: 1.4;
        }
        
        .pa-preview-item:hover {
            background: #2d3142;
            color: #e0e0e0;
        }
        
        .pa-preview-item:last-child {
            border-bottom: none;
        }
        
        /* 游戏选择器样式 - 紧凑版 */
        .pa-game-selector {
            position: relative;
            margin-bottom: 8px;
        }
        
        .pa-game-selector-input {
            cursor: pointer;
        }
        
        .pa-game-selector-dropdown {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #242736;
            border: 1px solid #2d3142;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
            margin-top: 4px;
        }
        
        .pa-game-selector-dropdown.active {
            display: block;
        }
        
        .pa-game-quick-filters {
            display: flex;
            gap: 4px;
            padding: 6px;
            border-bottom: 1px solid #2d3142;
            flex-wrap: wrap;
            background: #1a1d29;
        }
        
        .pa-quick-filter-btn {
            padding: 3px 8px;
            background: #2d3142;
            border: 1px solid #3d4152;
            border-radius: 3px;
            cursor: pointer;
            font-size: 9px;
            transition: all 0.2s;
            color: #b8b8b8;
        }
        
        .pa-quick-filter-btn:hover {
            background: #3d4152;
            color: #e0e0e0;
        }
        
        .pa-quick-filter-btn.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            border-color: transparent;
        }
        
        .pa-game-list {
            max-height: 250px;
            overflow-y: auto;
        }
        
        .pa-game-item {
            padding: 6px 8px;
            cursor: pointer;
            border-bottom: 1px solid #2d3142;
            transition: all 0.2s;
            background: #242736;
        }
        
        .pa-game-item:hover {
            background: #2d3142;
        }
        
        .pa-game-item.selected {
            background: rgba(102, 126, 234, 0.2);
            border-left: 3px solid #667eea;
        }
        
        .pa-game-item.selected .pa-game-item-name {
            color: #a8b5ff;
        }
        
        .pa-game-item-name {
            font-weight: 600;
            font-size: 10px;
            margin-bottom: 2px;
            color: #e0e0e0;
        }
        
        .pa-game-item-services {
            font-size: 9px;
            color: #b8b8b8;
        }
        
        .pa-game-item-badge {
            display: inline-block;
            padding: 1px 4px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            border-radius: 2px;
            font-size: 8px;
            margin-left: 4px;
            font-weight: 600;
        }
        
        .pa-detect-btn {
            background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%) !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
            margin-bottom: 8px;
            font-size: 11px !important;
            padding: 7px 10px !important;
        }
        
        .pa-detect-btn:hover {
            background: linear-gradient(135deg, #389e0d 0%, #237804 100%) !important;
            box-shadow: 0 4px 12px rgba(82, 196, 26, 0.4) !important;
        }
        
        .pa-keyword-section {
            margin: 10px 0;
            padding: 8px 10px;
            background: #2d2a1f;
            border-radius: 6px;
            border: 1px solid #4a4520;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .pa-keyword-section h4 {
            margin: 0 0 6px 0;
            font-size: 11px;
            color: #ffd666;
            font-weight: 600;
        }
        
        .pa-keyword-input {
            background: #242736 !important;
            font-size: 11px !important;
            padding: 6px 8px !important;
            color: #e0e0e0 !important;
            border-color: #2d3142 !important;
        }
        
        .pa-keyword-help {
            font-size: 9px;
            color: #b8b8b8;
            margin-top: 4px;
        }
        
        /* 调整页面布局 */
        body.pa-panel-active {
            margin-right: 360px;
        }
        
        body.pa-panel-collapsed {
            margin-right: 40px;
        }
        
        /* Cloudflare 状态区域 - 紧凑版 (位于底部) */
        .pa-cf-status-section {
            background: #242736;
            padding: 0;
            border-radius: 8px;
            margin-top: 12px;
            display: block;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            border: 1px solid #2d3142;
            overflow: hidden;
        }
        
        .pa-cf-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 8px 10px;
            font-size: 11px;
            font-weight: 600;
            background: #1a1d29;
            border-bottom: 1px solid #2d3142;
        }
        
        .pa-cf-header-left {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .pa-cf-status-icon {
            font-size: 14px;
            display: inline-block;
        }
        
        .pa-cf-header span:not(.pa-cf-status-icon) {
            color: #e0e0e0;
        }
        
        /* 状态指示器 */
        .pa-cf-status-badge {
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: 600;
            background: #28a745;
            color: #ffffff;
        }
        
        .pa-cf-status-section.checking .pa-cf-status-badge {
            background: #ffc107;
            color: #000000;
        }
        
        .pa-cf-status-section.error .pa-cf-status-badge {
            background: #dc3545;
            color: #ffffff;
        }
        
        .pa-cf-status-section.checking .pa-cf-status-icon {
            animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
        }
        
        /* 根据状态改变图标 */
        .pa-cf-status-section .pa-cf-status-icon::before {
            content: '✅';
        }
        
        .pa-cf-status-section.checking .pa-cf-status-icon::before {
            content: '🔄';
        }
        
        .pa-cf-status-section.error .pa-cf-status-icon::before {
            content: '❌';
        }
        
        .pa-cf-status-content {
            padding: 8px 10px;
            background: #242736;
        }
        
        .pa-cf-status-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 5px 0;
            padding: 4px 0;
            border-bottom: 1px solid #2d3142;
        }
        
        .pa-cf-status-item:last-child {
            border-bottom: none;
        }
        
        .pa-cf-status-item label {
            color: #b8b8b8;
            font-size: 10px;
            font-weight: 500;
        }
        
        .pa-cf-status-item value {
            color: #e0e0e0;
            font-weight: 600;
            font-size: 10px;
            text-align: right;
            max-width: 60%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .pa-cf-progress-bar {
            width: 100%;
            height: 4px;
            background: #2d3142;
            border-radius: 4px;
            margin: 8px 0;
            overflow: hidden;
        }
        
        .pa-cf-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            border-radius: 4px;
            transition: width 0.5s ease;
            animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
            0% { opacity: 0.8; }
            50% { opacity: 1; }
            100% { opacity: 0.8; }
        }
        
        .pa-cf-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 6px;
            padding: 8px 10px;
            background: #1a1d29;
            border-top: 1px solid #2d3142;
        }
        
        .pa-cf-button {
            padding: 6px 8px;
            background: #2d3142;
            color: #b8b8b8;
            border: 1px solid #3d4152;
            border-radius: 5px;
            cursor: pointer;
            font-size: 10px;
            font-weight: 600;
            transition: all 0.3s;
        }
        
        .pa-cf-button:hover:not(:disabled) {
            background: #3d4152;
            border-color: #4d5162;
            color: #e0e0e0;
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .pa-cf-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .pa-cf-button.primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            border-color: transparent;
        }
        
        .pa-cf-button.primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #5568d3 0%, #6a3e8f 100%);
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(102, 126, 234, 0.4);
        }
        
        .pa-cf-log {
            max-height: 60px;
            overflow-y: auto;
            margin: 8px 0 0 0;
            padding: 6px 8px;
            background: #1a1d29;
            border: 1px solid #2d3142;
            border-radius: 5px;
            font-size: 9px;
            font-family: 'Consolas', 'Monaco', monospace;
            color: #b8b8b8;
        }
        
        .pa-cf-log::-webkit-scrollbar {
            width: 4px;
        }
        
        .pa-cf-log::-webkit-scrollbar-track {
            background: #0f1117;
        }
        
        .pa-cf-log::-webkit-scrollbar-thumb {
            background: #2d3142;
            border-radius: 2px;
        }
        
        .pa-cf-log-item {
            margin: 2px 0;
            padding: 3px 6px;
            border-radius: 3px;
            line-height: 1.3;
        }
        
        .pa-cf-log-item.error {
            color: #f8b4b4;
            background: #4a1c1c;
        }
        
        .pa-cf-log-item.success {
            color: #a8e6a1;
            background: #1e4620;
        }
        
        .pa-cf-log-item.info {
            color: #a8d5ff;
            background: #1c2d4a;
        }
    `);

    // 显示 Cloudflare 状态区(集成在主面板内)
    function showCloudflareStatus() {
        const cfSection = document.getElementById('pa-cf-status-section');
        if (cfSection) {
            cfSection.classList.add('active');
            console.log('%c[PA爬取工具] Cloudflare 状态区已显示', 'color: #667eea; font-weight: bold');
        } else {
            console.warn('[PA爬取工具] 未找到 Cloudflare 状态区元素');
        }
    }
    
    // 隐藏 Cloudflare 状态区
    function hideCloudflareStatus() {
        const cfSection = document.getElementById('pa-cf-status-section');
        if (cfSection) {
            cfSection.classList.remove('active');
            console.log('%c[PA爬取工具] Cloudflare 状态区已隐藏', 'color: #999');
        }
    }

    // 添加 Cloudflare 日志
    function addCfLog(message, type = 'info') {
        const logContainer = document.getElementById('pa-cf-log');
        if (!logContainer) return;
        
        const logItem = document.createElement('div');
        logItem.className = `pa-cf-log-item ${type}`;
        const time = new Date().toLocaleTimeString();
        logItem.textContent = `[${time}] ${message}`;
        
        logContainer.insertBefore(logItem, logContainer.firstChild);
        
        // 限制日志数量
        while (logContainer.children.length > 10) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }

    // 更新进度条
    function updateCfProgress(percent, statusText) {
        const progressBar = document.getElementById('pa-cf-progress');
        const progressText = document.getElementById('pa-cf-progress-text');
        const statusElement = document.getElementById('pa-cf-status');
        const cfSection = document.getElementById('pa-cf-status-section');
        
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        if (progressText) {
            progressText.textContent = `${percent}%`;
        }
        if (statusElement && statusText) {
            statusElement.textContent = statusText;
        }
        
        // 根据状态文本更新样式
        if (cfSection) {
            cfSection.classList.remove('checking', 'verified', 'error');
            if (statusText.includes('✅') || statusText.includes('完成') || statusText.includes('成功')) {
                cfSection.classList.add('verified');
            } else if (statusText.includes('❌') || statusText.includes('失败') || statusText.includes('错误')) {
                cfSection.classList.add('error');
            } else {
                cfSection.classList.add('checking');
            }
        }
    }

    // 全局变量
    let isScrapingActive = false;
    let currentScrapingPage = 1;
    let totalPagesToScrape = 1;
    let gamesDatabase = {}; // 存储所有游戏及其服务类型
    let selectedGameKey = null; // 当前选中的游戏
    
    // 服务类型映射
    const SERVICE_TYPE_MAP = {
        'gold': 'Gold/Currency',
        'items': 'Items',
        'account': 'Accounts',
        'accounts': 'Accounts',
        'power-leveling': 'Power Leveling',
        'leveling': 'Power Leveling',      // 映射 leveling → power-leveling
        'boosting': 'Power Leveling',      // 映射 boosting → power-leveling
        'currency': 'Currency',
        'coins': 'Coins',
        'points': 'Points',
        'platinum': 'Platinum',
        'silver': 'Silver',
        'gems': 'Gems',
        'bells': 'Bells',
        'kinah': 'Kinah',
        'money': 'Money',
        'auec': 'aUEC',
        'pokécoins': 'Pokécoins',
        'credits': 'Credits',
        'tekniq-alloy': 'Tekniq Alloy'
    };

    // 🔧 服务类型规范化函数 - 统一将 leveling/boosting 映射为 power-leveling
    function normalizeServiceType(service) {
        if (!service) return service;
        
        const normalized = service.toLowerCase().trim();
        
        // leveling 和 boosting 统一映射为 power-leveling
        if (normalized === 'leveling' || normalized === 'boosting') {
            console.log(`🔄 服务类型规范化: ${service} → power-leveling`);
            return 'power-leveling';
        }
        
        // accounts 映射为 account (统一单数形式)
        if (normalized === 'accounts') {
            return 'account';
        }
        
        return normalized;
    }

    // 从页面自动获取游戏列表
    function fetchGamesFromPage() {
        const games = {};
        const hotGamesSet = new Set();
        
        // 获取热门游戏
        const hotGamesSection = document.querySelector('ul.content-box-body');
        if (hotGamesSection) {
            hotGamesSection.querySelectorAll('li.content-item').forEach(item => {
                const gameLink = item.querySelector('a.align-self-baseline[title]');
                if (gameLink) {
                    const gameName = gameLink.getAttribute('title');
                    const gameUrl = gameLink.href;
                    const gameKey = extractGameKey(gameUrl);
                    
                    if (gameKey) {
                        const services = {};
                        item.querySelectorAll('a.gameindex-txt').forEach(serviceLink => {
                            const serviceUrl = serviceLink.href;
                            const serviceName = serviceLink.textContent.trim();
                            const serviceKey = extractServiceKey(serviceUrl);
                            if (serviceKey) {
                                services[serviceKey] = serviceName;
                            }
                        });
                        
                        games[gameKey] = {
                            name: gameName,
                            services: services,
                            isHot: true,
                            category: getGameCategory(gameName)
                        };
                        hotGamesSet.add(gameKey);
                    }
                }
            });
        }
        
        // 获取所有游戏（按字母分组）
        document.querySelectorAll('.gameindex-box').forEach(section => {
            section.querySelectorAll('li.content-item').forEach(item => {
                const gameLink = item.querySelector('a.align-self-baseline[title]');
                if (gameLink) {
                    const gameName = gameLink.getAttribute('title');
                    const gameUrl = gameLink.href;
                    const gameKey = extractGameKey(gameUrl);
                    
                    if (gameKey && !games[gameKey]) {
                        const services = {};
                        item.querySelectorAll('a.gameindex-txt').forEach(serviceLink => {
                            const serviceUrl = serviceLink.href;
                            const serviceName = serviceLink.textContent.trim();
                            const serviceKey = extractServiceKey(serviceUrl);
                            if (serviceKey) {
                                services[serviceKey] = serviceName;
                            }
                        });
                        
                        games[gameKey] = {
                            name: gameName,
                            services: services,
                            isHot: false,
                            category: getGameCategory(gameName)
                        };
                    }
                }
            });
        });
        
        return games;
    }

    // 获取游戏分类
    function getGameCategory(gameName) {
        const name = gameName.toLowerCase();
        if (name.includes('world of warcraft') || name.includes('wow') || name.includes('diablo') || name.includes('path of exile')) {
            return 'RPG';
        } else if (name.includes('fortnite') || name.includes('apex') || name.includes('pubg') || name.includes('call of duty')) {
            return 'FPS/BR';
        } else if (name.includes('league of legends') || name.includes('dota') || name.includes('mobile legends')) {
            return 'MOBA';
        } else if (name.includes('fifa') || name.includes('nba') || name.includes('madden')) {
            return 'Sports';
        } else if (name.includes('genshin') || name.includes('honkai') || name.includes('tower of fantasy')) {
            return 'Gacha';
        }
        return 'Other';
    }

    // 提取游戏key
    function extractGameKey(url) {
        const match = url.match(/\/([^\/]+)-marketplace\//);
        if (match) {
            return match[1];
        }
        return null;
    }

    // 提取服务类型key
    function extractServiceKey(url) {
        const patterns = [
            /\/[^\/]+-([^\/]+)\/$/,
            /\/[^\/]+-([^\/]+)\?/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                // 🔧 返回规范化后的服务类型
                return normalizeServiceType(match[1]);
            }
        }
        return null;
    }

    // 从GM存储加载数据
    function loadStoredData() {
        const stored = GM_getValue('scrapedData', []);
        // 🔧 改用商品URL作为唯一标识,而不是标题
        const storedLinks = GM_getValue('uniqueLinks', []);
        return {
            data: stored,
            links: new Set(storedLinks)
        };
    }

    // 保存数据到GM存储
    function saveDataToStorage(data, links) {
        GM_setValue('scrapedData', data);
        // 🔧 保存商品URL而不是标题
        GM_setValue('uniqueLinks', Array.from(links));
    }

    // 创建控制面板
    function createControlPanel() {
        console.log('%c[PA爬取工具] 开始创建控制面板...', 'color: #9C27B0');
        
        if (document.getElementById('pa-scraper-panel')) {
            console.log('%c[PA爬取工具] 面板已存在,跳过创建', 'color: #FF9800');
            return;
        }

        const { data: storedData, links: storedLinks } = loadStoredData();
        console.log(`%c[PA爬取工具] 已加载存储数据: ${storedData.length} 条`, 'color: #9C27B0');
        
        // 添加body类用于调整页面布局
        document.body.classList.add('pa-panel-active');
        console.log('%c[PA爬取工具] 已添加 body 类', 'color: #9C27B0');
        
        const panel = document.createElement('div');
        panel.id = 'pa-scraper-panel';
        panel.innerHTML = `
            <div class="pa-toggle-btn" id="pa-toggle-panel">
                <span>◀</span>
            </div>
            <h3>
                🎮 PA爬取工具 v8.6
                <div>
                    <span class="pa-minimize-btn" id="pa-minimize-panel">−</span>
                    <span class="pa-close-btn" id="pa-close-panel">×</span>
                </div>
            </h3>
            
            <div class="pa-panel-content">
                <div class="pa-game-info pa-info-box">
                    <strong>当前页面：</strong>
                    <span id="pa-current-game-info">检测中...</span>
                </div>
                
                <div class="pa-page-info pa-info-box">
                    <strong>页面信息：</strong>
                    <span id="pa-page-info-text">检测中...</span>
                </div>
                
                <button id="pa-detect-games-btn" class="pa-detect-btn">🔍 重新检测游戏列表</button>
                
                <div class="pa-section-divider"></div>
                
                <div class="pa-game-selector">
                    <label>选择游戏:</label>
                    <input type="text" class="pa-game-selector-input" id="pa-game-selector-input" 
                           placeholder="点击或输入搜索游戏...">
                    <div class="pa-game-selector-dropdown" id="pa-game-selector-dropdown">
                        <div class="pa-game-quick-filters">
                            <span class="pa-quick-filter-btn" data-filter="hot">🔥 热门</span>
                            <span class="pa-quick-filter-btn" data-filter="rpg">RPG</span>
                            <span class="pa-quick-filter-btn" data-filter="fps">FPS</span>
                            <span class="pa-quick-filter-btn" data-filter="moba">MOBA</span>
                            <span class="pa-quick-filter-btn" data-filter="all">全部</span>
                        </div>
                        <div class="pa-game-list" id="pa-game-list"></div>
                    </div>
                </div>
                
                <div>
                    <label>选择服务类型:</label>
                    <select id="pa-service-select">
                        <option value="">-- 选择服务类型 --</option>
                    </select>
                </div>
                
                <div class="pa-keyword-section">
                    <h4>🔍 关键词过滤</h4>
                    <input type="text" id="pa-keyword-filter" class="pa-keyword-input" placeholder="输入关键词，多个用逗号分隔">
                    <div class="pa-keyword-help">例如: epic,legendary 或 留空爬取所有</div>
                </div>
                
                <div>
                    <label>爬取页数:</label>
                    <input type="number" id="pa-max-pages" value="1" min="1" max="100">
                    <small id="pa-max-pages-hint" style="color: #666; font-size: 9px;"></small>
                </div>
                
                <button id="pa-go-to-page-btn">🔗 前往指定页面</button>
                
                <div class="pa-section-divider"></div>
                
                <div class="pa-button-group">
                    <button id="pa-start-btn">▶ 当前页</button>
                    <button id="pa-start-multi-btn">▶▶ 多页</button>
                    <button id="pa-start-all-btn">▶▶▶ 所有</button>
                </div>
                
                <button id="pa-stop-btn" style="display:none;">■ 停止爬取</button>
                
                <div class="pa-button-group">
                    <button id="pa-export-csv-btn" ${storedData.length === 0 ? 'disabled' : ''}>
                        📊 CSV (${storedData.length})
                    </button>
                    <button id="pa-export-json-btn" ${storedData.length === 0 ? 'disabled' : ''}>
                        📋 JSON
                    </button>
                    <button id="pa-clear-btn">🗑 清空</button>
                </div>
                
                <div id="pa-scraper-progress" style="${storedData.length === 0 ? 'display:none;' : ''}">
                    <strong>进度：</strong>
                    <span id="pa-progress-text">准备中...</span>
                    <div>已收集: <span id="pa-collected-count">${storedData.length}</span> 条</div>
                    <div>去重后(按URL): <span id="pa-unique-count">${storedLinks.size}</span> 条</div>
                    <div>当前: 第 <span id="pa-current-page">1</span>/<span id="pa-total-pages">1</span> 页</div>
                </div>
                
                <div id="pa-data-preview" style="${storedData.length === 0 ? 'display:none;' : ''}">
                    <strong>数据预览：</strong>
                    <div id="pa-preview-content"></div>
                </div>
                
                <div id="pa-scraper-log"></div>
                
                <!-- Cloudflare 状态区域 - 位于底部 -->
                <div class="pa-cf-status-section" id="pa-cf-status-section">
                    <div class="pa-cf-header">
                        <div class="pa-cf-header-left">
                            <span class="pa-cf-status-icon"></span>
                            <span>Cloudflare 验证</span>
                        </div>
                        <span class="pa-cf-status-badge" id="pa-cf-status">安全</span>
                    </div>
                    
                    <div class="pa-cf-status-content">
                        <div class="pa-cf-status-item">
                            <label>Sitekey</label>
                            <value id="pa-cf-sitekey">--</value>
                        </div>
                        <div class="pa-cf-status-item">
                            <label>任务ID</label>
                            <value id="pa-cf-taskid">--</value>
                        </div>
                        <div class="pa-cf-status-item">
                            <label>进度</label>
                            <value id="pa-cf-progress-text">0%</value>
                        </div>
                        
                        <div class="pa-cf-progress-bar">
                            <div class="pa-cf-progress-fill" id="pa-cf-progress" style="width: 0%"></div>
                        </div>
                        
                        <div class="pa-cf-log" id="pa-cf-log"></div>
                    </div>
                    
                    <div class="pa-cf-buttons">
                        <button class="pa-cf-button" id="pa-cf-manual-btn">手动</button>
                        <button class="pa-cf-button primary" id="pa-cf-auto-btn">自动</button>
                        <button class="pa-cf-button" id="pa-cf-close-btn">刷新</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        console.log('%c[PA爬取工具] 面板DOM已添加到页面', 'color: #2196F3');

        bindEvents();
        console.log('%c[PA爬取工具] 事件绑定完成', 'color: #2196F3');
        
        // 延迟执行初始化，确保DOM已完全加载
        setTimeout(() => {
            loadGamesDatabase();
            detectPageInfo();
            detectCurrentGame();
            if (storedData.length > 0) {
                updateDataPreview(storedData);
            }
        }, 500);
    }

    // 加载游戏数据库
    function loadGamesDatabase() {
        // 尝试从页面获取游戏列表
        const games = fetchGamesFromPage();
        
        if (Object.keys(games).length > 0) {
            gamesDatabase = games;
            GM_setValue('gamesDatabase', games);
            addLog(`已加载 ${Object.keys(games).length} 个游戏`, 'success');
        } else {
            // 如果页面上没有，尝试从存储加载
            const storedGames = GM_getValue('gamesDatabase', {});
            if (Object.keys(storedGames).length > 0) {
                gamesDatabase = storedGames;
                addLog(`从缓存加载 ${Object.keys(storedGames).length} 个游戏`, 'info');
            } else {
                // 使用默认游戏列表
                gamesDatabase = getDefaultGamesDatabase();
                addLog('使用默认游戏列表，建议前往主页重新检测', 'warning');
            }
        }
        
        // 初始化游戏列表显示
        updateGameList('all');
    }

    // 重新检测游戏列表
    function reDetectGames() {
        addLog('开始重新检测游戏列表...', 'info');
        
        // 如果当前在游戏索引页
        if (window.location.href.includes('/game-index') || window.location.pathname === '/') {
            const games = fetchGamesFromPage();
            if (Object.keys(games).length > 0) {
                gamesDatabase = games;
                GM_setValue('gamesDatabase', games);
                addLog(`成功检测到 ${Object.keys(games).length} 个游戏`, 'success');
                updateGameList('all');  // 改为 updateGameList
            } else {
                addLog('未能从当前页面检测到游戏', 'warning');
                if (confirm('未能从当前页面检测到游戏列表，是否前往游戏索引页？')) {
                    window.location.href = 'https://www.playerauctions.com/';
                }
            }
        } else {
            if (confirm('需要前往主页或游戏索引页来检测游戏列表，是否跳转？')) {
                window.location.href = 'https://www.playerauctions.com/';
            }
        }
    }

    // 默认游戏数据库
    function getDefaultGamesDatabase() {
        return {
            'fortnite': {
                name: 'Fortnite',
                services: {
                    'items': 'Items',
                    'account': 'Accounts',
                    'power-leveling': 'Power leveling'
                },
                isHot: true
            },
            'wow': {
                name: 'World of Warcraft',
                services: {
                    'gold': 'Gold',
                    'items': 'Items',
                    'account': 'Accounts',
                    'power-leveling': 'Power leveling'
                },
                isHot: true
            },
            'diablo-4': {
                name: 'Diablo 4',
                services: {
                    'gold': 'Gold',
                    'items': 'Items',
                    'account': 'Accounts',
                    'power-leveling': 'Power leveling'
                },
                isHot: true
            },
            'lol': {
                name: 'League of Legends',
                services: {
                    'items': 'Items',
                    'account': 'Accounts',
                    'boosting': 'Boosting'
                },
                isHot: true
            },
            'valorant': {
                name: 'Valorant',
                services: {
                    'points': 'Points',
                    'items': 'Items',
                    'account': 'Accounts',
                    'power-leveling': 'Power leveling'
                },
                isHot: true
            }
        };
    }

    // 更新游戏列表（新的展示方式）
    function updateGameList(filter = 'all', searchTerm = '') {
        const listContainer = document.getElementById('pa-game-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        const searchLower = searchTerm.toLowerCase();
        
        // 根据过滤条件分组游戏
        const groups = {
            '🔥 热门游戏': [],
            'RPG': [],
            'FPS/BR': [],
            'MOBA': [],
            'Sports': [],
            'Gacha': [],
            'Other': []
        };
        
        for (const [key, game] of Object.entries(gamesDatabase)) {
            // 搜索过滤
            if (searchTerm && !game.name.toLowerCase().includes(searchLower) && 
                !key.toLowerCase().includes(searchLower)) {
                continue;
            }
            
            // 分类过滤
            if (filter === 'hot' && !game.isHot) continue;
            if (filter === 'rpg' && game.category !== 'RPG') continue;
            if (filter === 'fps' && game.category !== 'FPS/BR') continue;
            if (filter === 'moba' && game.category !== 'MOBA') continue;
            
            const gameItem = { key, ...game };
            
            // 优先显示热门游戏
            if (game.isHot && (filter === 'hot' || filter === 'all') && !searchTerm) {
                groups['🔥 热门游戏'].push(gameItem);
            } else if (game.category && filter === 'all') {
                groups[game.category].push(gameItem);
            } else if (filter !== 'hot' && filter !== 'all' && game.category === groups[Object.keys(groups).find(g => g.toLowerCase().includes(filter))]) {
                groups[game.category].push(gameItem);
            } else if (filter === 'all') {
                if (!game.category) {
                    groups['Other'].push(gameItem);
                } else {
                    groups[game.category].push(gameItem);
                }
            }
        }
        
        let hasResults = false;
        
        // 渲染分组
        for (const [groupName, games] of Object.entries(groups)) {
            if (games.length === 0) continue;
            
            hasResults = true;
            
            const groupDiv = document.createElement('div');
            groupDiv.className = 'pa-game-group';
            
            // 不显示分组标题如果正在搜索
            if (!searchTerm || games.length > 1) {
                const headerDiv = document.createElement('div');
                headerDiv.className = 'pa-game-group-header';
                headerDiv.textContent = groupName;
                groupDiv.appendChild(headerDiv);
            }
            
            games.forEach(game => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'pa-game-item';
                if (game.key === selectedGameKey) {
                    itemDiv.classList.add('selected');
                }
                itemDiv.dataset.gameKey = game.key;
                
                const nameDiv = document.createElement('div');
                nameDiv.className = 'pa-game-item-name';
                nameDiv.textContent = game.name;
                nameDiv.title = game.name; // 显示完整名称的提示
                
                const badgeDiv = document.createElement('div');
                badgeDiv.className = 'pa-game-item-badge';
                badgeDiv.textContent = Object.keys(game.services).length + ' 服务';
                
                itemDiv.appendChild(nameDiv);
                itemDiv.appendChild(badgeDiv);
                
                itemDiv.addEventListener('click', () => selectGame(game.key));
                groupDiv.appendChild(itemDiv);
            });
            
            listContainer.appendChild(groupDiv);
        }
        
        if (!hasResults) {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.className = 'pa-no-results';
            noResultsDiv.textContent = searchTerm ? `未找到包含 "${searchTerm}" 的游戏` : '暂无游戏数据';
            listContainer.appendChild(noResultsDiv);
        }
    }

    // 选择游戏
    function selectGame(gameKey) {
        const game = gamesDatabase[gameKey];
        if (!game) return;
        
        selectedGameKey = gameKey;
        
        // 更新输入框显示
        const input = document.getElementById('pa-game-selector-input');
        input.value = game.name;
        
        // 更新列表中的选中状态
        document.querySelectorAll('.pa-game-item').forEach(item => {
            item.classList.remove('selected');
        });
        const selectedItem = document.querySelector(`.pa-game-item[data-game-key="${gameKey}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        // 关闭下拉框
        document.getElementById('pa-game-selector-dropdown').classList.remove('active');
        
        // 更新服务类型选项
        const serviceSelect = document.getElementById('pa-service-select');
        serviceSelect.innerHTML = '<option value="">-- 选择服务类型 --</option>';
        
        // 🔧 创建服务类型选项时,对键名进行规范化
        for (const [key, name] of Object.entries(game.services)) {
            const normalizedKey = normalizeServiceType(key);
            const option = document.createElement('option');
            option.value = normalizedKey;
            option.textContent = name;
            serviceSelect.appendChild(option);
        }
        
        // 保存选择
        GM_setValue('lastSelectedGame', gameKey);
    }

    // 检测当前游戏和服务类型 - 修复版
    function detectCurrentGame() {
        const url = window.location.href;
        const gameInfoElement = document.getElementById('pa-current-game-info');
        
        if (!gameInfoElement) return;
        
        let detectedGame = '';
        let detectedService = '';
        
        // 更精确的URL模式匹配
        const urlPath = window.location.pathname;
        
        // 调试日志
        console.log('检测URL路径:', urlPath);
        
        // 首先尝试精确匹配已知游戏
        for (const [gameKey, game] of Object.entries(gamesDatabase)) {
            // 检查URL路径是否包含该游戏的模式
            // 修复：正确转义正则表达式中的特殊字符
            const gamePattern = new RegExp(`\\/${gameKey}-([^\\/\\?]+)(?:\\/|\\?|$)`);
            const match = urlPath.match(gamePattern);
            
            if (match) {
                detectedGame = gameKey;
                detectedService = match[1];
                
                // 🔧 服务类型规范化
                detectedService = normalizeServiceType(detectedService);
                
                console.log(`匹配到游戏: ${gameKey}, 服务: ${detectedService}`);
                
                gameInfoElement.textContent = game.name;
                selectGame(gameKey);
                
                // 设置服务类型
                const serviceSelect = document.getElementById('pa-service-select');
                if (serviceSelect) {
                    serviceSelect.value = detectedService;
                }
                
                const serviceName = game.services[detectedService] || SERVICE_TYPE_MAP[detectedService];
                if (serviceName) {
                    gameInfoElement.textContent = `${game.name} - ${serviceName}`;
                }
                
                addLog(`检测到游戏: ${game.name}, 服务: ${serviceName || detectedService}`, 'info');
                return; // 找到后直接返回
            }
        }
        
        // 如果没有精确匹配，尝试通用模式（处理未知游戏）
        // 修复：同样需要转义特殊字符
        const genericPattern = /\/([^\/]+)-([^\/\?]+)(?:\/|\?|$)/;
        const genericMatch = urlPath.match(genericPattern);
        
        if (genericMatch) {
            const fullMatch = genericMatch[0].replace(/^\/|\/$/g, ''); // 移除首尾斜杠
            const parts = fullMatch.split('-');
            
            console.log('通用匹配，分割后:', parts);
            
            // 已知的服务类型列表（包括完整的power-leveling）
            const knownServices = [
                'power-leveling',  // 完整的power-leveling
                'leveling',        // 单独的leveling也算power-leveling
                'boosting',
                'items',
                'gold',
                'accounts',
                'account',
                'currency',
                'coins',
                'points',
                'platinum',
                'silver',
                'gems',
                'bells',
                'kinah',
                'money',
                'auec',
                'credits'
            ];
            
            // 从后往前检查是否匹配已知服务类型
            let foundService = '';
            let foundGame = '';
            
            // 特殊处理power-leveling（两个词）
            if (parts.length >= 2 && parts[parts.length - 2] === 'power' && parts[parts.length - 1] === 'leveling') {
                foundService = 'power-leveling';
                foundGame = parts.slice(0, -2).join('-');
            } else if (parts[parts.length - 1] === 'leveling') {
                // 单独的 leveling 也识别为 power-leveling
                foundService = 'power-leveling';
                foundGame = parts.slice(0, -1).join('-');
            } else {
                // 检查其他单词服务类型
                for (const service of knownServices) {
                    const serviceParts = service.split('-');
                    if (serviceParts.length === 1 && service !== 'leveling') {
                        // 单词服务 (leveling已经在上面处理了)
                        if (parts[parts.length - 1] === service) {
                            foundService = service;
                            foundGame = parts.slice(0, -1).join('-');
                            break;
                        }
                    }
                }
            }
            
            // 🔧 服务类型规范化
            foundService = normalizeServiceType(foundService);
            
            console.log(`解析结果 - 游戏: ${foundGame}, 服务: ${foundService}`);
            
            if (foundGame && foundService) {
                detectedGame = foundGame;
                detectedService = foundService;
                
                // 检查游戏是否在数据库中
                if (gamesDatabase[foundGame]) {
                    const game = gamesDatabase[foundGame];
                    gameInfoElement.textContent = game.name;
                    selectGame(foundGame);
                    
                    const serviceSelect = document.getElementById('pa-service-select');
                    if (serviceSelect) {
                        serviceSelect.value = foundService;
                    }
                    
                    const serviceName = game.services[foundService] || SERVICE_TYPE_MAP[foundService];
                    if (serviceName) {
                        gameInfoElement.textContent = `${game.name} - ${serviceName}`;
                    }
                    
                    addLog(`检测到游戏: ${game.name}, 服务: ${serviceName || foundService}`, 'info');
                } else {
                    // 游戏不在数据库中
                    gameInfoElement.textContent = `未知游戏: ${foundGame}`;
                    addLog(`未识别的游戏: ${foundGame}`, 'warning');
                }
                return;
            }
        }
        
        // 如果什么都没匹配到，检查是否在主页
        if (urlPath === '/' || urlPath === '/game-index' || urlPath === '/game-index/') {
            gameInfoElement.textContent = '游戏主页';
        } else {
            gameInfoElement.textContent = '未检测到游戏';
            console.log('无法检测游戏，当前路径:', urlPath);
        }
    }

    // 前往指定游戏页面 - 调试版
    function goToGamePage() {
        if (!selectedGameKey) {
            alert('请选择游戏！');
            addLog('错误：未选择游戏', 'error');
            return;
        }
        
        const service = document.getElementById('pa-service-select').value;
        
        if (!service) {
            alert('请选择服务类型！');
            addLog('错误：未选择服务类型', 'error');
            return;
        }
        
        const game = gamesDatabase[selectedGameKey];
        
        if (!game) {
            alert('选择的游戏不存在！');
            addLog(`错误：游戏 ${selectedGameKey} 不在数据库中`, 'error');
            return;
        }
        
        // 构建URL - 确保格式正确
        const url = `https://www.playerauctions.com/${selectedGameKey}-${service}/`;
        
        // 调试日志
        addLog(`准备跳转:`, 'info');
        addLog(`  游戏Key: ${selectedGameKey}`, 'info');
        addLog(`  游戏名: ${game.name}`, 'info');
        addLog(`  服务Key: ${service}`, 'info');
        addLog(`  服务名: ${game.services[service] || SERVICE_TYPE_MAP[service] || '未知'}`, 'info');
        addLog(`  目标URL: ${url}`, 'info');
        
        // 延迟一下让用户看到日志
        setTimeout(() => {
            window.location.href = url;
        }, 500);
    }

    // 绑定事件
    function bindEvents() {
        // 面板折叠/展开
        document.getElementById('pa-toggle-panel').addEventListener('click', () => {
            const panel = document.getElementById('pa-scraper-panel');
            const isCollapsed = panel.classList.toggle('collapsed');
            document.body.classList.toggle('pa-panel-collapsed', isCollapsed);
            document.querySelector('#pa-toggle-panel span').textContent = isCollapsed ? '▶' : '◀';
        });
        
        document.getElementById('pa-close-panel').addEventListener('click', () => {
            document.getElementById('pa-scraper-panel').style.display = 'none';
            document.body.classList.remove('pa-panel-active', 'pa-panel-collapsed');
        });
        
        document.getElementById('pa-minimize-panel').addEventListener('click', () => {
            const panel = document.getElementById('pa-scraper-panel');
            panel.classList.toggle('minimized');
            document.getElementById('pa-minimize-panel').textContent = 
                panel.classList.contains('minimized') ? '+' : '−';
        });
        
        // 游戏选择器
        const gameSelectorInput = document.getElementById('pa-game-selector-input');
        const gameSelectorDropdown = document.getElementById('pa-game-selector-dropdown');
        
        // 点击输入框显示下拉菜单
        gameSelectorInput.addEventListener('click', (e) => {
            e.stopPropagation();
            gameSelectorDropdown.classList.add('active');
            // 如果输入框为空或者是游戏名，显示所有游戏
            if (!gameSelectorInput.value || gamesDatabase[selectedGameKey]?.name === gameSelectorInput.value) {
                updateGameList('all');
            } else {
                updateGameList('all', gameSelectorInput.value);
            }
        });
        
        // 输入时搜索 - 实时更新列表
        gameSelectorInput.addEventListener('input', (e) => {
            gameSelectorDropdown.classList.add('active');
            const searchTerm = e.target.value;
            
            // 清空快速过滤按钮的选中状态
            document.querySelectorAll('.pa-quick-filter-btn').forEach(b => b.classList.remove('active'));
            
            // 更新列表显示搜索结果
            updateGameList('all', searchTerm);
        });
        
        // 获得焦点时显示下拉菜单
        gameSelectorInput.addEventListener('focus', () => {
            gameSelectorDropdown.classList.add('active');
            const currentValue = gameSelectorInput.value;
            
            // 如果当前值是选中的游戏名，清空以便搜索
            if (gamesDatabase[selectedGameKey]?.name === currentValue) {
                gameSelectorInput.select(); // 选中全部文本，方便替换
                updateGameList('all');
            } else if (currentValue) {
                updateGameList('all', currentValue);
            } else {
                updateGameList('all');
            }
        });
        
        // 快速过滤按钮
        document.querySelectorAll('.pa-quick-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // 清空输入框
                gameSelectorInput.value = '';
                
                // 更新按钮状态
                document.querySelectorAll('.pa-quick-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const filter = e.target.dataset.filter;
                updateGameList(filter, '');
            });
        });
        
        // 点击外部关闭下拉框
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.pa-game-selector')) {
                gameSelectorDropdown.classList.remove('active');
                // 如果没有选择游戏，恢复显示选中的游戏名
                if (selectedGameKey && !gameSelectorInput.value) {
                    gameSelectorInput.value = gamesDatabase[selectedGameKey]?.name || '';
                }
            }
        });
        
        // 阻止下拉框内的点击事件冒泡
        gameSelectorDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // 重新检测游戏列表
        document.getElementById('pa-detect-games-btn').addEventListener('click', reDetectGames);
        
        document.getElementById('pa-go-to-page-btn').addEventListener('click', goToGamePage);
        document.getElementById('pa-start-btn').addEventListener('click', scrapeCurrentPage);
        document.getElementById('pa-start-multi-btn').addEventListener('click', startMultiPageScraping);
        document.getElementById('pa-start-all-btn').addEventListener('click', startAllPagesScraping);
        document.getElementById('pa-stop-btn').addEventListener('click', stopScraping);
        document.getElementById('pa-export-csv-btn').addEventListener('click', () => exportData('csv'));
        document.getElementById('pa-export-json-btn').addEventListener('click', () => exportData('json'));
        document.getElementById('pa-clear-btn').addEventListener('click', clearData);
        
        // Cloudflare 按钮事件
        const cfManualBtn = document.getElementById('pa-cf-manual-btn');
        const cfAutoBtn = document.getElementById('pa-cf-auto-btn');
        const cfCloseBtn = document.getElementById('pa-cf-close-btn');
        
        if (cfManualBtn) {
            cfManualBtn.addEventListener('click', () => {
                addCfLog('开始手动处理...', 'info');
                handleCloudflareTurnstile();
            });
        }
        
        if (cfAutoBtn) {
            cfAutoBtn.addEventListener('click', () => {
                addCfLog('开始自动处理...', 'info');
                autoHandleCloudflare();
            });
        }
        
        if (cfCloseBtn) {
            cfCloseBtn.addEventListener('click', () => {
                hideCloudflareStatus();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 's') {
                const panel = document.getElementById('pa-scraper-panel');
                if (panel.style.display === 'none') {
                    panel.style.display = 'block';
                    document.body.classList.add('pa-panel-active');
                } else {
                    panel.style.display = 'none';
                    document.body.classList.remove('pa-panel-active', 'pa-panel-collapsed');
                }
            }
        });
    }

    // 验证URL是否可访问
    async function validateUrl(url) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors',  // 避免CORS问题
                cache: 'no-cache'
            });
            return true;  // no-cors模式下，只要没抛出异常就认为成功
        } catch (error) {
            console.error('URL验证失败:', error);
            return false;
        }
    }

    // 前往指定游戏页面（修复版 + URL验证）
    async function goToGamePage() {
        if (!selectedGameKey) {
            alert('请选择游戏！');
            addLog('错误：未选择游戏', 'error');
            return;
        }
        
        let service = document.getElementById('pa-service-select').value;
        
        if (!service) {
            alert('请选择服务类型！');
            addLog('错误：未选择服务类型', 'error');
            return;
        }
        
        // 🔧 服务类型规范化（leveling/boosting → power-leveling）
        service = normalizeServiceType(service);
        
        const game = gamesDatabase[selectedGameKey];
        
        if (!game) {
            alert('选择的游戏不存在！');
            addLog(`错误：游戏 ${selectedGameKey} 不在数据库中`, 'error');
            return;
        }
        
        // 检查游戏是否支持该服务
        if (!game.services[service]) {
            const confirmed = confirm(`警告：${game.name} 可能不支持 ${SERVICE_TYPE_MAP[service] || service} 服务。\n\n是否仍要尝试访问？`);
            if (!confirmed) {
                addLog(`取消跳转: 游戏不支持该服务`, 'warning');
                return;
            }
        }
        
        // 构建URL - 确保格式正确
        const url = `https://www.playerauctions.com/${selectedGameKey}-${service}/`;
        
        // 调试日志
        addLog(`准备跳转:`, 'info');
        addLog(`  游戏Key: ${selectedGameKey}`, 'info');
        addLog(`  游戏名: ${game.name}`, 'info');
        addLog(`  服务Key: ${service}`, 'info');
        addLog(`  服务名: ${game.services[service] || SERVICE_TYPE_MAP[service] || '未知'}`, 'info');
        addLog(`  目标URL: ${url}`, 'info');
        
        // 验证URL格式
        try {
            new URL(url);
        } catch (error) {
            alert('错误：生成的URL格式无效！');
            addLog(`URL格式错误: ${url}`, 'error');
            return;
        }
        
        // 验证URL是否可访问（可选，可能会稍慢）
        addLog('正在验证URL...', 'info');
        const isValid = await validateUrl(url);
        
        if (!isValid) {
            const confirmed = confirm(`警告：无法验证URL是否可访问。\n\nURL: ${url}\n\n是否仍要尝试跳转？`);
            if (!confirmed) {
                addLog(`取消跳转: URL验证失败`, 'warning');
                return;
            }
        } else {
            addLog('URL验证通过 ✓', 'success');
        }
        
        // 延迟一下让用户看到日志
        setTimeout(() => {
            addLog('正在跳转...', 'info');
            window.location.href = url;
        }, 500);
    }

    // 检测页面信息
    function detectPageInfo() {
        const pageInfoText = document.getElementById('pa-page-info-text');
        const maxPagesHint = document.getElementById('pa-max-pages-hint');
        
        let totalPages = 1;
        let currentPage = 1;
        let totalItems = 0;
        
        // 🔥 优先从商品总数计算总页数
        // 需要找到当前激活的服务类型对应的计数元素
        let itemCountElement = null;
        
        // 方法1: 找到激活的(当前页面)服务类型链接
        const activeCategory = document.querySelector('.product-category-active .product-category__count, .product-category__item--active .product-category__count');
        if (activeCategory) {
            itemCountElement = activeCategory;
            console.log('✓ 从激活的分类找到商品数:', activeCategory.textContent);
        }
        
        // 方法2: 如果方法1失败,根据当前URL路径匹配
        if (!itemCountElement) {
            const currentPath = window.location.pathname;
            const serviceType = detectServiceType();
            
            // 获取所有分类链接
            const categoryLinks = document.querySelectorAll('.product-category__item a, [class*="category"] a');
            categoryLinks.forEach(link => {
                const href = link.getAttribute('href') || link.href;
                // 如果链接包含当前服务类型且链接是当前页面
                if (href && (href.includes(currentPath) || currentPath.includes(href))) {
                    const countEl = link.querySelector('.product-category__count');
                    if (countEl) {
                        itemCountElement = countEl;
                        console.log('✓ 从URL路径匹配找到商品数:', countEl.textContent);
                    }
                }
            });
        }
        
        // 方法3: 最后备选,使用第一个计数元素(可能不准确)
        if (!itemCountElement) {
            itemCountElement = document.querySelector('.product-category__count, .result-count, .total-count');
            if (itemCountElement) {
                console.log('⚠️ 使用第一个计数元素(可能不准确):', itemCountElement.textContent);
            }
        }
        
        if (itemCountElement) {
            const countText = itemCountElement.textContent.trim();
            totalItems = parseInt(countText);
            if (!isNaN(totalItems) && totalItems > 0) {
                // 获取当前页面的商品数量作为每页数量
                const itemsOnPage = document.querySelectorAll('.featured-seller, .offer-item, .product-item').length || 20;
                totalPages = Math.ceil(totalItems / itemsOnPage);
                console.log(`✓ 从商品总数计算: 总共${totalItems}个商品, 每页${itemsOnPage}个, 共${totalPages}页`);
                addLog(`检测到${totalItems}个商品, 共${totalPages}页`, 'info');
            }
        }
        
        // 查找分页 - 扩展选择器
        const paginationSelectors = [
            '.pagination',
            '.page-list',
            'ul.pagination',
            '.paging',
            'nav[aria-label*="pagination" i]',
            '.pages'
        ];
        
        let paginationContainer = null;
        for (const selector of paginationSelectors) {
            paginationContainer = document.querySelector(selector);
            if (paginationContainer) break;
        }
        
        if (paginationContainer) {
            // 查找所有页码链接 - 改进选择器
            const pageLinks = paginationContainer.querySelectorAll('a[href*="PageIndex"], a.page-link, a[href*="page="]');
            const pageNumbers = [];
            
            pageLinks.forEach(link => {
                // 获取href属性，而不是href属性值（避免浏览器自动转换）
                const href = link.getAttribute('href') || link.href;
                
                // 多种页码格式匹配
                const patterns = [
                    /PageIndex=(\d+)/i,
                    /page=(\d+)/i,
                    /p=(\d+)/i,
                    /\/page\/(\d+)/i
                ];
                
                for (const pattern of patterns) {
                    const match = href.match(pattern);
                    if (match) {
                        const pageNum = parseInt(match[1]);
                        if (!isNaN(pageNum) && pageNum > 0) {
                            pageNumbers.push(pageNum);
                        }
                        break;
                    }
                }
                
                // 检查当前页
                const parentElement = link.parentElement;
                if (parentElement && (
                    parentElement.classList.contains('active') ||
                    parentElement.classList.contains('current') ||
                    parentElement.classList.contains('selected') ||
                    link.getAttribute('aria-current') === 'page' ||
                    link.classList.contains('active') ||
                    link.classList.contains('current')
                )) {
                    for (const pattern of patterns) {
                        const match = href.match(pattern);
                        if (match) {
                            currentPage = parseInt(match[1]);
                            break;
                        }
                    }
                }
            });
            
            // 也检查页码文本
            const pageItems = paginationContainer.querySelectorAll('li, span.page, a.page');
            pageItems.forEach(item => {
                const text = item.textContent.trim();
                const num = parseInt(text);
                if (!isNaN(num) && num > 0) {
                    pageNumbers.push(num);
                    
                    // 检查是否是当前页
                    if (item.classList.contains('active') || 
                        item.classList.contains('current') ||
                        item.querySelector('.active') ||
                        item.querySelector('[aria-current="page"]')) {
                        currentPage = num;
                    }
                }
            });
            
            // 查找"下一页"按钮来确定是否还有更多页
            const nextButton = paginationContainer.querySelector('a[aria-label*="Next" i], a.next, a[rel="next"], .page-item.next a');
            if (nextButton && !nextButton.classList.contains('disabled') && !nextButton.parentElement?.classList.contains('disabled')) {
                // 如果有下一页按钮且未禁用，说明还有更多页
                const nextHref = nextButton.getAttribute('href') || nextButton.href;
                for (const pattern of [/PageIndex=(\d+)/i, /page=(\d+)/i]) {
                    const match = nextHref.match(pattern);
                    if (match) {
                        const nextPage = parseInt(match[1]);
                        if (!isNaN(nextPage)) {
                            pageNumbers.push(nextPage);
                        }
                        break;
                    }
                }
            }
            
            // 只有在没有从商品总数获取到总页数时,才从分页链接推断
            if (pageNumbers.length > 0 && totalPages === 1) {
                const maxPageFromLinks = Math.max(...pageNumbers);
                // 如果分页链接显示的最大页码大于从商品总数计算的,使用更大的值
                totalPages = Math.max(totalPages, maxPageFromLinks);
                console.log(`⚠️ 分页链接最大页码: ${maxPageFromLinks}, 使用总页数: ${totalPages}`);
            }
        }
        
        // 从URL获取当前页 - 支持多种格式
        const urlPatterns = [
            /PageIndex=(\d+)/i,
            /page=(\d+)/i,
            /p=(\d+)/i,
            /\/page\/(\d+)/i
        ];
        
        for (const pattern of urlPatterns) {
            const urlMatch = window.location.href.match(pattern);
            if (urlMatch) {
                currentPage = parseInt(urlMatch[1]);
                break;
            }
        }
        
        // 检测商品数量 - 根据不同类型使用不同选择器
        let itemCount = 0;
        const selectors = [
            '.product-item',      // Items
            '.offer-item',         // Gold/Currency/Accounts
            '.featured-seller',    // Power Leveling
            'article.offer',       // 通用offer
            '.listing-item',       // 列表项
            'tr[class*="offer"]'   // 表格形式
        ];
        
        for (const selector of selectors) {
            const items = document.querySelectorAll(selector);
            if (items.length > 0) {
                itemCount = items.length;
                break;
            }
        }
        
        // 显示页面信息
        if (totalItems > 0) {
            pageInfoText.textContent = `第 ${currentPage}/${totalPages} 页，本页 ${itemCount} 个商品 (共${totalItems}个)`;
        } else {
            pageInfoText.textContent = `第 ${currentPage}/${totalPages} 页，本页 ${itemCount} 个商品`;
        }
        
        // 如果检测不到总页数,给出提示
        if (totalPages <= 1 && itemCount > 0) {
            maxPagesHint.textContent = '(无法检测总页数，请手动输入)';
            maxPagesHint.style.color = '#ff9800';
        } else {
            maxPagesHint.textContent = totalPages > 1 ? `(共 ${totalPages} 页)` : '';
            maxPagesHint.style.color = '';
        }
        
        const logMsg = totalItems > 0 
            ? `页面信息：第 ${currentPage}/${totalPages} 页，${itemCount} 个商品，总共${totalItems}个`
            : `页面信息：第 ${currentPage}/${totalPages} 页，${itemCount} 个商品`;
        addLog(logMsg, 'info');
    }

    // 添加日志
    function addLog(message, type = 'info') {
        const logContainer = document.getElementById('pa-scraper-log');
        if (!logContainer) return;
        
        const logItem = document.createElement('div');
        logItem.className = `pa-log-item pa-log-${type}`;
        logItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContainer.insertBefore(logItem, logContainer.firstChild);
        
        while (logContainer.children.length > 30) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }

    // 更新进度
    function updateProgress(text) {
        const { data: collectedData, links: uniqueLinks } = loadStoredData();
        
        const progressText = document.getElementById('pa-progress-text');
        const collectedCount = document.getElementById('pa-collected-count');
        const uniqueCount = document.getElementById('pa-unique-count');
        const progressDiv = document.getElementById('pa-scraper-progress');
        const currentPageSpan = document.getElementById('pa-current-page');
        const totalPagesSpan = document.getElementById('pa-total-pages');
        
        if (progressText) progressText.textContent = text;
        if (collectedCount) collectedCount.textContent = collectedData.length;
        if (uniqueCount) uniqueCount.textContent = uniqueLinks.size;
        if (currentPageSpan) currentPageSpan.textContent = currentScrapingPage;
        if (totalPagesSpan) totalPagesSpan.textContent = totalPagesToScrape;
        if (progressDiv) progressDiv.style.display = 'block';
        
        // 更新导出按钮
        const exportCsvBtn = document.getElementById('pa-export-csv-btn');
        const exportJsonBtn = document.getElementById('pa-export-json-btn');
        if (exportCsvBtn) {
            exportCsvBtn.disabled = collectedData.length === 0;
            exportCsvBtn.textContent = `📊 导出CSV (${collectedData.length}条)`;
        }
        if (exportJsonBtn) {
            exportJsonBtn.disabled = collectedData.length === 0;
        }
    }

    // 提取页面数据 - 增强版
    function extractPageData() {
        const offers = [];
        const keywords = document.getElementById('pa-keyword-filter')?.value.trim();
        const keywordList = keywords ? keywords.split(',').map(k => k.trim().toLowerCase()) : [];
        
        // URL验证统计
        let urlStats = {
            total: 0,        // 总处理数
            valid: 0,        // 有效URL
            fixed: 0,        // 修复的URL
            invalid: 0,      // 无效URL（已跳过）
            external: 0      // 外部链接
        };
        
        // 尝试多种选择器 - 改进选择器顺序和准确性
        const itemSelectors = [
            '.offer-item',         // Gold/Currency/Accounts类型 - 优先
            '.product-item',      // Items类型
            '.featured-seller',    // Power Leveling
            'tr.offer-item',      // 表格形式的offer
            '[role="row"]'        // 通用表格行
        ];
        
        let elements = [];
        for (const selector of itemSelectors) {
            elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                addLog(`使用选择器: ${selector}, 找到 ${elements.length} 个元素`, 'info');
                break;
            }
        }
        
        elements.forEach((element, index) => {
            try {
                const offerData = {
                    index: index + 1,
                    offerId: '',
                    title: '',
                    link: '',
                    sellerName: '',
                    sellerLevel: '',
                    sellerRating: '',
                    totalOrders: '',
                    memberSince: '',
                    price: '',
                    deliveryTime: '',
                    server: '',  // 新增服务器信息（金币类）
                    game: selectedGameKey || '',  // 使用 selectedGameKey
                    serviceType: '',
                    scrapedAt: new Date().toISOString(),
                    pageUrl: window.location.href
                };
                
                // 获取服务类型并规范化
                offerData.serviceType = normalizeServiceType(
                    document.getElementById('pa-service-select')?.value || detectServiceType()
                );
                
                // 获取Offer ID
                const offerIdElement = element.querySelector('.offerid, [class*="offerid"], .offer-id');
                if (offerIdElement) {
                    offerData.offerId = offerIdElement.textContent.trim();
                }
                
                // 特殊处理: Power Leveling 链接提取
                let powerLevelingUrl = null;
                if (offerData.serviceType === 'power-leveling') {
                    console.log('🔍 Power Leveling 元素调试:', {
                        'element': element,
                        'data-bind': element.getAttribute('data-bind'),
                        'innerHTML片段': element.innerHTML.substring(0, 300)
                    });
                    
                    // 方式1: 查找 <a> 标签的 href (最可靠)
                    const linkSelectors = [
                        'a.txt-hot',                           // 标题链接
                        'a[href*="power-leveling"]',           // 包含 power-leveling
                        'a[href*="leveling"]',                 // 包含 leveling
                        'a[href*="boosting"]',                 // 包含 boosting
                        '.offer-title a',                      // 通用 offer 标题
                        'a.offer-details',                     // 详情链接
                        'a'                                    // 任何链接(最后备选)
                    ];
                    
                    let linkElement = null;
                    for (const selector of linkSelectors) {
                        linkElement = element.querySelector(selector);
                        if (linkElement && linkElement.href) {
                            powerLevelingUrl = linkElement.href;
                            console.log(`✓ Power Leveling URL (selector: ${selector}):`, powerLevelingUrl);
                            break;
                        }
                    }
                    
                    // 如果找不到任何链接,尝试从 data-bind 构建
                    if (!powerLevelingUrl) {
                        const dataBind = element.getAttribute('data-bind');
                        if (dataBind) {
                            console.log('⚠️ 未找到 <a> 标签,尝试使用 data-bind:', dataBind);
                            
                            // data-bind 可能是完整路径或相对路径
                            if (dataBind.startsWith('http')) {
                                powerLevelingUrl = dataBind;
                            } else if (dataBind.startsWith('/')) {
                                powerLevelingUrl = window.location.origin + dataBind;
                            } else {
                                // 相对路径,需要补全基础路径
                                const currentUrl = window.location.pathname;
                                console.log('当前页面路径:', currentUrl);
                                const match = currentUrl.match(/^(\/[^\/]+-(power-leveling|leveling|boosting)\/)/);
                                if (match) {
                                    powerLevelingUrl = window.location.origin + match[1] + dataBind;
                                    console.log('✓ 构建的 URL:', powerLevelingUrl);
                                } else {
                                    console.error('❌ 无法匹配基础路径');
                                }
                            }
                        } else {
                            console.error('❌ Power Leveling: 既没有 <a> 标签也没有 data-bind 属性!');
                        }
                    }
                }
                
                // 获取标题和链接 - 修复链接处理
                const titleSelectors = [
                    'a.offer-details',                 // Accounts/Gold通用
                    '.offer-title a',                  // 通用offer标题
                    'a.txt',                           // Items
                    '.account-title a',                // Accounts特定
                    'a.txt-hot',                       // Power Leveling
                    '.product-detail-title a',
                    'h3 a',                            // 某些页面使用h3
                    '.offer-info a'                    // 备用
                ];
                
                let titleElement = null;
                for (const selector of titleSelectors) {
                    titleElement = element.querySelector(selector);
                    if (titleElement && titleElement.textContent.trim()) break;
                }
                
                if (titleElement) {
                    offerData.title = titleElement.textContent.trim();
                    
                    // 优先使用 Power Leveling URL (如果存在且已经是完整URL)
                    if (powerLevelingUrl && powerLevelingUrl.startsWith('http')) {
                        offerData.link = powerLevelingUrl;
                        console.log('✓ 使用 Power Leveling 完整URL:', offerData.link);
                    } else {
                        // 否则使用标准方式获取链接
                        let href = titleElement.getAttribute('href') || titleElement.href;
                        
                        if (href) {
                            if (href.startsWith('http://') || href.startsWith('https://')) {
                                // 完整的URL
                                offerData.link = href;
                            } else if (href.startsWith('//')) {
                                // 协议相对URL
                                offerData.link = window.location.protocol + href;
                            } else if (href.startsWith('/')) {
                                // 绝对路径
                                offerData.link = window.location.origin + href;
                            } else {
                                // 相对路径 - 相对于当前目录
                                const currentUrl = new URL(window.location.href);
                                const currentPath = currentUrl.pathname;
                                
                                // 如果当前路径以/结尾，直接追加
                                if (currentPath.endsWith('/')) {
                                    offerData.link = window.location.origin + currentPath + href;
                                } else {
                                    // 否则，获取目录部分
                                    const lastSlashIndex = currentPath.lastIndexOf('/');
                                    const baseDir = currentPath.substring(0, lastSlashIndex + 1);
                                    offerData.link = window.location.origin + baseDir + href;
                                }
                            }
                        } else if (titleElement.href) {
                            // 如果getAttribute('href')返回null，直接使用href属性
                            offerData.link = titleElement.href;
                        }
                    }
                    
                    // 验证生成的链接
                    if (offerData.link) {
                        urlStats.total++;
                        try {
                            const testUrl = new URL(offerData.link);
                            // 验证链接是否属于PlayerAuctions域
                            if (!testUrl.hostname.includes('playerauctions.com')) {
                                console.warn('⚠️ 链接不属于PA域:', offerData.link);
                                addLog(`警告: 检测到外部链接 - ${offerData.title}`, 'warning');
                                urlStats.external++;
                            } else {
                                urlStats.valid++;
                            }
                        } catch (e) {
                            console.error('❌ 生成的链接无效:', offerData.link);
                            
                            // 如果链接无效，尝试使用titleElement.href作为备用
                            if (titleElement.href && titleElement.href.startsWith('http')) {
                                console.log('🔧 尝试使用备用链接:', titleElement.href);
                                offerData.link = titleElement.href;
                                try {
                                    const fixedUrl = new URL(offerData.link);
                                    if (fixedUrl.hostname.includes('playerauctions.com')) {
                                        urlStats.fixed++;
                                        console.log('✓ 链接已修正');
                                    } else {
                                        urlStats.external++;
                                    }
                                } catch (e2) {
                                    console.error('❌ 备用链接也无效');
                                    urlStats.invalid++;
                                    return;  // 跳过这个无效的offer
                                }
                            } else {
                                console.error('❌ 无法获取有效链接，跳过此条目');
                                urlStats.invalid++;
                                return;  // 跳过这个无效的offer
                            }
                        }
                    }
                    
                    // 最终验证：确保链接不为空且格式正确
                    if (!offerData.link) {
                        console.error('❌ 未能提取链接，跳过此条目:', offerData.title);
                        urlStats.invalid++;
                        return;
                    }
                    
                    if (!offerData.link.startsWith('http')) {
                        console.error('❌ 链接格式错误（非HTTP）:', offerData.link);
                        urlStats.invalid++;
                        return;
                    }
                    
                    // Power Leveling 特殊验证
                    if (offerData.serviceType === 'power-leveling' && powerLevelingUrl) {
                        console.log('✓ Power Leveling URL:', offerData.link);
                        console.log('  data-bind:', element.getAttribute('data-bind'));
                    }
                }

                // 关键词过滤
                if (keywordList.length > 0) {
                    const titleLower = offerData.title.toLowerCase();
                    const hasKeyword = keywordList.some(keyword => titleLower.includes(keyword));
                    if (!hasKeyword) {
                        return; // 跳过不匹配的项
                    }
                }
                
                // 获取服务器信息（主要用于金币类）- 修复选择器
                const serverSelectors = [
                    '.offer-title-lv2 a',              // 金币类页面的服务器链接
                    '.txt-gray.offer-title-lv2 a',     // 灰色文本的服务器
                    '.server-name',                    // 直接的服务器名称
                    '.offer-subtitle a',               // 副标题中的服务器
                    'a[href*="/server/"]',             // 包含/server/的链接
                    '.offer-server'                    // 备用
                ];
                
                for (const selector of serverSelectors) {
                    const serverElement = element.querySelector(selector);
                    if (serverElement) {
                        offerData.server = serverElement.textContent.trim();
                        break;
                    }
                }
                
                // 获取卖家名称 - 改进选择器
                const sellerNameSelectors = [
                    '.offer-seller-name a span',
                    '.offer-seller-name span',
                    '.seller-name span',
                    'a[href*="/store/"] span',
                    '.seller-info .name',
                    '.offer-seller span'
                ];
                
                for (const selector of sellerNameSelectors) {
                    const sellerElement = element.querySelector(selector);
                    if (sellerElement && sellerElement.textContent.trim()) {
                        offerData.sellerName = sellerElement.textContent.trim();
                        break;
                    }
                }
                
                // 获取卖家信息
                const sellerInfoList = element.querySelector('ul.text-left, .seller-info ul, .offer-seller-info');
                if (sellerInfoList) {
                    const listItems = sellerInfoList.querySelectorAll('li');
                    listItems.forEach(li => {
                        const text = li.textContent.trim();
                        
                        // 卖家等级
                        const levelMatch = text.match(/(?:Lvl|Level|Seller Lvl)\s*(\d+)/i);
                        if (levelMatch) {
                            offerData.sellerLevel = levelMatch[1];
                        }
                        
                        // 总订单数
                        const ordersMatch = text.match(/Total orders:\s*([\d,]+)/i);
                        if (ordersMatch) {
                            offerData.totalOrders = ordersMatch[1].replace(/,/g, '');
                        }
                        
                        // 注册时间
                        const sinceMatch = text.match(/Member since:\s*(\d{4})/i);
                        if (sinceMatch) {
                            offerData.memberSince = sinceMatch[1];
                        }
                    });
                    
                    // 获取评分
                    const ratingElement = sellerInfoList.querySelector('.offer-rating, .offer-item-rating, .rating');
                    if (ratingElement) {
                        const ratingText = ratingElement.textContent.trim();
                        const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
                        if (ratingMatch) {
                            offerData.sellerRating = ratingMatch[1];
                        }
                    }
                }
                
                // 【重点修复】获取价格 - 增强选择器和提取逻辑
                const priceSelectors = [
                    // 精确选择器
                    '.offer-price-tag span',           // 价格标签内的span
                    '.offer-price-tag',                // 主要价格标签
                    '.offer-price span',               // offer价格内的span
                    '.offer-price',                    // offer价格
                    '.price-tag span',                 // 价格标签内的span
                    '.price-tag',                      // 价格标签
                    '.price span',                     // 价格内的span
                    '.price',                          // 简单价格
                    
                    // 特定类型选择器
                    'span.txt-color',                  // 彩色价格文本
                    'span.txt-hot',                    // 热门价格文本
                    '.txt-color',                      // 彩色文本（可能是价格）
                    
                    // 更宽泛的选择器
                    '.offer-item-price',               // offer项目价格
                    '.item-price',                     // 项目价格
                    '.product-price',                  // 产品价格
                    
                    // 包含price的任何元素（但排除delivery相关）
                    '[class*="price"]:not([class*="delivery"]):not([class*="old"])',
                    
                    // 文本内容包含美元符号的span
                    'span:not([class*="delivery"])'
                ];
                
                // 先尝试精确选择器
                for (const selector of priceSelectors) {
                    const priceElements = element.querySelectorAll(selector);
                    for (const priceElement of priceElements) {
                        const priceText = priceElement.textContent.trim();
                        
                        // 跳过明显不是价格的文本
                        if (priceText.length > 50 || !priceText) continue;
                        
                        // 改进价格匹配 - 支持多种货币格式
                        const pricePatterns = [
                            /\$\s*([\d,]+(?:\.\d+)?)/,        // $ 123.45 (有空格)
                            /\$([\d,]+(?:\.\d+)?)/,           // $123.45
                            /USD\s*([\d,]+(?:\.\d+)?)/i,      // USD 123.45
                            /([\d,]+(?:\.\d+)?)\s*USD/i,      // 123.45 USD
                            /^\$([\d,]+(?:\.\d+)?)$/,         // 仅价格
                            /([\d,]+(?:\.\d+)?)\s*\$/,        // 123.45$
                            /^([\d,]+(?:\.\d+)?)$/            // 纯数字（如果在价格相关元素中）
                        ];
                        
                        for (const pattern of pricePatterns) {
                            const priceMatch = priceText.match(pattern);
                            if (priceMatch) {
                                const priceValue = priceMatch[1].replace(/,/g, '');
                                // 验证价格合理性（大于0，小于1000000）
                                const numPrice = parseFloat(priceValue);
                                if (numPrice > 0 && numPrice < 1000000) {
                                    offerData.price = priceValue;
                                    console.log(`找到价格: ${priceValue} 使用选择器: ${selector}`);
                                    break;
                                }
                            }
                        }
                        
                        if (offerData.price) break;
                    }
                    
                    if (offerData.price) break;
                }
                
                // 如果还没有价格，尝试从特定位置查找
                if (!offerData.price) {
                    // 查找所有包含美元符号的文本节点
                    const walker = document.createTreeWalker(
                        element,
                        NodeFilter.SHOW_TEXT,
                        {
                            acceptNode: function(node) {
                                const text = node.textContent.trim();
                                if (text && text.includes('$') && text.length < 50) {
                                    return NodeFilter.FILTER_ACCEPT;
                                }
                                return NodeFilter.FILTER_REJECT;
                            }
                        },
                        false
                    );
                    
                    let node;
                    while (node = walker.nextNode()) {
                        const text = node.textContent.trim();
                        const priceMatch = text.match(/\$\s*([\d,]+(?:\.\d+)?)/);
                        if (priceMatch) {
                            const priceValue = priceMatch[1].replace(/,/g, '');
                            const numPrice = parseFloat(priceValue);
                            if (numPrice > 0 && numPrice < 1000000) {
                                offerData.price = priceValue;
                                console.log(`通过文本节点找到价格: ${priceValue}`);
                                break;
                            }
                        }
                    }
                }
                
                // 最后的备用方案：从整个元素HTML中查找价格
                if (!offerData.price) {
                    const elementHTML = element.innerHTML;
                    // 查找类似 >$123.45< 的模式
                    const htmlPriceMatch = elementHTML.match(/>?\$\s*([\d,]+(?:\.\d+)?)</);
                    if (htmlPriceMatch) {
                        const priceValue = htmlPriceMatch[1].replace(/,/g, '');
                        const numPrice = parseFloat(priceValue);
                        if (numPrice > 0 && numPrice < 1000000) {
                            offerData.price = priceValue;
                            console.log(`从HTML中找到价格: ${priceValue}`);
                        }
                    }
                }
                
                // 获取交付时间 - 修复：只提取时间部分
                const deliverySelectors = [
                    '.OLP-delivery-text',
                    '.offer-delivery',
                    '.delivery-time',
                    '[class*="delivery"]:not(.offer-delivery-seller)'
                ];
                
                for (const selector of deliverySelectors) {
                    const deliveryElement = element.querySelector(selector);
                    if (deliveryElement) {
                        // 获取直接文本节点，避免获取子元素的文本
                        let deliveryText = '';
                        for (const node of deliveryElement.childNodes) {
                            if (node.nodeType === Node.TEXT_NODE) {
                                deliveryText += node.textContent;
                            }
                        }
                        deliveryText = deliveryText.trim();
                        
                        // 如果没有直接文本，获取整个文本
                        if (!deliveryText) {
                            deliveryText = deliveryElement.textContent.trim();
                        }
                        
                        // 多种时间格式匹配
                        const timePatterns = [
                            /(\d+\s*(?:min|mins|minute|minutes|hour|hours|hr|hrs|day|days|week|weeks))/i,
                            /(\d+\s*-\s*\d+\s*(?:min|hour|day|week)s?)/i,  // 范围时间如 "1-2 hours"
                            /(?:Within|In)\s+(\d+\s*(?:min|hour|day|week)s?)/i
                        ];
                        
                        for (const pattern of timePatterns) {
                            const timeMatch = deliveryText.match(pattern);
                            if (timeMatch) {
                                offerData.deliveryTime = timeMatch[1].trim();
                                break;
                            }
                        }
                        
                        if (offerData.deliveryTime) break;
                    }
                }
                
                // 特殊处理：Accounts页面的数据结构可能不同
                if (offerData.serviceType === 'account' || offerData.serviceType === 'accounts') {
                    // 尝试获取账号特定信息
                    const accountInfoElement = element.querySelector('.account-info, .offer-description');
                    if (accountInfoElement && !offerData.title) {
                        offerData.title = accountInfoElement.textContent.trim().substring(0, 100); // 限制长度
                    }
                    
                    // 账号页面可能没有服务器信息，尝试从标题提取
                    if (!offerData.server && offerData.title) {
                        const serverMatch = offerData.title.match(/\[([^\]]+)\]/);
                        if (serverMatch) {
                            offerData.server = serverMatch[1];
                        }
                    }
                }
                
                // 特殊处理：Power Leveling页面
                if (offerData.serviceType === 'power-leveling' || offerData.serviceType === 'boosting') {
                    // 尝试获取代练特定信息
                    const serviceInfoElement = element.querySelector('.service-info, .boost-info');
                    if (serviceInfoElement && !offerData.title) {
                        offerData.title = serviceInfoElement.textContent.trim().substring(0, 100);
                    }
                }
                
                // 调试日志 - 帮助诊断问题
                if (!offerData.price) {
                    console.warn('未找到价格，元素:', element);
                    console.log('元素HTML片段:', element.innerHTML.substring(0, 500));
                }
                if (!offerData.server && (offerData.serviceType === 'gold' || offerData.serviceType === 'currency')) {
                    console.log('未找到服务器，元素内容：', element.innerHTML.substring(0, 500));
                }
                
                // 只添加有效数据
                if (offerData.title || offerData.price) {
                    offers.push(offerData);
                }
                
            } catch (error) {
                console.error('解析元素出错:', error);
                addLog(`解析第 ${index + 1} 个元素出错: ${error.message}`, 'error');
            }
        });
        
        // 输出URL验证统计
        if (urlStats.total > 0) {
            console.log('📊 URL验证统计:');
            console.log(`  总处理: ${urlStats.total}`);
            console.log(`  ✓ 有效: ${urlStats.valid}`);
            console.log(`  🔧 修复: ${urlStats.fixed}`);
            console.log(`  ❌ 无效: ${urlStats.invalid}`);
            console.log(`  ⚠️ 外部: ${urlStats.external}`);
            
            const validRate = ((urlStats.valid + urlStats.fixed) / urlStats.total * 100).toFixed(1);
            addLog(`URL验证: ${urlStats.total}个，有效${urlStats.valid}个，修复${urlStats.fixed}个，跳过${urlStats.invalid}个 (${validRate}%通过)`, 'info');
            
            if (urlStats.invalid > 0) {
                addLog(`⚠️ 发现${urlStats.invalid}个无效链接已跳过`, 'warning');
            }
        }
        
        addLog(`成功解析 ${offers.length} 个商品`, 'info');
        return offers;
    }

    // 检测服务类型
    function detectServiceType() {
        const url = window.location.href;
        for (const [key, name] of Object.entries(SERVICE_TYPE_MAP)) {
            if (url.includes(`-${key}/`) || url.includes(`-${key}?`)) {
               
                return key;
            }
        }
        return '';
    }

    // 更新数据预览
    function updateDataPreview(data) {
        const previewDiv = document.getElementById('pa-data-preview');
        const previewContent = document.getElementById('pa-preview-content');
        
        if (!previewDiv || !previewContent) return;
        
        if (data && data.length > 0) {
            previewDiv.style.display = 'block';
            const lastItems = data.slice(-3);
            previewContent.innerHTML = lastItems.map(item => `
                <div class="pa-data-item">
                    <strong>标题:</strong> ${item.title || 'N/A'}<br>
                    <strong>卖家:</strong> ${ item.sellerName || 'N/A'} (Lv.${item.sellerLevel || '?'})<br>
                    <strong>价格:</strong> $${item.price || 'N/A'}<br>
                    <strong>评分:</strong> ${item.sellerRating || 'N/A'}<br>
                    ${item.server ? `<strong>服务器:</strong> ${item.server}<br>` : ''}
                    <strong>交付:</strong> ${item.deliveryTime || 'N/A'}
                </div>
            `).join('');
        }
    }

    // 爬取当前页面
    async function scrapeCurrentPage() {
        addLog('开始爬取当前页面...', 'info');
        updateProgress('正在爬取当前页面...');
        
        try {
            const pageData = extractPageData();
            
            if (pageData.length === 0) {
                addLog('未找到商品数据或数据不匹配关键词', 'warning');
                return;
            }
            
            const { data: collectedData, links: uniqueLinks } = loadStoredData();
            let newItems = 0;
            
            // 🔧 改用商品URL去重,而不是标题
            pageData.forEach(item => {
                if (!uniqueLinks.has(item.link)) {
                    uniqueLinks.add(item.link);
                    item.index = collectedData.length + 1;
                    collectedData.push(item);
                    newItems++;
                } else {
                    console.log(`⚠️ 跳过重复商品: ${item.title} (URL已存在)`);
                }
            });
            
            saveDataToStorage(collectedData, uniqueLinks);
            
            addLog(`成功爬取 ${pageData.length} 条数据，新增 ${newItems} 条`, 'success');
            updateProgress(`当前页面爬取完成`);
            updateDataPreview(collectedData);
            
        } catch (error) {
            addLog(`爬取失败: ${error.message}`, 'error');
            console.error('爬取错误:', error);
        }
    }

    // 多页爬取
    async function startMultiPageScraping() {
        if (isScrapingActive) {
            addLog('爬取已在进行中', 'warning');
            return;
        }
        
        let service = document.getElementById('pa-service-select').value;
        const maxPages = parseInt(document.getElementById('pa-max-pages').value);
        
        if (!selectedGameKey || !service) {
            alert('请先选择游戏和服务类型！');
            return;
        }
        
        // 🔧 服务类型规范化
        service = normalizeServiceType(service);
        
        const game = gamesDatabase[selectedGameKey];
        if (!game) {
            alert('请先选择游戏！');
            return;
        }
        
        isScrapingActive = true;
        currentScrapingPage = 1;
        totalPagesToScrape = maxPages;
        
        // 保存爬取任务信息
        GM_setValue('scrapingTask', {
            active: true,
            game: selectedGameKey,
            gameName: game.name,
            service: service,
            serviceName: game.services[service] || SERVICE_TYPE_MAP[service],
            currentPage: currentScrapingPage,
            totalPages: totalPagesToScrape,
            keywords: document.getElementById('pa-keyword-filter')?.value || '',
            startTime: new Date().toISOString()
        });
        
        toggleScrapingButtons(true);
        
        addLog(`开始多页爬取: ${game.name} - ${game.services[service] || SERVICE_TYPE_MAP[service]}, 目标 ${maxPages} 页`, 'success');
        
        // 如果不在目标页面，先跳转
        const currentUrl = window.location.href;
        const targetBaseUrl = `https://www.playerauctions.com/${selectedGameKey}-${service}/`;
        
        if (!currentUrl.includes(`${selectedGameKey}-${service}`)) {
            addLog('正在跳转到目标页面...', 'info');
            window.location.href = targetBaseUrl;
        } else {
            // 开始自动爬取流程
            await autoScrapePages();
        }
    }

    // 爬取所有页面
    async function startAllPagesScraping() {
        // 检测总页数
        const pageInfoText = document.getElementById('pa-page-info-text').textContent;
        const match = pageInfoText.match(/第 \d+\/(\d+) 页/);
        
        if (match) {
            const totalPages = parseInt(match[1]);
            document.getElementById('pa-max-pages').value = totalPages;
            addLog(`检测到共 ${totalPages} 页，开始爬取所有页面`, 'info');
            await startMultiPageScraping();
        } else {
            addLog('无法检测总页数', 'error');
        }
    }

    // 自动爬取页面
    async function autoScrapePages() {
        const task = GM_getValue('scrapingTask', null);
        if (!task || !task.active) return;
        
        // 获取当前URL的页码
        let currentUrlPage = 1;
        const urlPatterns = [
            /PageIndex=(\d+)/i,
            /page=(\d+)/i,
            /p=(\d+)/i,
            /\/page\/(\d+)/i
        ];
        
        for (const pattern of urlPatterns) {
            const urlMatch = window.location.href.match(pattern);
            if (urlMatch) {
                currentUrlPage = parseInt(urlMatch[1]);
                break;
            }
        }
        
        // 爬取当前页
        await scrapeCurrentPage();
        
        // 检查是否继续
        if (currentUrlPage < task.totalPages) {
            // 更新任务进度
            task.currentPage = currentUrlPage + 1;
            GM_setValue('scrapingTask', task);
            
            addLog(`准备跳转到第 ${task.currentPage} 页...`, 'info');
            updateProgress(`即将跳转到第 ${task.currentPage}/${task.totalPages} 页...`);
            
            // 等待一下然后跳转 - 使用改进的URL构建
            setTimeout(() => {
                let nextPageUrl;
                
                // 先尝试从页面找到下一页链接
                const nextLink = document.querySelector('a[aria-label*="Next" i], a.next, a[rel="next"], .page-item.next a');
                if (nextLink) {
                    const href = nextLink.getAttribute('href');
                    if (href) {
                        if (href.startsWith('http://') || href.startsWith('https://')) {
                            nextPageUrl = href;
                        } else if (href.startsWith('//')) {
                            nextPageUrl = window.location.protocol + href;
                        } else if (href.startsWith('/')) {
                            nextPageUrl = window.location.origin + href;
                        } else {
                            const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
                            nextPageUrl = window.location.origin + currentPath + '/' + href;
                        }
                    }
                }
                
                // 如果没找到下一页链接，手动构建
                if (!nextPageUrl) {
                    nextPageUrl = buildPageUrl(task.game, task.service, task.currentPage);
                } else {
                    // 更新页码参数
                    const url = new URL(nextPageUrl);
                    url.searchParams.set('PageIndex', task.currentPage.toString());
                    nextPageUrl = url.toString();
                }
                
                window.location.href = nextPageUrl;
            }, 2000);
        } else {
            // 爬取完成
            stopScraping();
            addLog(`多页爬取完成！共爬取 ${task.totalPages} 页`, 'success');
        }
    }

    // 构建页面URL - 改进版
    function buildPageUrl(game, service, pageIndex) {
        const baseUrl = `https://www.playerauctions.com/${game}-${service}/`;
        
        if (pageIndex > 1) {
            // 使用URL对象构建，确保格式正确
            const url = new URL(baseUrl);
            url.searchParams.set('PageIndex', pageIndex.toString());
            return url.toString();
        }
        
        return baseUrl;
    }

    // 切换爬取按钮状态
    function toggleScrapingButtons(isActive) {
        document.getElementById('pa-start-btn').style.display = isActive ? 'none' : 'block';
        document.getElementById('pa-start-multi-btn').style.display = isActive ? 'none' : 'block';
        document.getElementById('pa-start-all-btn').style.display = isActive ? 'none' : 'block';
        document.getElementById('pa-stop-btn').style.display = isActive ? 'block' : 'none';
    }

    // 停止爬取
    function stopScraping() {
        isScrapingActive = false;
        GM_setValue('scrapingTask', { active: false });
        
        toggleScrapingButtons(false);
        
        const { data: collectedData } = loadStoredData();
        updateProgress(`完成！共收集 ${collectedData.length} 条数据`);
        addLog(`爬取完成，共 ${collectedData.length} 条唯一数据`, 'success');
    }

    // 导出数据
    function exportData(format) {
        const { data: collectedData } = loadStoredData();
        
        if (collectedData.length === 0) {
            alert('没有数据可以导出！');
            return;
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const game = collectedData[0].game || 'unknown';
        const service = collectedData[0].serviceType || 'unknown';
        
        if (format === 'csv') {
            exportCSV(collectedData, `PA_${game}_${service}_${timestamp}.csv`);
        } else if (format === 'json') {
            exportJSON(collectedData, `PA_${game}_${service}_${timestamp}.json`);
        }
    }

    // 导出CSV
    function exportCSV(data, filename) {
        const headers = ['序号', 'Offer ID', '商品标题', '卖家名称', '卖家等级', '卖家评分', '总订单数', '注册年份', '价格($)', '服务器', '交付时间', '游戏', '服务类型', '详情链接', 'URL状态', '爬取时间'];
        
        // 验证每个链接的状态
        const dataWithStatus = data.map(item => {
            let urlStatus = '未知';
            if (item.link) {
                try {
                    const url = new URL(item.link);
                    if (url.hostname.includes('playerauctions.com')) {
                        urlStatus = '有效';
                    } else {
                        urlStatus = '外部链接';
                    }
                } catch (e) {
                    urlStatus = '无效';
                }
            } else {
                urlStatus = '缺失';
            }
            return { ...item, urlStatus };
        });
        
        const csvContent = [
            headers.join(','),
            ...dataWithStatus.map(item => [
                item.index || '',
                item.offerId || '',
                `"${(item.title || '').replace(/"/g, '""')}"`,
                `"${(item.sellerName || '').replace(/"/g, '""')}"`,
                item.sellerLevel || '',
                item.sellerRating || '',
                item.totalOrders || '',
                item.memberSince || '',
                item.price || '',
                `"${(item.server || '').replace(/"/g, '""')}"`,
                `"${(item.deliveryTime || '').replace(/"/g, '""').substring(0, 50)}"`,  // 限制交付时间长度
                gamesDatabase[item.game]?.name || item.game || '',
                SERVICE_TYPE_MAP[item.serviceType] || item.serviceType || '',
                item.link || '',
                item.urlStatus || '',
                item.scrapedAt || ''
            ].join(','))
        ].join('\n');
        
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
        downloadFile(blob, filename);
        
        // 统计URL状态
        const statusCount = {
            valid: dataWithStatus.filter(item => item.urlStatus === '有效').length,
            external: dataWithStatus.filter(item => item.urlStatus === '外部链接').length,
            invalid: dataWithStatus.filter(item => item.urlStatus === '无效').length,
            missing: dataWithStatus.filter(item => item.urlStatus === '缺失').length
        };
        
        console.log('📊 导出数据URL统计:');
        console.log(`  有效: ${statusCount.valid}`);
        console.log(`  外部: ${statusCount.external}`);
        console.log(`  无效: ${statusCount.invalid}`);
        console.log(`  缺失: ${statusCount.missing}`);
        
        addLog(`导出CSV成功: ${data.length}条数据，有效URL ${statusCount.valid}个`, 'success');
        if (statusCount.invalid + statusCount.missing > 0) {
            addLog(`⚠️ ${statusCount.invalid + statusCount.missing}个条目URL有问题`, 'warning');
        }
    }

    // 导出JSON
    function exportJSON(data, filename) {
        const exportData = data.map(item => {
            // 验证URL状态
            let urlStatus = '未知';
            let urlValid = false;
            if (item.link) {
                try {
                    const url = new URL(item.link);
                    if (url.hostname.includes('playerauctions.com')) {
                        urlStatus = '有效';
                        urlValid = true;
                    } else {
                        urlStatus = '外部链接';
                    }
                } catch (e) {
                    urlStatus = '无效';
                }
            } else {
                urlStatus = '缺失';
            }
            
            return {
                ...item,
                gameName: gamesDatabase[item.game]?.name || item.game,
                serviceTypeName: SERVICE_TYPE_MAP[item.serviceType] || item.serviceType,
                urlStatus,
                urlValid
            };
        });
        
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        downloadFile(blob, filename);
        
        // 统计URL状态
        const validCount = exportData.filter(item => item.urlValid).length;
        const invalidCount = data.length - validCount;
        
        addLog(`导出JSON成功: ${data.length}条数据，有效URL ${validCount}个`, 'success');
        if (invalidCount > 0) {
            addLog(`⚠️ ${invalidCount}个条目URL有问题`, 'warning');
        }
    }

    // 下载文件
    function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 清空数据
    function clearData() {
        const { data: collectedData } = loadStoredData();
        
        if (collectedData.length > 0) {
            if (!confirm(`确定清空 ${collectedData.length} 条数据吗？`)) {
                return;
            }
        }
        
        GM_deleteValue('scrapedData');
        GM_deleteValue('uniqueTitles');  // 旧的键名(兼容清理)
        GM_deleteValue('uniqueLinks');   // 新的键名
        GM_deleteValue('scrapingTask');
        
        document.getElementById('pa-collected-count').textContent = '0';
        document.getElementById('pa-unique-count').textContent = '0';
        document.getElementById('pa-export-csv-btn').disabled = true;
        document.getElementById('pa-export-csv-btn').textContent = '📊 导出CSV (0条)';
        document.getElementById('pa-export-json-btn').disabled = true;
        document.getElementById('pa-data-preview').style.display = 'none';
        document.getElementById('pa-scraper-log').innerHTML = '';
        
        addLog('数据已清空', 'info');
    }

    // 检查是否有未完成的任务
    function checkPendingTask() {
        const task = GM_getValue('scrapingTask', null);
        if (task && task.active) {
            isScrapingActive = true;
            currentScrapingPage = task.currentPage;
            totalPagesToScrape = task.totalPages;
            
            // 恢复关键词
            const keywordInput = document.getElementById('pa-keyword-filter');
            if (keywordInput && task.keywords) {
                keywordInput.value = task.keywords;
            }
            
            toggleScrapingButtons(true);
            
            addLog(`检测到未完成的爬取任务 (${task.gameName} - ${task.service})，继续执行...`, 'info');
            updateProgress(`继续爬取第 ${currentScrapingPage}/${totalPagesToScrape} 页...`);
            
            // 继续自动爬取
            setTimeout(() => autoScrapePages(), 2000);
        }
    }

    // ===== Cloudflare 验证处理函数 =====
    // 检测是否需要处理 Cloudflare
    function checkForCloudflare() {
        // 检测 Cloudflare challenge 页面的多种指标
        const indicators = {
            iframe: !!document.querySelector('iframe[src*="challenges.cloudflare.com"]'),
            cfWidget: !!document.querySelector('iframe[id^="cf-chl-widget"]'),
            turnstile: !!document.querySelector('.cf-turnstile'),
            sitekey: !!document.querySelector('[data-sitekey]'),
            titleCheck: document.title.includes('Just a moment') || document.title.includes('Cloudflare'),
            bodyCheck: document.body?.textContent?.includes('Checking your browser') || 
                       document.body?.textContent?.includes('Cloudflare') || false,
            challengeRunning: !!document.querySelector('#challenge-running'),
            challengeForm: !!document.querySelector('.challenge-form')
        };

        // 需要至少有一个强指标才认为是 Cloudflare
        const hasCloudflare = indicators.iframe || 
                             indicators.cfWidget || 
                             indicators.turnstile || 
                             indicators.sitekey ||
                             indicators.challengeRunning ||
                             indicators.challengeForm ||
                             (indicators.titleCheck && indicators.bodyCheck); // 标题和内容同时包含才算
        
        if (hasCloudflare) {
            console.log('Cloudflare 检测结果:', {
                iframe: indicators.iframe,
                cfWidget: indicators.cfWidget,
                turnstile: indicators.turnstile,
                sitekey: indicators.sitekey,
                title: document.title
            });
        }
        
        return hasCloudflare;
    }

    // 改进的 Cloudflare 处理函数
    async function handleCloudflareTurnstile() {
        showCloudflareStatus();
        updateCfProgress(0, '初始化...');
        addCfLog('开始处理 Cloudflare Turnstile', 'info');
        
        // 获取 sitekey
        let sitekey = '';
        
        // 从 iframe 提取
        const iframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
        if (iframe) {
            const src = iframe.src;
            addCfLog(`发现 iframe: ${src.substring(0, 100)}...`, 'info');
            
            // 提取 sitekey (格式: /0x4AAAAAAADnPIDROrmt1Wwj/)
            const pathMatch = src.match(/\/0x[A-Za-z0-9]+/);
            if (pathMatch) {
                sitekey = pathMatch[0].substring(1);
                addCfLog(`提取到 sitekey: ${sitekey}`, 'success');
            }
        }
        
        // 从 data-sitekey 属性获取
        if (!sitekey) {
            const sitekeyElement = document.querySelector('[data-sitekey]');
            if (sitekeyElement) {
                sitekey = sitekeyElement.dataset.sitekey;
                addCfLog(`从属性获取 sitekey: ${sitekey}`, 'success');
            }
        }
        
        if (!sitekey) {
            updateCfProgress(0, '❌ 获取 sitekey 失败');
            addCfLog('无法获取 sitekey', 'error');
            return false;
        }
        
        // 显示 sitekey
        document.getElementById('pa-cf-sitekey').textContent = sitekey.substring(0, 20) + '...';
        updateCfProgress(10, '创建任务...');
        
        try {
            // 创建任务
            const taskId = await createTurnstileTask(sitekey);
            if (!taskId) {
                updateCfProgress(0, '❌ 创建任务失败');
                addCfLog('创建任务失败', 'error');
                return false;
            }
            
            document.getElementById('pa-cf-taskid').textContent = taskId;
            addCfLog(`任务创建成功: ${taskId}`, 'success');
            updateCfProgress(20, '等待处理...');
            
            // 等待结果
            const solution = await waitForTaskResultWithProgress(taskId);
            if (!solution) {
                updateCfProgress(0, '❌ 获取结果失败');
                addCfLog('获取验证结果失败', 'error');
                return false;
            }
            
            updateCfProgress(90, '应用结果...');
            addCfLog('获取到验证结果，正在应用...', 'success');
            
            // 应用结果
            await applyTurnstileSolution(solution);
            
            updateCfProgress(100, '✅ 验证完成');
            addCfLog('验证成功完成！', 'success');
            
            // 3秒后关闭面板
            setTimeout(() => {
                const panel = document.getElementById('pa-cloudflare-panel');
                if (panel) panel.remove();
            }, 3000);
            
            return true;
            
        } catch (error) {
            updateCfProgress(0, '❌ 处理失败');
            addCfLog(`错误: ${error.message}`, 'error');
            return false;
        }
    }

    // 等待任务结果（带进度更新）
    async function waitForTaskResultWithProgress(taskId) {
        let attempts = 0;
        
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${YESCAPTCHA_CONFIG.apiUrl}/getTaskResult`,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        clientKey: YESCAPTCHA_CONFIG.clientKey,
                        taskId: taskId
                    }),
                    onload: function(response) {
                        try {
                            const data = JSON.parse(response.responseText);
                            
                            if (data.errorId === 0) {
                                if (data.status === 'ready' && data.solution) {
                                    clearInterval(checkInterval);
                                    updateCfProgress(80, '验证成功');
                                    addCfLog('验证码解决成功', 'success');
                                    resolve(data.solution.token);
                                } else if (data.status === 'processing') {
                                    const progress = 20 + (attempts * 60 / YESCAPTCHA_CONFIG.maxAttempts);
                                    updateCfProgress(Math.min(progress, 80), `处理中 (${attempts}/${YESCAPTCHA_CONFIG.maxAttempts})`);
                                    addCfLog(`任务处理中... 尝试 ${attempts + 1}`, 'info');
                                }
                            } else {
                                addCfLog(`API错误: ${data.errorDescription}`, 'error');
                                clearInterval(checkInterval);
                                resolve(null);
                            }
                        } catch (e) {
                            addCfLog(`解析响应失败: ${e.message}`, 'error');
                        }
                        
                        attempts++;
                        if (attempts >= YESCAPTCHA_CONFIG.maxAttempts) {
                            clearInterval(checkInterval);
                            addCfLog('处理超时', 'error');
                            resolve(null);
                        }
                    },
                    onerror: function(error) {
                        addCfLog(`网络错误: ${error.message || '未知'}`, 'error');
                        attempts++;
                        if (attempts >= YESCAPTCHA_CONFIG.maxAttempts) {
                            clearInterval(checkInterval);
                            resolve(null);
                        }
                    }
                });
            }, YESCAPTCHA_CONFIG.checkInterval);
        });
    }

    // 创建测试按钮 (修复版本)
    // 测试按钮功能(已集成到主面板,此功能已移除)
    function createTestButton() {
        // 功能已集成到主面板的 Cloudflare 状态区
        // 不再需要独立测试按钮
    }

    // 自动处理 Cloudflare
    async function autoHandleCloudflare() {
        if (checkForCloudflare()) {
            console.log('检测到 Cloudflare 验证，自动处理中...');
            await handleCloudflareTurnstile();
        }
    }

    // 修改初始化函数
    async function init() {
        console.log('%c[PA爬取工具] 初始化开始...', 'color: #4CAF50; font-weight: bold');
        
        // 先创建主面板
        createControlPanel();
        console.log('%c[PA爬取工具] 主面板已创建', 'color: #2196F3');
        addLog('PA爬取工具 v8.6 已加载', 'success');
        addLog('按 Alt+S 显示/隐藏面板', 'info');
        
        // 检查 Cloudflare
        if (checkForCloudflare()) {
            console.log('%c[PA爬取工具] 检测到 Cloudflare 验证，准备处理...', 'color: #FF9800; font-weight: bold');
            updateCfStatus('checking', '⚠️ 检测到 Cloudflare');
            await autoHandleCloudflare();
        } else {
            console.log('%c[PA爬取工具] 未检测到 Cloudflare', 'color: #4CAF50');
            updateCfStatus('safe', '✓ 未检测到 Cloudflare');
        }
        
        checkPendingTask();
        console.log('%c[PA爬取工具] 初始化完成 ✓', 'color: #4CAF50; font-weight: bold; font-size: 14px');
    }
    
    // 更新 Cloudflare 状态显示
    // 更新 Cloudflare 状态显示 (新版)
    function updateCfStatus(state, message) {
        const cfSection = document.getElementById('pa-cf-status-section');
        const cfStatus = document.getElementById('pa-cf-status'); // 现在是badge
        
        if (cfSection) {
            // 移除所有状态类
            cfSection.classList.remove('checking', 'error');
            // 添加新状态类
            if (state === 'checking') {
                cfSection.classList.add('checking');
            } else if (state === 'error') {
                cfSection.classList.add('error');
            }
            // safe/verified 不需要特殊类
        }
        
        if (cfStatus && message) {
            // 简化显示文本用于badge
            if (message.includes('未检测') || message.includes('安全')) {
                cfStatus.textContent = '安全';
            } else if (message.includes('检测到')) {
                cfStatus.textContent = '处理中';
            } else if (message.includes('成功') || message.includes('完成')) {
                cfStatus.textContent = '已验证';
            } else if (message.includes('失败') || message.includes('错误')) {
                cfStatus.textContent = '错误';
            } else {
                cfStatus.textContent = message;
            }
        }
    }

    // 页面加载完成后初始化 - 改进启动逻辑
    console.log('%c[PA爬取工具] 脚本已加载，准备初始化...', 'color: #9C27B0; font-weight: bold');
    
    // 尽快启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('%c[PA爬取工具] DOM 加载完成', 'color: #2196F3');
            init();
        });
    } else {
        // DOM 已加载，延迟一点以确保页面稳定
        console.log('%c[PA爬取工具] DOM 已就绪，500ms 后启动', 'color: #2196F3');
        setTimeout(init, 500);
    }

    // 监听页面变化 - 修复版
    const observer = new MutationObserver((mutations) => {
        // 只在确实有 Cloudflare 元素且状态区未显示时才处理
        const hasRealCloudflare = document.querySelector('iframe[src*="challenges.cloudflare.com"]') ||
                                  document.querySelector('.cf-turnstile') ||
                                  document.querySelector('[data-sitekey]');
        
        const cfSection = document.getElementById('pa-cf-status-section');
        const isStatusShowing = cfSection && cfSection.classList.contains('active');
        
        if (hasRealCloudflare && !isStatusShowing) {
            console.log('检测到新的 Cloudflare challenge');
            autoHandleCloudflare();
        }
    });
    
    // 确保 body 存在后再开始观察
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

})();
/**
 * Formula Module Entry Point
 * 公式复制功能的入口，自动初始化，完全独立运行
 *
 * 特性：
 * - 完全独立，不依赖时间轴功能
 * - 自动初始化和清理
 * - 所有匹配的网站都会执行
 * - ✅ 错误隔离：防止 temml 库加载失败影响其他功能
 */

(function() {
    'use strict';

    // 全局 FormulaManager 实例
    let globalFormulaManager = null;

    /**
     * 检查 temml 库是否可用
     */
    function checkTemmlAvailable() {
        try {
            // temml 应该已经通过 content_scripts 加载
            // 检查是否定义了全局变量或命名空间
            return typeof temml !== 'undefined' ||
                   typeof window.temml !== 'undefined' ||
                   typeof TeXMml !== 'undefined';
        } catch (e) {
            return false;
        }
    }

    /**
     * 初始化公式复制功能
     */
    async function initFormulaModule() {
        // 避免重复初始化
        if (globalFormulaManager) {
            return;
        }

        // ✅ 检查 temml 库是否可用（防止加载失败）
        if (!checkTemmlAvailable()) {
            // 静默失败，不影响其他功能
            // 这个错误通常由页面监控脚本误报，实际 temml 可能已正常加载
            return;
        }

        // 检查依赖
        if (typeof FormulaManager === 'undefined') {
            console.error('[Formula] FormulaManager is not loaded');
            return;
        }

        if (typeof FormulaSourceParser === 'undefined') {
            console.error('[Formula] FormulaSourceParser is not loaded');
            return;
        }

        try {
            // 创建并初始化 FormulaManager（内部会检查是否启用）
            globalFormulaManager = new FormulaManager();
            await globalFormulaManager.init();
        } catch (error) {
            // ✅ 错误隔离：捕获所有异常，防止影响其他功能
            console.error('[Formula] Initialization failed:', error);
            globalFormulaManager = null;
        }
    }

    /**
     * 清理公式复制功能
     */
    function destroyFormulaModule() {
        if (globalFormulaManager) {
            try {
                globalFormulaManager.destroy();
                globalFormulaManager = null;
            } catch (error) {
                console.error('[Formula] Destroy failed:', error);
            }
        }
    }

    /**
     * ✅ 监听功能开关变化，动态启用/禁用公式复制功能
     */
    function setupStorageListener() {
        try {
            chrome.storage.onChanged.addListener(async (changes, areaName) => {
                if (areaName !== 'local') return;

                if (changes.formulaLatexEnabled || changes.formulaMathMLEnabled) {
                    try {
                        const result = await chrome.storage.local.get(['formulaLatexEnabled', 'formulaMathMLEnabled']);
                        const isEnabled = (result.formulaLatexEnabled !== false || result.formulaMathMLEnabled === true);

                        if (isEnabled) {
                            if (!globalFormulaManager) {
                                initFormulaModule();
                            } else {
                                globalFormulaManager.rescan();
                            }
                        } else {
                            if (globalFormulaManager) {
                                destroyFormulaModule();
                            }
                        }
                    } catch (error) {
                        console.error('[Formula] Storage listener error:', error);
                    }
                }
            });
        } catch (error) {
            // ✅ 防止 chrome.storage API 不可用
            console.error('[Formula] Failed to setup storage listener:', error);
        }
    }

    // ✅ 使用 try-catch 包裹初始化逻辑，防止任何异常影响页面
    try {
        // 页面加载完成后自动初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                try {
                    initFormulaModule();
                } catch (error) {
                    console.error('[Formula] DOMContentLoaded init error:', error);
                }
            });
        } else {
            // 如果已经加载完成，立即初始化
            initFormulaModule();
        }

        // ✅ 设置 Storage 监听器
        setupStorageListener();

        // 页面卸载时清理
        window.addEventListener('beforeunload', () => {
            try {
                destroyFormulaModule();
            } catch (error) {
                // 静默失败
            }
        });
    } catch (error) {
        // ✅ 顶层错误隔离
        console.error('[Formula] Module load error:', error);
    }

    // 暴露到全局（用于调试）
    window.__formulaModule__ = {
        init: initFormulaModule,
        destroy: destroyFormulaModule,
        getInstance: () => globalFormulaManager,
        checkTemml: checkTemmlAvailable
    };
})();


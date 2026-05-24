/**
 * Chat Width Manager - 对话宽度调节
 * 
 * 通过注入 CSS 覆盖各 AI 平台对话容器的 max-width，
 * 让用户可以自由调宽对话区域。
 * 
 * 特性：
 * - 全平台共享同一个宽度比例（chatWidthScale）
 * - 默认 100%（不做任何修改），只能往大调（最大 150%）
 * - 浮动滑块拖动实时预览，点击确定后持久化
 * - 使用 calc() 基于页面原始 max-width 按比例缩放
 */

class ChatWidthManager {
    static _instance = null;

    static getInstance() {
        if (!ChatWidthManager._instance) {
            ChatWidthManager._instance = new ChatWidthManager();
        }
        return ChatWidthManager._instance;
    }

    constructor() {
        this._styleEl = null;
        this._config = null;
        this._scale = 100;
        this._floatingEl = null;
        this._floatingStyleEl = null;
        this._originalWidths = null;
    }

    /**
     * 初始化：从平台配置读取宽度参数并应用已保存的宽度
     */
    async init() {
        const platform = getCurrentPlatform();
        if (!platform) return;

        const cfg = platform.features?.chatWidth;
        if (!ChatWidthManager.isValidConfig(cfg)) return;

        this._config = cfg;

        const saved = await this._load();
        this._scale = saved;
        this._tryApply();

        this._listenStorageChanges();
        this._listenUrlChanges();
    }

    _tryApply() {
        this._originalWidths = null;
        this._apply();
        this._watchForElements();
    }

    /**
     * 设置宽度比例并持久化
     * @param {number} scale - 100~150
     */
    async setScale(scale) {
        this._scale = Math.max(100, Math.round(scale));
        this._apply();
        await this._save(this._scale);
    }

    getScale() {
        return this._scale;
    }

    isSupported() {
        return !!this._config;
    }

    static isValidConfig(cfg) {
        if (!cfg || typeof cfg !== 'object') return false;
        const targets = cfg.targets || cfg.selectors;
        return Array.isArray(targets) && targets.length > 0;
    }

    canApplyToPage() {
        if (!this._config) return false;
        if (!document.body) return true;

        return this._normalizeTargets().some(target => {
            try {
                if (target.staticOnly) {
                    return false;
                }
                return Array.from(document.querySelectorAll(target.selector)).some(el =>
                    !!this._getBaseWidthForElement(el, target)
                );
            } catch {
                return false;
            }
        });
    }

    // ==================== 内部方法 ====================

    _normalizeTargets() {
        if (!this._config) return [];
        const rawTargets = this._config.targets || this._config.selectors || [];
        return rawTargets
            .map(target => {
                if (typeof target === 'string') {
                    return { selector: target, properties: ['max-width'], staticProperties: {}, staticOnly: false };
                }
                if (!target || typeof target !== 'object') return null;
                const staticProperties = target.staticProperties && typeof target.staticProperties === 'object'
                    ? target.staticProperties
                    : {};
                const properties = target.staticOnly
                    ? []
                    : (Array.isArray(target.properties) && target.properties.length > 0 ? target.properties : ['max-width']);
                return {
                    selector: target.selector,
                    properties,
                    staticProperties,
                    staticOnly: target.staticOnly === true,
                    base: target.base || 'maxWidth'
                };
            })
            .filter(target => target?.selector);
    }

    _getTargetKey(target) {
        return [
            target.selector,
            (target.properties || ['max-width']).join(','),
            Object.entries(target.staticProperties || {}).map(([prop, value]) => `${prop}:${value}`).join(','),
            target.staticOnly ? 'static' : '',
            target.base || 'maxWidth'
        ].join('::');
    }

    _getBaseWidthForElement(el, target) {
        if (!el) return null;

        const style = getComputedStyle(el);
        const maxWidth = style.maxWidth;
        if (this._isUsableCssWidth(maxWidth)) {
            return maxWidth;
        }

        if (target.base === 'rect') {
            const width = el.getBoundingClientRect?.().width || 0;
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            if (width > 0 && (!viewportWidth || width < viewportWidth * 0.96)) {
                return `${Math.round(width)}px`;
            }
        }

        return null;
    }

    _isUsableCssWidth(value) {
        if (!value) return false;
        const normalized = String(value).trim().toLowerCase();
        if (!normalized || ['none', 'auto', '100%', 'initial', 'inherit', 'unset'].includes(normalized)) {
            return false;
        }
        if (/^calc\(/.test(normalized)) return true;
        return /^-?[\d.]+(px|rem|em|ch|vw|vh|vmin|vmax)$/.test(normalized) && parseFloat(normalized) > 0;
    }

    _watchForElements() {
        if (this._scale <= 100) return;
        const targets = this._normalizeTargets();
        if (targets.every(target => this._originalWidths?.[this._getTargetKey(target)])) return;

        const observer = new MutationObserver(() => {
            const hasUncachedMatch = targets.some(target =>
                !this._originalWidths?.[this._getTargetKey(target)] &&
                document.querySelector(target.selector)
            );
            if (!hasUncachedMatch) return;
            this._apply();
            if (targets.every(target => this._originalWidths?.[this._getTargetKey(target)])) {
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    _snapshotOriginalWidths() {
        const targets = this._normalizeTargets();
        if (!this._originalWidths) this._originalWidths = {};

        const uncached = targets.filter(target => !this._originalWidths[this._getTargetKey(target)]);
        if (uncached.length === 0) return;

        // 暂时清除注入样式，以读取页面原始 max-width
        if (this._styleEl) this._styleEl.textContent = '';

        for (const target of uncached) {
            if (target.staticOnly) {
                if (document.querySelector(target.selector)) {
                    this._originalWidths[this._getTargetKey(target)] = {
                        selector: target.selector,
                        base: null,
                        properties: [],
                        staticProperties: target.staticProperties || {}
                    };
                }
                continue;
            }

            const candidates = document.querySelectorAll(target.selector);
            let bestVal = null;
            let bestWidth = 0;
            for (const el of candidates) {
                const val = this._getBaseWidthForElement(el, target);
                if (val) {
                    const width = parseFloat(val) || 0;
                    if (target.base !== 'rect') {
                        bestVal = val;
                        break;
                    }
                    if (width > bestWidth) {
                        bestVal = val;
                        bestWidth = width;
                    }
                }
            }
            if (bestVal) {
                this._originalWidths[this._getTargetKey(target)] = {
                    selector: target.selector,
                    base: bestVal,
                    properties: target.properties || ['max-width'],
                    staticProperties: target.staticProperties || {}
                };
            }
        }
    }

    _apply() {
        if (!this._config) return;

        if (!this._styleEl) {
            this._styleEl = document.createElement('style');
            this._styleEl.id = 'ait-chat-width-override';
            document.head.appendChild(this._styleEl);
        }

        if (this._scale <= 100) {
            this._styleEl.textContent = '';
            return;
        }

        this._snapshotOriginalWidths();

        const pct = this._scale;
        const entries = Object.values(this._originalWidths);
        if (entries.length === 0) return;

        const rules = entries.map(({ selector, base, properties, staticProperties }) => {
            const scaledDeclarations = base
                ? (properties || ['max-width']).map(prop => `${prop}: calc(${base} * ${pct} / 100) !important;`)
                : [];
            const staticDeclarations = Object.entries(staticProperties || {})
                .map(([prop, value]) => `${prop}: ${value} !important;`);
            const declarations = scaledDeclarations.concat(staticDeclarations).join(' ');
            return `${selector} { ${declarations} }`;
        }).join('\n');

        this._styleEl.textContent = rules;
    }

    async _load() {
        try {
            const result = await chrome.storage.local.get('chatWidthScale');
            return result.chatWidthScale || 100;
        } catch {
            return 100;
        }
    }

    async _save(scale) {
        try {
            if (scale <= 100) {
                await chrome.storage.local.remove('chatWidthScale');
            } else {
                await chrome.storage.local.set({ chatWidthScale: scale });
            }
        } catch (e) {
            console.error('[ChatWidthManager] save failed:', e);
        }
    }

    _listenUrlChanges() {
        window.addEventListener('url:change', () => {
            this._tryApply();
        });
    }

    _listenStorageChanges() {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local' || !changes.chatWidthScale) return;
            const newScale = changes.chatWidthScale.newValue || 100;
            if (newScale !== this._scale) {
                this._scale = newScale;
                this._apply();
            }
        });
    }

    /**
     * 仅预览宽度（应用 CSS 但不持久化）
     */
    _previewScale(scale) {
        this._scale = Math.max(100, Math.round(scale));
        this._apply();
    }

    // ==================== 浮动滑块条 ====================

    _formatVal(v) {
        return v <= 100
            ? (chrome.i18n.getMessage('chatWidthNormal') || '正常')
            : v + '%';
    }

    showFloatingSlider() {
        if (this._floatingEl) return;
        this._injectFloatingStyles();

        const savedScale = this._scale;
        const isDark = typeof detectDarkMode === 'function' && detectDarkMode();
        const bar = document.createElement('div');
        bar.className = 'ait-cw-float' + (isDark ? ' ait-cw-light' : ' ait-cw-dark');
        bar.innerHTML = `
            <div class="ait-cw-float-inner">
                <svg class="ait-cw-float-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 3H3v18h18V3z"/><path d="M9 3v18"/><path d="M15 3v18"/>
                </svg>
                <input type="range" class="ait-cw-float-slider" min="100" max="150" step="5" value="${this._scale}">
                <span class="ait-cw-float-val">${this._formatVal(this._scale)}</span>
                <button class="ait-cw-float-ok">${chrome.i18n.getMessage('chatWidthConfirm') || '确定'}</button>
                <button class="ait-cw-float-close" title="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
                </button>
            </div>
        `;
        document.body.appendChild(bar);
        this._floatingEl = bar;

        requestAnimationFrame(() => bar.classList.add('ait-cw-float-show'));

        const slider = bar.querySelector('.ait-cw-float-slider');
        const valEl = bar.querySelector('.ait-cw-float-val');

        const updateTrack = (val) => {
            const pct = ((val - 100) / 50) * 100;
            const fg = isDark ? '#1f2937' : '#fff';
            const bg = isDark ? 'rgba(0,0,0,.15)' : 'rgba(255,255,255,.25)';
            slider.style.background = `linear-gradient(90deg, ${fg} ${pct}%, ${bg} ${pct}%)`;
        };
        updateTrack(this._scale);

        slider.addEventListener('input', (e) => {
            const v = parseInt(e.target.value, 10);
            valEl.textContent = this._formatVal(v);
            updateTrack(v);
            this._previewScale(v);
        });

        bar.querySelector('.ait-cw-float-ok').addEventListener('click', () => {
            const v = parseInt(slider.value, 10);
            this.setScale(v);
            this._hideFloatingSlider();
            if (window.globalToastManager) {
                window.globalToastManager.success(this._formatVal(v), null, { duration: 1800 });
            }
        });

        bar.querySelector('.ait-cw-float-close').addEventListener('click', () => {
            this._previewScale(savedScale);
            this._hideFloatingSlider();
        });
    }

    _hideFloatingSlider() {
        if (!this._floatingEl) return;
        this._floatingEl.classList.remove('ait-cw-float-show');
        this._floatingEl.addEventListener('transitionend', () => {
            this._floatingEl?.remove();
            this._floatingEl = null;
        }, { once: true });
    }

    _injectFloatingStyles() {
        if (this._floatingStyleEl) return;
        const style = document.createElement('style');
        style.id = 'ait-cw-float-styles';
        style.textContent = `
            .ait-cw-float {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(80px);
                z-index: 2147483646;
                opacity: 0;
                transition: transform .3s cubic-bezier(.4,0,.2,1), opacity .3s ease;
                pointer-events: auto;
            }
            .ait-cw-float.ait-cw-float-show {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
            .ait-cw-float-inner {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 16px;
                border-radius: 16px;
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .ait-cw-float-icon {
                width: 18px;
                height: 18px;
                flex-shrink: 0;
            }
            .ait-cw-float-slider {
                width: 200px;
                -webkit-appearance: none;
                appearance: none;
                height: 4px;
                border-radius: 2px;
                outline: none;
                cursor: pointer;
            }
            .ait-cw-float-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                cursor: pointer;
                transition: box-shadow .15s;
            }
            .ait-cw-float-slider::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border: none;
                border-radius: 50%;
                cursor: pointer;
            }
            .ait-cw-float-val {
                font-size: 13px;
                font-weight: 600;
                min-width: 38px;
                text-align: center;
                user-select: none;
            }
            .ait-cw-float-ok {
                font-size: 13px;
                font-weight: 500;
                border: none;
                border-radius: 8px;
                padding: 5px 14px;
                cursor: pointer;
                transition: opacity .15s;
                white-space: nowrap;
            }
            .ait-cw-float-ok:hover { opacity: .85; }
            .ait-cw-float-close {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border: none;
                border-radius: 8px;
                background: transparent;
                cursor: pointer;
                padding: 0;
                transition: background .15s, color .15s;
            }
            .ait-cw-float-close svg {
                width: 16px;
                height: 16px;
            }

            /* ---- dark bar (page is light) ---- */
            .ait-cw-dark .ait-cw-float-inner {
                background: rgba(30,30,30,.88);
                border: 1px solid rgba(255,255,255,.1);
                box-shadow: 0 8px 32px rgba(0,0,0,.28), 0 2px 8px rgba(0,0,0,.12);
                color: #e5e7eb;
            }
            .ait-cw-dark .ait-cw-float-icon { color: #9ca3af; }
            .ait-cw-dark .ait-cw-float-slider::-webkit-slider-thumb { background: #fff; }
            .ait-cw-dark .ait-cw-float-slider::-webkit-slider-thumb:hover { box-shadow: 0 0 0 4px rgba(255,255,255,.15); }
            .ait-cw-dark .ait-cw-float-slider::-moz-range-thumb { background: #fff; }
            .ait-cw-dark .ait-cw-float-val { color: #f3f4f6; }
            .ait-cw-dark .ait-cw-float-ok { background: #fff; color: #1f2937; }
            .ait-cw-dark .ait-cw-float-close { color: #9ca3af; }
            .ait-cw-dark .ait-cw-float-close:hover { background: rgba(255,255,255,.1); color: #f3f4f6; }

            /* ---- light bar (page is dark) ---- */
            .ait-cw-light .ait-cw-float-inner {
                background: rgba(255,255,255,.92);
                border: 1px solid rgba(0,0,0,.08);
                box-shadow: 0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06);
                color: #1f2937;
            }
            .ait-cw-light .ait-cw-float-icon { color: #6b7280; }
            .ait-cw-light .ait-cw-float-slider::-webkit-slider-thumb { background: #1f2937; }
            .ait-cw-light .ait-cw-float-slider::-webkit-slider-thumb:hover { box-shadow: 0 0 0 4px rgba(0,0,0,.1); }
            .ait-cw-light .ait-cw-float-slider::-moz-range-thumb { background: #1f2937; }
            .ait-cw-light .ait-cw-float-val { color: #1f2937; }
            .ait-cw-light .ait-cw-float-ok { background: #1f2937; color: #fff; }
            .ait-cw-light .ait-cw-float-close { color: #6b7280; }
            .ait-cw-light .ait-cw-float-close:hover { background: rgba(0,0,0,.06); color: #1f2937; }
        `;
        document.head.appendChild(style);
        this._floatingStyleEl = style;
    }

    destroy() {
        this._hideFloatingSlider();
        if (this._styleEl) {
            this._styleEl.remove();
            this._styleEl = null;
        }
        if (this._floatingStyleEl) {
            this._floatingStyleEl.remove();
            this._floatingStyleEl = null;
        }
    }
}

window.ChatWidthManager = ChatWidthManager;

// 自初始化
(function () {
    async function initialize() {
        if (!getCurrentPlatform()) return;
        await ChatWidthManager.getInstance().init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();

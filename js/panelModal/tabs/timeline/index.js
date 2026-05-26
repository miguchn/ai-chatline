/**
 * Timeline Settings Tab - 时间轴设置
 * 
 * 功能：
 * - 提供开关控制上下键跳转对话节点功能
 * - 按↑↓方向键快速浏览对话历史
 * - 控制各平台的箭头键导航功能
 */

function isTimelineTabExtensionContextInvalidated(error) {
    return String(error?.message || error).includes('Extension context invalidated');
}

function timelineTabI18n(key, fallback = '', substitutions) {
    try {
        return chrome.i18n.getMessage(key, substitutions) || fallback;
    } catch (error) {
        return fallback;
    }
}

function timelineTabGetURL(path) {
    try {
        return chrome.runtime.getURL(path);
    } catch (error) {
        return '';
    }
}

class TimelineSettingsTab extends BaseTab {
    constructor() {
        super();
        this.id = 'timeline';
        this.name = timelineTabI18n('pxkmvz', '时间轴');
        this.icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="9"/>
        </svg>`;
    }

    _handleExtensionError(scope, error) {
        if (!isTimelineTabExtensionContextInvalidated(error)) {
            console.error(`[TimelineSettingsTab] ${scope}:`, error);
        }
    }
    
    /**
     * 渲染设置内容
     */
    render() {
        const container = document.createElement('div');
        container.className = 'timeline-settings';

        const divider = `<div class="divider"></div>`;
        const longConversationSettingsSection = this._supportsLongConversationOptimize()
            ? `
            <div class="setting-section">
                <div class="setting-item timeline-long-conversation-setting">
                    <div class="setting-info">
                        <div class="setting-label">${timelineTabI18n('longConversationPerformanceTitle', '长对话性能优化')}</div>
                        <div class="setting-hint">${timelineTabI18n('longConversationPerformanceHint', '当对话消息超过指定数量后生效，仅折叠历史消息节点，不删除真实对话内容。')}</div>
                    </div>
                    <label class="ait-toggle-switch">
                        <input type="checkbox" id="long-conversation-performance-toggle">
                        <span class="ait-toggle-slider"></span>
                    </label>
                </div>
                <div class="timeline-performance-controls" id="timeline-performance-controls">
                    <div class="timeline-performance-control-row">
                        <span class="timeline-performance-control-label">${timelineTabI18n('longConversationThresholdLabel', '超过')}</span>
                        <div class="timeline-segmented-options" data-setting="threshold">
                            ${this._renderSegmentedOptions([20, 30, 50], 'threshold')}
                        </div>
                        <span class="timeline-performance-control-label">${timelineTabI18n('longConversationMessageUnit', '条消息后启用')}</span>
                    </div>
                    <div class="timeline-performance-control-row">
                        <span class="timeline-performance-control-label">${timelineTabI18n('longConversationKeepRecentLabel', '保留最近')}</span>
                        <div class="timeline-segmented-options" data-setting="keepRecent">
                            ${this._renderSegmentedOptions([10, 20, 30, 40], 'keepRecent')}
                        </div>
                        <span class="timeline-performance-control-label">${timelineTabI18n('longConversationKeepRecentUnit', '条消息不折叠')}</span>
                    </div>
                    <div class="timeline-performance-warning" id="timeline-performance-warning"></div>
                </div>
            </div>
            ${divider}`
            : '';

        // ==================== 滚动区域 ====================
        const scrollArea = document.createElement('div');
        scrollArea.className = 'timeline-settings-scroll';
        scrollArea.innerHTML = `
            <div class="setting-section">
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-label">${timelineTabI18n('chatTimeLabelTitle', '显示对话时间')}</div>
                        <div class="setting-hint">${timelineTabI18n('chatTimeLabelHint', '在对话消息旁显示时间标签')}</div>
                    </div>
                    <label class="ait-toggle-switch">
                        <input type="checkbox" id="chat-time-label-toggle">
                        <span class="ait-toggle-slider"></span>
                    </label>
                </div>
            </div>
            ${divider}
            <div class="setting-section">
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-label">${timelineTabI18n('timelineThemeColorLabel', '时间轴主题色')}</div>
                        <div class="setting-hint">${timelineTabI18n('timelineThemeColorHint', '为不同平台设置时间轴激活节点的主题色')}</div>
                    </div>
                    <button class="starred-manage-btn timeline-theme-color-manage-btn">${timelineTabI18n('timelineThemeColorManageButton', '设置')}</button>
                </div>
            </div>
            ${divider}
            <div class="setting-section">
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-label">${timelineTabI18n('timelineAICompleteToastTitle', '回复完成提醒')}</div>
                        <div class="setting-hint">${timelineTabI18n('timelineAICompleteToastHint', 'AI 回复完成且当前不在最新位置时显示提醒')}</div>
                    </div>
                    <label class="ait-toggle-switch">
                        <input type="checkbox" id="ai-complete-toast-toggle">
                        <span class="ait-toggle-slider"></span>
                    </label>
                </div>
            </div>
            ${divider}
            ${longConversationSettingsSection}
            <div class="setting-section">
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-label"><svg class="setting-label-icon setting-label-icon-pin" viewBox="0 0 24 24" fill="rgb(255, 125, 3)" stroke="rgb(255, 125, 3)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z"/></svg>${timelineTabI18n('pxmzkv', '长按标记重点')}</div>
                        <div class="setting-hint">${timelineTabI18n('kzxvpm', '长按时间轴节点可标记重点对话')}</div>
                    </div>
                    <label class="ait-toggle-switch">
                        <input type="checkbox" id="long-press-mark-toggle">
                        <span class="ait-toggle-slider"></span>
                    </label>
                </div>
            </div>
            ${divider}
            <div class="setting-section">
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-label">${timelineTabI18n('notepadTitle', '闪记')}</div>
                        <div class="setting-hint">${timelineTabI18n('notepadToggleHint', '在时间轴底部显示闪记入口')}</div>
                    </div>
                    <label class="ait-toggle-switch">
                        <input type="checkbox" id="notepad-toggle">
                        <span class="ait-toggle-slider"></span>
                    </label>
                </div>
            </div>
            ${divider}
            <div class="setting-section">
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-label">${timelineTabI18n('vkpmzx', '上下键导航')}</div>
                        <div class="setting-hint">${timelineTabI18n('xpvmkz', '按上下方向键快速浏览对话历史')}</div>
                    </div>
                    <label class="ait-toggle-switch">
                        <input type="checkbox" id="arrow-keys-nav-toggle">
                        <span class="ait-toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
        container.appendChild(scrollArea);

        // ==================== 底部悬浮区域 ====================
        const bottomDivider = document.createElement('div');
        bottomDivider.className = 'timeline-settings-bottom-divider';
        container.appendChild(bottomDivider);

        const bottomSection = document.createElement('div');
        bottomSection.className = 'timeline-settings-bottom';
        bottomSection.innerHTML = `
            <div class="setting-item">
                <div class="setting-info">
                    <div class="setting-label">${timelineTabI18n('timelineDisplayLabel', '显示时间轴')}</div>
                    <div class="setting-hint">${timelineTabI18n('mzkvxp', '控制哪些平台显示时间轴')}</div>
                </div>
                <button class="starred-manage-btn">${timelineTabI18n('promptBtnSwitch', '开关')}</button>
            </div>
        `;
        container.appendChild(bottomSection);

        this.addEventListener(bottomSection.querySelector('.starred-manage-btn'), 'click', () => {
            this._showPlatformManageModal().catch(error => this._handleExtensionError('Failed to show platform modal', error));
        });

        this.addEventListener(scrollArea.querySelector('.timeline-theme-color-manage-btn'), 'click', () => {
            this._showThemeColorModal().catch(error => this._handleExtensionError('Failed to show theme color modal', error));
        });

        return container;
    }

    _renderSegmentedOptions(values, settingName) {
        return values.map(value => `
            <button
                type="button"
                class="timeline-segmented-option"
                data-setting="${settingName}"
                data-value="${value}"
                aria-pressed="false"
            >${value}</button>
        `).join('');
    }

    _supportsLongConversationOptimize() {
        try {
            return getCurrentPlatform?.()?.features?.supportsLongConversationOptimize === true;
        } catch {
            return false;
        }
    }

    _getCurrentPerformancePlatformId() {
        try {
            return getCurrentPlatform?.()?.id || null;
        } catch {
            return null;
        }
    }

    _isPerformanceEnabledForCurrentPlatform(config) {
        const normalized = this._normalizePerformanceConfig(config);
        const platformId = this._getCurrentPerformancePlatformId();
        return normalized.enabled === true &&
            !!platformId &&
            normalized.platforms?.[platformId] === true;
    }

    _getDefaultPerformanceConfig() {
        if (typeof LongConversationOptimizerConfig !== 'undefined') {
            return LongConversationOptimizerConfig.normalize();
        }
        return {
            enabled: false,
            threshold: 50,
            keepRecent: 20,
            platforms: { chatgpt: true }
        };
    }

    _normalizePerformanceConfig(config) {
        if (typeof LongConversationOptimizerConfig !== 'undefined') {
            return LongConversationOptimizerConfig.normalize(config);
        }
        const defaults = this._getDefaultPerformanceConfig();
        const threshold = [20, 30, 50].includes(Number(config?.threshold))
            ? Number(config.threshold)
            : defaults.threshold;
        let keepRecent = [10, 20, 30, 40].includes(Number(config?.keepRecent))
            ? Number(config.keepRecent)
            : defaults.keepRecent;
        if (keepRecent >= threshold) {
            const validOptions = [10, 20, 30, 40].filter(value => value < threshold);
            keepRecent = validOptions.length ? Math.max(...validOptions) : Math.max(1, threshold - 1);
        }
        return {
            ...defaults,
            ...(config || {}),
            threshold,
            keepRecent,
            platforms: {
                ...defaults.platforms,
                ...((config || {}).platforms || {})
            }
        };
    }

    _performanceConfigKey() {
        return typeof LONG_CONVERSATION_OPTIMIZER_CONFIG_KEY !== 'undefined'
            ? LONG_CONVERSATION_OPTIMIZER_CONFIG_KEY
            : 'longConversationPerformanceConfig';
    }

    _updatePerformanceControls(config) {
        const normalized = this._normalizePerformanceConfig(config);
        const platformEnabled = this._isPerformanceEnabledForCurrentPlatform(normalized);
        const controls = document.getElementById('timeline-performance-controls');
        const toggle = document.getElementById('long-conversation-performance-toggle');
        if (toggle) toggle.checked = platformEnabled;
        if (controls) controls.classList.toggle('disabled', !platformEnabled);

        document.querySelectorAll('.timeline-segmented-option').forEach(btn => {
            const key = btn.dataset.setting;
            const value = Number(btn.dataset.value);
            const selected = String(normalized[key]) === btn.dataset.value;
            btn.classList.toggle('selected', selected);
            btn.setAttribute('aria-pressed', selected ? 'true' : 'false');

            // Disable if feature is off, or if keepRecent >= threshold
            let disabled = !platformEnabled;
            if (!disabled && key === 'keepRecent' && value >= normalized.threshold) {
                disabled = true;
            }
            btn.disabled = disabled;
        });

        // Show warning if current config is invalid
        const warningEl = document.getElementById('timeline-performance-warning');
        if (warningEl) {
            if (normalized.keepRecent >= normalized.threshold) {
                warningEl.textContent = timelineTabI18n('longConversationValidationKeepRecent', '保留消息数必须小于触发阈值，已自动修正');
                warningEl.classList.add('visible');
            } else {
                warningEl.classList.remove('visible');
            }
        }
    }
    
    /**
     * Tab 激活时加载状态
     */
    async mounted() {
        super.mounted();
        
        // 0. 处理显示对话时间开关（默认开启）
        const chatTimeLabelCheckbox = document.getElementById('chat-time-label-toggle');
        if (chatTimeLabelCheckbox) {
            // 读取当前状态（默认开启）
            try {
                const result = await chrome.storage.local.get('chatTimeLabelEnabled');
                // 默认值为 true（开启）
                chatTimeLabelCheckbox.checked = result.chatTimeLabelEnabled !== false;
            } catch (e) {
                this._handleExtensionError('Failed to load chat time label state', e);
                chatTimeLabelCheckbox.checked = true;
            }
            
            // 监听开关变化
            this.addEventListener(chatTimeLabelCheckbox, 'change', async (e) => {
                try {
                    const enabled = e.target.checked;
                    
                    // 保存到 Storage
                    await chrome.storage.local.set({ chatTimeLabelEnabled: enabled });
                    
                    // 立即更新当前页面的时间标签显示
                    if (window.chatTimeRecorder) {
                        window.chatTimeRecorder.updateLabelVisibility(enabled);
                    }
                } catch (e) {
                    this._handleExtensionError('Failed to save chat time label state', e);
                    chatTimeLabelCheckbox.checked = !chatTimeLabelCheckbox.checked;
                }
            });
        }
        
        // 1. 处理 AI 回复完成提醒开关（默认开启）
        const aiCompleteToastCheckbox = document.getElementById('ai-complete-toast-toggle');
        if (aiCompleteToastCheckbox) {
            try {
                const result = await chrome.storage.local.get('timelineAICompleteToastEnabled');
                aiCompleteToastCheckbox.checked = result.timelineAICompleteToastEnabled !== false;
            } catch (e) {
                this._handleExtensionError('Failed to load AI complete toast state', e);
                aiCompleteToastCheckbox.checked = true;
            }

            this.addEventListener(aiCompleteToastCheckbox, 'change', async (e) => {
                try {
                    const enabled = e.target.checked;
                    await chrome.storage.local.set({ timelineAICompleteToastEnabled: enabled });
                } catch (e) {
                    this._handleExtensionError('Failed to save AI complete toast state', e);
                    aiCompleteToastCheckbox.checked = !aiCompleteToastCheckbox.checked;
                }
            });
        }

        // 1.1 处理长对话性能优化配置（默认关闭，仅支持平台展示）
        if (this._supportsLongConversationOptimize()) {
            const performanceToggle = document.getElementById('long-conversation-performance-toggle');
            const performanceControls = document.getElementById('timeline-performance-controls');
            const performanceConfigKey = this._performanceConfigKey();
            let performanceConfig = this._getDefaultPerformanceConfig();
            try {
                const result = await chrome.storage.local.get(performanceConfigKey);
                performanceConfig = this._normalizePerformanceConfig(result[performanceConfigKey] || {});
            } catch (e) {
                this._handleExtensionError('Failed to load long conversation performance config', e);
            }
            this._updatePerformanceControls(performanceConfig);

            const savePerformanceConfig = async (patch) => {
                try {
                    const candidateConfig = {
                        ...performanceConfig,
                        ...patch
                    };
                    const shouldShowValidationWarning =
                        Number(candidateConfig.keepRecent) >= Number(candidateConfig.threshold);
                    const newConfig = this._normalizePerformanceConfig(candidateConfig);

                    // Validate: keepRecent must be less than threshold
                    if (shouldShowValidationWarning) {
                        const warningEl = document.getElementById('timeline-performance-warning');
                        if (warningEl) {
                            warningEl.textContent = timelineTabI18n('longConversationValidationKeepRecent', '保留消息数必须小于触发阈值，已自动修正');
                            warningEl.classList.add('visible');
                            setTimeout(() => warningEl.classList.remove('visible'), 3000);
                        }
                    }

                    performanceConfig = newConfig;
                    await chrome.storage.local.set({ [performanceConfigKey]: performanceConfig });
                    this._updatePerformanceControls(performanceConfig);
                } catch (e) {
                    this._handleExtensionError('Failed to save long conversation performance config', e);
                    this._updatePerformanceControls(performanceConfig);
                }
            };

            if (performanceToggle) {
                this.addEventListener(performanceToggle, 'change', (e) => {
                    const platformId = this._getCurrentPerformancePlatformId();
                    if (!platformId) {
                        e.target.checked = false;
                        return;
                    }

                    const enabled = e.target.checked;
                    savePerformanceConfig({
                        enabled: enabled ? true : performanceConfig.enabled === true,
                        platforms: {
                            ...(performanceConfig.platforms || {}),
                            [platformId]: enabled
                        }
                    });
                });
            }

            performanceControls?.querySelectorAll('.timeline-segmented-option').forEach(btn => {
                this.addEventListener(btn, 'click', () => {
                    if (btn.disabled) return;
                    const key = btn.dataset.setting;
                    const value = Number(btn.dataset.value);
                    if (!key || !Number.isFinite(value)) return;
                    savePerformanceConfig({ [key]: value });
                });
            });
        }

        // 1. 处理闪记开关（默认开启）
        const notepadCheckbox = document.getElementById('notepad-toggle');
        if (notepadCheckbox) {
            try {
                const result = await chrome.storage.local.get('aitNotepadEnabled');
                notepadCheckbox.checked = result.aitNotepadEnabled !== false;
            } catch (e) {
                notepadCheckbox.checked = true;
            }
            
            this.addEventListener(notepadCheckbox, 'change', async (e) => {
                try {
                    const enabled = e.target.checked;
                    await chrome.storage.local.set({ aitNotepadEnabled: enabled });
                    
                    // 立即更新时间轴上闪记按钮的显隐
                    const notepadBtn = document.querySelector('.ait-notepad-btn');
                    if (notepadBtn) {
                        notepadBtn.style.display = enabled ? 'flex' : 'none';
                    }
                    // 关闭时同时收起面板
                    if (!enabled && window.notepadManager && window.notepadManager.isOpen) {
                        window.notepadManager.close();
                    }
                } catch (e) {
                    notepadCheckbox.checked = !notepadCheckbox.checked;
                }
            });
        }
        
        // 2. 处理长按标记重点对话开关（默认开启，无法关闭）
        const longPressCheckbox = document.getElementById('long-press-mark-toggle');
        if (longPressCheckbox) {
            // 设置为默认开启
            longPressCheckbox.checked = true;
            
            // 监听点击事件，阻止关闭并显示提示
            this.addEventListener(longPressCheckbox, 'change', (e) => {
                // 阻止关闭，保持开启状态
                e.target.checked = true;
                
                // 显示 toast 提示
                if (window.globalToastManager) {
                    const message = timelineTabI18n('qoytxz', '该功能默认开启');
                    window.globalToastManager.info(message, e.target, {
                        duration: 2200,
                        icon: '',  // 不显示图标
                        color: {
                            light: {
                                backgroundColor: '#0d0d0d',  // 浅色模式：黑色背景
                                textColor: '#ffffff',        // 浅色模式：白色文字
                                borderColor: '#0d0d0d'       // 浅色模式：黑色边框
                            },
                            dark: {
                                backgroundColor: '#ffffff',  // 深色模式：白色背景
                                textColor: '#1f2937',        // 深色模式：深灰色文字
                                borderColor: '#e5e7eb'       // 深色模式：浅灰色边框
                            }
                        }
                    });
                }
            });
        }
        
        // 2. 处理全局箭头键导航开关
        const checkbox = document.getElementById('arrow-keys-nav-toggle');
        if (checkbox) {
            // 读取当前状态（默认开启）
            try {
                const result = await chrome.storage.local.get('arrowKeysNavigationEnabled');
                // 默认值为 true（开启）
                checkbox.checked = result.arrowKeysNavigationEnabled !== false;
            } catch (e) {
                this._handleExtensionError('Failed to load state', e);
                // 读取失败，默认开启
                checkbox.checked = true;
            }
            
            // 监听开关变化
            this.addEventListener(checkbox, 'change', async (e) => {
                try {
                    const enabled = e.target.checked;
                    
                    // 保存到 Storage
                    await chrome.storage.local.set({ arrowKeysNavigationEnabled: enabled });
                } catch (e) {
                    this._handleExtensionError('Failed to save state', e);
                    
                    // 保存失败，恢复checkbox状态
                    checkbox.checked = !checkbox.checked;
                }
            });
        }
        
        
    }

    async _showPlatformManageModal() {
        const platforms = getPlatformsByFeature('timeline');
        const result = await chrome.storage.local.get('timelinePlatformSettings');
        const settings = result.timelinePlatformSettings || {};

        const overlay = document.createElement('div');
        overlay.className = 'starred-platform-modal-overlay';

        const items = platforms.map(p => {
            const logoUrl = p.logoPath ? timelineTabGetURL(p.logoPath) : '';
            const logoHtml = logoUrl
                ? `<img src="${logoUrl}" alt="${p.name}">`
                : `<span>${p.name.charAt(0)}</span>`;
            return `
                <div class="starred-platform-item">
                    <div class="starred-platform-info">
                        <div class="starred-platform-logo">${logoHtml}</div>
                        <span class="starred-platform-name">${p.name}</span>
                    </div>
                    <label class="ait-toggle-switch">
                        <input type="checkbox" data-platform-id="${p.id}" ${settings[p.id] !== false ? 'checked' : ''}>
                        <span class="ait-toggle-slider"></span>
                    </label>
                </div>`;
        }).join('');

        overlay.innerHTML = `
            <div class="starred-platform-modal">
                <div class="starred-platform-modal-header">
                    <span>${timelineTabI18n('mkvzpx', '支持的平台')}</span>
                    <button class="starred-platform-modal-close">✕</button>
                </div>
                <div class="starred-platform-modal-body">${items}</div>
            </div>`;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('.starred-platform-modal-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        overlay.querySelectorAll('input[data-platform-id]').forEach(cb => {
            cb.addEventListener('change', async () => {
                try {
                    const cur = (await chrome.storage.local.get('timelinePlatformSettings')).timelinePlatformSettings || {};
                    cur[cb.dataset.platformId] = cb.checked;
                    await chrome.storage.local.set({ timelinePlatformSettings: cur });

                    if (cb.dataset.platformId === 'grok' && !cb.checked) {
                        const el = document.querySelector('.group\\/timeline');
                        if (el) el.style.display = '';
                    }
                } catch (error) {
                    this._handleExtensionError('Failed to save platform settings', error);
                    cb.checked = !cb.checked;
                }
            });
        });
    }

    async _showThemeColorModal() {
        const platforms = getPlatformsByFeature('timeline');
        const result = await chrome.storage.local.get('timelineActiveColorByPlatform');
        const activeColorByPlatform = result.timelineActiveColorByPlatform || {};
        const activeColorOptions = getTimelineActiveColorOptions();
        const themeColorLabel = timelineTabI18n('timelineThemeColorLabel', '时间轴主题色');

        const overlay = document.createElement('div');
        overlay.className = 'starred-platform-modal-overlay';

        const items = platforms.map(p => {
            const logoUrl = p.logoPath ? timelineTabGetURL(p.logoPath) : '';
            const logoHtml = logoUrl
                ? `<img src="${logoUrl}" alt="${p.name}">`
                : `<span>${p.name.charAt(0)}</span>`;
            const selectedColorId = resolveTimelineActiveColorId(p.id, activeColorByPlatform);
            const colorItems = activeColorOptions.map(option => `
                <button
                    type="button"
                    class="timeline-active-color-btn ${option.id === selectedColorId ? 'selected' : ''}"
                    data-platform-id="${p.id}"
                    data-color-id="${option.id}"
                    style="--timeline-color-option: ${option.color};"
                    aria-label="${themeColorLabel} ${option.color}"
                    aria-pressed="${option.id === selectedColorId ? 'true' : 'false'}"
                ></button>
            `).join('');

            return `
                <div class="timeline-theme-color-item">
                    <div class="starred-platform-info timeline-theme-color-platform">
                        <div class="starred-platform-logo">${logoHtml}</div>
                        <span class="starred-platform-name">${p.name}</span>
                    </div>
                    <div class="timeline-active-color-options" aria-label="${themeColorLabel}">
                        ${colorItems}
                    </div>
                </div>`;
        }).join('');

        overlay.innerHTML = `
            <div class="starred-platform-modal timeline-theme-color-modal">
                <div class="starred-platform-modal-header">
                    <span>${themeColorLabel}</span>
                    <button class="starred-platform-modal-close">✕</button>
                </div>
                <div class="starred-platform-modal-body">${items}</div>
            </div>`;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('.starred-platform-modal-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        const setSelectedColor = (platformId, colorId) => {
            overlay.querySelectorAll(`.timeline-active-color-btn[data-platform-id="${platformId}"]`).forEach(btn => {
                const selected = btn.dataset.colorId === colorId;
                btn.classList.toggle('selected', selected);
                btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
            });
        };

        overlay.querySelectorAll('.timeline-active-color-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const platformId = btn.dataset.platformId;
                const colorId = btn.dataset.colorId;
                if (!isTimelineActiveColorId(colorId)) return;

                try {
                    const result = await chrome.storage.local.get('timelineActiveColorByPlatform');
                    const cur = result.timelineActiveColorByPlatform || {};
                    if (colorId === getDefaultTimelineActiveColorId(platformId)) {
                        delete cur[platformId];
                    } else {
                        cur[platformId] = colorId;
                    }
                    await chrome.storage.local.set({ timelineActiveColorByPlatform: cur });
                    setSelectedColor(platformId, colorId);
                } catch (e) {
                    this._handleExtensionError('Failed to save active color', e);
                }
            });
        });
    }

    unmounted() {
        super.unmounted();
    }
}

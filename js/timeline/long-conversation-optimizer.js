/**
 * Long Conversation Optimizer
 *
 * Collapses old rendered message DOM while keeping timeline data and real
 * conversation content intact. The module is platform-aware and currently only
 * opts ChatGPT in; other platforms can enable their own collapse targets later.
 */

const LONG_CONVERSATION_OPTIMIZER_CONFIG_KEY = 'longConversationPerformanceConfig';

const LongConversationOptimizerConfig = {
    DEFAULT: {
        enabled: false,
        threshold: 50,
        keepRecent: 20,
        platforms: {
            chatgpt: true
        }
    },
    THRESHOLDS: [20, 30, 50],
    KEEP_RECENT_OPTIONS: [10, 20, 30, 40],

    normalize(config = {}) {
        const defaults = this.DEFAULT;
        const threshold = this.THRESHOLDS.includes(Number(config.threshold))
            ? Number(config.threshold)
            : defaults.threshold;
        let keepRecent = this.KEEP_RECENT_OPTIONS.includes(Number(config.keepRecent))
            ? Number(config.keepRecent)
            : defaults.keepRecent;
        if (keepRecent >= threshold) {
            const validKeepRecentOptions = this.KEEP_RECENT_OPTIONS.filter(value => value < threshold);
            keepRecent = validKeepRecentOptions.length
                ? Math.max(...validKeepRecentOptions)
                : Math.max(1, threshold - 1);
        }

        return {
            enabled: config.enabled === true,
            threshold,
            keepRecent,
            platforms: {
                ...defaults.platforms,
                ...(config.platforms || {})
            }
        };
    }
};

class LongConversationOptimizer {
    constructor(adapter, timelineManager) {
        this.adapter = adapter;
        this.timelineManager = timelineManager;
        this.config = LongConversationOptimizerConfig.normalize();
        this.collapsedElements = new Set();
        this.turnGroups = [];
        this.expandedRange = null;
        this.storageHandler = null;
        this.measurementDepth = 0;
        this.reapplyTimer = null;
        this.collapseHintElement = null;
        this.collapsedCount = 0;
        this.collapsedTurnIds = new Set();
    }

    async init() {
        await this.loadConfig();
        this.storageHandler = (changes, areaName) => {
            if (areaName !== 'local' || !changes[LONG_CONVERSATION_OPTIMIZER_CONFIG_KEY]) return;
            this.config = LongConversationOptimizerConfig.normalize(changes[LONG_CONVERSATION_OPTIMIZER_CONFIG_KEY].newValue || {});
            this.expandedRange = null;
            if (this.isEnabled()) {
                this.scheduleApply();
            } else {
                this.restoreAll();
            }
        };
        try { StorageAdapter.addChangeListener(this.storageHandler); } catch {}
    }

    async loadConfig() {
        try {
            const stored = await StorageAdapter.get(LONG_CONVERSATION_OPTIMIZER_CONFIG_KEY);
            this.config = LongConversationOptimizerConfig.normalize(stored || {});
        } catch (error) {
            if (!TimelineUtils.isExtensionContextInvalidated(error)) {
                console.error('[LongConversationOptimizer] Failed to load config:', error);
            }
            this.config = LongConversationOptimizerConfig.normalize();
        }
    }

    destroy() {
        this.reapplyTimer = TimelineUtils.clearTimerSafe(this.reapplyTimer);
        if (this.storageHandler) {
            try { StorageAdapter.removeChangeListener(this.storageHandler); } catch {}
            this.storageHandler = null;
        }
        this.restoreAll();
        this.removeCollapseHint();
        this.turnGroups = [];
        this.expandedRange = null;
        this.collapsedTurnIds.clear();
    }

    getPlatformId() {
        try {
            return getCurrentPlatform?.()?.id || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    isPlatformSupported() {
        const platform = typeof getCurrentPlatform === 'function' ? getCurrentPlatform() : null;
        const platformId = platform?.id || this.getPlatformId();
        return platform?.features?.supportsLongConversationOptimize === true &&
            this.config.platforms?.[platformId] === true &&
            typeof this.adapter?.getLongConversationCollapseTargets === 'function';
    }

    isEnabled() {
        return this.config.enabled === true && this.isPlatformSupported();
    }

    beginMeasurement() {
        if (!this.isEnabled()) return null;
        this.measurementDepth += 1;
        this.restoreAll();
        return { active: true };
    }

    endMeasurement(token, userElements) {
        if (!token?.active) return;
        this.measurementDepth = Math.max(0, this.measurementDepth - 1);
        if (this.measurementDepth === 0) {
            this.apply(userElements);
        }
    }

    async withAllRestored(callback, options = {}) {
        const shouldReapply = options.reapply !== false;
        const wasEnabled = this.isEnabled();
        if (wasEnabled) {
            this.measurementDepth += 1;
            this.restoreAll();
        }
        try {
            return await callback();
        } finally {
            if (wasEnabled) {
                this.measurementDepth = Math.max(0, this.measurementDepth - 1);
                if (shouldReapply && this.measurementDepth === 0) {
                    this.scheduleApply();
                }
            }
        }
    }

    scheduleApply() {
        this.reapplyTimer = TimelineUtils.clearTimerSafe(this.reapplyTimer);
        this.reapplyTimer = setTimeout(() => {
            this.reapplyTimer = null;
            this.apply();
        }, 0);
    }

    apply(userElements) {
        if (this.measurementDepth > 0) {
            return;
        }
        if (!this.isEnabled()) {
            this.restoreAll();
            return;
        }

        const elements = Array.from(userElements || this.adapter.getUserMessageElements?.(this.timelineManager?.conversationContainer || document) || []);
        const total = elements.length;

        if (total <= this.config.threshold) {
            this.restoreAll();
            this.turnGroups = this.buildTurnGroups(elements);
            return;
        }

        const keepStart = Math.max(0, total - this.config.keepRecent);
        const groups = this.buildTurnGroups(elements);
        const activeTargets = new Set();
        const newCollapsedIds = new Set();
        let collapsedCount = 0;

        groups.forEach(group => {
            const shouldKeepVisible = group.index >= keepStart || this.isIndexInExpandedRange(group.index);
            group.targets.forEach(element => activeTargets.add(element));
            if (shouldKeepVisible) {
                this.restoreGroup(group);
            } else {
                this.collapseGroup(group);
                newCollapsedIds.add(group.id);
                collapsedCount++;
            }
        });

        Array.from(this.collapsedElements).forEach(element => {
            if (!activeTargets.has(element) || !element.isConnected) {
                this.restoreElement(element);
            }
        });

        this.turnGroups = groups;
        this.collapsedCount = collapsedCount;
        this.collapsedTurnIds = newCollapsedIds;
        this.syncTimelineDots();
        this.updateCollapseHint();
        this.refreshTimeline();
    }

    buildTurnGroups(userElements) {
        const root = this.timelineManager?.conversationContainer || document;
        const context = { root, userElements };
        return Array.from(userElements || []).map((userElement, index) => {
            const id = this.adapter.generateTurnId?.(userElement, index) || `turn-${index}`;
            const targets = this.adapter.getLongConversationCollapseTargets?.(userElement, index, context) || [userElement];
            return {
                id,
                index,
                userElement,
                targets: Array.from(new Set(targets.filter(element => element?.isConnected)))
            };
        });
    }

    collapseGroup(group) {
        group.targets.forEach(element => this.collapseElement(element, group));
    }

    restoreGroup(group) {
        group.targets.forEach(element => this.restoreElement(element));
    }

    collapseElement(element, group) {
        if (!element?.isConnected) return;
        if (!element.classList.contains('ait-lco-collapsed')) {
            const rect = element.getBoundingClientRect();
            const height = Math.max(1, Math.ceil(rect.height || element.offsetHeight || 1));
            element.style.setProperty('--ait-lco-collapsed-height', `${height}px`);
            element.dataset.aitLcoTurnId = group.id;
            element.dataset.aitLcoIndex = String(group.index);
            element.classList.add('ait-lco-collapsed');
        }
        this.collapsedElements.add(element);
    }

    restoreElement(element) {
        if (!element) return;
        element.classList?.remove('ait-lco-collapsed');
        element.style?.removeProperty('--ait-lco-collapsed-height');
        try {
            delete element.dataset.aitLcoTurnId;
            delete element.dataset.aitLcoIndex;
        } catch {}
        this.collapsedElements.delete(element);
    }

    restoreAll() {
        Array.from(this.collapsedElements).forEach(element => this.restoreElement(element));
        this.collapsedElements.clear();
        this.collapsedTurnIds.clear();
        this.collapsedCount = 0;
        this.removeCollapseHint();
        this.syncTimelineDots();
        this.refreshTimeline();
    }

    restoreRangeAroundIndex(index, radius = 2) {
        if (!this.isEnabled() || !Number.isFinite(index)) return;
        this.expandedRange = {
            start: Math.max(0, index - radius),
            end: index + radius
        };
        this.apply();
    }

    isIndexInExpandedRange(index) {
        return !!this.expandedRange &&
            index >= this.expandedRange.start &&
            index <= this.expandedRange.end;
    }

    syncTimelineDots() {
        const tm = this.timelineManager;
        if (!tm?.markers) return;

        tm.markers.forEach(marker => {
            if (!marker.dotElement) return;
            marker.dotElement.classList.toggle('ait-lco-dot-hidden', this.collapsedTurnIds.has(marker.id));
        });
    }

    refreshTimeline() {
        const tm = this.timelineManager;
        if (!tm) return;
        try { tm.updateTimelineGeometry?.(); } catch {}
        try { tm.syncTimelineTrackToMain?.(); } catch {}
        try { tm.updateVirtualRangeAndRender?.(); } catch {}
        try { tm.updateActiveDotUI?.(); } catch {}
    }

    updateCollapseHint() {
        if (this.collapsedCount <= 0) {
            this.removeCollapseHint();
            return;
        }

        const topActions = this.timelineManager?.ui?.topActions;
        const timelineBar = this.timelineManager?.ui?.timelineBar;
        const hintContainer = topActions || timelineBar;
        if (!hintContainer) return;

        if (!this.collapseHintElement) {
            this.collapseHintElement = document.createElement('button');
            this.collapseHintElement.className = 'ait-timeline-collapse-hint';
            this.collapseHintElement.setAttribute('aria-label', this.i18n('longConversationExpandMore', '展开更多历史消息'));
            this.collapseHintElement.setAttribute('tabindex', '0');
            this.collapseHintElement.innerHTML = `
                <span class="ait-timeline-collapse-hint-icon" aria-hidden="true">↥</span>
                <span class="ait-timeline-collapse-hint-count"></span>
            `;

            this.collapseHintElement.addEventListener('click', () => {
                this.expandMoreMessages();
            });

            this.collapseHintElement.addEventListener('mouseenter', () => {
                if (window.globalTooltipManager) {
                    window.globalTooltipManager.show(
                        'collapse-hint',
                        'collapse-hint',
                        this.collapseHintElement,
                        this.i18n('longConversationCollapsedTooltip', `上方 ${this.collapsedCount} 条历史对话已折叠，点击展开更多`, [String(this.collapsedCount)]),
                        { style: 'mini', placement: 'left' }
                    );
                }
            });

            this.collapseHintElement.addEventListener('mouseleave', () => {
                if (window.globalTooltipManager) {
                    window.globalTooltipManager.hide();
                }
            });
        }

        if (!this.collapseHintElement.querySelector('.ait-timeline-collapse-hint-count')) {
            this.collapseHintElement.innerHTML = `
                <span class="ait-timeline-collapse-hint-icon" aria-hidden="true">↥</span>
                <span class="ait-timeline-collapse-hint-count"></span>
            `;
        }

        const countElement = this.collapseHintElement.querySelector('.ait-timeline-collapse-hint-count');
        if (countElement) {
            countElement.textContent = String(this.collapsedCount);
        }
        this.collapseHintElement.dataset.collapsedCount = String(this.collapsedCount);

        if (this.collapseHintElement.parentNode !== hintContainer) {
            hintContainer.appendChild(this.collapseHintElement);
        }
        this.timelineManager?.updateTimelineTopActionsVisibility?.();
    }

    removeCollapseHint() {
        if (this.collapseHintElement?.parentNode) {
            this.collapseHintElement.parentNode.removeChild(this.collapseHintElement);
        }
        this.collapseHintElement = null;
        this.timelineManager?.updateTimelineTopActionsVisibility?.();
    }

    expandMoreMessages() {
        if (this.collapsedCount <= 0) return;

        const expandCount = Math.min(10, this.collapsedCount);
        const keepStart = Math.max(0, this.turnGroups.length - this.config.keepRecent);

        if (this.expandedRange) {
            this.expandedRange.start = Math.max(0, this.expandedRange.start - expandCount);
        } else {
            this.expandedRange = {
                start: Math.max(0, keepStart - expandCount),
                end: keepStart - 1
            };
        }

        this.apply();
    }

    i18n(key, fallback = '', substitutions) {
        try {
            return chrome.i18n.getMessage(key, substitutions) || fallback;
        } catch {
            return fallback;
        }
    }
}

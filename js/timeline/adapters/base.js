/**
 * Base Adapter for AI Chat Sites
 * 
 * All site-specific adapters should extend this class
 */

/**
 * Base class for site adapters
 * Each AI chat site needs to implement this interface
 */
class SiteAdapter {
    constructor() {
    }

    /**
     * Check if current URL matches this site
     * @param {string} url - Current page URL
     * @returns {boolean}
     */
    matches(url) {
        return false;
    }

    /**
     * Get CSS selector for user message elements
     * @returns {string}
     */
    getUserMessageSelector() {
        return '';
    }

    /**
     * Get all user message elements for the current conversation.
     * Adapters can override this when a platform needs custom filtering beyond CSS selectors.
     * @param {ParentNode} root - DOM root to search within
     * @returns {Element[]}
     */
    getUserMessageElements(root = document) {
        const selector = this.getUserMessageSelector();
        if (!selector || !root?.querySelectorAll) return [];
        return Array.from(root.querySelectorAll(selector));
    }

    /**
     * Generate unique ID for a message (using index)
     * @param {Element} element - Message DOM element
     * @param {number} index - Message index in the list
     * @returns {string}
     */
    generateTurnId(element, index) {
        return `msg-${index}`;
    }

    /**
     * Extract text content from message element
     * @param {Element} element - Message DOM element
     * @returns {string}
     */
    extractText(element) {
        const text = (element.textContent || '').trim();
        return text || '[图片或文件]';
    }

    /**
     * Extract user message text for timeline display and export.
     * Platform adapters should keep platform-specific DOM parsing in extractText().
     * @param {Element} element
     * @param {number} index
     * @param {Object} context
     * @returns {string}
     */
    extractMessageText(element, index, context = {}) {
        return this.extractText(element, index, context);
    }

    /**
     * Build a normalized, platform-agnostic conversation message list.
     * This is the common export surface; adapters only need to customize selectors,
     * turn IDs, and text extraction.
     * @param {Object} options
     * @returns {Array<{id:string,index:number,text:string,element:Element}>}
     */
    extractConversationMessages(options = {}) {
        const root = options.root || document;
        const elements = options.elements || this.getUserMessageElements(root);
        const context = options.context || {};
        return Array.from(elements).map((element, index) => ({
            id: this.generateTurnId(element, index),
            index,
            text: this.extractMessageText(element, index, context),
            element
        }));
    }

    /**
     * Create a portable export payload for the current conversation.
     * UI callers can consume this without knowing the active AI platform.
     * @param {Object} options
     * @returns {Object}
     */
    createConversationExport(options = {}) {
        const pathname = options.pathname || location.pathname;
        const messages = this.extractConversationMessages(options).map(({ element, ...message }) => message);
        return {
            platform: this.constructor?.name?.replace(/Adapter$/, '').toLowerCase() || 'unknown',
            conversationId: this.extractConversationId(pathname),
            url: options.url || location.href,
            exportedAt: new Date().toISOString(),
            messages
        };
    }
    
    /**
     * 获取时间标签的渲染目标元素
     * @param {Element} element - 消息体元素（getUserMessageSelector 匹配到的）
     * @returns {Element} - 时间标签实际渲染到的元素
     */
    getTimeLabelTarget(element) {
        return element; // 默认返回消息元素本身
    }

    /**
     * Get all DOM targets that should show this turn's time.
     * Default is the user turn target; adapters may include the paired assistant
     * response when the platform exposes a reliable message container.
     * @param {Element} element - User turn element
     * @param {number} index - User turn index
     * @param {Object} context - { root, userElements }
     * @returns {Element[]}
     */
    getTimeLabelTargets(element, index, context = {}) {
        const targets = [];
        const userTarget = this.getTimeLabelTarget(element) || element;
        if (userTarget) targets.push(userTarget);

        const assistantTarget = this.getAssistantTimeLabelTarget?.(element, index, context);
        if (assistantTarget) targets.push(assistantTarget);

        return targets.filter((target, targetIndex, arr) =>
            target && arr.indexOf(target) === targetIndex
        );
    }

    /**
     * Optional adapter hook for the assistant response paired with a user turn.
     * Returns null by default to keep unsupported platforms unchanged.
     */
    getAssistantTimeLabelTarget() {
        return null;
    }

    /**
     * Find the first element matching selector(s) after sourceElement and before
     * the next user turn. Used by adapters to attach the same turn timestamp to
     * the assistant reply without changing timeline node semantics.
     */
    findFirstFollowingElement(sourceElement, boundaryElement, selectors, root = document) {
        if (!sourceElement || !root?.querySelectorAll) return null;
        const selector = Array.isArray(selectors) ? selectors.filter(Boolean).join(', ') : selectors;
        if (!selector) return null;

        const isFollowingSource = (candidate) => {
            try {
                return !!(sourceElement.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING);
            } catch {
                return false;
            }
        };
        const isBeforeBoundary = (candidate) => {
            if (!boundaryElement) return true;
            try {
                return !!(candidate.compareDocumentPosition(boundaryElement) & Node.DOCUMENT_POSITION_FOLLOWING);
            } catch {
                return true;
            }
        };

        try {
            return Array.from(root.querySelectorAll(selector)).find(candidate =>
                candidate !== sourceElement &&
                !sourceElement.contains(candidate) &&
                isFollowingSource(candidate) &&
                isBeforeBoundary(candidate)
            ) || null;
        } catch {
            return null;
        }
    }
    
    /**
     * Get time label position configuration
     * @returns {Object} - { top, right, left, bottom } CSS values
     */
    getTimeLabelPosition() {
        return {
            top: '-18px',
            right: '0'
        };
    }

    /**
     * Check if current path is a conversation page
     * @param {string} pathname - URL pathname
     * @returns {boolean}
     */
    isConversationRoute(pathname) {
        return false;
    }

    /**
     * Extract conversation ID from pathname (for storage key)
     * @param {string} pathname - URL pathname
     * @returns {string|null}
     */
    extractConversationId(pathname) {
        return null;
    }

    /**
     * Find conversation container element
     * @param {Element} firstMessage - First message element
     * @returns {Element|null}
     */
    findConversationContainer(firstMessage) {
        return firstMessage?.parentElement;
    }

    /**
     * Get timeline position configuration for this site
     * @returns {Object} - {top, right, bottom} in pixels or CSS values
     */
    getTimelinePosition() {
        return {
            top: '120px',      // 避开顶部导航栏
            right: '22px',    // 右侧边距
            bottom: '120px',   // 避开底部输入框
        };
    }
    
    /**
     * Get target element for inserting star chat button
     * @returns {Element|null} - Target element to insert before, or null if not supported
     */
    getStarChatButtonTarget() {
        return null; // 默认不支持，返回 null
    }
    
    /**
     * Get default chat theme for star chat feature
     * @returns {string} - Default theme name, empty string means no default
     */
    getDefaultChatTheme() {
        return ''; // 默认返回空字符串
    }
    
    /**
     * Detect if the site is in dark mode
     * 使用全局 detectDarkMode 函数（定义在 constants.js）
     * @returns {boolean} - true if dark mode is detected
     */
    detectDarkMode() {
        return typeof detectDarkMode === 'function' ? detectDarkMode() : false;
    }
    
    /**
     * Check if timeline should be hidden in current state
     * @returns {boolean} - true if timeline should be hidden
     */
    shouldHideTimeline() {
        return false; // 默认不隐藏
    }
    
    /**
     * Get scroll offset for this site when clicking timeline nodes
     * Different sites may need different offsets due to fixed headers etc.
     * @returns {number} - Scroll offset in pixels
     */
    getScrollOffset() {
        return 30; // 默认偏移量
    }
    
    /**
     * Check if AI is currently generating a response
     * Used to control padding visibility during AI response
     * @returns {boolean|null} - true: AI generating, false: AI stopped, null: not implemented
     */
    isAIGenerating() {
        return null; // 默认返回 null 表示未实现，子类需覆盖才能启用 padding 功能
    }
    
}

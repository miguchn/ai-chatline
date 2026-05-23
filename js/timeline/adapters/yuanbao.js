/**
 * Yuanbao (元宝) Adapter
 * 
 * Supports: yuanbao.tencent.com
 * Features: 使用元宝消息气泡 class + 文本 class 多信号识别，兼容 SPA/异步加载
 */

class YuanbaoAdapter extends SiteAdapter {
    constructor() {
        super();
        this._lastDebugLogAt = 0;
    }

    matches(url) {
        return matchesPlatform(url, 'yuanbao');
    }

    getUserMessageSelector() {
        return [
            '.agent-chat__bubble--human .agent-chat__bubble__content',
            '.agent-chat__conv--human .agent-chat__bubble__content',
            '[class*="agent-chat__bubble--human"] [class*="agent-chat__bubble__content"]',
            '[class*="agent-chat__conv--human"] [class*="agent-chat__bubble__content"]',
            '.agent-chat__bubble--human',
            '.agent-chat__conv--human',
            '[class*="agent-chat__bubble--human"]',
            '[class*="agent-chat__conv--human"]',
            '.hyc-content-text',
            '[class$="-content-text"]',
            '[class*="content-text"]',
            '[data-message-author-role="user"]',
            '[data-message-role="user"]',
            '[data-role="user"]'
        ].join(', ');
    }

    getUserMessageElements(root = document) {
        const raw = Array.from(root.querySelectorAll?.(this.getUserMessageSelector()) || []);
        if (raw.length === 0) {
            this._debug('no-user-candidates', { root: this._describeElement(root) });
            return [];
        }

        const normalized = raw.map(element => this._normalizeUserMessageElement(element));
        const elements = Array.from(new Set(normalized))
            .filter(element => this._isValidUserMessageElement(element))
            .sort((a, b) => {
                if (a === b) return 0;
                return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
            });

        if (elements.length === 0) {
            this._debug('all-user-candidates-filtered', {
                rawCount: raw.length,
                samples: raw.slice(0, 3).map(element => this._describeElement(element))
            });
        }
        return elements;
    }

    generateTurnId(element, index) {
        const idSource = element.closest?.('[data-message-id], [data-msgid], [data-id], [id]');
        const id = element.getAttribute?.('data-message-id') ||
            element.getAttribute?.('data-msgid') ||
            element.getAttribute?.('data-id') ||
            idSource?.getAttribute?.('data-message-id') ||
            idSource?.getAttribute?.('data-msgid') ||
            idSource?.getAttribute?.('data-id') ||
            idSource?.id;
        return id ? `yuanbao-${id}` : `yuanbao-${index}`;
    }

    generateTurnIdFromIndex(identifier) {
        return `yuanbao-${identifier}`;
    }

    extractIndexFromTurnId(turnId) {
        if (!turnId?.startsWith?.('yuanbao-')) return null;
        const part = turnId.substring(8);
        const parsed = parseInt(part, 10);
        return String(parsed) === part ? parsed : part;
    }

    findMarkerByStoredIndex(storedKey, markers, markerMap) {
        if (storedKey === null || storedKey === undefined) return null;
        const marker = markerMap?.get(`yuanbao-${storedKey}`);
        if (marker) return marker;
        if (typeof storedKey === 'number' && storedKey >= 0 && storedKey < markers.length) {
            return markers[storedKey];
        }
        return null;
    }

    extractText(element) {
        const content = element.querySelector?.([
            '.hyc-content-text',
            '[class$="-content-text"]',
            '[class*="content-text"]',
            '[data-message-content]'
        ].join(', ')) || element;
        const text = this._extractCleanText(content);
        return text || '[图片或文件]';
    }

    getTimeLabelTarget(element) {
        return element.querySelector?.('.hyc-content-text, [class$="-content-text"], [class*="content-text"]') || element;
    }

    getAssistantTimeLabelTarget(element, index, context = {}) {
        const assistant = this.findFirstFollowingElement(
            element,
            context.userElements?.[index + 1],
            [
                '.agent-chat__bubble--ai .agent-chat__bubble__content',
                '.agent-chat__conv--ai .agent-chat__bubble__content',
                '[class*="agent-chat__bubble--ai"] [class*="agent-chat__bubble__content"]',
                '[class*="agent-chat__conv--ai"] [class*="agent-chat__bubble__content"]',
                '.hyc-common-markdown',
                '[class*="common-markdown"]',
                '[class*="markdown"]',
                '[data-message-author-role="assistant"]',
                '[data-message-role="assistant"]',
                '[data-role="assistant"]'
            ],
            context.root || document
        );
        return assistant?.querySelector('.hyc-common-markdown, [class*="common-markdown"], [class*="markdown"], p') || assistant;
    }

    isConversationRoute(pathname) {
        const hasMessages = !!document.querySelector(this.getUserMessageSelector());
        return pathname.startsWith('/chat/') ||
            ((pathname === '/' || pathname === '/chat') && hasMessages);
    }

    extractConversationId(pathname) {
        try {
            const params = new URLSearchParams(location.search);
            const queryId = params.get('conversationId') || params.get('chatId') || params.get('id');
            if (queryId) return queryId;

            const segments = pathname.split('/').filter(Boolean);
            if (segments[0] === 'chat' && segments.length >= 2) {
                return segments[segments.length - 1];
            }
            return null;
        } catch {
            return null;
        }
    }

    findConversationContainer(firstMessage) {
        const containerSelectors = [
            '#chat-content',
            '.agent-chat__list__content-wrapper',
            '.agent-chat__list',
            '.agent-chat__container',
            '.agent-dialogue__content--common__content',
            '.agent-dialogue__content',
            '[class*="agent-chat__list__content-wrapper"]',
            '[class*="agent-chat__list"]',
            '[class*="agent-chat__container"]',
            '[class*="agent-dialogue__content--common__content"]',
            '[class*="agent-dialogue__content"]',
            'main',
            '[role="main"]'
        ];

        for (const selector of containerSelectors) {
            const candidates = Array.from(document.querySelectorAll(selector)).filter(el =>
                el.contains(firstMessage) && this.getUserMessageElements(el).length > 0
            );
            const container = this._pickNearestContainer(candidates);
            if (container) {
                this._debug('container-found', { selector, container: this._describeElement(container) });
                return container;
            }
        }

        const users = this.getUserMessageElements(document);
        const lca = users.length > 1 ? ContainerFinder.findLowestCommonAncestor(users) : null;
        if (lca && lca !== document.body && lca !== document.documentElement) {
            this._debug('container-found-lca', { container: this._describeElement(lca) });
            return lca;
        }

        const fallback = ContainerFinder.findConversationContainer(firstMessage, {
            messageSelector: this.getUserMessageSelector()
        });
        this._debug('container-found-fallback', { container: this._describeElement(fallback) });
        return fallback;
    }

    getTimelinePosition() {
        // 元宝位置配置
        return {
            top: '120px',       // 避开顶部导航栏
            right: '22px',     // 右侧边距
            bottom: '120px',    // 避开底部输入框
        };
    }
    
    getStarChatButtonTarget() {
        // 返回 header__name 元素，收藏按钮将插入到它前面（左边）
        return document.querySelector('[class*="agent-dialogue__content--common__header__name"]');
    }
    
    getDefaultChatTheme() {
        // 元宝使用页面标题作为默认主题
        return document.title || '';
    }
    
    /**
     * 检测 AI 是否正在生成回答
     * 元宝: 仅识别输入区内可见的停止/生成中按钮，避免非会话页误判
     * @returns {boolean}
     */
    isAIGenerating() {
        const inputScope = document.querySelector([
            '.agent-chat__input-box',
            '.agent-dialogue__content--common__input',
            '.chat-input-container',
            '[class*="agent-chat__input-box"]',
            '[class*="agent-dialogue__content--common__input"]'
        ].join(', ')) || document;

        const stopButton = inputScope.querySelector([
            '[class*="stop"]',
            '[aria-label*="停止"]',
            '[aria-label*="Stop"]',
            '[class*="generating"]'
        ].join(', '));
        if (stopButton && this._isVisible(stopButton)) return true;

        return false;
    }

    _isVisible(element) {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            element.getClientRects().length > 0;
    }

    _normalizeUserMessageElement(element) {
        if (!element?.closest) return element;
        const humanBubble = element.closest([
            '.agent-chat__bubble--human',
            '.agent-chat__conv--human',
            '[class*="agent-chat__bubble--human"]',
            '[class*="agent-chat__conv--human"]',
            '[data-message-author-role="user"]',
            '[data-message-role="user"]',
            '[data-role="user"]'
        ].join(', '));
        if (humanBubble) {
            return humanBubble.querySelector('.agent-chat__bubble__content, [class*="agent-chat__bubble__content"]') || humanBubble;
        }

        return element.closest('.agent-chat__bubble__content, [class*="agent-chat__bubble__content"]') || element;
    }

    _isValidUserMessageElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

        const aiSelector = [
            '.agent-chat__bubble--ai',
            '.agent-chat__conv--ai',
            '[class*="agent-chat__bubble--ai"]',
            '[class*="agent-chat__conv--ai"]',
            '.hyc-common-markdown',
            '[class*="common-markdown"]',
            '[data-message-author-role="assistant"]',
            '[data-message-role="assistant"]',
            '[data-role="assistant"]'
        ].join(', ');
        if (element.matches?.(aiSelector) || element.closest?.(aiSelector) || element.querySelector?.(aiSelector)) {
            return false;
        }

        const role = (
            element.getAttribute('data-message-author-role') ||
            element.getAttribute('data-message-role') ||
            element.getAttribute('data-role') ||
            ''
        ).toLowerCase();
        if (role && role !== 'user' && role !== 'human') return false;

        const text = this._extractCleanText(element);
        return !!text || !!element.querySelector?.('img, video, audio, canvas, [class*="file"], [class*="attachment"]');
    }

    _extractCleanText(element) {
        if (!element) return '';
        try {
            const clone = element.cloneNode(true);
            clone.querySelectorAll([
                'button',
                'svg',
                'script',
                'style',
                '[aria-hidden="true"]',
                '[role="button"]',
                '[class*="toolbar"]',
                '[class*="operation"]',
                '[class*="action"]',
                '[class*="copy"]',
                '[class*="share"]',
                '[class*="feedback"]'
            ].join(', ')).forEach(node => node.remove());
            return (clone.textContent || '').replace(/\s+/g, ' ').trim();
        } catch {
            return (element.textContent || '').replace(/\s+/g, ' ').trim();
        }
    }

    _pickNearestContainer(candidates) {
        return candidates.reduce((nearest, candidate) => {
            if (!nearest) return candidate;
            return nearest.contains(candidate) ? candidate : nearest;
        }, null);
    }

    _debug(reason, details = {}) {
        let enabled = false;
        try {
            enabled = localStorage.getItem('yuanbaoAdapterDebug') === '1' ||
                localStorage.getItem('chatgptTimelineDebugPerf') === '1' ||
                (typeof GLOBAL_DEBUG !== 'undefined' && GLOBAL_DEBUG === true);
        } catch {}
        if (!enabled) return;

        const now = Date.now();
        if (now - this._lastDebugLogAt < 1000) return;
        this._lastDebugLogAt = now;
        console.debug('[YuanbaoAdapter]', reason, details);
    }

    _describeElement(element) {
        if (!element) return null;
        const className = typeof element.className === 'string' ? element.className : '';
        return {
            tag: element.tagName?.toLowerCase?.(),
            id: element.id || '',
            className: className.slice(0, 160),
            text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
        };
    }
    
}

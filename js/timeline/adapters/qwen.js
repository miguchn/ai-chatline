/**
 * Qwen International (千问国际版) Adapter
 *
 * Supports: chat.qwen.ai
 *
 * DOM 结构：
 *   .qwen-chat-message-user         — 用户消息容器（id 含 uuid）
 *   .user-message-content           — 用户消息文本
 *   #chat-message-container         — 对话消息容器
 *   #chat-messages-scroll-container — 滚动容器
 *   button.stop-button              — AI 生成中的停止按钮
 *   #qwen-chat-header-right         — 标题栏右侧操作区
 */

class QwenAdapter extends SiteAdapter {
    constructor() {
        super();
        this._lastDebugLogAt = 0;
    }

    matches(url) {
        return matchesPlatform(url, 'qwen');
    }

    getUserMessageSelector() {
        return [
            '.qwen-chat-message-user',
            '[id^="qwen-chat-message-user"]',
            '.chat-user-message',
            '.user-message-content',
            '[class*="chat-message-user"]',
            '[class*="user-message"], [class*="UserMessage"]',
            '[class*="userMessage"]',
            '[class*="message-user"], [class*="MessageUser"]',
            '[data-message-author-role="user"]',
            '[data-message-role="user"]',
            '[data-role="user"]',
            '[data-author="user"]',
            '[data-sender="user"]',
            '[data-testid*="user-message"]',
            '[data-testid*="message-user"]'
        ].join(', ');
    }

    getUserMessageElements(root = document) {
        const raw = Array.from(root.querySelectorAll?.(this.getUserMessageSelector()) || []);
        if (raw.length === 0) {
            this._debug('no-user-candidates', { root: this._describeElement(root) });
            return [];
        }

        const normalized = raw.map(element => this._normalizeUserMessageElement(element));
        const elements = this._dedupeNestedUserElements(Array.from(new Set(normalized))
            .filter(element => this._isValidUserMessageElement(element)));

        if (elements.length === 0) {
            this._debug('all-user-candidates-filtered', {
                rawCount: raw.length,
                samples: raw.slice(0, 3).map(element => this._describeElement(element))
            });
        } else if (raw.length !== elements.length) {
            this._debug('user-candidates-normalized', {
                rawCount: raw.length,
                normalizedCount: elements.length
            });
        }

        return elements;
    }

    _normalizeUserMessageElement(element) {
        if (!element?.closest) return element;
        const exactRoot = element.closest([
            '.qwen-chat-message-user',
            '[id^="qwen-chat-message-user"]',
            '[class*="chat-message-user"]',
            '[class*="message-user"], [class*="MessageUser"]',
            '[data-message-author-role="user"]',
            '[data-message-role="user"]',
            '[data-role="user"]',
            '[data-author="user"]',
            '[data-sender="user"]',
            '[data-testid*="user-message"]',
            '[data-testid*="message-user"]'
        ].join(', '));
        if (exactRoot) return exactRoot;

        return this._findBestUserMessageRoot(element) || element;
    }

    _isValidUserMessageElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

        if (this._isAssistantElement(element)) return false;

        const score = this._messageRootScore(element);
        if (score < 40) return false;

        // Very broad fallbacks can accidentally climb to a mixed conversation wrapper.
        // Keep high-confidence user roots even if they contain quoted/embedded content.
        if (score < 80 && element.querySelector?.(this._assistantSelector())) {
            return false;
        }

        const role = (
            element.getAttribute('data-message-author-role') ||
            element.getAttribute('data-message-role') ||
            element.getAttribute('data-role') ||
            element.getAttribute('data-author') ||
            element.getAttribute('data-sender') ||
            ''
        ).toLowerCase();
        if (role && role !== 'user' && role !== 'human') return false;

        const text = this._extractCleanText(element);
        return !!text || !!element.querySelector?.('img, video, audio, canvas, [class*="file"], [class*="File"], [class*="attachment"], [class*="Attachment"]');
    }

    _findBestUserMessageRoot(element) {
        let best = null;
        let bestScore = 0;
        let current = element;
        let depth = 0;

        while (current && current !== document.body && depth < 7) {
            const score = this._messageRootScore(current);
            if (score > bestScore && !this._isAssistantElement(current)) {
                best = current;
                bestScore = score;
            }
            current = current.parentElement;
            depth += 1;
        }

        return best;
    }

    _messageRootScore(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return 0;
        const id = String(element.id || '').toLowerCase();
        const classText = String(element.className || '').toLowerCase();
        const attrText = [
            element.getAttribute?.('data-message-author-role'),
            element.getAttribute?.('data-message-role'),
            element.getAttribute?.('data-role'),
            element.getAttribute?.('data-author'),
            element.getAttribute?.('data-sender'),
            element.getAttribute?.('data-testid')
        ].join(' ').toLowerCase();

        let score = 0;
        if (id.startsWith('qwen-chat-message-user')) score += 120;
        if (classText.includes('qwen-chat-message-user')) score += 120;
        if (/\b(user|human)\b/.test(attrText)) score += 105;
        if (classText.includes('chat-message-user') || classText.includes('message-user')) score += 90;
        if (classText.includes('usermessage') || classText.includes('user-message')) score += 70;
        if (/\b(user|human)\b/.test(classText) &&
            /(message|chat|bubble|row|item|turn)/.test(classText) &&
            !/(content|text|paragraph)/.test(classText)) score += 65;
        if (classText.includes('chat-user-message') || classText.includes('chat-user')) score += 60;
        if (classText.includes('message') || classText.includes('bubble')) score += 25;
        if (element.hasAttribute?.('data-message-id') || element.hasAttribute?.('data-msgid') || element.hasAttribute?.('data-id')) score += 20;
        if (classText.includes('content') || classText.includes('text') || classText.includes('paragraph')) score -= 18;
        if (classText.includes('toolbar') || classText.includes('action') || classText.includes('button')) score -= 80;
        return score;
    }

    _dedupeNestedUserElements(elements) {
        const sorted = this._sortByDom(elements);
        return sorted.filter(element => {
            const containingSameTurn = sorted.find(other =>
                other !== element &&
                other.contains(element) &&
                this._messageRootScore(other) >= this._messageRootScore(element) - 10
            );
            return !containingSameTurn;
        });
    }

    _sortByDom(elements) {
        return Array.from(elements || []).sort((a, b) => {
            if (a === b) return 0;
            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
    }

    _assistantSelector() {
        return [
            '.qwen-chat-message-assistant',
            '[id^="qwen-chat-message-assistant"]',
            '.chat-assistant-message',
            '[class*="assistant-message"], [class*="AssistantMessage"]',
            '[class*="message-assistant"], [class*="MessageAssistant"]',
            '[data-message-author-role="assistant"]',
            '[data-message-role="assistant"]',
            '[data-role="assistant"]',
            '[data-author="assistant"]',
            '[data-sender="assistant"]'
        ].join(', ');
    }

    _isAssistantElement(element) {
        const selector = this._assistantSelector();
        return !!(element.matches?.(selector) || element.closest?.(selector));
    }

    generateTurnId(element, index) {
        const idSource = element.closest?.('[id^="qwen-chat-message-user"], [data-message-id], [data-msgid], [data-id]');
        const id = element.getAttribute('data-message-id') ||
            element.getAttribute('data-msgid') ||
            element.getAttribute('data-id') ||
            element.id ||
            idSource?.getAttribute('data-message-id') ||
            idSource?.getAttribute('data-msgid') ||
            idSource?.getAttribute('data-id') ||
            idSource?.id;
        if (id && id !== 'qwen-chat-message-user-undefined') {
            return `qwen-${id}`;
        }
        return `qwen-${index}`;
    }

    extractIndexFromTurnId(turnId) {
        if (!turnId) return null;
        if (turnId.startsWith('qwen-')) {
            const part = turnId.substring(5);
            const parsed = parseInt(part, 10);
            return (String(parsed) === part) ? parsed : part;
        }
        return null;
    }

    generateTurnIdFromIndex(identifier) {
        return `qwen-${identifier}`;
    }

    findMarkerByStoredIndex(storedKey, markers, markerMap) {
        if (storedKey === null || storedKey === undefined) return null;
        const turnId = `qwen-${storedKey}`;
        const marker = markerMap?.get(turnId);
        if (marker) return marker;
        if (typeof storedKey === 'number' && storedKey >= 0 && storedKey < markers.length) {
            return markers[storedKey];
        }
        return null;
    }

    extractText(element) {
        const content = element.querySelector([
            '.user-message-content',
            '.chat-user-message',
            '[class*="user-message-content"], [class*="UserMessageContent"]',
            '[class*="message-content"], [class*="MessageContent"]',
            '[data-message-content]'
        ].join(', '));
        const text = this._extractCleanText(content || element);
        return text || '[图片或文件]';
    }

    _extractCleanText(element) {
        if (!element) return '';
        try {
            const clone = element.cloneNode(true);
            clone.querySelectorAll('button, svg, script, style, [aria-hidden="true"], [role="button"], [class*="toolbar"], [class*="Toolbar"], [class*="action"], [class*="Action"]').forEach(node => node.remove());
            return (clone.textContent || '').replace(/\s+/g, ' ').trim();
        } catch {
            return (element.textContent || '').replace(/\s+/g, ' ').trim();
        }
    }

    _debug(reason, details = {}) {
        let enabled = false;
        try {
            enabled = localStorage.getItem('qwenAdapterDebug') === '1' ||
                localStorage.getItem('chatgptTimelineDebugPerf') === '1' ||
                (typeof GLOBAL_DEBUG !== 'undefined' && GLOBAL_DEBUG === true);
        } catch {}
        if (!enabled) return;

        const now = Date.now();
        if (now - this._lastDebugLogAt < 1000) return;
        this._lastDebugLogAt = now;
        console.debug('[QwenAdapter]', reason, details);
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

    getTimeLabelTarget(element) {
        return element.querySelector('.chat-user-message, .user-message-content, [class*="user-message-content"], [class*="UserMessageContent"]') || element;
    }

    getAssistantTimeLabelTarget(element, index, context = {}) {
        const assistant = this.findFirstFollowingElement(
            element,
            context.userElements?.[index + 1],
            [
                '.qwen-chat-message-assistant',
                '.chat-assistant-message',
                '[id^="qwen-chat-message-assistant"]',
                '[class*="assistant-message"], [class*="AssistantMessage"]',
                '[class*="message-assistant"], [class*="MessageAssistant"]',
                '[data-message-author-role="assistant"]',
                '[data-message-role="assistant"]',
                '[data-role="assistant"]',
                '[data-author="assistant"]',
                '[data-sender="assistant"]'
            ],
            context.root || document
        );
        return assistant?.querySelector('.markdown-body, .assistant-message-content, .chat-assistant-message, [class*="message-content"], [class*="MessageContent"]') || assistant;
    }

    isConversationRoute(pathname) {
        return pathname.startsWith('/c/') ||
            pathname.startsWith('/chat/') ||
            pathname.startsWith('/share/') ||
            pathname === '/' ||
            !!document.querySelector(this.getUserMessageSelector());
    }

    extractConversationId(pathname) {
        if (pathname.startsWith('/c/')) {
            return pathname.replace('/c/', '').split('/')[0] || null;
        }
        if (pathname.startsWith('/chat/')) {
            return pathname.replace('/chat/', '').split('/')[0] || null;
        }
        if (pathname.startsWith('/share/')) {
            return pathname.replace('/share/', '').split('/')[0] || null;
        }
        return null;
    }

    findConversationContainer(firstMessage) {
        const containerSelectors = [
            '#chat-message-container',
            '#chat-messages-scroll-container',
            '[class*="chat-message-container"], [class*="ChatMessageContainer"]',
            '[class*="message-list"], [class*="MessageList"]',
            '[class*="conversation"], [class*="Conversation"]',
            '[data-testid*="conversation"]',
            'main',
            '[role="main"]'
        ];
        for (const selector of containerSelectors) {
            const candidates = Array.from(document.querySelectorAll(selector)).filter(el =>
                el.contains(firstMessage) &&
                this.getUserMessageElements(el).length > 0
            );
            const container = this._pickNearestContainer(candidates);
            if (container) return container;
        }
        return ContainerFinder.findConversationContainer(firstMessage, {
            messageSelector: this.getUserMessageSelector()
        });
    }

    _pickNearestContainer(candidates) {
        return candidates.reduce((nearest, candidate) => {
            if (!nearest) return candidate;
            return nearest.contains(candidate) ? candidate : nearest;
        }, null);
    }

    getTimeLabelPosition() {
        return { top: '0px', right: '30px', paddingTop: '18px' };
    }

    getTimelinePosition() {
        return {
            top: '120px',
            right: '22px',
            bottom: '120px',
        };
    }

    getStarChatButtonTarget() {
        const headerRight = document.querySelector('#qwen-chat-header-right');
        if (headerRight) {
            const modal = headerRight.querySelector('.chat-extension-modal');
            if (modal) return modal;
        }
        return null;
    }

    getDefaultChatTheme() {
        try {
            const active = document.querySelector('.chat-item-drag-active .chat-item-drag-link-content-tip-text');
            if (active?.textContent?.trim()) return active.textContent.trim();
            return '';
        } catch { return ''; }
    }

    isAIGenerating() {
        return !!document.querySelector([
            'button.stop-button',
            '[class*="stop-button"], [class*="StopButton"]',
            '[data-testid*="stop"]',
            '[aria-label*="Stop"]',
            '[aria-label*="停止"]',
            '[class*="generating"], [class*="Generating"]'
        ].join(', '));
    }
}

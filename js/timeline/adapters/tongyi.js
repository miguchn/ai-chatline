/**
 * Tongyi (通义千问) Adapter
 * 
 * Supports: qianwen.com
 * Features: 使用 class 前缀识别用户消息和文本内容
 */

class TongyiAdapter extends SiteAdapter {
    constructor() {
        super();
        this._lastDebugLogAt = 0;
    }

    matches(url) {
        return matchesPlatform(url, 'tongyi');
    }

    getUserMessageSelector() {
        // 基于 class 前缀 "questionItem" 识别用户消息容器
        return [
            '[class*="questionItem"]',
            '[class*="question-item"]',
            '[class*="question"][data-msgid], [class*="Question"][data-msgid]',
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
            '[class*="questionItem"]',
            '[class*="question-item"]',
            '[class*="question"][data-msgid], [class*="Question"][data-msgid]',
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

        // Avoid accepting broad mixed wrappers when fallback selectors are the only match.
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
        if (classText.includes('questionitem') || classText.includes('question-item')) score += 125;
        if (element.hasAttribute?.('data-msgid') && classText.includes('question')) score += 105;
        if (id.startsWith('qwen-chat-message-user')) score += 110;
        if (classText.includes('qwen-chat-message-user')) score += 110;
        if (/\b(user|human)\b/.test(attrText)) score += 105;
        if (classText.includes('chat-message-user') || classText.includes('message-user')) score += 90;
        if (classText.includes('usermessage') || classText.includes('user-message')) score += 70;
        if (/\b(user|human)\b/.test(classText) &&
            /(message|chat|bubble|row|item|turn|question)/.test(classText) &&
            !/(content|text|paragraph)/.test(classText)) score += 65;
        if (classText.includes('chat-user-message') || classText.includes('chat-user')) score += 60;
        if (classText.includes('message') || classText.includes('bubble') || classText.includes('question')) score += 25;
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
            '[class*="answerItem"]',
            '[class*="answer-item"]',
            '[class*="responseItem"]',
            '[class*="assistant-message"], [class*="AssistantMessage"]',
            '[class*="message-assistant"], [class*="MessageAssistant"]',
            '.qwen-chat-message-assistant',
            '.chat-assistant-message',
            '[id^="qwen-chat-message-assistant"]',
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
        const msgId = element.getAttribute('data-msgid') ||
            element.getAttribute('data-message-id') ||
            element.getAttribute('data-id') ||
            element.id;
        if (msgId) return `tongyi-${msgId}`;
        return `tongyi-${index}`;
    }

    extractIndexFromTurnId(turnId) {
        if (!turnId) return null;
        if (turnId.startsWith('tongyi-')) {
            const part = turnId.substring(7);
            const parsed = parseInt(part, 10);
            return (String(parsed) === part) ? parsed : part;
        }
        return null;
    }

    generateTurnIdFromIndex(identifier) {
        return `tongyi-${identifier}`;
    }

    findMarkerByStoredIndex(storedKey, markers, markerMap) {
        if (storedKey === null || storedKey === undefined) return null;
        const turnId = `tongyi-${storedKey}`;
        const marker = markerMap?.get(turnId);
        if (marker) return marker;
        if (typeof storedKey === 'number' && storedKey >= 0 && storedKey < markers.length) {
            return markers[storedKey];
        }
        return null;
    }

    extractText(element) {
        // 文本在 bubble-- 开头的 class 中
        const bubble = element.querySelector([
            '[class*="bubble"]',
            '.user-message-content',
            '.chat-user-message',
            '[class*="user-message-content"], [class*="UserMessageContent"]',
            '[class*="message-content"], [class*="MessageContent"]',
            '[data-message-content]'
        ].join(', '));
        const text = this._extractCleanText(bubble || element);
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
            enabled = localStorage.getItem('tongyiAdapterDebug') === '1' ||
                localStorage.getItem('qwenCnAdapterDebug') === '1' ||
                localStorage.getItem('chatgptTimelineDebugPerf') === '1' ||
                (typeof GLOBAL_DEBUG !== 'undefined' && GLOBAL_DEBUG === true);
        } catch {}
        if (!enabled) return;

        const now = Date.now();
        if (now - this._lastDebugLogAt < 1000) return;
        this._lastDebugLogAt = now;
        console.debug('[TongyiAdapter]', reason, details);
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
        return element.querySelector('[class*="bubble"], .chat-user-message, .user-message-content, [class*="user-message-content"], [class*="UserMessageContent"]') || element;
    }

    getAssistantTimeLabelTarget(element, index, context = {}) {
        const assistant = this.findFirstFollowingElement(
            element,
            context.userElements?.[index + 1],
            [
                '[class*="answerItem"]',
                '[class*="answer-item"]',
                '[class*="responseItem"]',
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
        return assistant?.querySelector('[class*="bubble"], .markdown, .markdown-body, [class*="message-content"], [class*="MessageContent"], p') || assistant;
    }

    isConversationRoute(pathname) {
        // 通义千问对话 URL:
        // 对话: /chat/{id}
        // 分享: /share?shareId={id}
        return pathname.startsWith('/chat/') || 
               pathname.startsWith('/c/') ||
               pathname.startsWith('/share/') ||
               pathname === '/' ||
               (pathname.startsWith('/share') && location.search.includes('shareId=')) ||
               !!document.querySelector(this.getUserMessageSelector());
    }

    extractConversationId(pathname) {
        try {
            // 对话 URL: /chat/{id}
            if (pathname.startsWith('/chat/')) {
                const id = pathname.replace('/chat/', '').split('/')[0];
                if (id) return id;
            }
            if (pathname.startsWith('/c/')) {
                const id = pathname.replace('/c/', '').split('/')[0];
                if (id) return id;
            }
            if (pathname.startsWith('/share/')) {
                const id = pathname.replace('/share/', '').split('/')[0];
                if (id) return id;
            }
            // 分享 URL: /share?shareId={id}
            if (pathname.startsWith('/share')) {
                const params = new URLSearchParams(location.search);
                return params.get('shareId');
            }
            return null;
        } catch {
            return null;
        }
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

        // 查找对话容器 - 使用 LCA（最近共同祖先）算法
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
        return { top: '0px', right: '0px', paddingTop: '4px' };
    }

    getTimelinePosition() {
        // 通义千问位置配置
        return {
            top: '120px',       // 避开顶部导航栏
            right: '22px',     // 右侧边距
            bottom: '120px',    // 避开底部输入框
        };
    }
    
    getStarChatButtonTarget() {
        const shareLink = document.querySelector('use[*|href="#qwpcicon-transmission"]') ||
            document.querySelector('[data-icon-type="qwpcicon-transmission"]');
        if (shareLink) {
            const button = shareLink.closest('button');
            return button;
        }
        return null;
    }
    
    getDefaultChatTheme() {
        // 从 text-primary text-title-attachment 元素中获取对话标题
        try {
            const titleElement = document.querySelector('.text-primary.text-title-attachment');
            if (titleElement) {
                const title = titleElement.textContent?.trim() || '';
                return title;
            }
            return '';
        } catch {
            return '';
        }
    }
    
    /**
     * 检测 AI 是否正在生成回答
     * 通义千问: 当存在 class 包含 "stop-" 的元素时，表示正在生成
     * @returns {boolean}
     */
    isAIGenerating() {
        const stopElement = document.querySelector([
            '[class*="stop-"]',
            '[class*="stop-button"], [class*="StopButton"]',
            '[data-testid*="stop"]',
            '[aria-label*="Stop"]',
            '[aria-label*="停止"]',
            '[class*="generating"], [class*="Generating"]'
        ].join(', '));
        return !!stopElement;
    }
    
}

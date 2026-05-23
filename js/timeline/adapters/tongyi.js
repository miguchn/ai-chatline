/**
 * Tongyi (通义千问) Adapter
 * 
 * Supports: qianwen.com, tongyi.com, tongyi.aliyun.com, qianwen.aliyun.com
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
        // 千问国内版用户消息选择器 - 多套 DOM 结构兼容
        return [
            // 主要：class 前缀识别
            '[class*="questionItem"]',
            '[class*="question-item"]',
            '[class^="questionItem-"]',
            '[class^="questionItem_"]',
            '[class*="askItem"]',
            '[class*="ask-item"]',
            '[class*="question"][data-msgid], [class*="Question"][data-msgid]',

            // 通用：data 属性识别
            '[data-message-author-role="user"]',
            '[data-message-role="user"]',
            '[data-role="user"]',
            '[data-author="user"]',
            '[data-sender="user"]',
            '[data-testid*="user-message"]',
            '[data-testid*="message-user"]',

            // 通用：class 包含 user 相关关键词
            '.qwen-chat-message-user',
            '[id^="qwen-chat-message-user"]',
            '.chat-user-message',
            '.user-message-content',
            '[class*="chat-message-user"]',
            '[class*="user-message"], [class*="UserMessage"]',
            '[class*="userMessage"]',
            '[class*="message-user"], [class*="MessageUser"]',

            // 新增：更宽泛的 fallback（千问可能使用不同命名）
            '[class*="user-item"], [class*="UserItem"]',
            '[class*="human-message"], [class*="HumanMessage"]',
            '[class*="prompt-message"], [class*="PromptMessage"]',
            '[class*="input-message"], [class*="InputMessage"]',
            '[data-user-message]',
            '[data-human-message]'
        ].join(', ');
    }

    getUserMessageElements(root = document) {
        const selector = this.getUserMessageSelector();
        const raw = Array.from(root.querySelectorAll?.(selector) || []);

        this._debug('getUserMessageElements', {
            rootTag: root.tagName,
            rootClass: root.className?.slice?.(0, 100),
            selectorPreview: selector.slice(0, 200),
            rawCount: raw.length,
            rawSamples: raw.slice(0, 5).map(el => this._describeElement(el))
        });

        if (raw.length === 0) {
            this._debug('no-user-candidates', {
                root: this._describeElement(root),
                url: location.href,
                pathname: location.pathname
            });
            return [];
        }

        const normalized = raw.map(element => this._normalizeUserMessageElement(element));
        const elements = this._dedupeNestedUserElements(Array.from(new Set(normalized))
            .filter(element => this._isValidUserMessageElement(element)));

        if (elements.length === 0) {
            this._debug('all-user-candidates-filtered', {
                rawCount: raw.length,
                samples: raw.slice(0, 5).map(el => ({
                    element: this._describeElement(el),
                    score: this._messageRootScore(el),
                    normalized: this._describeElement(this._normalizeUserMessageElement(el)),
                    isValid: this._isValidUserMessageElement(el)
                }))
            });
        } else if (raw.length !== elements.length) {
            this._debug('user-candidates-normalized', {
                rawCount: raw.length,
                normalizedCount: elements.length,
                filteredOut: raw.length - elements.length
            });
        }

        this._debug('getUserMessageElements-result', {
            count: elements.length,
            samples: elements.slice(0, 3).map(el => this._describeElement(el))
        });

        return elements;
    }

    _normalizeUserMessageElement(element) {
        if (!element?.closest) return element;
        const exactRoot = element.closest([
            // 主要：class 前缀识别
            '[class*="questionItem"]',
            '[class*="question-item"]',
            '[class^="questionItem-"]',
            '[class^="questionItem_"]',
            '[class*="askItem"]',
            '[class*="ask-item"]',
            '[class*="question"][data-msgid], [class*="Question"][data-msgid]',

            // 通用：data 属性识别
            '[data-message-author-role="user"]',
            '[data-message-role="user"]',
            '[data-role="user"]',
            '[data-author="user"]',
            '[data-sender="user"]',
            '[data-testid*="user-message"]',
            '[data-testid*="message-user"]',

            // 通用：class 包含 user 相关关键词
            '.qwen-chat-message-user',
            '[id^="qwen-chat-message-user"]',
            '[class*="chat-message-user"]',
            '[class*="message-user"], [class*="MessageUser"]',

            // 新增：更宽泛的 fallback
            '[class*="user-item"], [class*="UserItem"]',
            '[class*="human-message"], [class*="HumanMessage"]',
            '[class*="prompt-message"], [class*="PromptMessage"]',
            '[class*="input-message"], [class*="InputMessage"]',
            '[data-user-message]',
            '[data-human-message]'
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
            element.getAttribute?.('data-testid'),
            element.getAttribute?.('data-user-message'),
            element.getAttribute?.('data-human-message')
        ].join(' ').toLowerCase();

        let score = 0;

        // 高优先级：千问国内版特有 class
        if (classText.includes('questionitem') || classText.includes('question-item')) score += 125;
        if (classText.includes('askitem') || classText.includes('ask-item')) score += 115;
        if (element.hasAttribute?.('data-msgid') && /(question|ask|user)/.test(classText)) score += 105;

        // 高优先级：data 属性明确标识 user
        if (/\b(user|human)\b/.test(attrText)) score += 105;

        // 中高优先级：通用 class 标识
        if (id.startsWith('qwen-chat-message-user')) score += 110;
        if (classText.includes('qwen-chat-message-user')) score += 110;
        if (classText.includes('chat-message-user') || classText.includes('message-user')) score += 90;
        if (classText.includes('usermessage') || classText.includes('user-message')) score += 70;

        // 中优先级：class 组合匹配
        if (/\b(user|human)\b/.test(classText) &&
            /(message|chat|bubble|row|item|turn|question|ask)/.test(classText) &&
            !/(content|text|paragraph)/.test(classText)) score += 65;
        if (classText.includes('chat-user-message') || classText.includes('chat-user')) score += 60;

        // 新增：宽泛 fallback 选择器
        if (classText.includes('user-item') || classText.includes('useritem')) score += 55;
        if (classText.includes('human-message') || classText.includes('humanmessage')) score += 55;
        if (classText.includes('prompt-message') || classText.includes('promptmessage')) score += 50;
        if (classText.includes('input-message') || classText.includes('inputmessage')) score += 50;
        if (element.hasAttribute?.('data-user-message') || element.hasAttribute?.('data-human-message')) score += 60;

        // 低优先级：通用关键词
        if (classText.includes('message') || classText.includes('bubble') || classText.includes('question') || classText.includes('ask')) score += 25;
        if (element.hasAttribute?.('data-message-id') || element.hasAttribute?.('data-msgid') || element.hasAttribute?.('data-id')) score += 20;

        // 负面评分：排除不相关元素
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
            '[class^="answerItem-"]',
            '[class^="answerItem_"]',
            '[class*="responseItem"]',
            '[class*="response-item"]',
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
            '[class*="contentBox"] [class*="bubble"]',
            '[class*="content-box"] [class*="bubble"]',
            '[class*="questionText"], [class*="question-text"]',
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
        return element.querySelector('[class*="contentBox"] [class*="bubble"], [class*="content-box"] [class*="bubble"], [class*="bubble"], .chat-user-message, .user-message-content, [class*="user-message-content"], [class*="UserMessageContent"]') || element;
    }

    getAssistantTimeLabelTarget(element, index, context = {}) {
        const assistant = this.findFirstFollowingElement(
            element,
            context.userElements?.[index + 1],
            [
                '[class*="answerItem"]',
                '[class*="answer-item"]',
                '[class^="answerItem-"]',
                '[class^="answerItem_"]',
                '[class*="responseItem"]',
                '[class*="response-item"]',
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
        // 千问国内版对话 URL 模式：
        // 对话: /chat/{id}, /c/{id}
        // 分享: /share/{id}, /share?shareId={id}
        // 首页: /
        // 千问相关路径: /qianwen, /tongyi 等

        const isRoute = pathname.startsWith('/chat/') ||
               pathname.startsWith('/c/') ||
               pathname.startsWith('/qianwen') ||
               pathname.startsWith('/tongyi') ||
               pathname.startsWith('/share/') ||
               pathname === '/' ||
               (pathname.startsWith('/share') && location.search.includes('shareId=')) ||
               !!document.querySelector(this.getUserMessageSelector());

        this._debug('isConversationRoute', {
            pathname,
            isRoute,
            hasUserMessages: !!document.querySelector(this.getUserMessageSelector())
        });

        return isRoute;
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
            '#scroll-list',
            '[class*="contentWrapper"], [class*="ContentWrapper"]',
            '[class*="content-wrapper"], [class*="ContentWrapper"]',
            '[class*="mainContent"], [class*="MainContent"]',
            '[class*="layoutContent"], [class*="LayoutContent"]',
            '[class*="chatContent"], [class*="ChatContent"]',
            '[class*="chat-content"], [class*="ChatContent"]',
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
        const fallback = ContainerFinder.findConversationContainer(firstMessage, {
            messageSelector: this.getUserMessageSelector()
        });
        this._debug('conversation-container-fallback', {
            container: this._describeElement(fallback),
            firstMessage: this._describeElement(firstMessage)
        });
        return fallback;
    }

    getScrollContainer(conversationContainer, firstMessage) {
        const selectors = [
            '#chat-messages-scroll-container',
            '#scroll-list',
            '[class*="contentWrapper"], [class*="ContentWrapper"]',
            '[class*="content-wrapper"], [class*="ContentWrapper"]',
            '[class*="chatContent"], [class*="ChatContent"]',
            '[class*="chat-content"], [class*="ChatContent"]',
            '[class*="mainContent"], [class*="MainContent"]',
            'main',
            '[role="main"]'
        ];
        const roots = [conversationContainer, firstMessage, document];

        for (const root of roots) {
            for (const selector of selectors) {
                const candidates = Array.from(root?.querySelectorAll?.(selector) || []);
                const selfCandidate = root?.matches?.(selector) ? [root] : [];
                const match = selfCandidate.concat(candidates).find(element =>
                    element &&
                    (!firstMessage || element.contains(firstMessage)) &&
                    this._isScrollable(element)
                );
                if (match) {
                    this._debug('scroll-container-adapter-found', {
                        scrollContainer: this._describeElement(match)
                    });
                    return match;
                }
            }
        }
        return null;
    }

    _isScrollable(element) {
        if (!element || element === document || element === document.body) return false;
        try {
            const style = window.getComputedStyle(element);
            const overflowY = style.overflowY;
            return (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
                element.scrollHeight > element.clientHeight;
        } catch {
            return false;
        }
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

    /**
     * 诊断方法 - 从控制台调用以排查问题
     * 用法: window.tongyiAdapter.diagnose()
     */
    diagnose() {
        const result = {
            url: location.href,
            pathname: location.pathname,
            hostname: location.hostname,
            platform: matchesPlatform(location.href, 'tongyi'),
            isConversationRoute: this.isConversationRoute(location.pathname),
            userMessageCount: this.getUserMessageElements(document).length,
            userMessageSelector: this.getUserMessageSelector().slice(0, 300),
            conversationContainer: this._describeElement(
                document.querySelector([
                    '#scroll-list',
                    '[class*="contentWrapper"]',
                    '[class*="mainContent"]',
                    '[class*="chatContent"]',
                    'main',
                    '[role="main"]'
                ].join(', '))
            ),
            domSample: Array.from(document.querySelectorAll('*')).slice(0, 100).map(el => ({
                tag: el.tagName,
                class: (el.className || '').slice(0, 80),
                hasUserKeyword: /(user|human|prompt|input|question|ask|message)/i.test(el.className || '')
            })).filter(el => el.hasUserKeyword)
        };

        console.log('[TongyiAdapter] 诊断结果:', result);
        console.table(result.domSample);
        return result;
    }
}

// 暴露到全局供调试
if (typeof window !== 'undefined') {
    window.tongyiAdapter = new TongyiAdapter();
}

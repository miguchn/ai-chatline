/**
 * Yiyan (文心一言) Adapter
 * 
 * Supports: yiyan.baidu.com
 * Features: 使用 class 前缀识别用户消息
 */

class YiyanAdapter extends SiteAdapter {
    constructor() {
        super();
    }

    matches(url) {
        return matchesPlatform(url, 'yiyan');
    }

    getUserMessageSelector() {
        // 基于多信号识别用户消息，保留 questionText 作为主路径
        return [
            '[class*="questionText"]',
            '[class*="question-text"]',
            '[class*="question"][data-msgid]',
            '[class*="question"][data-message-id]',
            '[data-message-author-role="user"]',
            '[data-message-role="user"]',
            '[data-role="user"]'
        ].join(', ');
    }

    getUserMessageElements(root = document) {
        const raw = Array.from(root.querySelectorAll?.(this.getUserMessageSelector()) || []);
        const normalized = raw.map(element => this._normalizeUserMessageElement(element));
        const elements = Array.from(new Set(normalized))
            .filter(element => this._isValidUserMessageElement(element))
            .sort((a, b) => {
                if (a === b) return 0;
                return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
            });
        return elements.filter(element =>
            !elements.some(other => other !== element && other.contains(element))
        );
    }

    _normalizeUserMessageElement(element) {
        if (!element?.closest) return element;
        return element.closest([
            '[class*="questionText"]',
            '[class*="question-text"]',
            '[class*="question"][data-msgid]',
            '[class*="question"][data-message-id]',
            '[data-message-author-role="user"]',
            '[data-message-role="user"]',
            '[data-role="user"]'
        ].join(', ')) || element;
    }

    _isValidUserMessageElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
        const assistantSelector = [
            '[class*="answer"]',
            '[class*="bot"]',
            '[class*="assistant"]',
            '[data-message-author-role="assistant"]',
            '[data-message-role="assistant"]',
            '[data-role="assistant"]'
        ].join(', ');
        if (element.matches?.(assistantSelector) || element.closest?.(assistantSelector) || element.querySelector?.(assistantSelector)) {
            return false;
        }

        const text = this._extractCleanText(element);
        return !!text || !!element.querySelector?.('img, video, audio, canvas, [class*="file"], [class*="attachment"]');
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
        return id ? `yiyan-${id}` : `yiyan-${index}`;
    }

    extractText(element) {
        // 文本在 span 子元素中
        const content = element.querySelector('[class*="questionText"], [class*="question-text"], [class*="content"], span') || element;
        const text = this._extractCleanText(content);
        return text || '[图片或文件]';
    }

    extractIndexFromTurnId(turnId) {
        if (!turnId?.startsWith?.('yiyan-')) return null;
        const part = turnId.substring(6);
        const parsed = parseInt(part, 10);
        return String(parsed) === part ? parsed : part;
    }

    generateTurnIdFromIndex(identifier) {
        return `yiyan-${identifier}`;
    }

    findMarkerByStoredIndex(storedKey, markers, markerMap) {
        if (storedKey === null || storedKey === undefined) return null;
        const marker = markerMap?.get(`yiyan-${storedKey}`);
        if (marker) return marker;
        if (typeof storedKey === 'number' && storedKey >= 0 && storedKey < markers.length) {
            return markers[storedKey];
        }
        return null;
    }

    _extractCleanText(element) {
        if (!element) return '';
        try {
            const clone = element.cloneNode(true);
            clone.querySelectorAll('button, svg, script, style, [aria-hidden="true"], [role="button"], [class*="toolbar"], [class*="operation"], [class*="action"], [class*="copy"], [class*="share"], [class*="feedback"]').forEach(node => node.remove());
            return (clone.textContent || '').replace(/\s+/g, ' ').trim();
        } catch {
            return (element.textContent || '').replace(/\s+/g, ' ').trim();
        }
    }
    
    getTimeLabelTarget(element) {
        return element.querySelector('[class*="questionText"], [class*="question-text"], [class*="content"], span') || element;
    }

    getAssistantTimeLabelTarget(element, index, context = {}) {
        const assistant = this.findFirstFollowingElement(
            element,
            context.userElements?.[index + 1],
            [
                '[class*="answer"]',
                '[class*="bot"]',
                '[class*="assistant"]',
                '[class*="markdown"]',
                '[data-message-author-role="assistant"]',
                '[data-message-role="assistant"]',
                '[data-role="assistant"]'
            ],
            context.root || document
        );
        return assistant?.querySelector('[class*="markdown"], p, span') || assistant;
    }

    isConversationRoute(pathname) {
        // 文心一言对话 URL: /chat/{id}
        return pathname.includes('/chat/');
    }

    extractConversationId(pathname) {
        try {
            // 从 /chat/MjM2MDc0MjI2Mjo1MDU4NDg3MjI 提取对话 ID
            const match = pathname.match(/\/chat\/([^\/]+)/);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }

    findConversationContainer(firstMessage) {
        // 查找对话容器 - 使用 LCA（最近共同祖先）算法
        return ContainerFinder.findConversationContainer(firstMessage, {
            messageSelector: this.getUserMessageSelector()
        });
    }

    getTimelinePosition() {
        // 文心一言位置配置
        return {
            top: '120px',       // 避开顶部导航栏
            right: '22px',     // 右侧边距
            bottom: '120px',    // 避开底部输入框
        };
    }
    
    // getStarChatButtonTarget() {
    //     // 返回 TopRightTools 元素，收藏按钮将插入到它前面
    //     return document.querySelector('[class*="TopRightTools"]');
    // }
    
    // getDefaultChatTheme() {
    //     // 文心一言使用特定元素中的文本作为默认主题
    //     try {
    //         const topFixedArea = document.querySelector('[class*="topFixedArea"]');
    //         if (!topFixedArea) return '';
    //         
    //         const container = topFixedArea.querySelector('[class*="container"]');
    //         if (!container) return '';
    //         
    //         const span = container.querySelector('span');
    //         const title = span?.textContent?.trim() || '';
    //         
    //         // 返回原始文本，不需要过滤
    //         return title;
    //     } catch {
    //         return '';
    //     }
    // }
    
    /**
     * 检测 AI 是否正在生成回答
     * 文心一言: 当存在 class 包含 "stopDealBtn" 的元素时，表示正在生成
     * @returns {boolean}
     */
    isAIGenerating() {
        const stopBtn = document.querySelector('[class*="stopDealBtn"]');
        return !!stopBtn;
    }
}

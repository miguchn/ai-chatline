/**
 * Perplexity Adapter
 * 
 * Supports: 
 *   - perplexity.ai/search/xxx (搜索对话)
 *   - perplexity.ai/thread/xxx (对话线程)
 * Features: 用户消息包含在 span.select-text 中
 */

class PerplexityAdapter extends SiteAdapter {
    constructor() {
        super();
    }

    matches(url) {
        return matchesPlatform(url, 'perplexity');
    }

    getUserMessageSelector() {
        // 新版 UI（2025-10 验证）：用户提问渲染在 group/user-bubble 容器中，
        // 旧版 span.select-text 已移除。class 包含 "group/user-bubble" 的斜杠，
        // 用属性包含选择器规避 CSS 转义问题。
        // 旧版回退：span.select-text
        return '[class*="group/user-bubble"], span.select-text';
    }

    generateTurnId(element, index) {
        return `perplexity-${index}`;
    }

    extractText(element) {
        // 新版气泡内混有原生时间戳（SPAN.select-none «16:22»）和操作按钮，
        // 正文在 [data-renderer] / .whitespace-pre-wrap 内容容器中；旧版 span.select-text 本身就是纯文本
        const content = element.querySelector('[data-renderer], .whitespace-pre-wrap');
        const text = ((content || element).textContent || '').trim();
        return text || '[图片或文件]';
    }

    getAssistantTimeLabelTarget(element, index, context = {}) {
        const assistant = this.findFirstFollowingElement(
            element,
            context.userElements?.[index + 1],
            [
                '[data-testid="answer"]',
                '.prose',
                '.answer-content'
            ],
            context.root || document
        );
        return assistant?.querySelector('.prose, p') || assistant;
    }

    isConversationRoute(pathname) {
        // Perplexity 对话 URL: /search/xxx 或 /thread/xxx
        return pathname.includes('/search/') || pathname.includes('/thread/');
    }

    extractConversationId(pathname) {
        try {
            // 提取对话 ID: /search/xxx 或 /thread/xxx
            const match = pathname.match(/\/(search|thread)\/([^\/\?]+)/);
            if (match) return match[2];
            
            return null;
        } catch {
            return null;
        }
    }

    findConversationContainer(firstMessage) {
        /**
         * 查找对话容器
         * 使用 LCA（最近共同祖先）算法查找所有对话记录的最近父容器
         */
        return ContainerFinder.findConversationContainer(firstMessage, {
            messageSelector: this.getUserMessageSelector()
        });
    }

    getTimelinePosition() {
        // Perplexity 时间轴位置配置
        return {
            top: '120px',
            right: '22px',
            bottom: '120px',
        };
    }
    
    getStarChatButtonTarget() {
        // Perplexity 暂不支持收藏按钮位置
        return null;
    }
    
    getDefaultChatTheme() {
        // Perplexity 使用页面标题作为默认主题，去掉后缀
        const title = document.title || '';
        return title.replace(/\s*-\s*Perplexity\s*$/i, '').trim();
    }
    
    /**
     * 检测 AI 是否正在生成回答
     * Perplexity: 当存在 aria-label="Stop" 的元素时，表示正在生成
     * @returns {boolean}
     */
    isAIGenerating() {
        const stopBtn = document.querySelector('[aria-label="Stop"]');
        return !!stopBtn;
    }
}


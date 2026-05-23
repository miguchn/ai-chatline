/**
 * NotebookLM Adapter
 * 
 * Google NotebookLM 平台适配器
 * 当前仅默认启用追问功能；保留时间轴/导出所需的通用适配入口，便于后续开启。
 * TODO: SITE_INFO 中 NotebookLM 的 timeline=false，当前不会注入时间轴顶部导出按钮；
 *       后续若需要在无时间轴页面展示导出入口，应新增独立页面入口而不是复用 TimelineManager。
 */

class NotebookLMAdapter extends SiteAdapter {
    /**
     * 检测是否为 NotebookLM 页面
     */
    matches(url) {
        return url.includes('notebooklm.google.com');
    }

    /**
     * 检测是否在对话页面
     * NotebookLM 的对话页面 URL 格式：/notebook/xxx
     */
    isConversationRoute(pathname) {
        return pathname.includes('/notebook/');
    }

    /**
     * 提取对话 ID
     */
    extractConversationId(pathname) {
        const match = pathname.match(/\/notebook\/([^/?]+)/);
        return match ? match[1] : null;
    }

    getUserMessageSelector() {
        return [
            '[data-testid="user-message"]',
            '.user-message',
            '.chat-message.user',
            '.message.user',
            '.query-text'
        ].join(', ');
    }

    extractText(element) {
        const content = element.querySelector?.(
            '[data-testid="message-content"], .message-content, .query-text, p'
        );
        const text = (content?.textContent || element.textContent || '').trim();
        return text || '[图片或文件]';
    }

    getTimeLabelTarget(element) {
        return element.querySelector?.('[data-testid="message-content"], .message-content, .query-text, p') || element;
    }

    getAssistantTimeLabelTarget(element, index, context = {}) {
        const assistant = this.findFirstFollowingElement(
            element,
            context.userElements?.[index + 1],
            [
                '[data-testid="assistant-message"]',
                '.assistant-message',
                '.chat-message.assistant',
                '.message.assistant'
            ],
            context.root || document
        );
        return assistant?.querySelector('[data-testid="message-content"], .message-content, p') || assistant;
    }

    findConversationContainer(firstMessage) {
        return ContainerFinder.findConversationContainer(firstMessage, {
            messageSelector: this.getUserMessageSelector()
        });
    }
}

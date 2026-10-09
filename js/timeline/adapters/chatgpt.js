/**
 * ChatGPT Adapter
 * 
 * Supports: 
 *   - chatgpt.com/c/xxx (普通对话)
 *   - chatgpt.com/g/xxx/c/xxx (GPT 对话)
 *   - chatgpt.com/share/e/xxx (分享页面)
 *   - chat.openai.com (旧域名)
 */

class ChatGPTAdapter extends SiteAdapter {
    constructor() {
        super();
    }

    matches(url) {
        return matchesPlatform(url, 'chatgpt');
    }

    getUserMessageSelector() {
        // 新版 UI（2025-10 起）：unit-key 以 :user 结尾的搜索单元容器
        // 旧版 UI 回退：data-turn="user"（灰度期间两套并存）
        return '[data-chatgpt-search-unit-key$=":user"], [data-turn="user"][data-turn-id]';
    }

    /**
     * 从 DOM 元素中提取 nodeId
     * 新版：data-chatgpt-search-message-ids（消息 UUID，多个时用空格分隔，取第一个）
     * 旧版：data-turn-id
     *
     * ✅ 降级方案：返回 null 时，generateTurnId 会降级使用 index（数字类型）
     * @param {Element} element - 用户消息元素
     * @returns {string|null} - nodeId（字符串），失败返回 null
     */
    _extractNodeIdFromDom(element) {
        if (!element) return null;

        const messageIds = element.getAttribute?.('data-chatgpt-search-message-ids');
        if (messageIds) {
            const first = messageIds.trim().split(/\s+/)[0];
            if (first) return first;
        }

        const nodeId = element.getAttribute('data-turn-id') || null;
        return nodeId ? String(nodeId) : null;
    }

    /**
     * 生成节点的唯一标识 turnId
     * 优先使用 data-turn-id（稳定），回退到数组索引（兼容）
     */
    generateTurnId(element, index) {
        // 优先使用 data-turn-id（稳定标识），回退到数组索引
        const nodeId = this._extractNodeIdFromDom(element);
        return nodeId ? `chatgpt-${nodeId}` : `chatgpt-${index}`;
    }
    
    /**
     * 从存储的 nodeId 生成 turnId（用于收藏跳转）
     * @param {string|number} identifier - nodeId（字符串）或 index（数字）
     * @returns {string}
     */
    generateTurnIdFromIndex(identifier) {
        return `chatgpt-${identifier}`;
    }
    
    /**
     * 从 turnId 中提取 nodeId/index
     * @param {string} turnId - 格式为 chatgpt-{nodeId} 或 chatgpt-{index}
     * @returns {string|number|null} - nodeId（字符串）或 index（数字）
     */
    extractIndexFromTurnId(turnId) {
        if (!turnId) return null;
        if (turnId.startsWith('chatgpt-')) {
            const part = turnId.substring(8); // 'chatgpt-'.length = 8
            // ✅ 尝试解析为数字（降级到 index 时的数据）
            const parsed = parseInt(part, 10);
            // 如果是纯数字字符串，返回数字；否则返回字符串
            return (String(parsed) === part) ? parsed : part;
        }
        return null;
    }
    
    /**
     * 根据存储的 nodeId/index 查找 marker
     * 支持新数据（nodeId 字符串）和旧数据（index 数字）
     * @param {string|number} storedKey - 存储的 nodeId 或 index
     * @param {Array} markers - marker 数组
     * @param {Map} markerMap - markerMap
     * @returns {Object|null} - 匹配的 marker
     */
    findMarkerByStoredIndex(storedKey, markers, markerMap) {
        if (storedKey === null || storedKey === undefined) return null;
        
        // 1. 先尝试用 nodeId/index 构建 turnId 查找
        const turnId = `chatgpt-${storedKey}`;
        const marker = markerMap.get(turnId);
        if (marker) return marker;
        
        // 2. Fallback：如果是数字，尝试用数组索引（兼容旧数据）
        if (typeof storedKey === 'number' && storedKey >= 0 && storedKey < markers.length) {
            return markers[storedKey];
        }
        
        return null;
    }

    extractText(element) {
        const textElement = element.querySelector('.whitespace-pre-wrap');
        const text = (textElement?.textContent || '').replace(/\s+/g, ' ').trim();
        return text || '[图片或文件]';
    }

    extractMessageText(element, index, context = {}) {
        const turnIdRaw = this._extractNodeIdFromDom(element);
        const fiberText = turnIdRaw ? context.fiberTexts?.get(turnIdRaw) : null;
        return fiberText || this.extractText(element, index, context);
    }

    /**
     * 通过 MAIN world 的 fiber bridge 同步提取所有用户消息文本
     * 用于补充/覆盖 DOM 提取（解决虚拟滚动导致的文本丢失问题）
     *
     * 通信依赖 DOM 自定义事件在同栈完成（同步往返）：
     * 1. 注册一次性 `timeline-fiber-result` 监听
     * 2. 派发 `timeline-extract-fiber` 触发 MAIN-world 桥
     * 3. dispatchEvent 返回时 cache 已被填充
     *
     * 如果桥脚本未就绪（document_idle 未到达 / CSP 拦截 / 非 ChatGPT 域），
     * 监听不会触发，cache 为空 → 调用方自动回退到 DOM 提取。
     * 首次检测到桥不可用时打印一条 warn，便于定位「桥根本没接通」。
     * @returns {Map<string, string>} - data-turn-id → 消息文本
     */
    extractFiberTexts() {
        const cache = new Map();
        let received = false;
        const handler = (e) => {
            received = true;
            if (e.detail) {
                Object.entries(e.detail).forEach(([id, txt]) => cache.set(id, txt));
            }
        };
        document.addEventListener('timeline-fiber-result', handler, { once: true });
        document.dispatchEvent(new CustomEvent('timeline-extract-fiber'));
        if (!received) {
            // 同步往返失败 → 桥脚本不可用，移除挂起监听避免内存泄漏
            document.removeEventListener('timeline-fiber-result', handler);
            if (!ChatGPTAdapter._bridgeWarned) {
                ChatGPTAdapter._bridgeWarned = true;
                console.warn('[ChatGPTAdapter] fiber bridge unavailable, falling back to DOM extraction. Check that fiber-bridge-chatgpt.js is loaded in MAIN world.');
            }
        }
        return cache;
    }
    
    /**
     * 获取时间标签的渲染目标元素
     * 新版 UI：用户消息气泡 [data-user-message-bubble]
     * 旧版 UI：[data-message-id] 子元素
     */
    getTimeLabelTarget(element) {
        return element.querySelector('[data-user-message-bubble], [data-message-id]') || element;
    }

    getAssistantTimeLabelTarget(element, index, context = {}) {
        const assistant = this.findFirstFollowingElement(
            element,
            context.userElements?.[index + 1],
            [
                '[data-chatgpt-search-unit-key$=":assistant"]',
                '[data-turn="assistant"][data-turn-id]',
                '[data-message-author-role="assistant"]'
            ],
            context.root || document
        );
        return assistant?.querySelector('[data-chatgpt-selection-message-id], [data-message-id]') || assistant;
    }

    getLongConversationCollapseTargets(element, index, context = {}) {
        const targets = [];
        if (element) targets.push(element);

        const assistant = this.findFirstFollowingElement(
            element,
            context.userElements?.[index + 1],
            [
                '[data-chatgpt-search-unit-key$=":assistant"]',
                '[data-turn="assistant"][data-turn-id]',
                '[data-message-author-role="assistant"]'
            ],
            context.root || document
        );
        if (assistant) {
            const assistantTurn = assistant.closest?.('[data-chatgpt-search-unit-key$=":assistant"], [data-turn="assistant"][data-turn-id]') || assistant;
            targets.push(assistantTurn);
        }

        return targets.filter((target, targetIndex, arr) =>
            target && arr.indexOf(target) === targetIndex
        );
    }

    isConversationRoute(pathname) {
        const segs = pathname.split('/').filter(Boolean);
        // 新对话在服务端确认前使用临时 ID（如 local-chatgpt%3Axxx），slug 校验需容忍 % : . 等字符
        const isValidSlug = (slug) =>
            typeof slug === 'string' && slug.length > 0 && /^[A-Za-z0-9_:%.+-]+$/.test(slug);

        // 检查普通对话路径: /c/{id}
        const cIndex = segs.indexOf('c');
        if (cIndex !== -1) {
            if (isValidSlug(segs[cIndex + 1])) {
                return true;
            }
        }

        // 检查 GPT 对话路径: /g/{gpt_id}/c/{conversation_id}
        const gIndex = segs.indexOf('g');
        if (gIndex !== -1 && segs[gIndex + 2] === 'c') {
            if (isValidSlug(segs[gIndex + 1]) && isValidSlug(segs[gIndex + 3])) {
                return true;
            }
        }

        // 检查分享页面路径: /share/e/{id}
        const shareIndex = segs.indexOf('share');
        if (shareIndex !== -1 && segs[shareIndex + 1] === 'e') {
            if (isValidSlug(segs[shareIndex + 2])) {
                return true;
            }
        }

        return false;
    }

    extractConversationId(pathname) {
        try {
            const segs = pathname.split('/').filter(Boolean);
            const isValidSlug = (slug) =>
                typeof slug === 'string' && slug.length > 0 && /^[A-Za-z0-9_:%.+-]+$/.test(slug);

            // 尝试提取 GPT 对话 ID: /g/{gpt_id}/c/{conversation_id}
            const gIndex = segs.indexOf('g');
            if (gIndex !== -1 && segs[gIndex + 2] === 'c') {
                const conversationId = segs[gIndex + 3];
                if (isValidSlug(conversationId)) return conversationId;
            }

            // 尝试提取普通对话 ID: /c/{id}
            const cIndex = segs.indexOf('c');
            if (cIndex !== -1) {
                const slug = segs[cIndex + 1];
                if (isValidSlug(slug)) return slug;
            }

            // 尝试提取分享页面 ID: /share/e/{id}
            const shareIndex = segs.indexOf('share');
            if (shareIndex !== -1 && segs[shareIndex + 1] === 'e') {
                const shareId = segs[shareIndex + 2];
                if (isValidSlug(shareId)) return shareId;
            }

            return null;
        } catch {
            return null;
        }
    }

    findConversationContainer(firstMessage) {
        /**
         * 查找对话容器
         * 
         * 使用 LCA（最近共同祖先）算法查找所有对话记录的最近父容器。
         * 传递 messageSelector 参数，让 ContainerFinder 能够：
         * 1. 查询所有用户消息元素
         * 2. 找到它们的最近共同祖先
         * 3. 确保容器是直接包裹所有对话的最小容器
         * 
         * 优势：比传统的向上遍历更精确，避免找到过于外层的容器
         */
        return ContainerFinder.findConversationContainer(firstMessage, {
            messageSelector: this.getUserMessageSelector()
        });
    }

    getTimelinePosition() {
        // ChatGPT 默认位置
        return {
            top: '120px',      // 避开顶部导航栏
            right: '22px',    // 右侧边距
            bottom: '120px',   // 避开底部输入框
        };
    }
    
    /**
     * 获取时间标签位置配置
     * ChatGPT: 底部显示
     */
    getTimeLabelPosition() {
        // 相对于消息元素定位
        return {
            top: '-16px',
            right: '10px'
        };
    }
    
    getStarChatButtonTarget() {
        // 旧版 UI：分享按钮带 data-testid
        const legacy = document.querySelector('[data-testid="share-chat-button"]');
        if (legacy) return legacy;

        // 新版 UI：标题栏工具区中带「分享」图标（arrow-up-open sprite）的按钮。
        // aria-label 随界面语言变化，不能作为锚点；sprite 片段名是语义化的，比 hash 文件名稳定。
        return document.querySelector(
            '[data-app-shell-main-titlebar] button:has(svg use[href*="arrow-up-open"])'
        );
    }
    
    getDefaultChatTheme() {
        // ChatGPT 使用页面标题作为默认主题
        return document.title || '';
    }
    
    /**
     * 检测是否应该隐藏时间轴
     * 旧版 UI：当页面存在 .text-token-primary 元素时隐藏（canvas 等全屏视图）
     * 新版 UI 已无 text-token-* 类 → 恒为 false，与基类默认一致
     * @returns {boolean}
     */
    shouldHideTimeline() {
        return document.querySelector('.text-token-primary') !== null;
    }
    
    /**
     * 获取滚动偏移量
     * 用户消息节点本身上方留白较多，仅需小幅补偿即可避免被顶部 UI 遮挡
     * @returns {number} - 滚动偏移量（像素）
     */
    getScrollOffset() {
        return 20;
    }
    
    /**
     * 检测 AI 是否正在生成回答
     *
     * 新版 UI（2025-10 起）：composer 主操作按钮无 id/testid，且 aria-label 随语言变化。
     * 三种状态共享 button.bg-composer-primary，仅 svg 可区分（已实测）：
     *   - 停止（生成中）：svg.icon-primary-action[fill="currentColor"]（实心方块）
     *   - 发送（有草稿）：svg fill="none"（箭头）
     *   - 语音（空输入）：svg 无 fill 属性（sprite 引用）
     * 旧版 UI 回退：#composer-submit-button[data-testid="stop-button"]
     * @returns {boolean}
     */
    isAIGenerating() {
        if (document.querySelector('button.bg-composer-primary svg.icon-primary-action[fill="currentColor"]')) {
            return true;
        }
        const submitButton = document.getElementById('composer-submit-button');
        // ✅ 必须返回 boolean，找不到按钮视为 false（未生成），而不是 null（未实现）
        return !!(submitButton && submitButton.getAttribute('data-testid') === 'stop-button');
    }
}

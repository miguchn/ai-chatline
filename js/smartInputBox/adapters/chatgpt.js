/**
 * ChatGPT Smart Enter Adapter
 * 
 * ChatGPT 平台的智能 Enter 适配器
 */

class ChatGPTSmartEnterAdapter extends BaseSmartEnterAdapter {
    /**
     * 检测是否为 ChatGPT 页面
     */
    matches() {
        return matchesSmartInputPlatform('chatgpt');
    }
    
    /**
     * 获取输入框选择器
     * 新版 UI（2025-10 起）：ProseMirror 编辑器位于 [data-composer-body] 内（无固定 id）
     * 旧版 UI 回退：id="prompt-textarea" 的 contenteditable div
     * 注意：新版对话中的 writing-block 也是 contenteditable，必须用 [data-composer-body] 限定作用域
     */
    getInputSelector() {
        return '[data-composer-body] [contenteditable="true"], #prompt-textarea';
    }

    /**
     * 获取定位参考元素
     * 优先使用 ChatGPT 统一输入区容器，避免通用背景类命中页面级祖先
     * @param {HTMLElement} inputElement - 输入框元素
     */
    getPositionReferenceElement(inputElement) {
        return inputElement?.closest('[data-composer-body]') ||
            inputElement?.closest('[data-composer-layout]') ||
            inputElement?.closest('form[data-type="unified-composer"]') ||
            inputElement?.closest('[data-type="unified-composer"]') ||
            inputElement?.closest('form') ||
            inputElement?.closest('.bg-token-bg-primary') ||
            inputElement;
    }
    
    /**
     * 获取提示词按钮位置偏移量
     */
    getPromptButtonOffset() {
        return { top: 10, left: -2 };
    }
    
    /**
     * 获取回到底部按钮位置偏移量
     */
    getScrollToBottomOffset() {
        return { top: -3, right: 8 };
    }
}

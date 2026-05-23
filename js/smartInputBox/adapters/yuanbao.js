/**
 * Yuanbao (元宝) Smart Enter Adapter
 * 
 * 元宝平台的智能输入适配器
 */

class YuanbaoSmartEnterAdapter extends BaseSmartEnterAdapter {
    /**
     * 检测是否为元宝页面
     */
    matches() {
        return matchesSmartInputPlatform('yuanbao');
    }
    
    /**
     * 获取输入框选择器
     * 元宝使用 Quill 编辑器，页面 class 会随版本调整，保留多候选兜底。
     */
    getInputSelector() {
        return [
            '.chat-input-editor .ql-editor[contenteditable="true"]',
            '.agent-chat__input-box .ql-editor[contenteditable="true"]',
            '.agent-dialogue__content--common__input .ql-editor[contenteditable="true"]',
            '[class*="agent-chat__input-box"] [contenteditable="true"]',
            '[class*="agent-dialogue__content--common__input"] [contenteditable="true"]',
            '.chat-input-container [contenteditable="true"]',
            '[data-lexical-editor="true"]',
            '[contenteditable="true"][role="textbox"]'
        ].join(', ');
    }

    /**
     * 获取定位参考元素
     * 优先使用输入框外层容器，保证提示词按钮和输入框宠物有稳定宽度。
     * @param {HTMLElement} inputElement - 输入框元素
     */
    getPositionReferenceElement(inputElement) {
        return inputElement?.closest?.([
            '.yb-input-box-textarea',
            '.agent-chat__input-box',
            '.agent-dialogue__content--common__input-box',
            '.agent-dialogue__content--common__input',
            '.chat-input-container',
            '[class*="agent-chat__input-box"]',
            '[class*="agent-dialogue__content--common__input"]'
        ].join(', ')) ||
            document.querySelector('.yb-input-box-textarea, .agent-chat__input-box, [class*="agent-chat__input-box"]') ||
            inputElement;
    }
    
    /**
     * 获取提示词按钮位置偏移量
     */
    getPromptButtonOffset() {
        return { top: 10, left: -2 };
    }
}


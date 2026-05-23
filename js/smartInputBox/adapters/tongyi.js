/**
 * Tongyi Smart Enter Adapter
 * 
 * 通义千问平台的智能 Enter 适配器
 */

class TongyiSmartEnterAdapter extends BaseSmartEnterAdapter {
    /**
     * 检测是否为通义千问页面
     */
    matches() {
        return matchesSmartInputPlatform('tongyi');
    }
    
    /**
     * 获取输入框选择器
     * 千问国内版在 qianwen.com 与旧 tongyi.aliyun.com 之间有多套输入框 DOM。
     * 新增更多 fallback 以兼容不同版本。
     */
    getInputSelector() {
        return [
            // 主要：Slate.js contenteditable
            '[class*="textareaWrap"] [data-slate-editor="true"][contenteditable="true"]',
            '[class*="inputOutWrap"] [data-slate-editor="true"][contenteditable="true"]',
            '[class*="chatInput"] [data-slate-editor="true"][contenteditable="true"]',
            '[class*="inputInner"] [data-slate-editor="true"][contenteditable="true"]',
            '[class*="editor"] [data-slate-editor="true"][contenteditable="true"]',
            '[contenteditable="true"][data-slate-editor="true"]',

            // 通用 contenteditable
            '[contenteditable="true"][data-placeholder]',
            '[contenteditable="true"][role="textbox"]',
            '[contenteditable="true"][class*="input"]',
            '[contenteditable="true"][class*="editor"]',
            '[contenteditable="true"][class*="textarea"]',

            // 新增：更多 fallback
            '[class*="inputArea"] [contenteditable="true"]',
            '[class*="messageInput"] [contenteditable="true"]',
            '[class*="chatTextarea"] [contenteditable="true"]',
            '[class*="promptInput"] [contenteditable="true"]',

            // Textarea fallback
            '[class*="textareaWrap"] textarea',
            '[class*="inputOutWrap"] textarea',
            '[class*="chatInput"] textarea',
            '[class*="inputArea"] textarea',
            '[class*="messageInput"] textarea',
            'textarea[placeholder*="输入"]',
            'textarea[placeholder*="消息"]',
            'textarea'
        ].join(', ');
    }

    /**
     * 获取定位参考元素
     * 使用 class 包含 inputContainer 的祖先元素作为定位参考
     * 新增更多 fallback 以兼容不同版本
     * @param {HTMLElement} inputElement - 输入框元素
     */
    getPositionReferenceElement(inputElement) {
        return inputElement?.closest([
            '[class*="inputContainer"]',
            '[class*="inputOutWrap"]',
            '[class*="chatInput"]',
            '[class*="inputInner"]',
            '[class*="textareaWrap"]',
            '[class*="editor"]',
            // 新增 fallback
            '[class*="inputArea"]',
            '[class*="messageInput"]',
            '[class*="chatTextarea"]',
            '[class*="promptInput"]',
            '[class*="input-box"]',
            '[class*="InputBox"]',
            '[class*="input-wrapper"]',
            '[class*="InputWrapper"]'
        ].join(', ')) || inputElement;
    }
    
    /**
     * 获取提示词按钮位置偏移量
     */
    getPromptButtonOffset() {
        return { top: 10, left: -2 };
    }

    insertText(inputElement, text) {
        if (!inputElement) return;
        inputElement.focus();

        const existingText = inputElement.innerText || '';
        const hasContent = existingText.trim().length > 0;

        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(inputElement);
        if (hasContent) {
            range.collapse(false);
        }
        sel.removeAllRanges();
        sel.addRange(range);

        const appendText = hasContent ? ('\n' + text + '\n') : text + '\n';

        const dt = new DataTransfer();
        dt.setData('text/plain', appendText);
        inputElement.dispatchEvent(new ClipboardEvent('paste', {
            clipboardData: dt, bubbles: true, cancelable: true
        }));

        setTimeout(() => {
            inputElement.focus();
            const s = window.getSelection();
            const r = document.createRange();
            r.selectNodeContents(inputElement);
            r.collapse(false);
            s.removeAllRanges();
            s.addRange(r);
            inputElement.scrollTop = inputElement.scrollHeight;
        }, 50);
    }

    /**
     * 诊断方法 - 从控制台调用以排查问题
     * 用法: window.tongyiSmartInputAdapter.diagnose()
     */
    diagnose() {
        const inputSelector = this.getInputSelector();
        const inputElement = document.querySelector(inputSelector);
        const positionRef = inputElement ? this.getPositionReferenceElement(inputElement) : null;

        const result = {
            url: location.href,
            platform: matchesSmartInputPlatform('tongyi'),
            inputSelector: inputSelector.slice(0, 300),
            inputFound: !!inputElement,
            inputElement: inputElement ? {
                tag: inputElement.tagName,
                class: (inputElement.className || '').slice(0, 100),
                contentEditable: inputElement.contentEditable,
                hasSlateEditor: inputElement.hasAttribute('data-slate-editor')
            } : null,
            positionRef: positionRef ? {
                tag: positionRef.tagName,
                class: (positionRef.className || '').slice(0, 100)
            } : null,
            allContentEditable: Array.from(document.querySelectorAll('[contenteditable="true"]')).map(el => ({
                tag: el.tagName,
                class: (el.className || '').slice(0, 80),
                hasSlate: el.hasAttribute('data-slate-editor'),
                hasRole: el.hasAttribute('role')
            }))
        };

        console.log('[TongyiSmartInputAdapter] 诊断结果:', result);
        return result;
    }
}

// 暴露到全局供调试
if (typeof window !== 'undefined') {
    window.tongyiSmartInputAdapter = new TongyiSmartEnterAdapter();
}

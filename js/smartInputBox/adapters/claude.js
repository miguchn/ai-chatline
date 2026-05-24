/**
 * Claude Smart Enter Adapter
 * 
 * Claude 平台的智能输入适配器
 */

class ClaudeSmartEnterAdapter extends BaseSmartEnterAdapter {
    /**
     * 检测是否为 Claude 页面
     */
    matches() {
        return matchesSmartInputPlatform('claude');
    }
    
    /**
     * 获取输入框选择器
     * Claude 使用 ProseMirror 编辑器，contenteditable="true"
     */
    getInputSelector() {
        return '.ProseMirror[contenteditable="true"]';
    }

    /**
     * 获取定位参考元素
     * 使用 data-testid="chat-input-grid-area" 作为定位参考
     * @param {HTMLElement} inputElement - 输入框元素
     */
    getPositionReferenceElement(inputElement) {
        return inputElement?.closest('[data-testid="chat-input-grid-area"]') || inputElement;
    }
    
    /**
     * 获取提示词按钮位置偏移量
     */
    getPromptButtonOffset() {
        return { top: 10, left: -2 };
    }

    isAIGenerating() {
        const stopPath = document.querySelector('path[d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm40-112v56a12,12,0,0,1-12,12H100a12,12,0,0,1-12-12V100a12,12,0,0,1,12-12h56A12,12,0,0,1,168,100Z"]');
        return !!stopPath || super.isAIGenerating();
    }
}


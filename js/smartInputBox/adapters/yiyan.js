/**
 * Yiyan Smart Enter Adapter
 *
 * Used by input animation for positioning. Smart Enter itself remains disabled
 * while SITE_INFO.features.smartInput is false.
 */
class YiyanSmartEnterAdapter extends BaseSmartEnterAdapter {
    matches() {
        return matchesSmartInputPlatform('yiyan');
    }

    getInputSelector() {
        return [
            '[class*="input"] textarea',
            '[class*="chat"] textarea',
            'textarea[placeholder*="输入"]',
            'textarea[placeholder*="提问"]',
            'textarea',
            '[contenteditable="true"][role="textbox"]',
            '[contenteditable="true"][data-placeholder]',
            '[class*="input"] [contenteditable="true"]'
        ].join(', ');
    }

    getPositionReferenceElement(inputElement) {
        return inputElement?.closest([
            '[class*="input"]',
            '[class*="Input"]',
            '[class*="textarea"]',
            '[class*="Textarea"]',
            '[class*="composer"]',
            '[class*="chat"]'
        ].join(', ')) || inputElement;
    }

    getPromptButtonOffset() {
        return { top: 10, left: -2 };
    }

    isAIGenerating() {
        const stopBtn = document.querySelector('[class*="stopDealBtn"]');
        return !!stopBtn || super.isAIGenerating();
    }
}

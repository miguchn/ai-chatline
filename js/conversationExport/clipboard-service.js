/**
 * Clipboard Service
 */

const ClipboardService = {
    async copy(text) {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.select();

        const ok = document.execCommand('copy');
        textarea.remove();
        if (!ok) throw new Error('复制到剪贴板失败');
    }
};

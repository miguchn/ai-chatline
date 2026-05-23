/**
 * Conversation Export Panel
 *
 * 轻量面板，只负责选择格式和触发复制/下载。
 */

const ConversationExportPanel = {
    _overlay: null,
    _service: null,
    _selectedFormat: 'markdown',

    show({ adapter } = {}) {
        this.hide();
        this._service = new ConversationExportService({ adapter });
        this._selectedFormat = 'markdown';

        const overlay = document.createElement('div');
        overlay.className = 'ait-export-panel-overlay';
        overlay.innerHTML = `
            <div class="ait-export-panel" role="dialog" aria-modal="true" aria-label="导出对话">
                <div class="ait-export-panel-header">
                    <div class="ait-export-panel-title">导出对话</div>
                    <button class="ait-export-panel-close" type="button" aria-label="关闭">×</button>
                </div>
                <div class="ait-export-panel-body">
                    <div class="ait-export-format-list" role="radiogroup" aria-label="导出格式">
                        ${this._formatOption('markdown', 'Markdown', '.md')}
                        ${this._formatOption('obsidian', 'Obsidian', '.md + YAML')}
                        ${this._formatOption('txt', 'TXT', '.txt')}
                        ${this._formatOption('json', 'JSON', '.json')}
                    </div>
                </div>
                <div class="ait-export-panel-actions">
                    <button class="ait-export-action-btn" type="button" data-action="copy">复制到剪贴板</button>
                    <button class="ait-export-action-btn primary" type="button" data-action="download">下载文件</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this._overlay = overlay;
        this._bindEvents(overlay);
    },

    hide() {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
        this._service = null;
    },

    _formatOption(value, label, hint) {
        const checked = value === this._selectedFormat ? 'checked' : '';
        return `
            <label class="ait-export-format-item">
                <input type="radio" name="ait-export-format" value="${value}" ${checked}>
                <span class="ait-export-format-check"></span>
                <span class="ait-export-format-text">
                    <span class="ait-export-format-label">${label}</span>
                    <span class="ait-export-format-hint">${hint}</span>
                </span>
            </label>
        `;
    },

    _bindEvents(overlay) {
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) this.hide();
        });

        overlay.querySelector('.ait-export-panel-close')?.addEventListener('click', () => this.hide());

        overlay.querySelectorAll('input[name="ait-export-format"]').forEach(input => {
            input.addEventListener('change', () => {
                if (input.checked) this._selectedFormat = input.value;
            });
        });

        overlay.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', () => this._handleAction(button));
        });
    },

    async _handleAction(button) {
        if (!this._service || !button) return;

        const action = button.dataset.action;
        const label = button.textContent;
        button.disabled = true;
        button.textContent = action === 'copy' ? '复制中...' : '导出中...';

        try {
            if (action === 'copy') {
                await this._service.copy(this._selectedFormat);
                this._toast('success', '已复制到剪贴板', button);
            } else {
                await this._service.download(this._selectedFormat);
                this._toast('success', '已开始下载', button);
            }
        } catch (error) {
            this._toast('error', error?.message || '导出失败', button);
        } finally {
            button.disabled = false;
            button.textContent = label;
        }
    },

    _toast(type, message, target) {
        const manager = window.globalToastManager;
        if (manager?.[type]) {
            manager[type](message, target);
            return;
        }
        console[type === 'error' ? 'error' : 'log'](`[ConversationExport] ${message}`);
    }
};

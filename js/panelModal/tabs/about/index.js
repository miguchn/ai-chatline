/**
 * About Tab - 关于插件
 */

class AboutTab extends BaseTab {
    constructor() {
        super();
        this.id = 'about';
        this.name = chrome.i18n.getMessage('aboutTabName') || '关于';
        this.icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="8" stroke-width="3" stroke-linecap="round"/>
            <line x1="12" y1="12" x2="12" y2="16" stroke-linecap="round"/>
        </svg>`;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'about-tab';

        container.innerHTML = `
            <div class="about-section">
                <div class="about-section-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                        <polyline points="13,2 13,9 20,9"/>
                    </svg>
                </div>
                <div class="about-section-body">
                    <div class="about-section-title">${chrome.i18n.getMessage('aboutPluginTitle') || '这是什么'}</div>
                    <div class="about-section-content">${chrome.i18n.getMessage('aboutPluginContent') || 'ChatLine 给 AI 对话页面加上时间轴、收藏、导出和代码运行，基于开源项目 Timeline 二次开发，支持 ChatGPT、Gemini、DeepSeek、Kimi、千问、Claude、元宝、NotebookLM 等平台。'}</div>
                </div>
            </div>

            <div class="about-section">
                <div class="about-section-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                </div>
                <div class="about-section-body">
                    <div class="about-section-title">${chrome.i18n.getMessage('aboutDataSecurityTitle') || '你的数据'}</div>
                    <div class="about-section-content">${chrome.i18n.getMessage('aboutDataSecurityContent') || '你的数据只存在浏览器本地或你自己的 Google Drive 里。插件不收集、不上传、不分享任何对话内容和个人信息。项目已在 GitHub 开源，代码随时可查。'}</div>
                </div>
            </div>

            <div class="about-section">
                <div class="about-section-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                </div>
                <div class="about-section-body">
                    <div class="about-section-title">${chrome.i18n.getMessage('aboutDeveloperTitle') || '提意见'}</div>
                    <div class="about-section-content">
                        ${chrome.i18n.getMessage('aboutDeveloperContent') || 'ChatLine 是 ai-chat-timeline 的二次开发版本。想提需求或报 bug，请到项目仓库提 Issue。'}
                    </div>
                </div>
            </div>

            <div class="about-section about-section-highlight">
                <div class="about-section-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                </div>
                <div class="about-section-body">
                    <div class="about-section-title">${chrome.i18n.getMessage('aboutShareTitle') || '推荐给朋友'}</div>
                    <div class="about-section-content">
                        ${chrome.i18n.getMessage('aboutShareContent') || '如果 ChatLine 帮到了你，欢迎推荐给常看 AI 对话的朋友。作者：咪咕看见小黑，邮箱 miguchn@gmail.com，有问题或建议随时来信。'}
                    </div>
                </div>
            </div>

        `;

        return container;
    }

    mounted() {
        super.mounted();
    }

    unmounted() {
        super.unmounted();
    }
}

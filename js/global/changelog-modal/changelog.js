/**
 * Changelog Data - 版本更新内容
 * 
 * 每次想推送更新提示时只需修改这个文件：
 * 1. 更换 id 为任意新字符串（与上次不同即可触发提示）
 * 2. 设置 displayMode：'icon'(提示词按钮左侧 Logo) 或 'popup'(自动弹窗)
 * 3. 更新 features / improvements 列表（支持 zh/en 双语）
 *    - features: 新功能
 *    - improvements: 功能优化 & 修复
 * 
 * 弹窗中展示的版本号自动从 manifest.json 获取，无需手动维护
 */

const CHANGELOG_DATA = {
    id: '2026052201',
    // 'icon' = 提示词按钮左侧显示 Logo + 小红点（温和提示）
    // 'popup' = 自动弹窗展示更新内容（强提醒）
    displayMode: 'icon',

    features: [
        {
            zh: '新增对话导出功能，支持将当前 AI 对话导出为 Markdown、Obsidian Markdown、TXT、JSON 等格式，便于本地归档、知识沉淀和后续复用',
            en: 'Added conversation export for the current AI chat, with Markdown, Obsidian Markdown, TXT, JSON, and other formats for local archiving and reuse'
        },
        {
            zh: '支持在对话页面快速导出当前会话内容，并提供复制到剪贴板和下载文件两种操作方式',
            en: 'Export the current conversation directly from the chat page, with both copy-to-clipboard and file download actions'
        },
        {
            zh: '新增对话导出开关配置，用户可在设置页中自主开启或关闭该能力',
            en: 'Added a conversation export setting so users can enable or disable the feature from the settings panel'
        }
    ],

    improvements: [
        {
            zh: '优化多平台适配能力，增强插件在豆包、千问、DeepSeek 等国产大模型平台下的兼容性和稳定性',
            en: 'Improved multi-platform compatibility and stability for Doubao, Qwen, DeepSeek, and other domestic AI model platforms'
        },
        {
            zh: '优化对话识别、内容采集和角色判断逻辑，提升时间轴展示与对话导出的完整性，减少角色错位和内容漏采集',
            en: 'Improved conversation detection, content extraction, and role recognition to make timeline display and exports more complete'
        },
        {
            zh: '保持 ChatGPT、Grok 等已适配平台能力稳定，不影响原有时间轴、收藏、文件夹、设置和数据同步功能',
            en: 'Kept existing support stable for ChatGPT, Grok, and other adapted platforms without affecting timeline, bookmarks, folders, settings, or data sync'
        }
    ]
};

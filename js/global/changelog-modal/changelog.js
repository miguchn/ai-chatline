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
    id: '2026100901',
    // 'icon' = 提示词按钮左侧显示 Logo + 小红点（温和提示）
    // 'popup' = 自动弹窗展示更新内容（强提醒）
    displayMode: 'popup',

    features: [
        {
            zh: '适配新版 ChatGPT 界面与新一代 AI 浏览器，时间轴、收藏、智能输入、对话导出全面恢复',
            en: 'Adapted to the new ChatGPT interface and the new generation of AI browsers — timeline, starring, smart input, and conversation export fully restored'
        },
        {
            zh: '对话宽度调节改用平台原生宽度变量，DeepSeek、ChatGPT 拉宽即时生效',
            en: 'Chat width control now scales the platforms’ native width variables, taking effect instantly on DeepSeek and ChatGPT'
        },
        {
            zh: 'NotebookLM 支持新域名 notebook.google.com',
            en: 'NotebookLM now works on its new domain notebook.google.com'
        }
    ],

    improvements: [
        {
            zh: 'Perplexity 适配新版页面结构，时间轴恢复正常',
            en: 'Perplexity timeline restored for the new page structure'
        },
        {
            zh: '兼容 ChatGPT 灰度期间的新旧两套界面',
            en: 'Compatible with both old and new ChatGPT interfaces during the rollout'
        },
        {
            zh: '界面文案全面更新为口语化短句，覆盖 19 种语言',
            en: 'Interface copy fully rewritten into conversational short lines across 19 languages'
        }
    ]
};

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
    id: '2026060801',
    // 'icon' = 提示词按钮左侧显示 Logo + 小红点（温和提示）
    // 'popup' = 自动弹窗展示更新内容（强提醒）
    displayMode: 'icon',

    features: [
        {
            zh: '对话导出支持「全量导出」和「选择导出」，可按需勾选指定对话内容导出',
            en: 'Conversation export now supports full export and selected export, so you can pick only the messages you need'
        }
    ],

    improvements: [
        {
            zh: '选择导出未勾选内容时会给出提示，导出完成后自动退出选择状态',
            en: 'Selected export now warns when nothing is selected and exits selection mode after export'
        }
    ]
};

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
    id: '2026052401',
    // 'icon' = 提示词按钮左侧显示 Logo + 小红点（温和提示）
    // 'popup' = 自动弹窗展示更新内容（强提醒）
    displayMode: 'icon',

    features: [
        {
            zh: '电子宠物新增小猫、小狗、小熊猫等更多选择，让 AI 回复等待过程更轻松有趣',
            en: 'Added more digital pet choices, including kitten, puppy, and red panda, to make waiting for AI replies more delightful'
        }
    ],

    improvements: [
        {
            zh: '优化对话宽度调节的跨平台适配，更多 AI 平台可稳定调整对话区域宽度',
            en: 'Improved cross-platform support for chat width adjustment, so more AI platforms can resize conversation areas reliably'
        }
    ]
};

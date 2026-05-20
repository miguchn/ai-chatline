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
    id: '2026052001',
    // 'icon' = 提示词按钮左侧显示 Logo + 小红点（温和提示）
    // 'popup' = 自动弹窗展示更新内容（强提醒）
    displayMode: 'icon',

    features: [
        {
            zh: '时间轴主题色：支持为不同 AI 平台设置激活节点颜色',
            en: 'Timeline theme colors: set active node colors for different AI platforms'
        },
        {
            zh: 'AI 回复完成提醒：当你停留在历史节点时，回复完成会及时提示',
            en: 'AI reply completion reminders: get notified when a reply finishes while viewing an earlier node'
        }
    ],

    improvements: [
        {
            zh: '修复 Gemini 页面改版后，侧边栏收藏文件夹显示位置异常的问题',
            en: 'Fixed incorrect starred folder placement after Gemini’s page structure update'
        }
    ]
};

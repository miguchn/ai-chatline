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
    id: '2026052301',
    // 'icon' = 提示词按钮左侧显示 Logo + 小红点（温和提示）
    // 'popup' = 自动弹窗展示更新内容（强提醒）
    displayMode: 'icon',

    features: [],

    improvements: [
        {
            zh: '优化千问、千问国际版平台适配，提升时间轴加载和节点识别稳定性',
            en: 'Improved Qwen and Qwen international compatibility for more stable timeline loading and node detection'
        },
        {
            zh: '修复腾讯元宝平台适配异常，提升插件加载、时间轴、对话识别和导出稳定性',
            en: 'Fixed Tencent Yuanbao compatibility issues and improved extension loading, timeline, conversation detection, and export stability'
        }
    ]
};

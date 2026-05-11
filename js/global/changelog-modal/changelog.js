/**
 * Changelog Data - 版本更新内容
 * 
 * 每次发版只需修改这个文件：
 * 1. 更新 version 为需要弹窗的版本号
 * 2. 设置 displayMode：'icon'(提示词按钮左侧 Logo) 或 'popup'(自动弹窗)
 * 3. 更新 features / improvements 列表（支持 zh/en 双语）
 *    - features: 新功能
 *    - improvements: 功能优化 & 修复
 * 
 * 如果某次小版本不想提示，保持 version 不变即可
 */

const CHANGELOG_DATA = {
    version: '4.6.6',
    // 'icon' = 提示词按钮左侧显示 Logo + 小红点（温和提示）
    // 'popup' = 自动弹窗展示更新内容（强提醒）
    displayMode: 'icon',

    features: [
        {
            zh: '文件夹新增「去重模式」，已收藏的对话可从原版侧边栏隐藏',
            en: 'Added "dedup mode" for starred items — hide starred conversations from native sidebar'
        },
        {
            zh: '新增调整对话宽度功能',
            en: 'Added chat width adjustment'
        },
        {
            zh: '侧边栏收藏区新增设置入口（齿轮图标）',
            en: 'Added settings shortcut (gear icon) in sidebar starred header'
        }
    ],

    improvements: [
        {
            zh: '修复 Ctrl+A 全选复制时会包含插件 UI 文本的问题',
            en: 'Fixed Ctrl+A copying extension UI text into clipboard'
        },
        {
            zh: '统一动画组件类名前缀（ait-）',
            en: 'Unified animation component class name prefix (ait-)'
        }
    ]
};

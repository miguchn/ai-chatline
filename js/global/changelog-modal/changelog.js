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
    id: '4.6.6',
    // 'icon' = 提示词按钮左侧显示 Logo + 小红点（温和提示）
    // 'popup' = 自动弹窗展示更新内容（强提醒）
    displayMode: 'icon',

    features: [
        {
            zh: '文件夹新增「去重模式」，已收藏的对话可从原版侧边栏隐藏',
            en: 'Added "dedup mode" for starred items — hide starred conversations from native sidebar'
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
            zh: '修复插件导致 QQ 邮箱等页面布局异常的问题',
            en: 'Fixed plugin causing layout issues on QQ Mail and similar pages'
        },
        {
            zh: '修复豆包页面 LaTeX 公式无法复制的问题',
            en: 'Fixed LaTeX formula copy not working on Doubao'
        }
    ]
};

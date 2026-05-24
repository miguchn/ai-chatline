<div align="center">
  <img src="./icons/icon128.png" alt="ChatLine Logo" width="80" height="80">
  <h1>ChatLine</h1>
  <p><strong>面向 AI 对话页面的浏览器增强插件</strong><br>基于开源项目 Timeline 二次开发，提供时间线导航、历史定位、对话浏览增强与对话数据归档能力。<br>支持 GPT、Gemini、DeepSeek、Kimi、千问、Claude、元宝、NotebookLM 等所有主流 AI 平台</p>

  <p>
    <img src="https://img.shields.io/badge/项目-ai--chat--timeline-181717?style=flat-square" alt="Project">
    <img src="https://img.shields.io/badge/许可证-GPL--3.0-blue?style=flat-square" alt="License">
  </p>

  <h4><strong>简体中文</strong> | <a href="./README.en.md">English</a></h4>

  <img src="./READMEIMAGE/index.png" alt="ChatLine 效果展示" width="800">
</div>

<br>

## 📥 安装

> ChatLine 当前处于二开初始化阶段，正式发布渠道确定后再补充商店安装方式。

开发调试时可通过浏览器扩展的开发者模式加载本仓库目录。安装后打开支持的 AI 对话页面即可使用，无需额外配置。

## 🎯 核心功能

<table>
  <tr>
    <td width="50%">

**对话时间轴** — 右侧竖向时间轴，一键跳转到任意对话

**提问列表** — 展示所有问题，标记重点、跳转、收藏

**收藏系统** — 收藏问答到文件夹，侧边栏快速访问

**闪记** — 浮动笔记面板，随手记录想法

  </td>
  <td width="50%">

**快捷追问** — 选中文本一键引用追问

**提示词库** — 保存常用 Prompt，一键插入

**代码运行** — 运行 JS/Python/TS/SQL 等代码块

**公式复制** — 一键复制 LaTeX / MathML 源码

  </td>
  </tr>
</table>

<details>
<summary><strong>查看完整功能列表（20 项）</strong></summary>

<br>

### 核心功能

| 功能 | 说明 |
|------|------|
| 🎯 **对话时间轴** | 右侧竖向时间轴，点击节点跳转到对应对话位置 |
| 📋 **提问列表** | 展示当前对话所有问题，支持标记重点、跳转、收藏 |
| ⭐️ **收藏对话** | 收藏单条问答或整页对话到文件夹，支持备注 |
| 📂 **收藏管理** | 设置面板中的收藏库，支持文件夹分组、搜索、跳转 |
| 📌 **侧边栏收藏** | 在 AI 平台原生侧边栏中注入收藏列表 |
| 📝 **闪记** | 浮动笔记面板，对话中随手记录想法 |
| 🕐 **提问时间标签** | 在时间轴上显示每条消息的发送时间 |

### 输入增强

| 功能 | 说明 |
|------|------|
| ⏎ **智能回车** | Enter 换行，双击 Enter 发送 |
| 💬 **提示词库** | 保存常用 Prompt，一键插入输入框 |
| 🔍 **快捷追问** | 选中 AI 回复文本，一键引用追问 |
| 🎨 **电子宠物** | AI 回复时输入框上方的电子宠物 |

### 公式与代码

| 功能 | 说明 |
|------|------|
| 🧮 **公式复制** | 点击数学公式复制 LaTeX / MathML 源码 |
| ▶️ **代码运行器** | 一键运行代码块（JS/Python/TS/SQL/Lua/Ruby/HTML/JSON/Markdown） |
| 📊 **Mermaid 图表** | 渲染 Mermaid 代码块为图表，支持全屏查看 |

### 导航与操作

| 功能 | 说明 |
|------|------|
| ⌨️ **键盘导航** | 上下方向键切换对话节点 |
| 📌 **长按标记** | 长按时间轴节点标记/取消重点 |
| ⬇️ **回到底部** | 快速滚动到最新消息 |

### 数据与设置

| 功能 | 说明 |
|------|------|
| ☁️ **数据同步** | Google Drive 云备份 + JSON 导入导出 |
| ⚙️ **设置面板** | 多 Tab 设置界面，集中管理所有功能 |
| 🌍 **多语言** | 支持 19 种语言 |

</details>

## 🌐 支持平台

| 平台 | 时间轴 | 文本高亮 | 智能输入 | 输入动画 | 快捷追问 | 提问时间 | 侧边栏收藏 | 回到底部 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| ChatGPT | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Gemini | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DeepSeek | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Claude | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Kimi | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| 豆包 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| 千问 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Qwen 国际版 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Grok | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Perplexity | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| 元宝 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| 文心一言 | ✅ | ✅ | — | ✅ | ✅ | ✅ | — | — |
| NotebookLM | — | ✅ | ✅ | ✅ | ✅ | — | — | — |

> 💡 **公式复制**和**代码运行器**不受平台限制，在所有页面上检测到对应内容即自动激活。

## 🌍 多语言

支持 **42 种语言**，覆盖全球主要语言。

<details>
<summary>查看完整语言列表</summary>

| 语言 | 代码 | 语言 | 代码 | 语言 | 代码 |
|------|------|------|------|------|------|
| 🇬🇧 English | en | 🇨🇳 简体中文 | zh_CN | 🇹🇼 繁體中文 | zh_TW |
| 🇯🇵 日本語 | ja | 🇰🇷 한국어 | ko | 🇪🇸 Español | es |
| 🇫🇷 Français | fr | 🇩🇪 Deutsch | de | 🇮🇹 Italiano | it |
| 🇵🇹 Português | pt | 🇷🇺 Русский | ru | 🇳🇱 Nederlands | nl |
| 🇵🇱 Polski | pl | 🇹🇷 Türkçe | tr | 🇸🇦 العربية | ar |
| 🇮🇱 עברית | he | 🇮🇳 हिन्दी | hi | 🇹🇭 ไทย | th |
| 🇻🇳 Tiếng Việt | vi | 🇮🇩 Bahasa Indonesia | id | 🇲🇾 Bahasa Melayu | ms |
| 🇵🇭 Filipino | fil | 🇸🇪 Svenska | sv | 🇩🇰 Dansk | da |
| 🇳🇴 Norsk | no | 🇫🇮 Suomi | fi | 🇮🇸 Íslenska | is |
| 🇨🇿 Čeština | cs | 🇭🇺 Magyar | hu | 🇷🇴 Română | ro |
| 🇺🇦 Українська | uk | 🇬🇷 Ελληνικά | el | 🇧🇬 Български | bg |
| 🇭🇷 Hrvatski | hr | 🇷🇸 Српски | sr | 🇸🇰 Slovenčina | sk |
| 🇱🇹 Lietuvių | lt | 🇱🇻 Latviešu | lv | 🇨🇦 Français (CA) | fr_CA |
| 🇧🇩 বাংলা | bn | 🇰🇿 Қазақша | kk | 🇦🇿 Azərbaycan | az |

</details>

## 🗺️ 开发计划

- [x] Firefox 浏览器支持
- [x] 跨浏览器同步数据
- [ ] 通过隐藏对话节点解决 GPT 卡顿
- [ ] 支持一键同步到 NotebookLM
- [ ] 优化 Gemini 中 Canvas 自动打开
- [x] 数据云同步

## 📝 版本说明

### v3.7.2 更新内容

【新功能】
电子宠物新增小猫、小狗、小熊猫等更多选择，让 AI 回复等待过程更轻松有趣。

【功能优化】
优化对话宽度调节的跨平台适配，更多 AI 平台可稳定调整对话区域宽度。

## 💬 联系与反馈

- **作者**：MiguCHN
- **问题反馈**：欢迎发邮件到 miguchn@gmail.com，看到就会回复~

## 🙏 致谢

本项目基于开源项目 chatgpt-conversation-timeline 进行开发，感谢原作者的开源贡献，也感谢每一位为开源生态添砖加瓦的开发者——正是你们的分享与付出，让这些好想法得以延续和生长。

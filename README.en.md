<div align="center">
  <img src="./icons/icon128.png" alt="ChatLine Logo" width="80" height="80">
  <h1>ChatLine</h1>
  <p><strong>Browser-based enhancement tool for AI chats</strong><br>ChatLine adds timeline navigation, content organization, prompt reuse, code execution, and conversation archiving to mainstream AI chat platforms, helping users browse, manage, and review AI conversations more efficiently.</p>

  <p>
    <img src="https://img.shields.io/badge/project-ai--chat--timeline-181717?style=flat-square" alt="Project">
    <img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square" alt="License">
  </p>

  <p>
    <a href="https://chromewebstore.google.com/detail/oiifmbmllkahpcagifgoedoiinohnfen?utm_source=item-share-cb"><img src="https://img.shields.io/badge/Install-Chrome%20Web%20Store-blue?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Install from Chrome Web Store"></a>
  </p>

  <h4><a href="./README.md">简体中文</a> | <strong>English</strong></h4>
</div>

## Contents

- [Installation](#installation)
- [Screenshots](#screenshots)
- [Key Features](#key-features)
- [Supported Platforms](#supported-platforms)
- [Data & Privacy](#data--privacy)
- [Local Development](#local-development)
- [Release Notes](#release-notes)
- [Contact & Support](#contact--support)
- [Acknowledgements](#acknowledgements)

## Installation

[![Install from Chrome Web Store](https://img.shields.io/badge/Install-Chrome%20Web%20Store-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/oiifmbmllkahpcagifgoedoiinohnfen?utm_source=item-share-cb)

The recommended way to install ChatLine is through the Chrome Web Store badge above. Open the store page and click "Add to Chrome" to complete the installation.

After installation, open a supported AI chat page and start using it with no extra setup.

## Screenshots

### Chat Timeline

![Chat Timeline](./READMEIMAGE/screenshot-01-timeline.png)

Automatically maps conversation nodes so long chats remain easy to locate, review, and navigate.

### Prompt Management

![Prompt Management](./READMEIMAGE/screenshot-02-prompts.png)

Save frequently used prompts and insert them from the chat page with less repeated typing.

### Highlights & Notes

![Highlights & Notes](./READMEIMAGE/screenshot-03-highlight.png)

Highlight, annotate, and note important parts of AI responses while keeping useful context visible.

### Conversation Export

![Conversation Export](./READMEIMAGE/screenshot-04-export.png)

Export AI conversations for archiving, sharing, and later review.

### More Enhancements

![More Enhancements](./READMEIMAGE/screenshot-05-more.png)

Practical enhancements continue to grow around reading, organization, export, and page display.

## Key Features

- **Chat Timeline**: Automatically detects conversation nodes for fast positioning, review, and jumping.
- **Folder Management**: Organize saved content, common materials, and conversation references by category.
- **Prompt Management**: Save reusable prompts and insert them quickly when chatting.
- **Code Runner**: Improves code-block viewing and execution inside AI conversations for common coding scenarios.
- **Conversation Export**: Export AI chat content for archiving, sharing, and review.
- **Highlights & Notes**: Mark key AI responses with highlights, colors, and notes.
- **Quick Follow-up**: Select response text and quote it into a follow-up question with less manual copying.
- **Formula & Diagram Enhancements**: Copy formula source and render Mermaid diagrams when matching content is detected.
- **Page Enhancements**: Includes chat width, display optimization, scroll-to-bottom, digital pet, and related experience settings.
- **Backup & Restore**: Supports JSON import/export and optional Google Drive sync for extension data.

## Supported Platforms

| Platform | Timeline | Text Highlight | Smart Input | Animations | Quick Follow-up | Chat Times | Sidebar Bookmarks | Scroll to Bottom |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| ChatGPT | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Gemini | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DeepSeek | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Claude | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Kimi | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Doubao | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Qwen | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Qwen Intl | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Grok | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | - |
| Perplexity | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | - |
| Yuanbao | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | - |
| Yiyan | ✅ | ✅ | - | ✅ | ✅ | ✅ | - | - |
| NotebookLM | - | ✅ | ✅ | ✅ | ✅ | - | - | - |

> Formula Copy and Code Runner activate automatically when matching content is detected, regardless of the AI platform.

## Data & Privacy

- ChatLine stores core extension data in the user's browser by default, including bookmarks, folders, prompts, extension settings, time labels, notes, and related local data.
- The extension does not proactively collect, upload, or share chat content or personal information, and the project code does not include remote user-data collection logic.
- Google Drive sync is optional and is enabled only after the user grants authorization. It is used for backing up and restoring extension data.
- This project is open source, so its data-handling logic can be reviewed directly in the repository.

## Local Development

This repository is a browser extension project. It does not require a complex frontend build process; for local development or debugging, the source directory can be loaded directly.

Chrome / Edge debugging:

1. Open the browser extension management page, such as `chrome://extensions/` or `edge://extensions/`.
2. Enable developer mode.
3. Choose "Load unpacked".
4. Select the root directory of this repository.
5. After changing code, reload the extension from the extension management page and refresh the target AI platform page.

Firefox debugging:

- Open `about:debugging` and use "Load Temporary Add-on" to load the `manifest.json` file from this repository.

## Release Notes

### v3.7.4

- Added full export and selective export modes for conversation export, with in-dialog preview and checkbox selection.
- Selective export now warns when nothing is selected and automatically exits selection mode after export.
- Improved timeline container detection and message adapter logic.

## Contact & Support

- **Author**: MiguCHN
- **Bug reports / Feedback**: miguchn@gmail.com

## Acknowledgements

ChatLine has referenced and benefited from the open-source Timeline project during its evolution. Thanks to the original author and community contributors for their open work, and thanks to everyone who continues to help improve the ChatLine experience through feedback and suggestions.

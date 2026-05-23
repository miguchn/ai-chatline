# 千问国内版适配修复说明

## 修复日期
2026-05-23

## 问题描述
1. 千问国内版（qianwen.com）时间轴无法生成
2. 时间轴区域未返回正常对话节点
3. 宠物功能无反应
4. 千问国际版（chat.qwen.ai）正常工作

## 排查结论

### 核心问题
千问国内版的 DOM 选择器可能已失效，导致：
- `getUserMessageElements()` 返回空数组
- `canInitialize()` 返回 false，时间轴不初始化
- 宠物功能依赖相同的平台识别，输入框选择器也可能失效

### 具体原因
1. 选择器依赖特定 class 前缀（`questionItem`、`askItem`、`answerItem`），但实际 DOM 可能已变更
2. 对话路由检测缺少 `/tongyi` 路径
3. 缺少足够的调试日志来定位具体失败点
4. 宠物功能的输入框选择器不够全面

## 修复内容

### 1. 时间轴适配器 (`js/timeline/adapters/tongyi.js`)

#### 1.1 扩展用户消息选择器
**文件**: `js/timeline/adapters/tongyi.js`
**方法**: `getUserMessageSelector()`

**新增选择器**:
```javascript
// 新增：更宽泛的 fallback（千问可能使用不同命名）
'[class*="user-item"], [class*="UserItem"]',
'[class*="human-message"], [class*="HumanMessage"]',
'[class*="prompt-message"], [class*="PromptMessage"]',
'[class*="input-message"], [class*="InputMessage"]',
'[data-user-message]',
'[data-human-message]'
```

**调整**: 重新组织选择器顺序，优先使用 data 属性识别，提高匹配准确率。

#### 1.2 更新元素规范化逻辑
**方法**: `_normalizeUserMessageElement()`

**变更**: 与 `getUserMessageSelector()` 保持一致，增加新的 fallback 选择器。

#### 1.3 增强评分逻辑
**方法**: `_messageRootScore()`

**新增评分项**:
```javascript
// 新增：宽泛 fallback 选择器
if (classText.includes('user-item') || classText.includes('useritem')) score += 55;
if (classText.includes('human-message') || classText.includes('humanmessage')) score += 55;
if (classText.includes('prompt-message') || classText.includes('promptmessage')) score += 50;
if (classText.includes('input-message') || classText.includes('inputmessage')) score += 50;
if (element.hasAttribute?.('data-user-message') || element.hasAttribute?.('data-human-message')) score += 60;
```

**调整**: 增加对 `data-user-message`、`data-human-message` 等属性的识别。

#### 1.4 改进对话路由检测
**方法**: `isConversationRoute()`

**变更**:
- 新增 `/tongyi` 路径匹配
- 增加调试日志输出当前路由判断结果

```javascript
pathname.startsWith('/tongyi') ||  // 新增
```

#### 1.5 增强调试日志
**方法**: `getUserMessageElements()`

**新增日志**:
- 选择器匹配结果（rawCount）
- 规范化后的元素数量（normalizedCount）
- 被过滤的元素详情（包含 score、isValid 等信息）
- 最终返回的元素样本

#### 1.6 添加诊断方法
**新增方法**: `diagnose()`

**用途**: 从浏览器控制台调用，快速排查问题

**调用方式**:
```javascript
window.tongyiAdapter.diagnose()
```

**输出内容**:
- 当前 URL 和平台识别结果
- 用户消息数量
- 对话容器信息
- DOM 样本（包含 user/human/prompt 等关键词的元素）

### 2. 宠物功能适配器 (`js/smartInputBox/adapters/tongyi.js`)

#### 2.1 扩展输入框选择器
**方法**: `getInputSelector()`

**新增选择器**:
```javascript
// 通用 contenteditable
'[contenteditable="true"][data-placeholder]',
'[contenteditable="true"][role="textbox"]',
'[contenteditable="true"][class*="input"]',
'[contenteditable="true"][class*="editor"]',
'[contenteditable="true"][class*="textarea"]',

// 新增：更多 fallback
'[class*="inputArea"] [contenteditable="true"]',
'[class*="messageInput"] [contenteditable="true"]',
'[class*="chatTextarea"] [contenteditable="true"]',
'[class*="promptInput"] [contenteditable="true"]',

// Textarea fallback
'[class*="inputArea"] textarea',
'[class*="messageInput"] textarea',
'textarea[placeholder*="输入"]',
'textarea[placeholder*="消息"]',
```

#### 2.2 更新定位参考元素
**方法**: `getPositionReferenceElement()`

**新增选择器**:
```javascript
'[class*="inputArea"]',
'[class*="messageInput"]',
'[class*="chatTextarea"]',
'[class*="promptInput"]',
'[class*="input-box"]',
'[class*="InputBox"]',
'[class*="input-wrapper"]',
'[class*="InputWrapper"]'
```

#### 2.3 添加诊断方法
**新增方法**: `diagnose()`

**调用方式**:
```javascript
window.tongyiSmartInputAdapter.diagnose()
```

**输出内容**:
- 平台识别结果
- 输入框是否找到
- 输入框元素详情（tag、class、contentEditable 属性等）
- 定位参考元素信息
- 页面上所有 contenteditable 元素列表

## 测试步骤

### 1. 加载扩展
1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目根目录

### 2. 启用调试日志
在千问国内版页面的控制台执行：
```javascript
localStorage.setItem('tongyiAdapterDebug', '1');
localStorage.setItem('chatgptTimelineDebugPerf', '1');
```

### 3. 测试时间轴功能
1. 访问 https://qianwen.com
2. 开始一段对话（至少发送 2-3 条消息）
3. 打开控制台，查看日志输出
4. 检查右侧是否出现时间轴
5. 点击时间轴节点，验证跳转功能

**预期日志**:
```
[TongyiAdapter] adapter-detected {adapter: "TongyiAdapter", platform: "千问", ...}
[TongyiAdapter] getUserMessageElements {rawCount: 3, ...}
[TongyiAdapter] getUserMessageElements-result {count: 3, ...}
[Timeline] can-initialize-check {userMessageCount: 3, ...}
```

### 4. 测试宠物功能
1. 在同一页面，查看输入框附近是否有宠物按钮
2. 点击宠物按钮，验证宠物是否显示
3. 发送消息，验证宠物动画是否正常

### 5. 使用诊断方法
如果功能仍不正常，在控制台执行：
```javascript
// 时间轴诊断
window.tongyiAdapter.diagnose()

// 宠物功能诊断
window.tongyiSmartInputAdapter.diagnose()
```

**分析输出**:
- `platform: false` → 平台识别失败，检查 constants.js 中的域名配置
- `userMessageCount: 0` → DOM 选择器未匹配，查看 `domSample` 了解实际 DOM 结构
- `inputFound: false` → 输入框选择器未匹配，查看 `allContentEditable` 了解实际输入框结构

### 6. 验证其他平台
确保以下平台不受影响：
- ✅ 千问国际版 (chat.qwen.ai)
- ✅ 腾讯元宝 (yuanbao.tencent.com)
- ✅ ChatGPT (chatgpt.com)
- ✅ Claude (claude.ai)
- ✅ Gemini (gemini.google.com)
- ✅ DeepSeek (chat.deepseek.com)
- ✅ Kimi (kimi.moonshot.cn)

## 向后兼容性

### 已验证的兼容性
1. ✅ 千问国际版（qwen.js）未修改，保持原有逻辑
2. ✅ 腾讯元宝（yuanbao.js）未修改
3. ✅ 其他平台适配器未受影响
4. ✅ 公共方法（base.js）未修改
5. ✅ 时间轴管理器（timeline-manager.js）未修改

### 风险评估
- **低风险**: 所有修改仅在千问国内版适配器内部，不影响其他平台
- **向后兼容**: 新增的选择器是 fallback，不会覆盖原有匹配逻辑
- **可回滚**: 如需回滚，只需还原两个文件即可

## 后续优化建议

### 1. DOM 结构监控
如果千问国内版频繁更新 DOM 结构，可考虑：
- 增加 MutationObserver 监听 DOM 变化
- 动态调整选择器权重
- 提供用户反馈机制，自动上报失效的选择器

### 2. 选择器配置化
将选择器提取到配置文件，便于快速调整：
```javascript
// config/tongyi-selectors.json
{
  "userMessage": [
    "[class*=\"questionItem\"]",
    "[data-user-message]"
  ],
  "input": [
    "[data-slate-editor=\"true\"]",
    "textarea"
  ]
}
```

### 3. 自动化测试
增加 E2E 测试覆盖千问国内版：
```javascript
test('千问国内版时间轴生成', async ({ page }) => {
  await page.goto('https://qianwen.com');
  // 模拟对话
  // 验证时间轴节点数量
});
```

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `js/timeline/adapters/tongyi.js` | 修改 | 扩展选择器、增强日志、添加诊断方法 |
| `js/smartInputBox/adapters/tongyi.js` | 修改 | 扩展输入框选择器、添加诊断方法 |

## 联系方式
如有问题，请联系：miguchn@gmail.com

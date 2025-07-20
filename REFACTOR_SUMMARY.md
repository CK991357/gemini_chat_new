# 重构总结报告

## 1. 概述

本次重构旨在将一个单体的 Web 应用（由一个庞大的 `main.js` 和一个 `style.css` 文件组成）迁移到一个现代的、模块化的 JavaScript 架构中。重构的核心原则是 **1:1 的功能迁移**，在不改变任何现有用户体验和功能的前提下，优化代码结构、可维护性和可扩展性。

## 2. 样式 (CSS) 重构

我们将原有的 `src/static/css/style.css` 文件拆分成了多个遵循 BEM (Block, Element, Modifier) 思想的 SCSS (Sassy CSS) 模块。

### 2.1. 文件结构

```
src/static/scss/
├── style.scss               # 主入口文件，导入所有 partials
└── partials/
    ├── _base.scss           # 基础样式 (body, a, a:hover, etc.)
    ├── _variables.scss      # SCSS 变量 (颜色, 字体大小, 间距)
    ├── _layout.scss         # 布局相关 (容器, 导航栏, 面板)
    ├── _components.scss     # 可重用组件 (按钮, 输入框, 卡片)
    ├── _chat.scss           # 聊天界面特定样式
    ├── _translation.scss    # 翻译界面特定样式
    ├── _vision.scss         # 视觉模型界面特定样式
    ├── _media.scss          # 媒体 (视频/屏幕) 预览样式
    ├── _log.scss            # 日志面板样式
    ├── _markdown.scss       # Markdown 渲染样式
    └── _responsive.scss     # 响应式布局
```

### 2.2. 编译

`style.scss` 文件会通过 SCSS 编译器（如 Dart Sass）编译成 `src/static/css/style.css`，该文件被 `index.html` 直接引用。

## 3. 脚本 (JavaScript) 重构

我们将原有的 `src/static/js/main.js` 文件拆分成了多个各司其职的 ES6 模块。

### 3.1. 文件结构

```
src/static/js/
├── main.js                     # 新的应用入口文件
├── stores/
│   └── ChatStore.js            # 全局状态管理
├── ui/
│   └── UIManager.js            # DOM 操作和 UI 事件管理
├── core/
│   └── ApiClient.js            # 后端通信 (WebSocket & HTTP)
├── managers/
│   ├── index.js                # 聚合所有管理器
│   ├── ChatManager.js          # 聊天逻辑
│   ├── MediaManager.js         # 媒体设备逻辑
│   ├── TranslationManager.js   # 翻译逻辑
│   ├── VisionManager.js        # 视觉模型逻辑
│   ├── ConfigManager.js        # 配置加载/保存逻辑
│   └── ConnectionManager.js    # WebSocket 连接逻辑
├── utils/
│   ├── helpers.js              # 通用工具函数
│   └── ui.js                   # UI 相关工具函数
└── config/
    └── prompts.js              # 静态系统指令
```

### 3.2. 模块功能详解

#### `main.js`
- **功能**: 应用程序的唯一入口。
- **职责**: 导入所有核心模块，在 `DOMContentLoaded` 后实例化它们，并按顺序注入依赖，最后启动应用。

#### `stores/ChatStore.js`
- **功能**: 全局状态容器。
- **职责**: 持有应用的所有状态（如 `isConnected`, `chatHistory`, `apiKey` 等），并提供更新和获取这些状态的方法，作为单一数据源 (Single Source of Truth)。

#### `ui/UIManager.js`
- **功能**: UI 层控制器。
- **职责**: 封装所有与 DOM 相关的操作。包括：
    - 缓存所有需要操作的 DOM 元素。
    - 统一注册和管理所有的事件监听器（如点击、输入等）。
    - 提供更新 UI 的方法（如显示消息、切换加载状态、更新图标等）。

#### `core/ApiClient.js`
- **功能**: API 通信客户端。
- **职责**: 封装所有与后端的网络通信。包括：
    - 管理 WebSocket 的连接、消息发送和接收。
    - 将 WebSocket 事件转换为一个内部事件系统，供其他模块监听。
    - 封装 `fetch` 请求，用于如翻译等 HTTP API 调用。

#### `managers/`
管理器层负责编排应用的业务逻辑。

- **`index.js`**: 导出一个 `MainManager` 类，该类实例化所有其他的管理器，并将它们聚合在一起，方便依赖注入。
- **`ConnectionManager.js`**: 处理 WebSocket 的连接、断开和重连逻辑。
- **`ConfigManager.js`**: 负责从 `localStorage` 加载用户配置，以及在用户修改设置后保存配置。
- **`ChatManager.js`**: 处理核心的聊天业务逻辑，如发送消息、处理收到的消息、管理聊天历史等。
- **`MediaManager.js`**: 管理麦克风、摄像头和屏幕共享的启动、停止和数据流处理。
- **`TranslationManager.js`**: 负责调用翻译 API 并将结果显示在 UI 上。
- **`VisionManager.js`**: 处理与视觉模型相关的逻辑，如文件上传、发送图文消息等。

#### `utils/`
- **`helpers.js`**: 包含通用的、与 UI 无关的辅助函数（如 `pcmToWavBlob`, `formatTime`）。
- **`ui.js`**: 包含 UI 相关的辅助函数（如 `showToast`, `showSystemMessage`）。

#### `config/`
- **`prompts.js`**: 存放静态的、预设的系统指令字符串。

## 4. 启动流程

1.  `index.html` 加载 `main.js` (作为 `type="module"`)。
2.  `main.js` 等待 `DOMContentLoaded` 事件。
3.  `main()` 函数执行：
    a.  创建 `ChatStore` 实例。
    b.  创建 `ApiClient` 实例 (注入 `store`)。
    c.  创建 `UIManager` 实例 (注入 `store`)。
    d.  创建 `MainManager` 实例 (注入 `store`, `apiClient`, `uiManager`)。
    e.  `MainManager` 的构造函数会创建所有具体的管理器。
    f.  `UIManager.init()` 被调用，开始缓存 DOM 元素并绑定事件监听器。
    g.  `ConfigManager.init()` 和 `ConnectionManager.init()` 被调用，启动应用。

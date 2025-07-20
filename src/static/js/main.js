/**
 * =================================================================================
 * main.js - 应用程序主入口文件
 * =================================================================================
 *
 * 职责:
 * 1. 导入所有核心模块 (Store, UI, API, Managers)。
 * 2. 在DOM加载完成后，按顺序实例化和初始化所有模块。
 * 3. 建立模块间的依赖关系 (依赖注入)。
 * 4. 启动整个应用程序。
 *
 * 加载方式:
 * 此文件通过 <script type="module"> 标签在 index.html 中加载。
 */

import { ApiClient } from './core/ApiClient.js';
import { MainManager } from './managers/index.js';
import { ChatStore } from './stores/ChatStore.js';
import { UIManager } from './ui/UIManager.js';

/**
 * @function main
 * @description 应用程序的主函数，在DOM完全加载后执行。
 */
function main() {
    // 1. 初始化核心依赖
    // Store 是所有状态的单一来源，必须首先创建。
    const store = new ChatStore();

    // ApiClient 封装了所有与后端的通信，是核心服务。
    const apiClient = new ApiClient(store);

    // UIManager 负责所有DOM操作和UI事件，它需要store来反映初始状态。
    // 注意：此时 managers 尚未注入 UIManager，这会在 MainManager 的构造函数中完成。
    const uiManager = new UIManager(store);

    // 2. 初始化管理器层
    // MainManager 是一个聚合器，它会创建所有具体的业务逻辑管理器，
    // 并将核心依赖（store, apiClient, uiManager）注入其中。
    // 它还会将自己（包含所有管理器的引用）注入到 UIManager 中，以连接业务逻辑和UI事件。
    const managers = new MainManager(store, apiClient, uiManager);

    // 3. 启动应用程序
    // 调用 UIManager 的 init 方法来收集DOM元素并设置所有事件监听器。
    // 这一步必须在所有管理器都创建之后执行，因为事件监听器需要调用管理器中的方法。
    uiManager.init();

    // 调用配置管理器的 init 方法，加载用户本地保存的设置。
    managers.config.init();

    // 调用连接管理器的 init 方法，开始尝试连接到WebSocket服务器。
    managers.connection.init();

    // 为了方便在浏览器控制台进行调试，可以将关键模块暴露到全局作用域。
    window.app = {
        store,
        apiClient,
        uiManager,
        managers
    };
    console.log("应用程序已初始化，可以通过 `window.app` 访问核心模块。");
}

// 使用 DOMContentLoaded 事件确保在执行任何DOM操作之前，整个DOM树已经准备就绪。
document.addEventListener('DOMContentLoaded', main);

import { ChatManager } from './ChatManager.js';
import { ConfigManager } from './ConfigManager.js';
import { ConnectionManager } from './ConnectionManager.js';
import { MediaManager } from './MediaManager.js';
import { TranslationManager } from './TranslationManager.js';
import { VisionManager } from './VisionManager.js';

/**
 * @class MainManager
 * @description 这是一个聚合类，用于初始化和持有所有其他的管理器实例。
 * 这样可以简化在主入口文件(main.js)中的依赖注入。
 */
export class MainManager {
    /**
     * @constructor
     * @param {ChatStore} store - 应用的状态存储实例。
     * @param {ApiClient} apiClient - API客户端实例。
     * @param {UIManager} uiManager - UI管理器实例。
     */
    constructor(store, apiClient, uiManager) {
        this.config = new ConfigManager(uiManager);
        this.connection = new ConnectionManager(store, apiClient, uiManager);
        this.chat = new ChatManager(store, apiClient, uiManager);
        this.media = new MediaManager(store, apiClient, uiManager);
        this.translation = new TranslationManager(apiClient, uiManager);
        this.vision = new VisionManager(store, apiClient, uiManager);

        // 将所有管理器的引用注入到UIManager中，以便事件监听器可以调用它们
        uiManager.managers = this;
    }
}
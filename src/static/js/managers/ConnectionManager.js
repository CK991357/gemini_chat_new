import { CONFIG } from '../config/config.js';

/**
 * @class ConnectionManager
 * @description 管理与服务器的连接状态，包括连接、断开和模型切换。
 */
export class ConnectionManager {
    /**
     * @constructor
     * @param {ChatStore} store - 应用的状态存储实例。
     * @param {ApiClient} apiClient - API客户端实例。
     * @param {UIManager} uiManager - UI管理器实例。
     */
    constructor(store, apiClient, uiManager) {
        this.store = store;
        this.apiClient = apiClient;
        this.uiManager = uiManager;
    }

    /**
     * @function toggleConnection
     * @description 切换连接/断开状态。
     */
    async toggleConnection() {
        const { isConnected } = this.store.getState();
        if (isConnected) {
            this.disconnect();
        } else {
            await this.connect();
        }
    }

    /**
     * @function connect
     * @description 根据当前选择的模型类型连接到服务器。
     */
    async connect() {
        const { apiKeyInput } = this.uiManager.domElements;
        if (!apiKeyInput.value) {
            this.uiManager.logMessage('请输入 API Key', 'system');
            return;
        }

        // 保存配置
        this.uiManager.managers.config.updateApiKey(apiKeyInput.value);
        this.uiManager.managers.config.updateVoice(this.uiManager.domElements.voiceSelect.value);
        this.uiManager.managers.config.updateSystemInstruction(this.uiManager.domElements.systemInstruction.value);
        this.uiManager.managers.config.updateFps(this.uiManager.domElements.fpsInput.value);

        const { selectedModelConfig } = this.store.getState();
        if (selectedModelConfig.isWebSocket) {
            await this.connectToWebsocket();
        } else {
            this.connectToHttp();
        }
    }

    /**
     * @function disconnect
     * @description 断开与服务器的连接。
     */
    disconnect() {
        const { selectedModelConfig } = this.store.getState();
        if (selectedModelConfig.isWebSocket) {
            this.apiClient.disconnect();
        }
        this.resetUIForDisconnectedState();
        this.uiManager.logMessage('已断开连接', 'system');
    }

    /**
     * @function connectToWebsocket
     * @description 连接到WebSocket服务器。
     */
    async connectToWebsocket() {
        const { apiKeyInput, voiceSelect, systemInstruction, responseTypeSelect, modelSelect } = this.uiManager.domElements;
        const config = {
            model: modelSelect.value,
            generationConfig: {
                responseModalities: responseTypeSelect.value === 'audio' ? ['audio'] : ['text'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceSelect.value }
                    },
                }
            },
            systemInstruction: {
                parts: [{ text: systemInstruction.value }],
            }
        };

        try {
            await this.apiClient.connect(config, apiKeyInput.value);
            this.store.updateState({ isConnected: true });
            this.uiManager.updateConnectionStatusUI(true);
            this.uiManager.logMessage('已连接到 Gemini WebSocket API', 'system');
        } catch (error) {
            this.uiManager.logMessage(`连接错误: ${error.message}`, 'system');
            this.resetUIForDisconnectedState();
        }
    }

    /**
     * @function connectToHttp
     * @description "连接"到HTTP API（实际上只是更新UI状态）。
     */
    connectToHttp() {
        this.store.updateState({ isConnected: true });
        this.uiManager.updateConnectionStatusUI(true);
        const { selectedModelConfig } = this.store.getState();
        this.uiManager.logMessage(`已连接到 Gemini HTTP API (${selectedModelConfig.displayName})`, 'system');
    }

    /**
     * @function resetUIForDisconnectedState
     * @description 重置UI到未连接状态。
     */
    resetUIForDisconnectedState() {
        this.store.updateState({ isConnected: false });
        this.uiManager.updateConnectionStatusUI(false);
        this.uiManager.managers.media.stopAllStreams();
    }

    /**
     * @function handleModelChange
     * @description 处理模型选择变化。
     * @param {string} selectedModelName - 新选择的模型名称。
     */
    handleModelChange(selectedModelName) {
        const selectedModelConfig = CONFIG.API.AVAILABLE_MODELS.find(m => m.name === selectedModelName);
        this.store.updateState({ selectedModelConfig });
        this.uiManager.logMessage(`模型已切换为: ${selectedModelConfig.displayName}`, 'system');

        if (this.store.getState().isConnected) {
            this.disconnect();
        }
    }
}
import { Logger } from '../utils/logger.js';
import { showSystemMessage } from '../utils/ui.js';

/**
 * @class ChatManager
 * @description 管理核心聊天功能的业务逻辑。
 */
export class ChatManager {
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
     * @function sendMessage
     * @description 发送一条聊天消息，可以是文本、附件或两者都有。
     */
    async sendMessage() {
        const { messageInput } = this.uiManager.domElements;
        const text = messageInput.value.trim();
        const { attachedFile, selectedModelConfig } = this.store.getState();

        if (!text && !attachedFile) return;

        this.uiManager.displayUserMessage(text, attachedFile);
        messageInput.value = '';

        // 重置当前AI消息DOM引用，确保新响应创建新气泡
        this.store.updateState({ currentAIMessageContentDiv: null });

        if (selectedModelConfig.isWebSocket) {
            if (attachedFile) {
                showSystemMessage('实时模式尚不支持文件上传。');
                this.clearAttachment();
                return;
            }
            this.apiClient.sendWsMessage({ text });
        } else {
            await this.sendHttpMessage(text, attachedFile);
        }
    }

    /**
     * @function sendHttpMessage
     * @description 通过HTTP发送消息。
     * @param {string} text - 文本消息。
     * @param {object|null} file - 附加的文件。
     */
    async sendHttpMessage(text, file) {
        try {
            const { apiKeyInput, systemInstruction, modelSelect } = this.uiManager.domElements;
            let { chatHistory, currentSessionId } = this.store.getState();

            if (!currentSessionId) {
                currentSessionId = 'session-' + Date.now();
                this.store.updateState({ currentSessionId });
                this.uiManager.logMessage(`新会话开始，ID: ${currentSessionId}`, 'system');
            }

            const userContent = [];
            if (text) userContent.push({ type: 'text', text });
            if (file) userContent.push({ type: 'image_url', image_url: { url: file.base64 } });

            this.store.addMessage({ role: 'user', content: userContent });
            
            this.clearAttachment();

            const requestBody = {
                model: modelSelect.value,
                messages: this.store.getState().chatHistory,
                generationConfig: { responseModalities: ['text'] },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }
                ],
                enableGoogleSearch: true,
                stream: true,
                sessionId: currentSessionId
            };

            if (systemInstruction.value) {
                requestBody.systemInstruction = { parts: [{ text: systemInstruction.value }] };
            }

            await this.apiClient.sendHttpRequest('/api/chat/completions', requestBody, apiKeyInput.value);

        } catch (error) {
            Logger.error('发送 HTTP 消息失败:', error);
            this.uiManager.logMessage(`发送消息失败: ${error.message}`, 'system');
        }
    }

    /**
     * @function handleFileAttachment
     * @description 处理文件附件选择。
     * @param {Event} event - 文件输入变化事件。
     */
    async handleFileAttachment(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showSystemMessage(`不支持的文件类型: ${file.type}。`);
            return;
        }
        if (file.size > 20 * 1024 * 1024) { // 20MB
            showSystemMessage('文件大小不能超过 20MB。');
            return;
        }

        try {
            const base64String = await this.readFileAsDataURL(file);
            const fileData = { name: file.name, type: file.type, base64: base64String };
            
            this.clearAttachment(); // 先清除旧的
            this.store.updateState({ attachedFile: fileData });
            this.uiManager.displayFilePreview(fileData);
            showSystemMessage(`文件已附加: ${file.name}`);
        } catch (error) {
            Logger.error('处理文件时出错:', error);
            showSystemMessage(`处理文件失败: ${error.message}`);
        } finally {
            event.target.value = ''; // 重置以便再次选择同个文件
        }
    }

    /**
     * @function readFileAsDataURL
     * @description 将文件读取为Base64数据URL。
     * @param {File} file - 要读取的文件。
     * @returns {Promise<string>}
     */
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * @function clearAttachment
     * @description 清除已附加的文件。
     */
    clearAttachment() {
        this.store.updateState({ attachedFile: null });
        this.uiManager.clearFilePreview('chat');
    }

    /**
     * @function startNewChat
     * @description 开始一个新的聊天会话。
     */
    startNewChat() {
        this.store.resetChatHistory();
        this.uiManager.domElements.messageHistory.innerHTML = '';
        this.uiManager.logMessage('新聊天已开始', 'system');
    }
}
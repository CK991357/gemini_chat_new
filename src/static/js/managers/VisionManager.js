import { VISION_SYSTEM_PROMPT } from '../config/prompts.js';
import { Logger } from '../utils/logger.js';
import { showToast } from '../utils/ui.js';

/**
 * @class VisionManager
 * @description 管理所有与视觉相关的业务逻辑。
 */
export class VisionManager {
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
     * @description 发送视觉模型消息。
     */
    async sendMessage() {
        const { visionInputText, visionModelSelect } = this.uiManager.domElements;
        const text = visionInputText.value.trim();
        const { visionAttachedFiles } = this.store.getState();

        if (!text && visionAttachedFiles.length === 0) {
            showToast('请输入文本或添加附件。');
            return;
        }

        this.uiManager.displayVisionUserMessage(text, visionAttachedFiles);

        const userContent = [];
        if (text) userContent.push({ type: 'text', text });
        visionAttachedFiles.forEach(file => {
            userContent.push({ type: 'image_url', image_url: { url: file.base64 } });
        });
        this.store.addMessage({ role: 'user', content: userContent }, 'vision');

        visionInputText.value = '';
        this.clearAllAttachments();

        const aiMessageElements = this.uiManager.createVisionAIMessageElement();
        aiMessageElements.markdownContainer.innerHTML = '<p>正在请求模型...</p>';

        try {
            const requestBody = {
                model: visionModelSelect.value,
                messages: [
                    { role: 'system', content: VISION_SYSTEM_PROMPT },
                    ...this.store.getState().visionChatHistory
                ],
                stream: true,
            };
            // 注意：视觉模型的API调用是独立的，不依赖全局apiKey输入
            await this.apiClient.sendHttpRequest('/api/chat/completions', requestBody, null);

        } catch (error) {
            Logger.error('发送视觉消息失败:', error);
            aiMessageElements.markdownContainer.innerHTML = `<p><strong>请求失败:</strong> ${error.message}</p>`;
        }
    }

    /**
     * @function handleFileAttachment
     * @description 处理视觉模式的文件附件。
     * @param {Event} event - 文件输入变化事件。
     */
    async handleFileAttachment(event) {
        const files = event.target.files;
        if (!files) return;

        for (const file of files) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
            if (!allowedTypes.includes(file.type)) {
                showToast(`不支持的文件类型: ${file.type}`);
                continue;
            }
            if (file.size > 20 * 1024 * 1024) { // 20MB
                showToast('文件大小不能超过 20MB。');
                continue;
            }

            try {
                const base64String = await this.readFileAsDataURL(file);
                const fileData = { name: file.name, type: file.type, base64: base64String };
                
                let { visionAttachedFiles } = this.store.getState();
                visionAttachedFiles.push(fileData);
                this.store.updateState({ visionAttachedFiles });
                
                this.uiManager.displayVisionFilePreviews();
                showToast(`文件已附加: ${file.name}`);

            } catch (error) {
                Logger.error('处理视觉文件时出错:', error);
                showToast(`处理文件失败: ${error.message}`);
            }
        }
        event.target.value = '';
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
     * @function removeAttachment
     * @description 移除一个指定的视觉附件。
     * @param {number} indexToRemove - 要移除的附件的索引。
     */
    removeAttachment(indexToRemove) {
        let { visionAttachedFiles } = this.store.getState();
        visionAttachedFiles.splice(indexToRemove, 1);
        this.store.updateState({ visionAttachedFiles });
        this.uiManager.displayVisionFilePreviews();
    }

    /**
     * @function clearAllAttachments
     * @description 清除所有视觉附件。
     */
    clearAllAttachments() {
        this.store.updateState({ visionAttachedFiles: [] });
        this.uiManager.clearFilePreview('vision');
    }
}
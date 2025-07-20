/**
 * @class ChatStore
 * @description 一个用于集中管理应用程序所有状态的类。
 * 这有助于消除全局变量，使状态变化更可预测和易于跟踪。
 */
export class ChatStore {
    /**
     * @constructor
     */
    constructor() {
        // 连接与模型状态
        this.isConnected = false;
        this.isUsingTool = false;
        this.selectedModelConfig = null; // 将在UIManager中初始化

        // 媒体与录音状态
        this.isRecording = false; // 通用录音状态（可能将来用于实时语音）
        this.micStream = null;
        this.isVideoActive = false;
        this.isScreenSharing = false;
        
        // 翻译模式语音输入状态
        this.isTranslationRecording = false;
        this.hasRequestedTranslationMicPermission = false;
        this.translationAudioRecorder = null;
        this.translationAudioChunks = [];
        this.recordingTimeout = null;
        this.initialTouchY = 0;

        // 聊天模式语音输入状态
        this.isChatRecording = false;
        this.hasRequestedChatMicPermission = false;
        this.chatAudioRecorder = null;
        this.chatAudioChunks = [];
        this.chatRecordingTimeout = null;
        this.chatInitialTouchY = 0;

        // 聊天与消息状态
        this.chatHistory = [];
        this.visionChatHistory = [];
        this.currentSessionId = null;
        this.isUserScrolling = false;
        this.currentAIMessageContentDiv = null; // 跟踪当前AI消息的DOM元素

        // 附件状态
        this.attachedFile = null; // 聊天模式的单附件
        this.visionAttachedFiles = []; // 视觉模式的多附件

        // AI 音频播放状态
        this.audioDataBuffer = []; // 累积AI返回的PCM音频数据
        this.currentAudioElement = null; // 跟踪当前播放的HTMLAudioElement
    }

    /**
     * @function updateState
     * @description 更新 Store 中的一个或多个状态属性。
     * @param {object} newState - 一个包含要更新的键和值的对象。
     * @example
     * store.updateState({ isConnected: true, isRecording: false });
     */
    updateState(newState) {
        for (const key in newState) {
            if (Object.prototype.hasOwnProperty.call(this, key)) {
                this[key] = newState[key];
            } else {
                console.warn(`ChatStore: 尝试更新一个不存在的状态属性 "${key}"`);
            }
        }
    }

    /**
     * @function getState
     * @description 获取当前所有状态的快照。
     * @returns {object} 包含所有状态属性的对象。
     */
    getState() {
        // 返回所有状态属性的副本，防止外部直接修改
        return { ...this };
    }

    /**
     * @function resetChatHistory
     * @description 重置聊天相关的历史记录和会话ID。
     */
    resetChatHistory() {
        this.chatHistory = [];
        this.currentSessionId = null;
        console.log("Chat history and session ID have been reset.");
    }

    /**
     * @function resetVisionHistory
     * @description 重置视觉模式相关的历史记录。
     */
    resetVisionHistory() {
        this.visionChatHistory = [];
        this.visionAttachedFiles = [];
        console.log("Vision history and attachments have been reset.");
    }

    /**
     * @function addMessage
     * @description 向指定的历史记录中添加一条消息。
     * @param {object} message - 要添加的消息对象。
     * @param {'chat' | 'vision'} type - 消息类型，决定添加到哪个历史记录。
     */
    addMessage(message, type = 'chat') {
        if (type === 'vision') {
            this.visionChatHistory.push(message);
        } else {
            this.chatHistory.push(message);
        }
    }
}
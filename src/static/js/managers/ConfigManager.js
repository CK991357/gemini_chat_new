import { CONFIG } from '../config/config.js';

/**
 * @class ConfigManager
 * @description 管理应用的配置，包括加载、保存和更新设置。
 */
export class ConfigManager {
    /**
     * @constructor
     * @param {UIManager} uiManager - UI管理器实例。
     */
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * @function updateApiKey
     * @description 更新并保存API Key。
     * @param {string} value -新的API Key。
     */
    updateApiKey(value) {
        localStorage.setItem('gemini_api_key', value);
    }

    /**
     * @function updateVoice
     * @description 更新并保存选择的语音。
     * @param {string} value - 新选择的语音。
     */
    updateVoice(value) {
        localStorage.setItem('gemini_voice', value);
    }

    /**
     * @function updateFps
     * @description 更新并保存视频的FPS。
     * @param {string} value - 新的FPS值。
     */
    updateFps(value) {
        localStorage.setItem('video_fps', value);
    }

    /**
     * @function updateSystemInstruction
     * @description 更新并保存系统指令。
     * @param {string} value - 新的系统指令。
     */
    updateSystemInstruction(value) {
        localStorage.setItem('system_instruction', value);
        CONFIG.SYSTEM_INSTRUCTION.TEXT = value;
    }
}
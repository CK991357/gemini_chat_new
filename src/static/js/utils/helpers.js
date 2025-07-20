import { CONFIG } from '../config/config.js';

/**
 * @function pcmToWavBlob
 * @description 将PCM数据转换为WAV Blob。
 * @param {Uint8Array[]} pcmDataBuffers - 包含PCM数据的Uint8Array数组。
 * @param {number} [sampleRate=CONFIG.AUDIO.OUTPUT_SAMPLE_RATE] - 采样率 (例如 24000)。
 * @returns {Blob} WAV格式的Blob。
 */
export function pcmToWavBlob(pcmDataBuffers, sampleRate = CONFIG.AUDIO.OUTPUT_SAMPLE_RATE) {
    let dataLength = 0;
    for (const buffer of pcmDataBuffers) {
        dataLength += buffer.length;
    }

    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // WAV header
    writeString(view, 0, 'RIFF'); // RIFF identifier
    view.setUint32(4, 36 + dataLength, true); // file length
    writeString(view, 8, 'WAVE'); // RIFF type
    writeString(view, 12, 'fmt '); // format chunk identifier
    view.setUint32(16, 16, true); // format chunk length
    view.setUint16(20, 1, true); // sample format (1 = PCM)
    view.setUint16(22, 1, true); // num channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * numChannels * bytesPerSample)
    view.setUint16(32, 2, true); // block align (numChannels * bytesPerSample)
    view.setUint16(34, 16, true); // bits per sample
    writeString(view, 36, 'data'); // data chunk identifier
    view.setUint32(40, dataLength, true); // data length

    // Write PCM data
    let offset = 44;
    for (const pcmBuffer of pcmDataBuffers) {
        for (let i = 0; i < pcmBuffer.length; i++) {
            view.setUint8(offset + i, pcmBuffer[i]);
        }
        offset += pcmBuffer.length;
    }

    return new Blob([view], { type: 'audio/wav' });
}

/**
 * @function writeString
 * @description 辅助函数：写入字符串到DataView。
 * @param {DataView} view - DataView实例。
 * @param {number} offset - 写入偏移量。
 * @param {string} string - 要写入的字符串。
 */
export function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * @function formatTime
 * @description 格式化秒数为 MM:SS 格式。
 * @param {number} seconds - 总秒数。
 * @returns {string} 格式化后的时间字符串。
 */
export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * @function generateUniqueSessionId
 * @description 生成一个唯一的会话ID。
 * @returns {string} 唯一的会话ID字符串。
 */
export function generateUniqueSessionId() {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * @function isMobileDevice
 * @description 检测当前设备是否为移动设备。
 * @returns {boolean} 如果是移动设备则返回 true，否则返回 false。
 */
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * @function getLanguageName
 * @description 根据语言代码获取语言的中文名称。
 * @param {string} code - 语言代码（如 'en', 'zh', 'auto'）。
 * @returns {string} 语言的中文名称或原始代码（如果未找到）。
 */
export function getLanguageName(code) {
  const language = CONFIG.TRANSLATION.LANGUAGES.find(lang => lang.code === code);
  return language ? language.name : code;
}
import { AudioStreamer } from '../audio/audio-streamer.js';
import { CONFIG } from '../config/config.js';
import { pcmToWavBlob } from '../utils/helpers.js';
import { Logger } from '../utils/logger.js';

/**
 * @class MediaManager
 * @description 管理所有媒体相关的业务逻辑，包括音视频的输入和输出。
 */
export class MediaManager {
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

        this.audioCtx = null;
        this.audioStreamer = null;
        this.videoManager = null;
        this.screenRecorder = null;
    }

    /**
     * @function initializeAudio
     * @description 初始化音频上下文和音频流处理器。
     * @returns {Promise<void>}
     */
    async initializeAudio() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            if (this.audioCtx.state === 'suspended') {
                await this.audioCtx.resume();
            }
        }
        if (!this.audioStreamer) {
            this.audioStreamer = new AudioStreamer(this.audioCtx);
        }
    }

    /**
     * @function playAudioChunk
     * @description 播放收到的AI音频数据块。
     * @param {ArrayBuffer} audioData - PCM音频数据。
     */
    async playAudioChunk(audioData) {
        await this.initializeAudio();
        this.audioStreamer.addPCM16(new Uint8Array(audioData));
        
        let { audioDataBuffer } = this.store.getState();
        audioDataBuffer.push(new Uint8Array(audioData));
        this.store.updateState({ audioDataBuffer });
    }

    /**
     * @function processAndDisplayBufferedAudio
     * @description 处理并显示缓存的完整音频。
     */
    processAndDisplayBufferedAudio() {
        let { audioDataBuffer } = this.store.getState();
        if (audioDataBuffer.length > 0) {
            const audioBlob = pcmToWavBlob(audioDataBuffer, CONFIG.AUDIO.OUTPUT_SAMPLE_RATE);
            const audioUrl = URL.createObjectURL(audioBlob);
            const duration = audioDataBuffer.reduce((sum, arr) => sum + arr.length, 0) / (CONFIG.AUDIO.OUTPUT_SAMPLE_RATE * 2);
            this.uiManager.displayAudioMessage(audioUrl, duration, 'ai');
            this.store.updateState({ audioDataBuffer: [] }); // 清空缓冲区
        }
    }

    /**
     * @function interruptPlayback
     * @description 中断当前正在播放的AI语音。
     */
    interruptPlayback() {
        if (this.audioStreamer) {
            this.audioStreamer.stop();
            Logger.info('Audio playback interrupted by user.');
            this.uiManager.logMessage('语音播放已中断', 'system');
            this.processAndDisplayBufferedAudio(); // 处理已缓冲的部分
        }
    }
    
    /**
     * @function playAudio
     * @description 播放指定的音频元素。
     * @param {HTMLAudioElement} audioElement - 要播放的音频元素。
     * @param {HTMLButtonElement} playButton - 控制播放的按钮。
     */
    playAudio(audioElement, playButton) {
        let { currentAudioElement } = this.store.getState();
        if (currentAudioElement && currentAudioElement !== audioElement) {
            currentAudioElement.pause();
            const prevPlayButton = currentAudioElement.closest('.audio-player')?.querySelector('.audio-play-button');
            if (prevPlayButton) prevPlayButton.textContent = 'play_arrow';
        }

        if (audioElement.paused) {
            audioElement.play();
            playButton.textContent = 'pause';
            this.store.updateState({ currentAudioElement: audioElement });
        } else {
            audioElement.pause();
            playButton.textContent = 'play_arrow';
            this.store.updateState({ currentAudioElement: null });
        }
    }

    /**
     * @function toggleMic
     * @description 切换麦克风实时输入的开关状态。
     */
    async toggleMic() {
        const { isRecording } = this.store.getState();
        if (!isRecording) {
            try {
                await this.initializeAudio();
                const audioRecorder = new AudioRecorder();
                
                await audioRecorder.start((base64Data) => {
                    const { isUsingTool } = this.store.getState();
                    const payload = isUsingTool
                        ? { mimeType: "audio/pcm;rate=16000", data: base64Data, interrupt: true }
                        : { mimeType: "audio/pcm;rate=16000", data: base64Data };
                    this.apiClient.sendRealtimeInput([payload]);
                });

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.store.updateState({ micStream: stream, isRecording: true });
                this.uiManager.logMessage('麦克风已启动', 'system');

            } catch (error) {
                Logger.error('麦克风错误:', error);
                this.uiManager.logMessage(`错误: ${error.message}`, 'system');
                this.store.updateState({ isRecording: false });
            }
        } else {
            const { micStream } = this.store.getState();
            micStream?.getTracks().forEach(track => track.stop());
            this.store.updateState({ isRecording: false, micStream: null });
            this.uiManager.logMessage('麦克风已停止', 'system');
        }
        this.uiManager.updateMicIcon();
    }

    /**
     * @function toggleVideo
     * @description 切换摄像头的开关状态。
     */
    async toggleVideo() {
        const { isVideoActive } = this.store.getState();
        if (!isVideoActive) {
            try {
                const { videoPreviewElement, fpsInput } = this.uiManager.domElements;
                this.videoManager = new VideoManager(videoPreviewElement, { width: 640, height: 480, facingMode: 'user' });
                
                await this.videoManager.start(fpsInput.value, (frameData) => {
                    if (this.store.getState().isConnected) {
                        this.apiClient.sendRealtimeInput([frameData]);
                    }
                });

                this.store.updateState({ isVideoActive: true });
                this.uiManager.logMessage('摄像头已启动', 'system');

            } catch (error) {
                Logger.error('摄像头错误:', error);
                this.uiManager.logMessage(`错误: ${error.message}`, 'system');
                this.videoManager = null;
                this.store.updateState({ isVideoActive: false });
            }
        } else {
            this.stopVideo();
        }
        this.uiManager.updateCameraIcon();
        this.uiManager.updateMediaPreviewsDisplay();
    }

    /**
     * @function stopVideo
     * @description 停止视频流。
     */
    stopVideo() {
        if (this.videoManager) {
            this.videoManager.stop();
            this.videoManager = null;
        }
        this.store.updateState({ isVideoActive: false });
        this.uiManager.logMessage('摄像头已停止', 'system');
        this.uiManager.updateCameraIcon();
        this.uiManager.updateMediaPreviewsDisplay();
    }
    
    /**
     * @function flipCamera
     * @description 翻转摄像头。
     */
    async flipCamera() {
        if (this.videoManager) {
            try {
                await this.videoManager.flipCamera();
                this.uiManager.logMessage('摄像头已翻转', 'system');
            } catch (error) {
                this.uiManager.logMessage(`翻转摄像头失败: ${error.message}`, 'error');
            }
        }
    }

    /**
     * @function toggleScreenShare
     * @description 切换屏幕共享的开关状态。
     */
    async toggleScreenShare() {
        const { isScreenSharing } = this.store.getState();
        if (!isScreenSharing) {
            try {
                const { screenPreviewElement, fpsInput } = this.uiManager.domElements;
                this.screenRecorder = new ScreenRecorder();

                const throttledSendFrame = this.throttle((frameData) => {
                    if (this.store.getState().isConnected) {
                        this.apiClient.sendRealtimeInput([{ mimeType: "image/jpeg", data: frameData }]);
                    }
                }, 1000 / fpsInput.value);

                await this.screenRecorder.start(screenPreviewElement, throttledSendFrame);
                this.store.updateState({ isScreenSharing: true });
                this.uiManager.logMessage('屏幕共享已启动', 'system');

            } catch (error) {
                Logger.error('屏幕共享错误:', error);
                this.uiManager.logMessage(`错误: ${error.message}`, 'system');
                this.screenRecorder = null;
                this.store.updateState({ isScreenSharing: false });
            }
        } else {
            this.stopScreenShare();
        }
        this.uiManager.updateScreenShareIcon();
        this.uiManager.updateMediaPreviewsDisplay();
    }

    /**
     * @function stopScreenShare
     * @description 停止屏幕共享。
     */
    stopScreenShare() {
        if (this.screenRecorder) {
            this.screenRecorder.stop();
            this.screenRecorder = null;
        }
        this.store.updateState({ isScreenSharing: false });
        this.uiManager.logMessage('屏幕共享已停止', 'system');
        this.uiManager.updateScreenShareIcon();
        this.uiManager.updateMediaPreviewsDisplay();
    }
    
    /**
     * @function stopAllStreams
     * @description 停止所有媒体流。
     */
    stopAllStreams() {
        if (this.store.getState().isVideoActive) this.stopVideo();
        if (this.store.getState().isScreenSharing) this.stopScreenShare();
    }

    /**
     * @function throttle
     * @description 节流函数。
     */
    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        }
    }
}
import { CONFIG } from '../config/config.js';
import { ApplicationError, ErrorCodes } from '../utils/error-boundary.js';
import { Logger } from '../utils/logger.js';

/**
 * @class AudioRecorder
 * @description Handles audio recording functionality with configurable sample rate
 * and real-time audio processing through WebAudio API.
 */
export class AudioRecorder {
    /**
     * @constructor
     * @param {number} sampleRate - The sample rate for audio recording (default: 16000)
     */
    constructor(sampleRate = CONFIG.AUDIO.SAMPLE_RATE) {
        this.sampleRate = sampleRate;
        this.stream = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.source = null;
        this.processor = null;
        this.onAudioData = null;
        
        // Bind methods to preserve context
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);

        // Add state tracking
        this.isRecording = false;
    }

    /**
     * @method start
     * @description Starts audio recording with the specified callback for audio data.
     * @param {Function} onAudioData - Callback function for processed audio data.
     * @param {Object} [options={}] - Optional configuration for recording.
     * @param {boolean} [options.returnRaw=false] - If true, onAudioData receives raw ArrayBuffer; otherwise, Base64 string.
     * @throws {Error} If unable to access microphone or set up audio processing.
     * @async
     */
    async start(onAudioData, options = {}) {
        this.onAudioData = onAudioData;
        const { returnRaw = false } = options; // 解构 options，默认 returnRaw 为 false

        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: this.sampleRate
                }
            });
            
            this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
            this.source = this.audioContext.createMediaStreamSource(this.stream);

            // Load and initialize audio worklet
            await this.audioContext.audioWorklet.addModule('js/audio/worklets/audio-processing.js');
            this.processor = new AudioWorkletNode(this.audioContext, 'audio-recorder-worklet');
            
            // Handle processed audio data
            this.processor.port.onmessage = (event) => {
                if (event.data.event === 'chunk' && this.onAudioData && this.isRecording) {
                    if (returnRaw) {
                        this.onAudioData(event.data.data.int16arrayBuffer); // 返回原始 ArrayBuffer
                    } else {
                        const base64Data = this.arrayBufferToBase64(event.data.data.int16arrayBuffer);
                        this.onAudioData(base64Data); // 返回 Base64 字符串
                    }
                }
            };

            // Connect audio nodes
            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            this.isRecording = true;
        } catch (error) {
            console.error('Error starting audio recording:', error);
            throw error;
        }
    }

    /**
     * @method stop
     * @description Stops the current recording session and cleans up resources.
     * @throws {ApplicationError} If an error occurs during stopping the recording.
     */
    stop() {
        try {
            if (!this.isRecording) {
                Logger.warn('Attempting to stop recording when not recording');
                return;
            }

            // Stop the microphone stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }

            // Disconnect nodes and close AudioContext
            if (this.source) {
                this.source.disconnect();
                this.source = null;
            }
            if (this.processor) {
                this.processor.disconnect();
                this.processor = null;
            }
            if (this.audioContext) {
                this.audioContext.close(); // 显式关闭 AudioContext
                this.audioContext = null;
            }

            this.isRecording = false;
            Logger.info('Audio recording stopped successfully');
        } catch (error) {
            Logger.error('Error stopping audio recording', error);
            throw new ApplicationError(
                'Failed to stop audio recording',
                ErrorCodes.AUDIO_STOP_FAILED,
                { originalError: error }
            );
        }
    }

    /**
     * @method arrayBufferToBase64
     * @description Converts ArrayBuffer to Base64 string.
     * @param {ArrayBuffer} buffer - The ArrayBuffer to convert.
     * @returns {string} The Base64 representation of the ArrayBuffer.
     * @throws {ApplicationError} If an error occurs during conversion.
     * @private
     */
    arrayBufferToBase64(buffer) {
        try {
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        } catch (error) {
            Logger.error('Error converting buffer to base64', error);
            throw new ApplicationError(
                'Failed to convert audio data',
                ErrorCodes.AUDIO_CONVERSION_FAILED,
                { originalError: error }
            );
        }
    }

    /**
     * @method checkBrowserSupport
     * @description Checks if the browser supports required audio APIs.
     * @throws {ApplicationError} If the browser does not support audio recording.
     * @private
     */
    checkBrowserSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new ApplicationError(
                'Audio recording is not supported in this browser',
                ErrorCodes.AUDIO_NOT_SUPPORTED
            );
        }
    }
} 
import { Logger } from '../utils/logger.js';
import { MultimodalLiveClient } from './websocket-client.js';

/**
 * @class ApiClient
 * @description 处理与后端的所有通信，包括WebSocket和HTTP请求。
 * 使用事件发射器模式通知上层模块网络事件。
 */
export class ApiClient extends EventTarget {
    /**
     * @constructor
     * @param {ToolManager} toolManager - 工具管理器实例。
     */
    constructor(toolManager) {
        super();
        this.wsClient = new MultimodalLiveClient();
        this.toolManager = toolManager;
        this.setupWsEventHandlers();
    }

    /**
     * @function setupWsEventHandlers
     * @description 设置WebSocket客户端的事件处理器。
     * 这些处理器会将原始的ws事件转换为更通用的ApiClient事件。
     */
    setupWsEventHandlers() {
        this.wsClient.on('open', () => this.dispatchEvent(new CustomEvent('open')));
        this.wsClient.on('close', (event) => this.dispatchEvent(new CustomEvent('close', { detail: event })));
        this.wsClient.on('error', (error) => this.dispatchEvent(new CustomEvent('error', { detail: error })));
        this.wsClient.on('log', (log) => this.dispatchEvent(new CustomEvent('log', { detail: log })));
        this.wsClient.on('audio', (data) => this.dispatchEvent(new CustomEvent('audio', { detail: data })));
        this.wsClient.on('content', (data) => this.dispatchEvent(new CustomEvent('content', { detail: data })));
        this.wsClient.on('interrupted', () => this.dispatchEvent(new CustomEvent('interrupted')));
        this.wsClient.on('turncomplete', () => this.dispatchEvent(new CustomEvent('turncomplete')));
        this.wsClient.on('setupcomplete', () => this.dispatchEvent(new CustomEvent('setupcomplete')));
    }

    /**
     * @function connect
     * @description 连接到WebSocket服务器。
     * @param {object} config - 连接配置。
     * @param {string} apiKey - API密钥。
     * @returns {Promise<void>}
     */
    async connect(config, apiKey) {
        try {
            await this.wsClient.connect(config, apiKey);
        } catch (error) {
            Logger.error('ApiClient: WebSocket连接失败', error);
            throw error; // 将错误向上抛出，由调用者处理
        }
    }

    /**
     * @function disconnect
     * @description 断开WebSocket连接。
     */
    disconnect() {
        this.wsClient.disconnect();
    }

    /**
     * @function sendWsMessage
     * @description 通过WebSocket发送消息。
     * @param {object} message - 要发送的消息对象。
     */
    sendWsMessage(message) {
        this.wsClient.send(message);
    }
    
    /**
     * @function sendRealtimeInput
     * @description 发送实时输入数据（如音频、视频帧）。
     * @param {Array<object>} data - 要发送的数据数组。
     */
    sendRealtimeInput(data) {
        this.wsClient.sendRealtimeInput(data);
    }

    /**
     * @function sendHttpRequest
     * @description 发送一个HTTP流式请求，并处理响应。
     * @param {string} endpoint - API端点。
     * @param {object} body - 请求体。
     * @param {string} apiKey - API密钥。
     * @returns {Promise<void>}
     */
    async sendHttpRequest(endpoint, body, apiKey) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP API请求失败: ${response.status} - ${errorData.error?.message || JSON.stringify(errorData)}`);
            }

            await this.processStreamedResponse(response.body, body, apiKey);

        } catch (error) {
            Logger.error(`ApiClient: HTTP请求失败到 ${endpoint}`, error);
            this.dispatchEvent(new CustomEvent('error', { detail: error }));
            throw error;
        }
    }

    /**
     * @function processStreamedResponse
     * @description 处理HTTP SSE流，解析数据块并分发事件。
     * @param {ReadableStream} stream - 响应的ReadableStream。
     * @param {object} originalRequestBody - 原始请求体，用于工具调用。
     * @param {string} apiKey - API密钥，用于工具调用。
     * @returns {Promise<void>}
     */
    async processStreamedResponse(stream, originalRequestBody, apiKey) {
        const reader = stream.getReader();
        const decoder = new TextDecoder('utf-8');
        let functionCallDetected = false;
        let currentFunctionCall = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                Logger.info('ApiClient: HTTP Stream finished.');
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            chunk.split('\n\n').forEach(part => {
                if (part.startsWith('data: ')) {
                    const jsonStr = part.substring(6);
                    if (jsonStr === '[DONE]') return;
                    
                    try {
                        const data = JSON.parse(jsonStr);
                        this.dispatchEvent(new CustomEvent('http-chunk', { detail: data }));

                        const choice = data.choices?.[0];
                        if (choice?.delta?.parts?.some(p => p.functionCall)) {
                            functionCallDetected = true;
                            currentFunctionCall = choice.delta.parts.find(p => p.functionCall).functionCall;
                        }
                    } catch (e) {
                        Logger.error('ApiClient: Error parsing SSE chunk:', e, jsonStr);
                    }
                }
            });
        }

        if (functionCallDetected && currentFunctionCall) {
            await this.handleToolCall(currentFunctionCall, originalRequestBody, apiKey);
        } else {
            this.dispatchEvent(new CustomEvent('turncomplete'));
        }
    }

    /**
     * @function handleToolCall
     * @description 处理模型发起的工具调用请求。
     * @param {object} functionCall - 函数调用对象。
     * @param {object} originalRequestBody - 原始请求体。
     * @param {string} apiKey - API密钥。
     * @returns {Promise<void>}
     */
    async handleToolCall(functionCall, originalRequestBody, apiKey) {
        this.dispatchEvent(new CustomEvent('tool-start', { detail: functionCall }));
        try {
            const toolResult = await this.toolManager.handleToolCall(functionCall);
            const toolResponsePart = toolResult.functionResponses[0].response.output;

            const newMessages = [
                ...originalRequestBody.messages,
                { role: 'assistant', parts: [{ functionCall: functionCall }] },
                { role: 'tool', parts: [{ functionResponse: { name: functionCall.name, response: toolResponsePart } }] }
            ];

            await this.sendHttpRequest('/api/chat/completions', {
                ...originalRequestBody,
                messages: newMessages,
            }, apiKey);

        } catch (toolError) {
            Logger.error('ApiClient: 工具执行失败', toolError);
            this.dispatchEvent(new CustomEvent('error', { detail: toolError }));
        }
    }
}
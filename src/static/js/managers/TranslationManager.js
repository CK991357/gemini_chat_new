import { getLanguageName } from '../utils/helpers.js';
import { Logger } from '../utils/logger.js';

/**
 * @class TranslationManager
 * @description 管理所有与翻译相关的业务逻辑。
 */
export class TranslationManager {
    /**
     * @constructor
     * @param {ApiClient} apiClient - API客户端实例。
     * @param {UIManager} uiManager - UI管理器实例。
     */
    constructor(apiClient, uiManager) {
        this.apiClient = apiClient;
        this.uiManager = uiManager;
    }

    /**
     * @function handleTranslation
     * @description 处理翻译请求。
     */
    async handleTranslation() {
        const { 
            translationInputText, 
            translationInputLanguageSelect, 
            translationOutputLanguageSelect, 
            translationModelSelect,
            systemInstruction,
            translationOutputText
        } = this.uiManager.domElements;

        const inputText = translationInputText.value.trim();
        if (!inputText) {
            this.uiManager.logMessage('请输入要翻译的内容', 'system');
            return;
        }

        const inputLang = translationInputLanguageSelect.value;
        const outputLang = translationOutputLanguageSelect.value;
        const model = translationModelSelect.value;

        translationOutputText.textContent = '翻译中...';

        try {
            const prompt = inputLang === 'auto'
                ? `你是一个专业的翻译助手，请将以下内容翻译成${getLanguageName(outputLang)}：\n\n${inputText}`
                : `你是一个专业的翻译助手，请将以下内容从${getLanguageName(inputLang)}翻译成${getLanguageName(outputLang)}：\n\n${inputText}`;

            const systemPrompt = systemInstruction.value
                .replace(/\{\{to\}\}/g, getLanguageName(outputLang))
                .replace(/\{\{title_prompt\}\}/g, '')
                .replace(/\{\{summary_prompt\}\}/g, '')
                .replace(/\{\{terms_prompt\}\}/g, '');

            const response = await this.apiClient.sendHttpRequest('/api/translate', {
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                stream: false
            }, null); // API Key is handled by the worker

            const translatedText = response.choices[0].message.content;
            translationOutputText.textContent = translatedText;
            this.uiManager.logMessage('翻译完成', 'system');

        } catch (error) {
            Logger.error('翻译错误:', error);
            this.uiManager.logMessage(`翻译失败: ${error.message}`, 'system');
            translationOutputText.textContent = '翻译失败，请重试';
        }
    }
}
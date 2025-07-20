import { CONFIG } from '../config/config.js';

/**
 * @class UIManager
 * @description 管理所有与UI相关的操作，包括DOM元素获取、事件监听和界面更新。
 */
export class UIManager {
    /**
     * @constructor
     * @param {object} managers - 一个包含所有业务逻辑管理器的对象。
     * @param {ChatStore} store - 应用的状态存储实例。
     */
    constructor(managers, store) {
        this.managers = managers;
        this.store = store;
        this.domElements = {}; // 存储所有DOM元素的引用
    }

    /**
     * @function init
     * @description 初始化UIManager，获取所有需要的DOM元素并绑定事件监听器。
     */
    init() {
        this.collectDOMElements();
        this.setupEventListeners();
        this.initializeUIState();
    }

    /**
     * @function collectDOMElements
     * @description 集中获取页面上的所有DOM元素，并存储在 this.domElements 中。
     */
    collectDOMElements() {
        const ids = [
            // 容器与面板
            'logs-container', 'message-history', 'config-container', 'media-previews',
            'video-container', 'screen-preview-container', 'file-attachment-previews',
            'translation-container', 'vision-container', 'vision-message-history',
            'vision-attachment-previews', 'toast-container',
            // 按钮
            'send-button', 'mic-button', 'connect-button', 'camera-button', 'stop-video',
            'screen-button', 'stop-screen-button', 'toggle-config', 'apply-config',
            'mobile-connect', 'interrupt-button', 'new-chat-button', 'theme-toggle',
            'toggle-log', 'clear-logs', 'attachment-button', 'translation-voice-input-button',
            'chat-voice-input-button', 'vision-mode-button', 'vision-attachment-button',
            'vision-send-button', 'translate-button', 'translation-copy-button', 'flip-camera',
            // 输入与选择
            'message-input', 'api-key', 'voice-select', 'fps-input', 'system-instruction',
            'response-type-select', 'model-select', 'file-input', 'translation-input-text',
            'translation-input-language-select', 'translation-output-language-select',
            'translation-model-select', 'vision-input-text', 'vision-file-input',
            'vision-model-select',
            // 预览元素
            'preview', 'screen-preview-element', 'translation-output-text',
            // 其他
            'audio-visualizer', 'input-audio-visualizer'
        ];
        const selectors = {
            'body': 'body',
            'modeTabs': '.mode-tabs .tab',
            'chatContainers': '.chat-container',
            'chatModeBtn': '#chat-mode-button',
            'translationModeBtn': '#translation-mode-button',
            'logContainer': '.chat-container.log-mode',
            'chatContainer': '.chat-container.text-mode',
            'inputArea': '.input-area'
        };

        ids.forEach(id => {
            this.domElements[id] = document.getElementById(id);
        });

        for (const key in selectors) {
            if (key.endsWith('s')) {
                 this.domElements[key] = document.querySelectorAll(selectors[key]);
            } else {
                 this.domElements[key] = document.querySelector(selectors[key]);
            }
        }
    }

    /**
     * @function setupEventListeners
     * @description 为所有交互式DOM元素绑定事件监听器。
     */
    setupEventListeners() {
        this.domElements.connectButton.addEventListener('click', () => this.managers.connection.toggleConnection());
        this.domElements.mobileConnect.addEventListener('click', () => this.managers.connection.toggleConnection());
        this.domElements.sendButton.addEventListener('click', () => this.managers.chat.sendMessage());
        this.domElements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.managers.chat.sendMessage();
            }
        });
        this.domElements.micButton.addEventListener('click', () => this.managers.media.toggleMic());
        this.domElements.cameraButton.addEventListener('click', () => this.managers.media.toggleVideo());
        this.domElements.stopVideo.addEventListener('click', () => this.managers.media.stopVideo());
        this.domElements.flipCamera.addEventListener('click', () => this.managers.media.flipCamera());
        this.domElements.screenButton.addEventListener('click', () => this.managers.media.toggleScreenShare());
        this.domElements.stopScreenButton.addEventListener('click', () => this.managers.media.stopScreenShare());
        this.domElements.interruptButton.addEventListener('click', () => this.managers.media.interruptPlayback());
        this.domElements.newChatButton.addEventListener('click', () => this.managers.chat.startNewChat());
        this.domElements.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.domElements.toggleConfig.addEventListener('click', () => this.toggleConfigPanel());
        this.domElements.applyConfig.addEventListener('click', () => this.hideConfigPanel());
        this.domElements.toggleLog.addEventListener('click', () => this.switchToMode('log'));
        this.domElements.clearLogs.addEventListener('click', () => this.clearLogs());
        this.domElements.modeTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchToMode(tab.dataset.mode));
        });
        this.domElements.attachmentButton.addEventListener('click', () => this.domElements.fileInput.click());
        this.domElements.fileInput.addEventListener('change', (e) => this.managers.chat.handleFileAttachment(e));
        this.domElements.translateButton.addEventListener('click', () => this.managers.translation.handleTranslation());
        this.domElements.translationCopyButton.addEventListener('click', () => this.copyTranslationOutput());
        this.setupVoiceInput(this.domElements.translationVoiceInputButton, 'translation');
        this.setupVoiceInput(this.domElements.chatVoiceInputButton, 'chat');
        this.domElements.visionAttachmentButton.addEventListener('click', () => this.domElements.visionFileInput.click());
        this.domElements.visionFileInput.addEventListener('change', (e) => this.managers.vision.handleFileAttachment(e));
        this.domElements.visionSendButton.addEventListener('click', () => this.managers.vision.sendMessage());
        this.domElements.modelSelect.addEventListener('change', (e) => this.managers.connection.handleModelChange(e.target.value));
        this.domElements.apiKeyInput.addEventListener('input', (e) => this.managers.config.updateApiKey(e.target.value));
        this.domElements.voiceSelect.addEventListener('change', (e) => this.managers.config.updateVoice(e.target.value));
        this.domElements.fpsInput.addEventListener('change', (e) => this.managers.config.updateFps(e.target.value));
        this.domElements.systemInstruction.addEventListener('change', (e) => this.managers.config.updateSystemInstruction(e.target.value));
        this.setupScrollListeners();
    }

    /**
     * @function initializeUIState
     * @description 根据保存的设置或默认值初始化UI界面。
     */
    initializeUIState() {
        this.loadAndApplyConfig();
        this.initTheme();
        this.initMarkdown();
        this.populateModelSelects();
        this.updateConnectionStatusUI(false);
        this.switchToMode('text', true);
    }

    /**
     * @function loadAndApplyConfig
     * @description 从 localStorage 加载保存的配置并应用到输入框。
     */
    loadAndApplyConfig() {
        const savedApiKey = localStorage.getItem('gemini_api_key');
        const savedVoice = localStorage.getItem('gemini_voice');
        const savedFPS = localStorage.getItem('video_fps');
        const savedSystemInstruction = localStorage.getItem('system_instruction');

        if (savedApiKey) this.domElements.apiKeyInput.value = savedApiKey;
        if (savedVoice) this.domElements.voiceSelect.value = savedVoice;
        if (savedFPS) this.domElements.fpsInput.value = savedFPS;
        
        if (savedSystemInstruction) {
            this.domElements.systemInstruction.value = savedSystemInstruction;
        } else {
            this.domElements.systemInstruction.value = CONFIG.SYSTEM_INSTRUCTION.TEXT;
        }
        this.managers.config.updateSystemInstruction(this.domElements.systemInstruction.value);
    }

    /**
     * @function initTheme
     * @description 初始化颜色主题（光/暗模式）。
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.domElements.body.classList.add(savedTheme);
        } else {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.domElements.body.classList.add(prefersDark ? 'dark-mode' : 'light-mode');
        }
        this.updateThemeButton();
    }

    /**
     * @function toggleTheme
     * @description 切换颜色主题。
     */
    toggleTheme() {
        this.domElements.body.classList.toggle('dark-mode');
        this.domElements.body.classList.toggle('light-mode');
        const currentTheme = this.domElements.body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode';
        localStorage.setItem('theme', currentTheme);
        this.updateThemeButton();
    }

    /**
     * @function updateThemeButton
     * @description 更新主题切换按钮的图标。
     */
    updateThemeButton() {
        const isDarkMode = this.domElements.body.classList.contains('dark-mode');
        this.domElements.themeToggle.textContent = isDarkMode ? 'dark_mode' : 'light_mode';
    }

    /**
     * @function initMarkdown
     * @description 初始化 Markdown 渲染库 (marked.js) 和代码高亮库 (highlight.js)。
     */
    initMarkdown() {
        marked.setOptions({
          breaks: true,
          highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
          },
          langPrefix: 'hljs language-'
        });
        hljs.configure({
          ignoreUnescapedHTML: true,
          throwUnescapedHTML: false
        });
    }

    /**
     * @function populateModelSelects
     * @description 动态填充所有模型选择的下拉菜单。
     */
    populateModelSelects() {
        const { modelSelect, translationModelSelect, visionModelSelect } = this.domElements;
        
        this.populateSelect(modelSelect, CONFIG.API.AVAILABLE_MODELS, CONFIG.API.MODEL_NAME);
        this.populateSelect(translationModelSelect, CONFIG.TRANSLATION.MODELS, CONFIG.TRANSLATION.DEFAULT_MODEL);
        this.populateSelect(visionModelSelect, CONFIG.VISION.MODELS, CONFIG.VISION.DEFAULT_MODEL);
    }

    /**
     * @function populateSelect
     * @description 辅助函数，用于填充一个 select 元素。
     * @param {HTMLSelectElement} selectElement - 要填充的 select 元素。
     * @param {Array<object>} models - 模型数据数组。
     * @param {string} defaultModelName - 默认选中的模型名称。
     */
    populateSelect(selectElement, models, defaultModelName) {
        if (!selectElement) return;
        selectElement.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.displayName;
            if (model.name === defaultModelName) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
    }

    /**
     * @function updateConnectionStatusUI
     * @description 根据连接状态更新所有相关UI元素。
     * @param {boolean} isConnected - 当前是否已连接。
     */
    updateConnectionStatusUI(isConnected) {
        const connectButtons = [this.domElements.connectButton, this.domElements.mobileConnect];
        connectButtons.forEach(btn => {
            if (btn) {
                btn.textContent = isConnected ? '断开连接' : '连接';
                btn.classList.toggle('connected', isConnected);
            }
        });

        const isWebSocket = this.store.getState().selectedModelConfig?.isWebSocket ?? false;
        this.domElements.messageInput.disabled = !isConnected;
        this.domElements.sendButton.disabled = !isConnected;
        this.domElements.micButton.disabled = !isConnected || !isWebSocket;
        this.domElements.cameraButton.disabled = !isConnected || !isWebSocket;
        this.domElements.screenButton.disabled = !isConnected || !isWebSocket;
        this.domElements.chatVoiceInputButton.disabled = !isConnected;
        this.domElements.attachmentButton.disabled = !isConnected || isWebSocket;
    }

    /**
     * @function logMessage
     * @description 在日志面板中记录一条消息。
     * @param {string} message - 消息内容。
     * @param {string} type - 消息类型 ('system', 'user', 'ai')。
     */
    logMessage(message, type = 'system') {
        const { logsContainer } = this.domElements;
        const rawLogEntry = document.createElement('div');
        rawLogEntry.classList.add('log-entry', type);
        rawLogEntry.innerHTML = `
            <span class="timestamp">${new Date().toLocaleTimeString()}</span>
            <span class="emoji">${type === 'system' ? '⚙️' : (type === 'user' ? '🫵' : '🤖')}</span>
            <span>${message}</span>
        `;
        logsContainer.appendChild(rawLogEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
    
    /**
     * @function clearLogs
     * @description 清空日志面板的内容。
     */
    clearLogs() {
        this.domElements.logsContainer.innerHTML = '';
        this.logMessage('日志已清空', 'system');
    }

    /**
     * @function copyTranslationOutput
     * @description 复制翻译结果到剪贴板。
     */
    copyTranslationOutput() {
        const outputText = this.domElements.translationOutputText.textContent;
        navigator.clipboard.writeText(outputText).then(() => {
            this.logMessage('翻译结果已复制', 'system');
            showToast('翻译结果已复制');
        }).catch(err => {
            this.logMessage('复制失败: ' + err, 'system');
            console.error('复制失败:', err);
        });
    }

    /**
     * @function toggleConfigPanel
     * @description 切换配置面板的显示和隐藏。
     */
    toggleConfigPanel() {
        this.domElements.configContainer.classList.toggle('active');
        this.domElements.toggleConfig.classList.toggle('active');
        if (window.innerWidth <= 1200) {
            const isActive = this.domElements.configContainer.classList.contains('active');
            this.domElements.body.style.overflow = isActive ? 'hidden' : '';
        }
    }

    /**
     * @function hideConfigPanel
     * @description 隐藏配置面板。
     */
    hideConfigPanel() {
        this.domElements.configContainer.classList.remove('active');
        this.domElements.toggleConfig.classList.remove('active');
        if (window.innerWidth <= 1200) {
            this.domElements.body.style.overflow = '';
        }
    }

    /**
     * @function setupScrollListeners
     * @description 设置聊天历史记录的滚动事件监听器。
     */
    setupScrollListeners() {
        const { messageHistory } = this.domElements;
        if (!messageHistory) return;

        const setUserScrolling = (isScrolling) => {
            this.store.updateState({ isUserScrolling: isScrolling });
        };

        messageHistory.addEventListener('wheel', () => setUserScrolling(true), { passive: true });
        messageHistory.addEventListener('scroll', () => {
            if (messageHistory.scrollHeight - messageHistory.clientHeight <= messageHistory.scrollTop + 1) {
                setUserScrolling(false);
            }
        });

        if ('ontouchstart' in window) {
            messageHistory.addEventListener('touchstart', () => setUserScrolling(true), { passive: true });
            messageHistory.addEventListener('touchend', () => {
                setUserScrolling(false);
                const threshold = 50;
                const isNearBottom = messageHistory.scrollHeight - messageHistory.clientHeight <= messageHistory.scrollTop + threshold;
                if (isNearBottom) {
                    this.scrollToBottom(messageHistory);
                }
            }, { passive: true });
        }
    }

    /**
     * @function scrollToBottom
     * @description 将指定的滚动容器滚动到底部。
     * @param {HTMLElement} element - 要滚动的DOM元素。
     */
    scrollToBottom(element) {
        if (!element) return;
        requestAnimationFrame(() => {
            if (!this.store.getState().isUserScrolling) {
                element.scrollTop = element.scrollHeight;
            }
        });
    }

    /**
     * @function switchToMode
     * @description 切换应用的主视图模式（聊天、翻译、视觉、日志）。
     * @param {string} mode - 要切换到的模式 ('text', 'translation', 'vision', 'log')。
     * @param {boolean} [isInitial=false] - 是否是初始加载时的切换。
     */
    switchToMode(mode, isInitial = false) {
        const { modeTabs, chatContainers, mediaPreviewsContainer, inputArea } = this.domElements;

        modeTabs.forEach(t => t.classList.remove('active'));
        chatContainers.forEach(c => c.classList.remove('active'));

        const activeTab = document.querySelector(`.tab[data-mode="${mode}"]`);
        const activeContainer = document.querySelector(`.chat-container.${mode}-mode`);

        if (activeTab) activeTab.classList.add('active');
        if (activeContainer) activeContainer.classList.add('active');

        const isMediaVisible = (mode === 'text');
        mediaPreviewsContainer.style.display = isMediaVisible ? 'flex' : 'none';
        inputArea.style.display = isMediaVisible ? 'flex' : 'none';

        if (!isInitial && (mode === 'log' || mode === 'translation' || mode === 'vision')) {
            this.managers.media.stopAllStreams();
        }
        
        this.updateMediaPreviewsDisplay();
    }

    /**
     * @function updateMediaPreviewsDisplay
     * @description 根据媒体流状态更新预览容器的显示。
     */
    updateMediaPreviewsDisplay() {
        const { isVideoActive, isScreenSharing } = this.store.getState();
        const { mediaPreviewsContainer, videoContainer, screenPreviewContainer } = this.domElements;

        const shouldShowPreviews = isVideoActive || isScreenSharing;
        mediaPreviewsContainer.style.display = shouldShowPreviews ? 'flex' : 'none';
        videoContainer.style.display = isVideoActive ? 'block' : 'none';
        screenPreviewContainer.style.display = isScreenSharing ? 'block' : 'none';
    }
    
    /**
     * @function displayUserMessage
     * @description 在聊天历史中显示用户的多模态消息。
     * @param {string} text - 文本消息内容。
     * @param {object|null} file - 附加的文件对象。
     */
    displayUserMessage(text, file) {
        const { messageHistory } = this.domElements;
        const messageDiv = this.createMessageElement('user');
        const contentDiv = messageDiv.querySelector('.content');

        if (text) {
            const textNode = document.createElement('p');
            textNode.textContent = text;
            contentDiv.appendChild(textNode);
        }

        if (file && file.base64) {
            const img = document.createElement('img');
            img.src = file.base64;
            img.alt = file.name || 'Attached Image';
            img.style.cssText = 'max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 10px;';
            contentDiv.appendChild(img);
        }

        messageHistory.appendChild(messageDiv);
        this.scrollToBottom(messageHistory);
    }

    /**
     * @function createMessageElement
     * @description 创建一个消息元素的基础结构。
     * @param {string} type - 消息类型 ('user', 'ai', 'system-info')。
     * @returns {HTMLElement} 创建的消息div元素。
     */
    createMessageElement(type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');
        avatarDiv.textContent = type === 'user' ? '👤' : '🤖';

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('content');

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        return messageDiv;
    }

    /**
     * @function createAIMessageElement
     * @description 创建并添加一个新的 AI 消息元素到聊天历史。
     * @returns {{container: HTMLElement, markdownContainer: HTMLElement, contentDiv: HTMLElement, rawMarkdownBuffer: string}}
     */
    createAIMessageElement() {
        const { messageHistory } = this.domElements;
        const messageDiv = this.createMessageElement('ai');
        const contentDiv = messageDiv.querySelector('.content');

        const markdownContainer = document.createElement('div');
        markdownContainer.classList.add('markdown-container');
        contentDiv.appendChild(markdownContainer);

        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-button', 'material-symbols-outlined');
        copyButton.textContent = 'content_copy';
        copyButton.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(markdownContainer.textContent);
                copyButton.textContent = 'check';
                setTimeout(() => { copyButton.textContent = 'content_copy'; }, 2000);
                this.logMessage('文本已复制到剪贴板', 'system');
            } catch (err) {
                this.logMessage('复制失败: ' + err, 'system');
            }
        });
        contentDiv.appendChild(copyButton);

        messageHistory.appendChild(messageDiv);
        this.scrollToBottom(messageHistory);

        const messageState = {
            container: messageDiv,
            markdownContainer,
            contentDiv,
            rawMarkdownBuffer: ''
        };
        this.store.updateState({ currentAIMessageContentDiv: messageState });
        return messageState;
    }

    /**
     * @function updateAIMessage
     * @description 更新流式AI消息的内容。
     * @param {string} textChunk - 新的文本块。
     */
    updateAIMessage(textChunk) {
        let messageState = this.store.getState().currentAIMessageContentDiv;
        if (!messageState) {
            messageState = this.createAIMessageElement();
        }

        messageState.rawMarkdownBuffer += textChunk;
        messageState.markdownContainer.innerHTML = marked.parse(messageState.rawMarkdownBuffer);

        if (typeof MathJax !== 'undefined' && MathJax.startup) {
            MathJax.startup.promise.then(() => {
                MathJax.typeset([messageState.markdownContainer]);
            }).catch((err) => console.error('MathJax typesetting failed:', err));
        }
        this.scrollToBottom(this.domElements.messageHistory);
    }

    /**
     * @function displayAudioMessage
     * @description 在聊天历史中显示语音消息。
     * @param {string} audioUrl - 语音文件的URL。
     * @param {number} duration - 语音时长（秒）。
     * @param {string} type - 消息类型 ('user' 或 'ai')。
     */
    displayAudioMessage(audioUrl, duration, type) {
        const { messageHistory } = this.domElements;
        const messageDiv = this.createMessageElement(type);
        const contentDiv = messageDiv.querySelector('.content');
        contentDiv.classList.add('audio-content');

        const audioPlayerDiv = document.createElement('div');
        audioPlayerDiv.className = 'audio-player';

        const playButton = document.createElement('button');
        playButton.className = 'audio-play-button material-icons';
        playButton.textContent = 'play_arrow';

        const audioWaveform = document.createElement('div');
        audioWaveform.className = 'audio-waveform';
        const audioProgressBar = document.createElement('div');
        audioProgressBar.className = 'audio-progress-bar';
        audioWaveform.appendChild(audioProgressBar);

        const audioDurationSpan = document.createElement('span');
        audioDurationSpan.className = 'audio-duration';
        audioDurationSpan.textContent = formatTime(duration);

        const audioElement = new Audio(audioUrl);
        audioElement.preload = 'metadata';

        playButton.addEventListener('click', () => this.managers.media.playAudio(audioElement, playButton));

        audioElement.addEventListener('timeupdate', () => {
            const progress = (audioElement.currentTime / audioElement.duration) * 100;
            audioProgressBar.style.width = `${progress}%`;
            audioDurationSpan.textContent = formatTime(audioElement.currentTime);
        });

        audioElement.addEventListener('ended', () => {
            playButton.textContent = 'play_arrow';
            audioProgressBar.style.width = '0%';
            audioDurationSpan.textContent = formatTime(duration);
            this.store.updateState({ currentAudioElement: null });
        });

        audioPlayerDiv.append(playButton, audioWaveform, audioDurationSpan);
        contentDiv.appendChild(audioPlayerDiv);
        messageHistory.appendChild(messageDiv);
        this.scrollToBottom(messageHistory);
    }

    /**
     * @function displayFilePreview
     * @description 显示单个文件预览。
     * @param {object} fileData - 文件数据。
     */
    displayFilePreview(fileData) {
        const { fileAttachmentPreviews } = this.domElements;
        fileAttachmentPreviews.innerHTML = ''; // Chat mode only supports one file

        const previewCard = this.createPreviewCard(fileData.name, 'chat');
        const previewElement = this.createPreviewElement(fileData);
        
        previewCard.prepend(previewElement);
        fileAttachmentPreviews.appendChild(previewCard);
    }

    /**
     * @function displayVisionFilePreviews
     * @description 显示视觉模式下的多个文件预览。
     */
    displayVisionFilePreviews() {
        const { visionAttachmentPreviews } = this.domElements;
        const files = this.store.getState().visionAttachedFiles;
        visionAttachmentPreviews.innerHTML = '';
        
        files.forEach((file, index) => {
            const previewCard = this.createPreviewCard(file.name, 'vision', index);
            const previewElement = this.createPreviewElement(file);
            previewCard.prepend(previewElement);
            visionAttachmentPreviews.appendChild(previewCard);
        });
    }

    /**
     * @function createPreviewCard
     * @description 创建文件预览卡片的基础结构。
     * @param {string} name - 文件名。
     * @param {string} mode - 模式 ('chat' or 'vision')。
     * @param {number} [index] - 索引 (仅用于视觉模式)。
     * @returns {HTMLElement}
     */
    createPreviewCard(name, mode, index) {
        const previewCard = document.createElement('div');
        previewCard.className = 'file-preview-card';
        previewCard.title = name;

        const closeButton = document.createElement('button');
        closeButton.className = 'close-button material-symbols-outlined';
        closeButton.textContent = 'close';
        closeButton.onclick = (e) => {
            e.stopPropagation();
            if (mode === 'vision') {
                this.managers.vision.removeAttachment(index);
            } else {
                this.managers.chat.clearAttachment();
            }
        };
        previewCard.appendChild(closeButton);
        return previewCard;
    }

    /**
     * @function createPreviewElement
     * @description 根据文件类型创建预览的DOM元素。
     * @param {object} fileData - 文件数据。
     * @returns {HTMLElement}
     */
    createPreviewElement(fileData) {
        let element;
        if (fileData.type.startsWith('image/')) {
            element = document.createElement('img');
            element.src = fileData.base64;
        } else if (fileData.type.startsWith('video/')) {
            element = document.createElement('video');
            element.src = fileData.base64;
            element.muted = true;
            element.autoplay = true;
            element.loop = true;
            element.playsInline = true;
        } else {
            element = document.createElement('div');
            element.className = 'file-placeholder';
            element.innerHTML = `<span class="material-symbols-outlined">description</span><p>${fileData.name}</p>`;
        }
        element.alt = fileData.name;
        return element;
    }

    /**
     * @function clearFilePreview
     * @description 清除文件预览。
     * @param {string} mode - 模式 ('chat' or 'vision')。
     */
    clearFilePreview(mode = 'chat') {
        const container = mode === 'vision' ? this.domElements.visionAttachmentPreviews : this.domElements.fileAttachmentPreviews;
        if(container) container.innerHTML = '';
    }

    /**
     * @function displayVisionUserMessage
     * @description 在视觉模式聊天历史中显示用户消息。
     * @param {string} text - 文本内容。
     * @param {Array<object>} files - 附加的文件列表。
     */
    displayVisionUserMessage(text, files) {
        const { visionMessageHistory } = this.domElements;
        const messageDiv = this.createMessageElement('user');
        const contentDiv = messageDiv.querySelector('.content');

        if (text) {
            const textNode = document.createElement('p');
            textNode.textContent = text;
            contentDiv.appendChild(textNode);
        }

        if (files && files.length > 0) {
            const attachmentsContainer = document.createElement('div');
            attachmentsContainer.className = 'attachments-grid';
            files.forEach(file => {
                const attachmentElement = this.createPreviewElement(file);
                attachmentElement.classList.add('chat-attachment');
                attachmentsContainer.appendChild(attachmentElement);
            });
            contentDiv.appendChild(attachmentsContainer);
        }

        visionMessageHistory.appendChild(messageDiv);
        this.scrollToBottom(visionMessageHistory);
    }

    /**
     * @function createVisionAIMessageElement
     * @description 在视觉模式中创建并添加一个新的 AI 消息元素。
     * @returns {object} 包含对新创建元素的引用的对象。
     */
    createVisionAIMessageElement() {
        const { visionMessageHistory } = this.domElements;
        const messageDiv = this.createMessageElement('ai');
        const contentDiv = messageDiv.querySelector('.content');

        const reasoningContainer = document.createElement('div');
        reasoningContainer.className = 'reasoning-container';
        reasoningContainer.style.display = 'none';
        reasoningContainer.innerHTML = `<h4 class="reasoning-title"><span class="material-symbols-outlined">psychology</span> 思维链</h4><div class="reasoning-content"></div>`;
        contentDiv.appendChild(reasoningContainer);

        const markdownContainer = document.createElement('div');
        markdownContainer.classList.add('markdown-container');
        contentDiv.appendChild(markdownContainer);

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button material-symbols-outlined';
        copyButton.textContent = 'content_copy';
        copyButton.addEventListener('click', async () => {
            const reasoningText = reasoningContainer.style.display !== 'none' ? `[思维链]\n${reasoningContainer.querySelector('.reasoning-content').innerText}\n\n` : '';
            const mainText = markdownContainer.innerText;
            await navigator.clipboard.writeText(reasoningText + mainText);
            copyButton.textContent = 'check';
            setTimeout(() => { copyButton.textContent = 'content_copy'; }, 2000);
        });
        contentDiv.appendChild(copyButton);

        visionMessageHistory.appendChild(messageDiv);
        this.scrollToBottom(visionMessageHistory);

        return {
            container: messageDiv,
            markdownContainer,
            reasoningContainer,
            contentDiv,
        };
    }

    /**
     * @function setupVoiceInput
     * @description 为指定的语音输入按钮设置事件监听器。
     * @param {HTMLElement} button - 语音输入按钮元素。
     * @param {'chat' | 'translation'} mode - 语音输入的模式。
     */
    setupVoiceInput(button, mode) {
        if (!button) return;

        const startRecording = () => this.managers.media.startRecording(mode);
        const stopRecording = () => this.managers.media.stopRecording(mode);
        const cancelRecording = () => this.managers.media.cancelRecording(mode);

        let initialTouchY = 0;

        // 鼠标事件
        button.addEventListener('mousedown', startRecording);
        button.addEventListener('mouseup', stopRecording);
        button.addEventListener('mouseleave', () => {
            if ((mode === 'chat' && this.store.getState().isChatRecording) || (mode === 'translation' && this.store.getState().isTranslationRecording)) {
                cancelRecording();
            }
        });

        // 触摸事件
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            initialTouchY = e.touches[0].clientY;
            startRecording();
        }, { passive: false });

        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            stopRecording();
        });

        button.addEventListener('touchmove', (e) => {
            if ((mode === 'chat' && this.store.getState().isChatRecording) || (mode === 'translation' && this.store.getState().isTranslationRecording)) {
                const currentTouchY = e.touches[0].clientY;
                if (initialTouchY - currentTouchY > 50) { // 50px 阈值
                    cancelRecording();
                }
            }
        }, { passive: false });
    }
}
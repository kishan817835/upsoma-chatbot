

(function() {
    'use strict';
    
    // Widget configuration
    let config = {
        apiUrl: 'http://localhost:3000',
        position: 'bottom-right',
        theme: 'blue',
        title: 'AI Assistant',
        welcomeMessage: '🤖 Hello! I\'m here to help you find information from your documents. What would you like to know?',
        placeholder: 'Ask me anything about your documents...',
        zIndex: 999999
    };
    
  
    let isOpen = false;
    let isLoading = false;
    let widgetContainer = null;
    window.initAIChatWidget = function(userConfig = {}) {
        // Merge user config with default config
        config = Object.assign(config, userConfig);
        
        // Create widget
        createWidget();
        
        // Log initialization
        console.log('AI Chat Widget initialized successfully!');
    };
    
    // Create widget HTML and CSS
    function createWidget() {
        // Remove existing widget if any
        if (widgetContainer) {
            widgetContainer.remove();
        }
        
        // Create main container
        widgetContainer = document.createElement('div');
        widgetContainer.id = 'ai-chat-widget';
        widgetContainer.innerHTML = getWidgetHTML();
        
        // Add CSS
        const style = document.createElement('style');
        style.textContent = getWidgetCSS();
        document.head.appendChild(style);
        
        // Add widget to body
        document.body.appendChild(widgetContainer);
        
        // Setup event listeners
        setupEventListeners();
    }
    
    // Get widget HTML
    function getWidgetHTML() {
        return `
            <div class="ai-chat-container">
                <!-- Chat Toggle Button -->
                <button class="ai-chat-toggle-btn" id="aiChatToggle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span class="ai-chat-badge">💬</span>
                </button>

                <!-- Chat Window -->
                <div class="ai-chat-window" id="aiChatWindow">
                    <!-- Chat Header -->
                    <div class="ai-chat-header">
                        <div class="ai-header-content">
                            <h3>${config.title}</h3>
                            <span class="ai-status-indicator"></span>
                        </div>
                        <button class="ai-close-btn" id="aiChatClose">×</button>
                    </div>

                    <!-- Messages Container -->
                    <div class="ai-messages-container" id="aiMessagesContainer">
                        <div class="ai-message ai-bot-message">
                            <div class="ai-message-content">
                                <div class="ai-sender-name">
                                    <strong>🤖 ${config.title}</strong>
                                </div>
                                <div class="ai-message-text">${config.welcomeMessage}</div>
                            </div>
                            <div class="ai-message-time">${getCurrentTime()}</div>
                        </div>
                    </div>

                    <!-- Input Area -->
                    <div class="ai-input-area">
                        <div class="ai-input-container">
                            <textarea 
                                id="aiMessageInput"
                                placeholder="${config.placeholder}"
                                rows="1"
                                class="ai-message-input">
                            </textarea>
                            <button class="ai-send-btn" id="aiSendBtn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22,2 15,22 11,13 2,9"></polygon>
                                </svg>
                            </button>
                        </div>
                        <div class="ai-input-info">
                            <small>💡 I'll search through your documents and provide precise answers.</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Get widget CSS
    function getWidgetCSS() {
        return `
            /* AI Chat Widget Styles */
            .ai-chat-container {
                position: fixed;
                ${config.position === 'bottom-right' ? 'bottom: 20px; right: 20px;' : ''}
                ${config.position === 'bottom-left' ? 'bottom: 20px; left: 20px;' : ''}
                ${config.position === 'top-right' ? 'top: 20px; right: 20px;' : ''}
                ${config.position === 'top-left' ? 'top: 20px; left: 20px;' : ''}
                z-index: ${config.zIndex};
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .ai-chat-toggle-btn {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: ${config.theme === 'blue' ? 'linear-gradient(135deg, #1976d2, #1565c0)' : 
                           config.theme === 'green' ? 'linear-gradient(135deg, #4caf50, #388e3c)' :
                           config.theme === 'purple' ? 'linear-gradient(135deg, #9c27b0, #7b1fa2)' :
                           'linear-gradient(135deg, #1976d2, #1565c0)'};
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                z-index: ${config.zIndex + 1};
            }

            .ai-chat-toggle-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(25, 118, 210, 0.4);
            }

            .ai-chat-toggle-btn.active {
                background: linear-gradient(135deg, #f44336, #d32f2f);
            }

            .ai-chat-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #4caf50;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                animation: ai-pulse 2s infinite;
            }

            @keyframes ai-pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }

            .ai-chat-window {
                position: absolute;
                ${config.position.includes('bottom') ? 'bottom: 80px;' : 'top: 80px;'}
                ${config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
                width: 380px;
                height: 500px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                opacity: 0;
                visibility: hidden;
                transform: translateY(20px) scale(0.9);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .ai-chat-window.open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0) scale(1);
            }

            .ai-chat-header {
                background: ${config.theme === 'blue' ? 'linear-gradient(135deg, #1976d2, #1565c0)' : 
                           config.theme === 'green' ? 'linear-gradient(135deg, #4caf50, #388e3c)' :
                           config.theme === 'purple' ? 'linear-gradient(135deg, #9c27b0, #7b1fa2)' :
                           'linear-gradient(135deg, #1976d2, #1565c0)'};
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 12px 12px 0 0;
            }

            .ai-header-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .ai-header-content h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }

            .ai-status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #4caf50;
                animation: ai-pulse 2s infinite;
            }

            .ai-close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s;
            }

            .ai-close-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .ai-messages-container {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #f8f9fa;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .ai-messages-container::-webkit-scrollbar {
                width: 6px;
            }

            .ai-messages-container::-webkit-scrollbar-track {
                background: #f1f1f1;
            }

            .ai-messages-container::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }

            .ai-message {
                max-width: 85%;
                animation: ai-slideIn 0.3s ease;
            }

            @keyframes ai-slideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .ai-user-message {
                align-self: flex-end;
            }

            .ai-bot-message {
                align-self: flex-start;
            }

            .ai-message-content {
                background: white;
                padding: 12px 16px;
                border-radius: 18px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .ai-user-message .ai-message-content {
                background: ${config.theme === 'blue' ? '#1976d2' : 
                           config.theme === 'green' ? '#4caf50' :
                           config.theme === 'purple' ? '#9c27b0' :
                           '#1976d2'};
                color: white;
            }

            .ai-sender-name {
                font-size: 12px;
                margin-bottom: 5px;
                opacity: 0.8;
            }

            .ai-message-text {
                line-height: 1.4;
                word-wrap: break-word;
            }

            .ai-message-text strong {
                color: ${config.theme === 'blue' ? '#1976d2' : 
                           config.theme === 'green' ? '#4caf50' :
                           config.theme === 'purple' ? '#9c27b0' :
                           '#1976d2'};
                font-weight: 600;
            }

            .ai-user-message .ai-message-text strong {
                color: white;
            }

            .ai-message-text .ai-chat-points {
                margin: 8px 0;
                padding-left: 0;
                list-style: none;
            }

            .ai-message-text .ai-chat-points li {
                margin: 6px 0;
                padding: 8px 12px;
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                border-left: 4px solid ${config.theme === 'blue' ? '#1976d2' : 
                                           config.theme === 'green' ? '#4caf50' :
                                           config.theme === 'purple' ? '#9c27b0' :
                                           '#1976d2'};
                border-radius: 8px;
                position: relative;
                transition: all 0.2s ease;
            }

            .ai-message-text .ai-chat-points li:hover {
                background: linear-gradient(135deg, #e9ecef, #dee2e6);
                transform: translateX(2px);
            }

            .ai-message-text .ai-chat-points li::before {
                content: "•";
                color: ${config.theme === 'blue' ? '#1976d2' : 
                           config.theme === 'green' ? '#4caf50' :
                           config.theme === 'purple' ? '#9c27b0' :
                           '#1976d2'};
                font-weight: bold;
                font-size: 16px;
                position: absolute;
                left: -8px;
                top: 8px;
            }

            .ai-message-text .ai-chat-points li strong {
                color: ${config.theme === 'blue' ? '#1976d2' : 
                           config.theme === 'green' ? '#4caf50' :
                           config.theme === 'purple' ? '#9c27b0' :
                           '#1976d2'};
                font-weight: 700;
            }

            .ai-user-message .ai-message-text .ai-chat-points li {
                background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1));
                border-left-color: #ffffff;
            }

            .ai-user-message .ai-message-text .ai-chat-points li::before {
                color: #ffffff;
            }

            .ai-user-message .ai-message-text .ai-chat-points li strong {
                color: #ffffff;
            }

            .ai-message-time {
                font-size: 11px;
                color: #666;
                margin-top: 5px;
                text-align: right;
            }

            .ai-user-message .ai-message-time {
                text-align: right;
            }

            .ai-bot-message .ai-message-time {
                text-align: left;
            }

            .ai-typing-indicator {
                display: flex;
                gap: 4px;
                padding: 10px 0;
            }

            .ai-typing-indicator span {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #666;
                animation: ai-typing 1.4s infinite;
            }

            .ai-typing-indicator span:nth-child(2) {
                animation-delay: 0.2s;
            }

            .ai-typing-indicator span:nth-child(3) {
                animation-delay: 0.4s;
            }

            @keyframes ai-typing {
                0%, 60%, 100% {
                    transform: translateY(0);
                }
                30% {
                    transform: translateY(-10px);
                }
            }

            .ai-input-area {
                padding: 15px 20px;
                background: white;
                border-top: 1px solid #e0e0e0;
                border-radius: 0 0 12px 12px;
            }

            .ai-input-container {
                display: flex;
                gap: 10px;
                align-items: flex-end;
            }

            .ai-message-input {
                flex: 1;
                border: 2px solid #e0e0e0;
                border-radius: 25px;
                padding: 12px 16px;
                font-size: 14px;
                resize: none;
                outline: none;
                transition: border-color 0.3s;
                font-family: inherit;
                min-height: 44px;
                max-height: 100px;
            }

            .ai-message-input:focus {
                border-color: ${config.theme === 'blue' ? '#1976d2' : 
                               config.theme === 'green' ? '#4caf50' :
                               config.theme === 'purple' ? '#9c27b0' :
                               '#1976d2'};
            }

            .ai-send-btn {
                background: ${config.theme === 'blue' ? '#1976d2' : 
                           config.theme === 'green' ? '#4caf50' :
                           config.theme === 'purple' ? '#9c27b0' :
                           '#1976d2'};
                border: none;
                border-radius: 50%;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background 0.3s;
                color: white;
            }

            .ai-send-btn:hover:not(:disabled) {
                background: ${config.theme === 'blue' ? '#1565c0' : 
                           config.theme === 'green' ? '#388e3c' :
                           config.theme === 'purple' ? '#7b1fa2' :
                           '#1565c0'};
            }

            .ai-send-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
            }

            .ai-input-info {
                margin-top: 8px;
                text-align: center;
            }

            .ai-input-info small {
                color: #666;
                font-size: 11px;
            }

            /* Responsive Design */
            @media (max-width: 480px) {
                .ai-chat-container {
                    ${config.position.includes('bottom') ? 'bottom: 10px;' : 'top: 10px;'}
                    ${config.position.includes('right') ? 'right: 10px;' : 'left: 10px;'}
                }
                
                .ai-chat-window {
                    width: calc(100vw - 40px);
                    height: 400px;
                    ${config.position.includes('right') ? 'right: -10px;' : 'left: -10px;'}
                }
                
                .ai-chat-toggle-btn {
                    width: 50px;
                    height: 50px;
                }
            }
        `;
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Toggle button
        const toggleBtn = document.getElementById('aiChatToggle');
        const closeBtn = document.getElementById('aiChatClose');
        const sendBtn = document.getElementById('aiSendBtn');
        const messageInput = document.getElementById('aiMessageInput');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleChat);
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', toggleChat);
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', handleKeyPress);
            messageInput.addEventListener('input', autoResize);
        }
    }
    
    // Toggle chat window
    function toggleChat() {
        isOpen = !isOpen;
        const chatWindow = document.getElementById('aiChatWindow');
        const toggleBtn = document.getElementById('aiChatToggle');
        
        if (isOpen) {
            chatWindow.classList.add('open');
            toggleBtn.classList.add('active');
        } else {
            chatWindow.classList.remove('open');
            toggleBtn.classList.remove('active');
        }
    }
    
    // Send message
    async function sendMessage() {
        const messageInput = document.getElementById('aiMessageInput');
        const message = messageInput.value.trim();
        
        if (!message || isLoading) return;

        const messagesContainer = document.getElementById('aiMessagesContainer');
        
        // Add user message
        addMessage(message, 'user');
        
        messageInput.value = '';
        isLoading = true;
        document.getElementById('aiSendBtn').disabled = true;

        // Add typing indicator
        addTypingIndicator();
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const response = await fetch(`${config.apiUrl}/v1/chatbot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message })
            });

            const result = await response.json();

            // Remove typing indicator
            removeTypingIndicator();

            if (result.success) {
                addMessage(result.response, 'bot');
            } else {
                addMessage('Sorry, I encountered an error while processing your request.', 'bot');
            }
        } catch (error) {
            // Remove typing indicator
            removeTypingIndicator();
            
            addMessage('Sorry, I encountered an error while connecting to the server.', 'bot');
            console.error('AI Chat Widget Error:', error);
        } finally {
            isLoading = false;
            document.getElementById('aiSendBtn').disabled = false;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    // Add message to chat
    function addMessage(text, sender) {
        const messagesContainer = document.getElementById('aiMessagesContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-${sender}-message`;
        messageDiv.innerHTML = `
            <div class="ai-message-content">
                <div class="ai-sender-name">
                    <strong>${sender === 'user' ? '👤 You' : `🤖 ${config.title}`}</strong>
                </div>
                <div class="ai-message-text">${formatMessage(text)}</div>
            </div>
            <div class="ai-message-time">${getCurrentTime()}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Add typing indicator
    function addTypingIndicator() {
        const messagesContainer = document.getElementById('aiMessagesContainer');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'aiTypingIndicator';
        typingDiv.className = 'ai-message ai-bot-message';
        typingDiv.innerHTML = `
            <div class="ai-message-content">
                <div class="ai-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Remove typing indicator
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('aiTypingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Format message text
    function formatMessage(text) {
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        if (formatted.includes('•')) {
            const lines = formatted.split('\n');
            let inList = false;
            let htmlLines = [];
            
            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('•')) {
                    if (!inList) {
                        htmlLines.push('<ul class="ai-chat-points">');
                        inList = true;
                    }
                    const bulletContent = trimmedLine.substring(1).trim();
                    const formattedBullet = bulletContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    htmlLines.push(`<li>${formattedBullet}</li>`);
                } else {
                    if (inList) {
                        htmlLines.push('</ul>');
                        inList = false;
                    }
                    if (trimmedLine) {
                        htmlLines.push(`<p>${trimmedLine}</p>`);
                    }
                }
            });
            
            if (inList) {
                htmlLines.push('</ul>');
            }
            
            formatted = htmlLines.join('');
        } else {
            formatted = formatted.replace(/\n/g, '<br>');
        }
        
        return formatted;
    }
    
    // Handle key press
    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }
    
    // Auto resize textarea
    function autoResize() {
        const textarea = document.getElementById('aiMessageInput');
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }
    
    // Get current time
    function getCurrentTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Auto-initialize if no manual initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Auto-initialize with default settings
            setTimeout(() => {
                if (!widgetContainer) {
                    initAIChatWidget();
                }
            }, 1000);
        });
    } else {
        // Auto-initialize if DOM is already loaded
        setTimeout(() => {
            if (!widgetContainer) {
                initAIChatWidget();
            }
        }, 1000);
    }
    
})();

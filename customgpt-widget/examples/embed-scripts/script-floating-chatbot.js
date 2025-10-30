/**
 * CustomGPT Widget Voice Assistant - Intercom-Style Floating Chatbot
 * Opens in bottom-right corner like Intercom, Drift, or other chat widgets
 * Fetches agent avatar from CustomGPT API
 * No dependencies, pure vanilla JavaScript
 */

(function() {
    const config = {
        apiUrl: 'http://localhost:8000', // Change to deployed URL in production
        primaryColor: '#8b5cf6',
        buttonSize: '60px',
        chatWidth: '400px',
        chatHeight: '600px',
        bottomOffset: '24px',
        rightOffset: '24px'
    };

    // Create floating button (initially hidden until we fetch avatar)
    const button = document.createElement('button');
    button.id = 'customgpt-widget-chat-button';
    button.style.cssText = `
        position: fixed;
        bottom: ${config.bottomOffset};
        right: ${config.rightOffset};
        width: ${config.buttonSize};
        height: ${config.buttonSize};
        background: linear-gradient(135deg, ${config.primaryColor}, #3b82f6);
        color: white;
        border: none;
        border-radius: 50%;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999998;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: none;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        padding: 0;
    `;

    // Hover effects
    button.onmouseover = () => {
        button.style.transform = 'scale(1.1)';
        button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
    };
    button.onmouseout = () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    };

    // Create chat widget container (Intercom-style, bottom-right)
    const chatWidget = document.createElement('div');
    chatWidget.id = 'customgpt-widget-chat-widget';
    chatWidget.style.cssText = `
        position: fixed;
        bottom: ${config.bottomOffset};
        right: ${config.rightOffset};
        width: ${config.chatWidth};
        height: ${config.chatHeight};
        background: white;
        border-radius: 16px;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
        z-index: 999999;
        display: none;
        flex-direction: column;
        overflow: hidden;
        transform-origin: bottom right;
        animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: scale(0.8) translateY(20px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }
        @keyframes slideOut {
            from {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
            to {
                opacity: 0;
                transform: scale(0.8) translateY(20px);
            }
        }
        @media (max-width: 768px) {
            #customgpt-widget-chat-widget {
                width: 100% !important;
                height: 100% !important;
                bottom: 0 !important;
                right: 0 !important;
                border-radius: 0 !important;
            }
        }
        .customgpt-widget-avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }
    `;
    document.head.appendChild(style);

    // Fetch agent settings and configure button
    async function loadAgentSettings() {
        try {
            const response = await fetch(`${config.apiUrl}/api/agent/settings`);
            const data = await response.json();

            const avatarUrl = data.chatbot_avatar;
            const title = data.chatbot_title || 'Voice Assistant';

            // Update button with avatar
            if (avatarUrl) {
                const img = document.createElement('img');
                img.src = avatarUrl;
                img.alt = 'Chat Assistant';
                img.className = 'customgpt-widget-avatar-img';
                img.onerror = () => {
                    // Hide button if avatar fails to load
                    console.error('Failed to load agent avatar');
                };
                button.innerHTML = '';
                button.appendChild(img);
            } else {
                // If no avatar, show a generic chat icon
                button.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22H17V20H12C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12V13.5C20 14.33 19.33 15 18.5 15C17.67 15 17 14.33 17 13.5V12C17 9.24 14.76 7 12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C13.38 17 14.64 16.44 15.54 15.53C16.19 16.42 17.31 17 18.5 17C20.43 17 22 15.43 22 13.5V12C22 6.48 17.52 2 12 2ZM12 15C10.34 15 9 13.66 9 12C9 10.34 10.34 9 12 9C13.66 9 15 10.34 15 12C15 13.66 13.66 15 12 15Z" fill="white"/></svg>';
            }

            // Update header title
            header.querySelector('span').textContent = title;

            // Show button now that it's configured
            button.style.display = 'flex';

        } catch (error) {
            console.error('Failed to load agent settings:', error);
            // Fallback to generic chat icon on error
            button.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22H17V20H12C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12V13.5C20 14.33 19.33 15 18.5 15C17.67 15 17 14.33 17 13.5V12C17 9.24 14.76 7 12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C13.38 17 14.64 16.44 15.54 15.53C16.19 16.42 17.31 17 18.5 17C20.43 17 22 15.43 22 13.5V12C22 6.48 17.52 2 12 2ZM12 15C10.34 15 9 13.66 9 12C9 10.34 10.34 9 12 9C13.66 9 15 10.34 15 12C15 13.66 13.66 15 12 15Z" fill="white"/></svg>';
            button.style.display = 'flex';
        }
    }

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(135deg, ${config.primaryColor}, #3b82f6);
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 600;
        font-size: 16px;
    `;
    header.innerHTML = `
        <span>Voice Assistant</span>
        <button id="customgpt-widget-close-btn" style="
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        ">✕</button>
    `;

    // Create iframe container
    const iframeContainer = document.createElement('div');
    iframeContainer.style.cssText = `
        flex: 1;
        position: relative;
        background: #f9fafb;
    `;

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = config.apiUrl;
    iframe.allow = 'microphone';
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        display: block;
    `;

    // Loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #6b7280;
        text-align: center;
    `;
    loadingDiv.innerHTML = `
        <div style="font-size: 14px; color: #9ca3af;">Loading...</div>
    `;

    iframeContainer.appendChild(loadingDiv);
    iframeContainer.appendChild(iframe);

    // Remove loading when iframe loads
    iframe.onload = () => {
        loadingDiv.style.display = 'none';
    };

    // Assemble chat widget
    chatWidget.appendChild(header);
    chatWidget.appendChild(iframeContainer);

    // Add to page
    document.body.appendChild(button);
    document.body.appendChild(chatWidget);

    // Track open state
    let isOpen = false;

    // Open chat widget
    function openChat() {
        chatWidget.style.display = 'flex';
        chatWidget.style.animation = 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        button.style.display = 'none';
        isOpen = true;
    }

    // Close chat widget
    function closeChat() {
        chatWidget.style.animation = 'slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            chatWidget.style.display = 'none';
            button.style.display = 'flex';
            isOpen = false;
        }, 300);
    }

    // Event listeners
    button.onclick = openChat;

    const closeBtn = header.querySelector('#customgpt-widget-close-btn');
    closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    closeBtn.onclick = closeChat;

    // Keyboard shortcut (ESC to close)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            closeChat();
        }
    });

    // Load agent settings and configure button
    loadAgentSettings();

    console.log('✅ CustomGPT Widget Floating Chat Widget loaded successfully');
})();

/**
 * Popup Script - Main UI Logic
 */

// State
let sessionId = null;
let conversationId = null;
let proxyUrl = CONFIG.VERCEL_PROXY_URL;

// DOM Elements
const messagesContainer = document.getElementById('messagesContainer');
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const refreshBtn = document.getElementById('refreshBtn');
const errorMessage = document.getElementById('errorMessage');
const welcomeScreen = document.getElementById('welcomeScreen');
const loadingScreen = document.getElementById('loadingScreen');
const chatWrapper = document.getElementById('chatWrapper');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] Initializing...');

  try {
    // Get session ID
    sessionId = await SessionManager.getSessionId();
    conversationId = await SessionManager.getConversationId();

    // Setup event listeners first (so UI is interactive)
    setupEventListeners();

    // Load conversation history (if exists) - do this before server check
    await loadConversationHistory();

    // Update UI state immediately
    updateUIState();

    // Hide loading screen and show chat wrapper
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (chatWrapper) chatWrapper.style.display = 'flex';

    // Fetch server capabilities in background (non-blocking)
    checkServerCapabilities().catch(err => {
      console.error('[Popup] Server capabilities check failed:', err);
      // Don't block UI if this fails
    });

    console.log('[Popup] Ready! Session:', sessionId);
  } catch (error) {
    console.error('[Popup] Initialization error:', error);

    // Hide loading screen even on error
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (chatWrapper) chatWrapper.style.display = 'flex';

    // Even if there's an error, ensure welcome screen is visible
    if (welcomeScreen) welcomeScreen.style.display = 'flex';
    if (messagesContainer) messagesContainer.classList.remove('show');
    setupEventListeners();
  }
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Send button
  if (sendBtn) {
    sendBtn.addEventListener('click', handleSendMessage);
  }

  // Text input - Enter to send
  if (textInput) {
    // Enable/disable send button based on input
    textInput.addEventListener('input', () => {
      const hasText = textInput.value.trim().length > 0;
      sendBtn.disabled = !hasText;
    });

    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Focus input on load if no history
    const hasMessages = messagesContainer && messagesContainer.querySelectorAll('.message').length > 0;
    if (!hasMessages) {
      setTimeout(() => textInput.focus(), 100);
    }
  }

  // Refresh button (new chat)
  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleNewChat);
  }

  // Note: Suggested question buttons are added dynamically in fetchAgentSettings()
}

/**
 * Update UI state (show welcome or messages)
 */
function updateUIState() {
  if (!messagesContainer || !welcomeScreen) {
    console.error('[Popup] Critical: DOM elements not found!');
    return;
  }

  const hasMessages = messagesContainer.querySelectorAll('.message').length > 0;

  console.log('[Popup] Updating UI state:', { hasMessages, messageCount: messagesContainer.querySelectorAll('.message').length });

  if (hasMessages) {
    // Show messages, hide welcome screen
    welcomeScreen.style.display = 'none';
    messagesContainer.style.display = 'block';
    messagesContainer.classList.add('show');
  } else {
    // Show welcome screen, hide messages
    welcomeScreen.style.display = 'flex';
    messagesContainer.style.display = 'none';
    messagesContainer.classList.remove('show');
  }
}

/**
 * Send message to AI
 */
async function handleSendMessage(messageText = null) {
  // Use provided message or get from input
  const message = messageText ? messageText.trim() : textInput.value.trim();

  if (!message) {
    return;
  }

  // Clear input only if using input value
  if (!messageText) {
    textInput.value = '';
    sendBtn.disabled = true;
  }

  // Hide welcome screen, show messages
  welcomeScreen.style.display = 'none';
  messagesContainer.classList.add('show');
  messagesContainer.style.display = 'block'; // Force display

  console.log('[Popup] Adding user message:', message);
  // Add user message to UI
  addMessage(message, 'user');
  console.log('[Popup] Message count:', messagesContainer.querySelectorAll('.message').length);

  // Disable input
  setInputEnabled(false);

  // Show typing indicator
  const typingIndicator = showTypingIndicator();

  try {
    // Send to background script
    const response = await chrome.runtime.sendMessage({
      action: 'sendMessage',
      data: {
        proxyUrl,
        sessionId,
        message,
        conversationId
      }
    });

    // Remove typing indicator
    typingIndicator.remove();

    if (!response.success) {
      throw new Error(response.error || 'Failed to send message');
    }

    // Add AI response with messageId and citations
    const aiMessage = response.data.message;
    const messageId = response.data.messageId;
    const citations = response.data.citations || [];

    addMessage(aiMessage, 'ai', messageId, citations);

    // Update conversation ID
    if (response.data.conversationId) {
      conversationId = response.data.conversationId;
      await SessionManager.setConversationId(conversationId);
    }

    // Save to history with messageId and citations
    await saveToHistory(message, aiMessage, messageId, citations);

  } catch (error) {
    console.error('[Popup] Send error:', error);
    typingIndicator.remove();
    showError(error.message || 'Failed to send message. Please try again.');
  } finally {
    setInputEnabled(true);
    textInput.focus();
  }
}

/**
 * Add message to UI with markdown support
 */
function addMessage(text, type, messageId = null, citations = []) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;

  // Store messageId and timestamp for AI messages
  if (type === 'ai' && messageId) {
    messageDiv.dataset.messageId = messageId;
  }

  // Store timestamp
  messageDiv.dataset.timestamp = Date.now();

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';

  // Use SVG icons instead of emojis
  if (type === 'user') {
    avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>`;
  } else {
    // AI avatar - use stored avatar or default icon
    const agentAvatar = sessionStorage.getItem('agent_avatar');
    if (agentAvatar && agentAvatar !== 'null') {
      avatar.innerHTML = `<img src="${agentAvatar}" alt="AI" />`;
    } else {
      avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
      </svg>`;
    }
  }

  const content = document.createElement('div');
  content.className = 'message-content';

  // Render markdown for AI messages, plain text for user messages
  if (type === 'ai' && typeof renderMarkdown === 'function') {
    content.innerHTML = renderMarkdown(text);
  } else {
    content.textContent = text;
  }

  // Add action buttons for AI messages
  if (type === 'ai') {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn copy-btn';
    copyBtn.title = 'Copy message';
    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>`;
    copyBtn.addEventListener('click', () => handleCopyMessage(text, copyBtn));
    actionsDiv.appendChild(copyBtn);

    // Reaction buttons (only if messageId exists)
    if (messageId) {
      const reactionsDiv = document.createElement('div');
      reactionsDiv.className = 'reaction-buttons';

      // Thumbs up
      const thumbsUpBtn = document.createElement('button');
      thumbsUpBtn.className = 'action-btn reaction-btn thumb-up';
      thumbsUpBtn.title = 'Good response';
      thumbsUpBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
      </svg>`;
      thumbsUpBtn.addEventListener('click', () => handleReaction(messageId, 'liked', thumbsUpBtn, thumbsDownBtn));
      reactionsDiv.appendChild(thumbsUpBtn);

      // Thumbs down
      const thumbsDownBtn = document.createElement('button');
      thumbsDownBtn.className = 'action-btn reaction-btn thumb-down';
      thumbsDownBtn.title = 'Bad response';
      thumbsDownBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
      </svg>`;
      thumbsDownBtn.addEventListener('click', () => handleReaction(messageId, 'disliked', thumbsUpBtn, thumbsDownBtn));
      reactionsDiv.appendChild(thumbsDownBtn);

      actionsDiv.appendChild(reactionsDiv);
    }

    content.appendChild(actionsDiv);
  }

  // Add citations if available
  if (type === 'ai' && citations && citations.length > 0) {
    // Filter out undefined/null citations
    const validCitations = citations.filter(id => id !== undefined && id !== null);

    if (validCitations.length > 0) {
      const citationsWrapper = document.createElement('div');
      citationsWrapper.className = 'citations-wrapper';

      // Citations header (clickable to toggle)
      const citationsHeader = document.createElement('div');
      citationsHeader.className = 'citations-header';
      citationsHeader.innerHTML = `
        <span class="citations-title">Sources (${validCitations.length})</span>
        <svg class="citations-toggle-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      `;

      // Citations content (collapsible)
      const citationsContent = document.createElement('div');
      citationsContent.className = 'citations-content';

      validCitations.forEach((citationId, index) => {
        // citationId is an integer, not an object
        const citationItem = document.createElement('div');
        citationItem.className = 'citation-item';
        citationItem.innerHTML = `
          <div class="citation-number">${index + 1}</div>
          <div class="citation-details">
            <div class="citation-loading">Loading citation...</div>
          </div>
        `;
        citationsContent.appendChild(citationItem);

        // Fetch citation details using the citation ID
        fetchCitationDetails(citationId, citationItem);
      });

      // Toggle functionality
      citationsHeader.addEventListener('click', () => {
        citationsWrapper.classList.toggle('expanded');
      });

      citationsWrapper.appendChild(citationsHeader);
      citationsWrapper.appendChild(citationsContent);
      content.appendChild(citationsWrapper);
    }
  }

  // Add timestamp
  const timestamp = document.createElement('span');
  timestamp.className = 'message-timestamp';
  timestamp.textContent = 'Just now';
  content.appendChild(timestamp);

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);

  messagesContainer.appendChild(messageDiv);

  // Smooth auto-scroll to bottom
  if (CONFIG.FEATURES.AUTO_SCROLL) {
    requestAnimationFrame(() => {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    });
  }

  // Update timestamps
  updateTimestamps();
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'message ai';
  indicator.id = 'typingIndicator';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';

  // Use agent avatar or default SVG icon
  const agentAvatar = sessionStorage.getItem('agent_avatar');
  if (agentAvatar && agentAvatar !== 'null') {
    avatar.innerHTML = `<img src="${agentAvatar}" alt="AI" />`;
  } else {
    avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>`;
  }

  const content = document.createElement('div');
  content.className = 'message-content';

  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

  content.appendChild(typingDiv);
  indicator.appendChild(avatar);
  indicator.appendChild(content);

  messagesContainer.appendChild(indicator);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return indicator;
}

/**
 * Show error message
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');

  setTimeout(() => {
    errorMessage.classList.remove('show');
  }, CONFIG.UI.ERROR_DISPLAY_DURATION);
}

/**
 * Enable/disable input
 */
function setInputEnabled(enabled) {
  textInput.disabled = !enabled;
  sendBtn.disabled = !enabled;
}

/**
 * Start new chat
 */
async function handleNewChat() {
  // Clear conversation ID
  await SessionManager.clearConversation();
  conversationId = null;

  // Clear UI
  messagesContainer.innerHTML = '';
  updateUIState();

  // Clear history
  await clearHistory();

  console.log('[Popup] Started new chat');
}

/**
 * Save conversation to local storage
 */
async function saveToHistory(userMessage, aiMessage, messageId = null, citations = []) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['conversation_history'], (result) => {
      const history = result.conversation_history || [];

      history.push({
        userMessage,
        aiMessage,
        messageId,
        citations,
        timestamp: Date.now()
      });

      // Keep only last 50 messages
      const trimmedHistory = history.slice(-50);

      chrome.storage.local.set({ conversation_history: trimmedHistory }, resolve);
    });
  });
}

/**
 * Load conversation history
 */
async function loadConversationHistory() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(['conversation_history'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('[Popup] Error loading history:', chrome.runtime.lastError);
          resolve(); // Resolve anyway to not block initialization
          return;
        }

        const history = result.conversation_history || [];

        if (history.length > 0) {
          if (welcomeScreen) welcomeScreen.style.display = 'none';
          if (messagesContainer) messagesContainer.classList.add('show');

          history.forEach(({ userMessage, aiMessage, messageId, citations }) => {
            if (userMessage) addMessage(userMessage, 'user');
            if (aiMessage) addMessage(aiMessage, 'ai', messageId || null, citations || []);
          });

          console.log('[Popup] Loaded', history.length, 'message pairs from history');
        } else {
          console.log('[Popup] No history found, showing welcome screen');
        }

        resolve();
      });
    } catch (error) {
      console.error('[Popup] Exception loading history:', error);
      resolve(); // Resolve anyway to not block initialization
    }
  });
}

/**
 * Clear conversation history
 */
async function clearHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ conversation_history: [] }, resolve);
  });
}

/**
 * Check server health and capabilities
 */
async function checkServerCapabilities() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'healthCheck',
      proxyUrl
    });

    if (response.success && response.data) {
      console.log('[Popup] Server is healthy');
    }

    // Fetch agent settings (avatar, name, etc.)
    await fetchAgentSettings();
  } catch (error) {
    console.error('[Popup] Failed to check capabilities:', error);
  }
}

/**
 * Fetch agent settings from server
 */
async function fetchAgentSettings() {
  try {
    console.log('[Popup] Fetching agent settings...');

    const response = await chrome.runtime.sendMessage({
      action: 'getAgentSettings',
      proxyUrl
    });

    if (response.success && response.data) {
      const { name, avatar, suggestedQuestions } = response.data;

      console.log('[Popup] Agent settings received:', { name, hasAvatar: !!avatar, questionsCount: suggestedQuestions.length });

      // Update agent name
      if (name) {
        sessionStorage.setItem('agent_name', name);

        const title = document.getElementById('title');
        const agentName = document.getElementById('agentName');

        if (title) {
          title.textContent = name;
        }
        if (agentName) {
          agentName.textContent = name;
        }
      }

      // Update avatar
      if (avatar) {
        sessionStorage.setItem('agent_avatar', avatar);

        const avatarEl = document.getElementById('avatar');
        if (avatarEl) {
          avatarEl.innerHTML = `<img src="${avatar}" alt="${name || 'AI Assistant'}" />`;
        }
      }

      // Update suggested questions
      if (suggestedQuestions && suggestedQuestions.length > 0) {
        const suggestedQuestionsContainer = document.getElementById('suggestedQuestions');

        if (suggestedQuestionsContainer) {
          // Clear existing questions
          const existingButtons = suggestedQuestionsContainer.querySelectorAll('.suggestion-btn');
          existingButtons.forEach(btn => btn.remove());

          // Add new questions
          suggestedQuestions.forEach(question => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.setAttribute('role', 'listitem');
            btn.setAttribute('type', 'button');
            btn.textContent = question;
            btn.addEventListener('click', async (e) => {
              // Disable button and show loading state
              btn.disabled = true;
              const originalText = btn.textContent;
              btn.innerHTML = '<span style="opacity: 0.6;">Sending...</span>';

              // Send message directly without populating input
              await handleSendMessage(originalText);

              // Re-enable button (if still exists)
              if (btn.isConnected) {
                btn.disabled = false;
                btn.textContent = originalText;
              }
            });
            suggestedQuestionsContainer.appendChild(btn);
          });

          console.log('[Popup] Updated suggested questions:', suggestedQuestions.length);
        }
      }
    }
  } catch (error) {
    console.error('[Popup] Failed to fetch agent settings:', error);
  }
}

/**
 * Handle copy message to clipboard
 */
async function handleCopyMessage(text, button) {
  try {
    // Remove markdown formatting for plain text copy
    const plainText = text.replace(/[*_~`#]/g, '');

    await navigator.clipboard.writeText(plainText);

    // Visual feedback
    const originalHTML = button.innerHTML;
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>`;
    button.classList.add('success');

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.classList.remove('success');
    }, 2000);

    console.log('[Popup] Message copied to clipboard');
  } catch (error) {
    console.error('[Popup] Failed to copy message:', error);
    showError('Failed to copy message');
  }
}

/**
 * Handle reaction (thumbs up/down)
 */
async function handleReaction(messageId, reaction, thumbsUpBtn, thumbsDownBtn) {
  try {
    console.log('[Popup] Submitting reaction:', { messageId, reaction });

    const response = await chrome.runtime.sendMessage({
      action: 'submitFeedback',
      data: {
        proxyUrl,
        sessionId,
        messageId,
        reaction
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to submit feedback');
    }

    // Visual feedback - highlight selected reaction
    if (reaction === 'liked') {
      thumbsUpBtn.classList.add('active');
      thumbsDownBtn.classList.remove('active');
    } else {
      thumbsDownBtn.classList.add('active');
      thumbsUpBtn.classList.remove('active');
    }

    console.log('[Popup] Reaction submitted successfully');
  } catch (error) {
    console.error('[Popup] Failed to submit reaction:', error);
    showError('Failed to submit feedback');
  }
}

/**
 * Fetch citation details
 */
async function fetchCitationDetails(citationId, citationElement) {
  try {
    // Validate citation ID
    if (!citationId || citationId === undefined || citationId === null) {
      console.error('[Popup] Invalid citation ID:', citationId);
      const citationDetails = citationElement.querySelector('.citation-details');
      citationDetails.innerHTML = `<div class="citation-error">Invalid citation ID</div>`;
      return;
    }

    console.log('[Popup] Fetching citation:', citationId);

    const response = await chrome.runtime.sendMessage({
      action: 'getCitation',
      data: {
        proxyUrl,
        citationId
      }
    });

    const citationDetails = citationElement.querySelector('.citation-details');

    if (response.success && response.data) {
      const { url, title, description, image } = response.data;

      citationDetails.innerHTML = `
        ${image ? `<img src="${image}" alt="${title}" class="citation-image" />` : ''}
        <div class="citation-text">
          <a href="${url}" target="_blank" class="citation-link">${title}</a>
          ${description ? `<p class="citation-description">${description}</p>` : ''}
        </div>
      `;

      console.log('[Popup] Citation loaded:', title);
    } else {
      citationDetails.innerHTML = `<div class="citation-error">Failed to load citation</div>`;
    }
  } catch (error) {
    console.error('[Popup] Failed to fetch citation:', error);
    const citationDetails = citationElement.querySelector('.citation-details');
    citationDetails.innerHTML = `<div class="citation-error">Error loading citation</div>`;
  }
}

/**
 * Update relative timestamps (e.g., "2m ago")
 */
function updateTimestamps() {
  const messages = document.querySelectorAll('.message');

  messages.forEach(msg => {
    const timestamp = msg.dataset.timestamp;
    if (!timestamp) return;

    const timestampSpan = msg.querySelector('.message-timestamp');
    if (!timestampSpan) return;

    const messageTime = parseInt(timestamp);
    const now = Date.now();
    const diff = now - messageTime;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let timeText = 'Just now';

    if (days > 0) {
      timeText = `${days}d ago`;
    } else if (hours > 0) {
      timeText = `${hours}h ago`;
    } else if (minutes > 0) {
      timeText = `${minutes}m ago`;
    } else if (seconds > 5) {
      timeText = `${seconds}s ago`;
    }

    timestampSpan.textContent = timeText;
  });
}

// Update timestamps every 10 seconds
setInterval(updateTimestamps, 10000);

/**
 * Background Service Worker
 * Handles API calls and background tasks
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Background] Extension installed');
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'healthCheck') {
    handleHealthCheck(request.proxyUrl)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'sendMessage') {
    handleSendMessage(request.data)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'getAgentSettings') {
    handleGetAgentSettings(request.proxyUrl)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'submitFeedback') {
    handleSubmitFeedback(request.data)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'getCitation') {
    handleGetCitation(request.data)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

/**
 * Health check for proxy server
 */
async function handleHealthCheck(proxyUrl) {
  try {
    const response = await fetch(`${proxyUrl}/api/health`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[Background] Health check failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send message to chat API
 */
async function handleSendMessage({ proxyUrl, sessionId, message, conversationId }) {
  try {
    console.log('[Background] Sending message:', message.substring(0, 50));

    const response = await fetch(`${proxyUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        message,
        conversationId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send message');
    }

    console.log('[Background] Response received');
    return { success: true, data };

  } catch (error) {
    console.error('[Background] Send message failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get agent settings (avatar, name, etc.)
 */
async function handleGetAgentSettings(proxyUrl) {
  try {
    console.log('[Background] Fetching agent settings from:', `${proxyUrl}/api/settings`);

    const response = await fetch(`${proxyUrl}/api/settings`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch agent settings');
    }

    console.log('[Background] Agent settings received:', data.data);
    return { success: true, data: data.data };
  } catch (error) {
    console.error('[Background] Get agent settings failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit feedback for a message
 */
async function handleSubmitFeedback({ proxyUrl, sessionId, messageId, reaction }) {
  try {
    console.log('[Background] Submitting feedback');

    const response = await fetch(`${proxyUrl}/api/feedback`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        messageId,
        reaction
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to submit feedback');
    }

    console.log('[Background] Feedback submitted');
    return { success: true, data: data.data };
  } catch (error) {
    console.error('[Background] Submit feedback failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get citation details
 */
async function handleGetCitation({ proxyUrl, citationId }) {
  try {
    console.log('[Background] Fetching citation:', citationId);

    const response = await fetch(`${proxyUrl}/api/citations?citationId=${citationId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch citation');
    }

    console.log('[Background] Citation received');
    return { success: true, data: data.data };
  } catch (error) {
    console.error('[Background] Get citation failed:', error);
    return { success: false, error: error.message };
  }
}


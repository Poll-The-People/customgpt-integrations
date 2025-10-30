/**
 * CustomGPT API Client
 * Handles all interactions with CustomGPT API
 */

const fetch = require('node-fetch');

const CUSTOMGPT_API_BASE = 'https://app.customgpt.ai/api/v1';

/**
 * Send a message to CustomGPT and get AI response
 * @param {string} message - User's message
 * @param {string} sessionId - Session identifier (UUID)
 * @param {string} conversationId - Optional conversation ID for history
 * @returns {Promise<Object>} Response with message and conversation ID
 */
async function sendMessage(message, sessionId, conversationId = null) {
  const apiKey = process.env.CUSTOMGPT_API_KEY;
  const projectId = process.env.CUSTOMGPT_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error('CustomGPT API credentials not configured');
  }

  try {
    // Correct API endpoint according to official docs
    // POST /api/v1/projects/{projectId}/conversations/{sessionId}/messages?stream=false&lang=en
    const url = `${CUSTOMGPT_API_BASE}/projects/${projectId}/conversations/${sessionId}/messages?stream=false&lang=en`;

    const body = {
      prompt: message,
      response_source: 'default'
    };

    console.log('[CustomGPT Client] Sending message:', {
      url,
      sessionId,
      messageLength: message.length
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CustomGPT API Error]', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`CustomGPT API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    console.log('[CustomGPT Client] Response received:', {
      status: data.status,
      hasData: !!data.data,
      conversationId: data.data?.conversation_id
    });

    return {
      message: data.data?.openai_response || data.data?.response || 'No response',
      conversationId: data.data?.conversation_id || conversationId,
      sessionId: sessionId,
      messageId: data.data?.id || null,
      citations: data.data?.citations || []
    };

  } catch (error) {
    console.error('[CustomGPT Client Error]', error);
    throw error;
  }
}

/**
 * Create a new conversation session
 * @param {string} sessionId - Session identifier
 * @returns {Promise<Object>} Conversation metadata
 */
async function createConversation(sessionId) {
  const apiKey = process.env.CUSTOMGPT_API_KEY;
  const projectId = process.env.CUSTOMGPT_PROJECT_ID;

  try {
    const url = `${CUSTOMGPT_API_BASE}/projects/${projectId}/conversations`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session_id: sessionId })
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status}`);
    }

    const data = await response.json();
    return {
      conversationId: data.data?.id,
      sessionId: sessionId
    };

  } catch (error) {
    console.error('[Create Conversation Error]', error);
    // Non-fatal: conversation will be created on first message
    return { sessionId };
  }
}

/**
 * Get agent details (name, etc.)
 * @returns {Promise<Object>} Agent details
 */
async function getAgentDetails() {
  const apiKey = process.env.CUSTOMGPT_API_KEY;
  const projectId = process.env.CUSTOMGPT_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error('CustomGPT API credentials not configured');
  }

  try {
    const url = `${CUSTOMGPT_API_BASE}/projects/${projectId}`;

    console.log('[CustomGPT Client] Fetching agent details');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CustomGPT API Error - Agent Details]', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`CustomGPT API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    console.log('[CustomGPT Client] Agent details received:', {
      status: data.status,
      projectName: data.data?.project_name
    });

    return data.data;

  } catch (error) {
    console.error('[CustomGPT Client Error - Agent Details]', error);
    throw error;
  }
}

/**
 * Get agent settings (avatar, suggested questions, etc.)
 * @returns {Promise<Object>} Agent settings
 */
async function getAgentSettings() {
  const apiKey = process.env.CUSTOMGPT_API_KEY;
  const projectId = process.env.CUSTOMGPT_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error('CustomGPT API credentials not configured');
  }

  try {
    const url = `${CUSTOMGPT_API_BASE}/projects/${projectId}/settings`;

    console.log('[CustomGPT Client] Fetching agent settings');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CustomGPT API Error - Agent Settings]', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`CustomGPT API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    console.log('[CustomGPT Client] Agent settings received:', {
      status: data.status,
      hasAvatar: !!data.data?.chatbot_avatar,
      questionsCount: data.data?.example_questions?.length || 0
    });

    return data.data;

  } catch (error) {
    console.error('[CustomGPT Client Error - Agent Settings]', error);
    throw error;
  }
}

/**
 * Submit feedback (like/dislike) for a message
 * @param {string} sessionId - Session identifier
 * @param {number} messageId - Message ID
 * @param {string} reaction - 'liked' or 'disliked'
 * @returns {Promise<Object>} Feedback response
 */
async function submitFeedback(sessionId, messageId, reaction) {
  const apiKey = process.env.CUSTOMGPT_API_KEY;
  const projectId = process.env.CUSTOMGPT_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error('CustomGPT API credentials not configured');
  }

  try {
    const url = `${CUSTOMGPT_API_BASE}/projects/${projectId}/conversations/${sessionId}/messages/${messageId}/feedback`;

    console.log('[CustomGPT Client] Submitting feedback:', { messageId, reaction });

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({ reaction })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CustomGPT API Error - Feedback]', {
        status: response.status,
        body: errorText
      });
      throw new Error(`CustomGPT API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[CustomGPT Client] Feedback submitted successfully');

    return { success: true, data: data.data };

  } catch (error) {
    console.error('[CustomGPT Client Error - Feedback]', error);
    throw error;
  }
}

/**
 * Get citation details by citation ID
 * @param {number} citationId - Citation ID
 * @returns {Promise<Object>} Citation details
 */
async function getCitation(citationId) {
  const apiKey = process.env.CUSTOMGPT_API_KEY;
  const projectId = process.env.CUSTOMGPT_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error('CustomGPT API credentials not configured');
  }

  try {
    const url = `${CUSTOMGPT_API_BASE}/projects/${projectId}/citations/${citationId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CustomGPT API Error - Citation]', {
        status: response.status,
        body: errorText
      });
      return null;
    }

    const data = await response.json();
    return data.data;

  } catch (error) {
    console.error('[CustomGPT Client Error - Citation]', error);
    return null;
  }
}

module.exports = {
  sendMessage,
  createConversation,
  getAgentDetails,
  getAgentSettings,
  submitFeedback,
  getCitation
};

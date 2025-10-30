/**
 * Chat API Endpoint
 * Handles text-based chat messages
 */

const { sendMessage } = require('../lib/customgpt-client');

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  try {
    const { sessionId, message, conversationId } = req.body;

    // Validate required fields
    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing sessionId',
        message: 'Session ID is required'
      });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Missing message',
        message: 'Message cannot be empty'
      });
    }

    // Send message to CustomGPT
    console.log(`[Chat] Session ${sessionId}: "${message.substring(0, 50)}..."`);

    const response = await sendMessage(message, sessionId, conversationId);

    // Return response
    return res.status(200).json({
      success: true,
      message: response.message,
      conversationId: response.conversationId,
      sessionId: response.sessionId,
      messageId: response.messageId,
      citations: response.citations
    });

  } catch (error) {
    console.error('[Chat API Error]', error);

    // Handle specific error types
    if (error.message.includes('CustomGPT API')) {
      return res.status(502).json({
        error: 'CustomGPT API error',
        message: 'Failed to get response from AI service'
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
};

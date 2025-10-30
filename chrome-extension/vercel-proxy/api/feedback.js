/**
 * Feedback API Endpoint
 * Handles message feedback (thumbs up/down)
 */

const { submitFeedback } = require('../lib/customgpt-client');

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept PUT requests
  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only PUT requests are accepted'
    });
  }

  try {
    const { sessionId, messageId, reaction } = req.body;

    // Validate required fields
    if (!sessionId || !messageId || !reaction) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'sessionId, messageId, and reaction are required'
      });
    }

    // Validate reaction value
    if (reaction !== 'liked' && reaction !== 'disliked') {
      return res.status(400).json({
        error: 'Invalid reaction',
        message: 'reaction must be "liked" or "disliked"'
      });
    }

    console.log(`[Feedback] Session ${sessionId}, Message ${messageId}: ${reaction}`);

    const response = await submitFeedback(sessionId, messageId, reaction);

    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('[Feedback API Error]', error);

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to submit feedback'
    });
  }
};

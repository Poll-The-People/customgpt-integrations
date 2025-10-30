/**
 * Settings API Endpoint
 * Fetches agent settings including name, avatar, and suggested questions
 */

const { getAgentSettings, getAgentDetails } = require('../lib/customgpt-client');

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  try {
    console.log('[Settings API] Fetching agent settings');

    // Fetch both agent details and settings in parallel
    const [agentDetails, agentSettings] = await Promise.all([
      getAgentDetails(),
      getAgentSettings()
    ]);

    // Combine the data
    const response = {
      success: true,
      data: {
        name: agentDetails.project_name || 'AI Assistant',
        avatar: agentSettings.chatbot_avatar || null,
        suggestedQuestions: agentSettings.example_questions || [],
        defaultPrompt: agentSettings.default_prompt || 'How can I help you?'
      }
    };

    console.log('[Settings API] Success:', {
      name: response.data.name,
      hasAvatar: !!response.data.avatar,
      questionsCount: response.data.suggestedQuestions.length
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('[Settings API Error]', error);

    // Handle specific error types
    if (error.message.includes('CustomGPT API')) {
      return res.status(502).json({
        error: 'CustomGPT API error',
        message: 'Failed to fetch agent settings'
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
};

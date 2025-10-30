/**
 * Health Check Endpoint
 * Verify proxy server is running and configured correctly
 */

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check environment variables
    const hasCustomGPTKey = !!process.env.CUSTOMGPT_API_KEY;
    const hasProjectId = !!process.env.CUSTOMGPT_PROJECT_ID;

    // CustomGPT is required for chat features
    const isConfigured = hasCustomGPTKey && hasProjectId;

    // Return health status
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      configured: isConfigured,
      config: {
        customgpt: {
          hasAPIKey: hasCustomGPTKey,
          hasProjectID: hasProjectId,
          configured: isConfigured
        }
      },
      features: {
        chat: isConfigured
      },
      endpoints: {
        chat: '/api/chat',
        health: '/api/health',
        settings: '/api/settings'
      }
    });

  } catch (error) {
    console.error('[Health Check Error]', error);

    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
};

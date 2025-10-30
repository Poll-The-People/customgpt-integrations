/**
 * Citations API Endpoint
 * Retrieves citation details by ID
 */

const { getCitation } = require('../lib/customgpt-client');

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
    const { citationId } = req.query;

    // Validate required fields
    if (!citationId) {
      return res.status(400).json({
        error: 'Missing citationId',
        message: 'citationId query parameter is required'
      });
    }

    console.log(`[Citations] Fetching citation ${citationId}`);

    const citation = await getCitation(citationId);

    if (!citation) {
      return res.status(404).json({
        error: 'Citation not found',
        message: `Citation with ID ${citationId} not found`
      });
    }

    return res.status(200).json({
      success: true,
      data: citation
    });

  } catch (error) {
    console.error('[Citations API Error]', error);

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch citation'
    });
  }
};

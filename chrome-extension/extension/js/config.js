/**
 * Configuration File for Chrome Extension
 *
 * ADMIN CONFIGURATION - White Label Setup
 * ========================================
 *
 * Before deploying your extension:
 * 1. Deploy vercel-proxy/ to Vercel with your CustomGPT API keys
 * 2. Update VERCEL_PROXY_URL below with your Vercel deployment URL
 * 3. Optionally customize branding
 * 4. Build extension and publish to Chrome Web Store
 *
 * Your end users will NOT need to configure anything!
 */

const CONFIG = {
  // ===========================================
  // REQUIRED: Your Vercel Proxy URL
  // ===========================================
  // For local testing: 'http://localhost:3000'
  // For production: 'https://your-proxy.vercel.app'
  VERCEL_PROXY_URL: 'http://localhost:3000',

  // ===========================================
  // OPTIONAL: Branding Customization
  // ===========================================
  EXTENSION_NAME: 'CustomGPT Assistant',
  EXTENSION_TAGLINE: 'Your AI-powered assistant',

  // ===========================================
  // API Endpoints (auto-configured)
  // ===========================================
  ENDPOINTS: {
    CHAT: '/api/chat',
    HEALTH: '/api/health',
    SETTINGS: '/api/settings',
    FEEDBACK: '/api/feedback',
    CITATIONS: '/api/citations'
  },

  // ===========================================
  // Feature Flags
  // ===========================================
  FEATURES: {
    AUTO_SCROLL: true
  },

  // ===========================================
  // UI Settings
  // ===========================================
  UI: {
    MAX_MESSAGE_LENGTH: 2000,
    TYPING_INDICATOR_DELAY: 300, // ms
    ERROR_DISPLAY_DURATION: 5000 // ms
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

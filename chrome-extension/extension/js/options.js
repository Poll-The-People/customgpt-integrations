/**
 * Options Page Script
 */

// DOM Elements
const proxyUrlInput = document.getElementById('proxyUrl');
const sessionIdInput = document.getElementById('sessionId');
const testConnectionBtn = document.getElementById('testConnectionBtn');
const resetSessionBtn = document.getElementById('resetSessionBtn');
const connectionStatus = document.getElementById('connectionStatus');
const statusBox = document.getElementById('statusBox');
const statusTitle = document.getElementById('statusTitle');
const statusText = document.getElementById('statusText');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load configuration
  proxyUrlInput.value = CONFIG.VERCEL_PROXY_URL;

  // Load session ID
  const sessionId = await SessionManager.getSessionId();
  sessionIdInput.value = sessionId;

  // Setup event listeners
  testConnectionBtn.addEventListener('click', handleTestConnection);
  resetSessionBtn.addEventListener('click', handleResetSession);

  // Auto-test connection on load
  await handleTestConnection();
});

/**
 * Test connection to proxy server
 */
async function handleTestConnection() {
  testConnectionBtn.disabled = true;
  testConnectionBtn.textContent = 'Testing...';
  connectionStatus.textContent = 'Testing...';
  connectionStatus.className = 'status-badge';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'healthCheck',
      proxyUrl: CONFIG.VERCEL_PROXY_URL
    });

    if (response.success && response.data.status === 'ok') {
      // Success
      connectionStatus.textContent = 'Connected';
      connectionStatus.className = 'status-badge connected';

      showStatus(
        'success',
        '✅ Connection Successful',
        `Successfully connected to proxy server. Configuration is valid.`
      );

      // Show additional info if available
      if (response.data.configured === false) {
        showStatus(
          'error',
          '⚠️ Server Not Configured',
          'The proxy server is running but missing CustomGPT API credentials. Contact your administrator.'
        );
      }

    } else {
      throw new Error(response.error || 'Connection failed');
    }

  } catch (error) {
    console.error('[Options] Connection test failed:', error);

    connectionStatus.textContent = 'Disconnected';
    connectionStatus.className = 'status-badge disconnected';

    showStatus(
      'error',
      '❌ Connection Failed',
      `Could not connect to proxy server: ${error.message}. Please verify the URL in config.js is correct.`
    );

  } finally {
    testConnectionBtn.disabled = false;
    testConnectionBtn.textContent = 'Test Connection';
  }
}

/**
 * Reset session (generates new UUID)
 */
async function handleResetSession() {
  if (!confirm('Reset your session? This will:\n\n• Generate a new session ID\n• Clear conversation history\n\nContinue?')) {
    return;
  }

  resetSessionBtn.disabled = true;
  resetSessionBtn.textContent = 'Resetting...';

  try {
    // Reset session
    const newSessionId = await SessionManager.resetSession();

    // Update display
    sessionIdInput.value = newSessionId;

    // Clear conversation history
    await chrome.storage.local.set({ conversation_history: [] });

    showStatus(
      'success',
      '✅ Session Reset',
      `New session ID: ${newSessionId.substring(0, 8)}...`
    );

  } catch (error) {
    console.error('[Options] Session reset failed:', error);

    showStatus(
      'error',
      '❌ Reset Failed',
      `Failed to reset session: ${error.message}`
    );

  } finally {
    resetSessionBtn.disabled = false;
    resetSessionBtn.textContent = 'Reset Session';
  }
}

/**
 * Show status message
 */
function showStatus(type, title, text) {
  statusBox.className = `info-box ${type}`;
  statusTitle.textContent = title;
  statusText.textContent = text;
  statusBox.style.display = 'block';

  // Auto-hide success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusBox.style.display = 'none';
    }, 5000);
  }
}

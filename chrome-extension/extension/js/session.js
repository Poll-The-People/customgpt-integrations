/**
 * Session Management
 * Handles UUID-based anonymous sessions
 */

const SessionManager = {
  SESSION_KEY: 'customgpt_session_id',
  CONVERSATION_KEY: 'customgpt_conversation_id',

  /**
   * Generate a new UUID v4
   * @returns {string} UUID
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * Get or create session ID
   * @returns {Promise<string>} Session ID
   */
  async getSessionId() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.SESSION_KEY], (result) => {
        if (result[this.SESSION_KEY]) {
          resolve(result[this.SESSION_KEY]);
        } else {
          const newSessionId = this.generateUUID();
          chrome.storage.local.set({ [this.SESSION_KEY]: newSessionId }, () => {
            console.log('[Session] Created new session:', newSessionId);
            resolve(newSessionId);
          });
        }
      });
    });
  },

  /**
   * Get current conversation ID
   * @returns {Promise<string|null>} Conversation ID or null
   */
  async getConversationId() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.CONVERSATION_KEY], (result) => {
        resolve(result[this.CONVERSATION_KEY] || null);
      });
    });
  },

  /**
   * Set conversation ID
   * @param {string} conversationId - Conversation ID from CustomGPT
   */
  async setConversationId(conversationId) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.CONVERSATION_KEY]: conversationId }, () => {
        console.log('[Session] Updated conversation ID:', conversationId);
        resolve();
      });
    });
  },

  /**
   * Clear conversation (start new chat)
   */
  async clearConversation() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([this.CONVERSATION_KEY], () => {
        console.log('[Session] Cleared conversation');
        resolve();
      });
    });
  },

  /**
   * Reset session (creates new UUID)
   */
  async resetSession() {
    return new Promise((resolve) => {
      const newSessionId = this.generateUUID();
      chrome.storage.local.set({
        [this.SESSION_KEY]: newSessionId,
        [this.CONVERSATION_KEY]: null
      }, () => {
        console.log('[Session] Reset session to:', newSessionId);
        resolve(newSessionId);
      });
    });
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionManager;
}

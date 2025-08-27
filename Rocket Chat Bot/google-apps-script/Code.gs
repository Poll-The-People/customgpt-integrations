/**
 * Rocket Chat CustomGPT Bot - Google Apps Script Implementation
 * Webhook-based bot that responds to Rocket Chat messages
 */

// Configuration - Set these in Script Properties
const CONFIG = {
  CUSTOMGPT_API_KEY: PropertiesService.getScriptProperties().getProperty('CUSTOMGPT_API_KEY'),
  CUSTOMGPT_PROJECT_ID: PropertiesService.getScriptProperties().getProperty('CUSTOMGPT_PROJECT_ID'),
  CUSTOMGPT_BASE_URL: PropertiesService.getScriptProperties().getProperty('CUSTOMGPT_BASE_URL') || 'https://app.customgpt.ai',
  ROCKET_CHAT_URL: PropertiesService.getScriptProperties().getProperty('ROCKET_CHAT_URL'),
  ROCKET_CHAT_USER_ID: PropertiesService.getScriptProperties().getProperty('ROCKET_CHAT_USER_ID'),
  ROCKET_CHAT_AUTH_TOKEN: PropertiesService.getScriptProperties().getProperty('ROCKET_CHAT_AUTH_TOKEN'),
  WEBHOOK_TOKEN: PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN') || 'your-secret-token',
  RATE_LIMIT_PER_USER: 5,
  RATE_LIMIT_WINDOW: 60, // seconds
  MAX_MESSAGE_LENGTH: 2000
};

// Rate limiting storage using Script Properties
class RateLimiter {
  static checkLimit(userId) {
    const now = new Date().getTime();
    const windowStart = now - (CONFIG.RATE_LIMIT_WINDOW * 1000);
    const key = `rate_${userId}`;
    
    try {
      const userDataStr = PropertiesService.getScriptProperties().getProperty(key);
      const userData = userDataStr ? JSON.parse(userDataStr) : { requests: [] };
      
      // Clean old requests
      userData.requests = userData.requests.filter(timestamp => timestamp > windowStart);
      
      if (userData.requests.length >= CONFIG.RATE_LIMIT_PER_USER) {
        return { allowed: false, remaining: 0 };
      }
      
      // Add current request
      userData.requests.push(now);
      PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(userData));
      
      return { allowed: true, remaining: CONFIG.RATE_LIMIT_PER_USER - userData.requests.length };
    } catch (e) {
      console.error('Rate limiter error:', e);
      return { allowed: true, remaining: CONFIG.RATE_LIMIT_PER_USER };
    }
  }
}

// CustomGPT API Client
class CustomGPTClient {
  static sendMessage(message, sessionId = null) {
    const endpoint = `${CONFIG.CUSTOMGPT_BASE_URL}/api/v1/projects/${CONFIG.CUSTOMGPT_PROJECT_ID}/chat/completions`;
    
    const payload = {
      messages: [{ role: 'user', content: message }],
      stream: false,
      lang: 'en',
      is_inline_citation: true
    };
    
    if (sessionId) {
      payload.session_id = sessionId;
    }
    
    const options = {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${CONFIG.CUSTOMGPT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    try {
      const response = UrlFetchApp.fetch(endpoint, options);
      const responseData = JSON.parse(response.getContentText());
      
      if (response.getResponseCode() === 200 && responseData.choices && responseData.choices.length > 0) {
        return {
          success: true,
          content: responseData.choices[0].message.content,
          citations: responseData.citations || [],
          messageId: responseData.id
        };
      } else {
        return {
          success: false,
          error: responseData.error || 'Unknown error'
        };
      }
    } catch (e) {
      console.error('CustomGPT API error:', e);
      return {
        success: false,
        error: e.toString()
      };
    }
  }
}

// Rocket Chat API Client
class RocketChatClient {
  static sendMessage(roomId, text, threadId = null) {
    const endpoint = `${CONFIG.ROCKET_CHAT_URL}/api/v1/chat.postMessage`;
    
    const payload = {
      roomId: roomId,
      text: text
    };
    
    if (threadId) {
      payload.tmid = threadId;
    }
    
    const options = {
      method: 'post',
      headers: {
        'X-Auth-Token': CONFIG.ROCKET_CHAT_AUTH_TOKEN,
        'X-User-Id': CONFIG.ROCKET_CHAT_USER_ID,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    try {
      const response = UrlFetchApp.fetch(endpoint, options);
      return response.getResponseCode() === 200;
    } catch (e) {
      console.error('Rocket Chat API error:', e);
      return false;
    }
  }
}

// Message formatter
class MessageFormatter {
  static formatResponse(content, citations = []) {
    let formatted = content;
    
    if (citations && citations.length > 0) {
      formatted += '\n\n**Sources:**';
      citations.forEach((citation, index) => {
        const title = citation.title || 'Source';
        const url = citation.url || '';
        formatted += `\n${index + 1}. ${url ? `[${title}](${url})` : title}`;
      });
    }
    
    return this.truncateMessage(formatted);
  }
  
  static formatError(error) {
    return `❌ **Error:** ${error}`;
  }
  
  static truncateMessage(message) {
    if (message.length <= CONFIG.MAX_MESSAGE_LENGTH) {
      return message;
    }
    return message.substring(0, CONFIG.MAX_MESSAGE_LENGTH - 50) + '\n\n... *(Message truncated)*';
  }
  
  static getStarterQuestions() {
    return [
      "What can you help me with?",
      "Tell me about your capabilities",
      "How do I get started?",
      "What kind of questions can I ask?",
      "Show me some examples"
    ];
  }
  
  static formatStarterQuestions() {
    const questions = this.getStarterQuestions();
    let message = "**Here are some questions to get you started:**\n\n";
    questions.forEach((q, i) => {
      message += `${i + 1}. ${q}\n`;
    });
    return message;
  }
  
  static formatHelp() {
    return `**CustomGPT Bot - Help**

**Available Commands:**
• \`help\` - Show this help message
• \`start\` - Show starter questions
• \`quota\` - Check your remaining quota

**How to use:**
Simply type your question and I'll respond with information from the CustomGPT knowledge base.

**Features:**
✅ AI-powered responses
✅ Source citations
✅ Rate limiting for fair usage
✅ Thread support`;
  }
}

// Main webhook handler
function doPost(e) {
  try {
    // Verify webhook token
    const token = e.parameter.token;
    if (token !== CONFIG.WEBHOOK_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid token' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Parse webhook data
    const data = JSON.parse(e.postData.contents);
    
    // Skip if bot's own message
    if (data.user_id === CONFIG.ROCKET_CHAT_USER_ID) {
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const message = data.text || '';
    const roomId = data.channel_id;
    const userId = data.user_id;
    const threadId = data.thread_id;
    
    // Extract clean message text (remove bot mentions)
    let cleanMessage = message.replace(/@[^\s]+/g, '').trim();
    
    // Handle commands
    const command = cleanMessage.toLowerCase();
    let response;
    
    switch (command) {
      case 'help':
        response = MessageFormatter.formatHelp();
        break;
        
      case 'start':
        response = MessageFormatter.formatStarterQuestions();
        break;
        
      case 'quota':
        const rateLimit = RateLimiter.checkLimit(userId);
        response = `**📊 Your Quota**\n\nRemaining requests: ${rateLimit.remaining}/${CONFIG.RATE_LIMIT_PER_USER} (resets every ${CONFIG.RATE_LIMIT_WINDOW} seconds)`;
        break;
        
      default:
        // Check rate limit
        const limit = RateLimiter.checkLimit(userId);
        if (!limit.allowed) {
          response = MessageFormatter.formatError(`Rate limit exceeded. Please try again in ${CONFIG.RATE_LIMIT_WINDOW} seconds.`);
        } else {
          // Process with CustomGPT
          const customgptResponse = CustomGPTClient.sendMessage(cleanMessage);
          
          if (customgptResponse.success) {
            response = MessageFormatter.formatResponse(
              customgptResponse.content,
              customgptResponse.citations
            );
          } else {
            response = MessageFormatter.formatError(customgptResponse.error);
          }
        }
    }
    
    // Send response back to Rocket Chat
    RocketChatClient.sendMessage(roomId, response, threadId);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Webhook error:', error);
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Setup function to configure properties
function setup() {
  const properties = {
    'CUSTOMGPT_API_KEY': 'your-api-key',
    'CUSTOMGPT_PROJECT_ID': 'your-project-id',
    'ROCKET_CHAT_URL': 'https://your-rocketchat.com',
    'ROCKET_CHAT_USER_ID': 'bot-user-id',
    'ROCKET_CHAT_AUTH_TOKEN': 'bot-auth-token',
    'WEBHOOK_TOKEN': 'your-secret-webhook-token'
  };
  
  PropertiesService.getScriptProperties().setProperties(properties);
  
  // Get the webhook URL
  const url = ScriptApp.getService().getUrl();
  console.log('Webhook URL:', url);
  console.log('Add this URL to your Rocket Chat outgoing webhook configuration');
}

// Test function
function testBot() {
  const testMessage = CustomGPTClient.sendMessage('Hello, what can you do?');
  console.log('Test response:', testMessage);
}
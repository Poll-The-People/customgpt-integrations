# Facebook Messenger Bot with CustomGPT Integration

A Facebook Messenger bot that uses CustomGPT's RAG API to answer questions from your agent's knowledge base.

Get your [CustomGPT.ai RAG API key here](https://app.customgpt.ai/register?utm_source=github_integrations), needed to use this integration.

## Features

- Responds using CustomGPT agent knowledge
- Multiple deployment options (Vercel, Google Apps Script, Replit, Glitch)
- Built-in rate limiting and security
- Starter questions and typing indicators
- Conversation management
- Secure webhook verification
- Rich media responses support
- Multi-language support
- Analytics and monitoring capabilities

## Prerequisites

1. Facebook Page and App
2. CustomGPT API key and Agent ID
3. Node.js 16+ (for local development)

---

## Quick Start (15 minutes)

### Option 1: Google Apps Script (Simplest, Free Forever)

1. **Copy Script**
   - Open [script.google.com](https://script.google.com)
   - Create new project
   - Copy code from `google-apps-script/Code.gs`

2. **Add Credentials**
   - Project Settings > Script Properties
   - Add your keys:
     - `FB_VERIFY_TOKEN`: random-string-123
     - `FB_PAGE_ACCESS_TOKEN`: (from Facebook)
     - `CUSTOMGPT_API_KEY`: (from CustomGPT)
     - `CUSTOMGPT_PROJECT_ID`: (your agent ID)

3. **Deploy**
   - Deploy > New deployment > Web app
   - Execute as: Me, Access: Anyone
   - Copy URL

4. **Connect Facebook**
   - Facebook App > Messenger > Webhooks
   - URL: Your Apps Script URL
   - Verify Token: random-string-123
   - Subscribe to: messages, messaging_postbacks

Done! Message your Facebook page.

### Option 2: Vercel (Modern, Scalable)

1. **Click Deploy**

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/customgpt-fb-messenger)

2. **Add Environment Variables**
   ```
   FB_VERIFY_TOKEN=random-string-123
   FB_PAGE_ACCESS_TOKEN=your-token
   FB_APP_SECRET=your-secret
   CUSTOMGPT_API_KEY=your-key
   CUSTOMGPT_AGENT_ID=your-id
   ```

3. **Connect Facebook**
   - Webhook URL: `https://your-app.vercel.app/webhook`
   - Verify Token: random-string-123

Done! Test your bot.

---

## Detailed Setup Guide

### 1. Facebook App Setup

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create a new app (Business type)
3. Add Messenger product
4. Generate Page Access Token
5. Subscribe to webhook events: `messages`, `messaging_postbacks`

### 2. CustomGPT Setup

1. Get your API key from [CustomGPT](https://app.customgpt.ai/register?utm_source=github_integrations)
2. Note your Agent ID (project ID)

### 3. Environment Variables

```env
# Facebook
FB_VERIFY_TOKEN=your-random-verify-token
FB_PAGE_ACCESS_TOKEN=your-page-access-token
FB_APP_SECRET=your-app-secret

# CustomGPT
CUSTOMGPT_API_KEY=your-api-key
CUSTOMGPT_AGENT_ID=your-agent-id

# Security
RATE_LIMIT_REQUESTS=20
RATE_LIMIT_WINDOW_MS=60000
```

---

## Deployment Options

### Vercel (Recommended - Free)

**Features:**
- Free tier: 100GB bandwidth/month
- Automatic HTTPS
- Global CDN (18+ regions)
- Serverless functions
- Zero configuration
- GitHub integration

**Setup:**

#### Option A: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/customgpt-fb-messenger&env=FB_VERIFY_TOKEN,FB_PAGE_ACCESS_TOKEN,FB_APP_SECRET,CUSTOMGPT_API_KEY,CUSTOMGPT_AGENT_ID)

#### Option B: Manual Deploy
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables
5. Click "Deploy"

#### Option C: CLI Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add FB_VERIFY_TOKEN production
vercel env add FB_PAGE_ACCESS_TOKEN production
vercel env add FB_APP_SECRET production
vercel env add CUSTOMGPT_API_KEY production
vercel env add CUSTOMGPT_AGENT_ID production

# Redeploy with env vars
vercel --prod
```

**Configure Facebook Webhook:**
1. Copy your Vercel URL: `https://your-app.vercel.app`
2. In Facebook App Dashboard:
   - Webhook URL: `https://your-app.vercel.app/webhook`
   - Verify Token: Your `FB_VERIFY_TOKEN`
   - Subscribe to: `messages`, `messaging_postbacks`

**Monitoring:**
- Vercel Dashboard: View function logs
- Analytics: Built-in performance metrics
- Alerts: Set up error notifications

**Scaling:**
- Concurrent executions: 1000 (free tier)
- Function duration: 10 seconds
- Memory: 1024 MB

**Custom Domain (Optional):**
1. Add domain in Vercel dashboard
2. Update Facebook webhook URL
3. Vercel handles SSL automatically

### Google Apps Script (Free Forever)

**Features:**
- Free hosting
- No server management
- Built-in HTTPS
- Auto-scaling
- Easy updates

**Setup:**
1. Go to [script.google.com](https://script.google.com)
2. Create new project
3. Copy code from `google-apps-script/Code.gs`
4. Project Settings > Script Properties > Add credentials
5. Deploy > New deployment > Web app
6. Execute as: Me, Access: Anyone
7. Copy Web app URL

**Limitations:**
- 6 minute execution time limit
- 20MB response size limit
- Limited concurrent executions
- No websockets

### Alternative Deployment Options

#### Render (Limited Free Tier)

**Features:**
- Free for 750 hours/month
- Automatic HTTPS
- GitHub auto-deploy

**Setup:**
1. Create account at [render.com](https://render.com)
2. New Web Service
3. Connect GitHub repo
4. Configure:
   - Build Command: `npm install`
   - Start Command: `node index.js`
5. Add environment variables
6. Deploy

**Limitations:**
- Spins down after 15 min inactivity
- Cold starts can be slow

#### Glitch (Development/Testing)

**Features:**
- Instant deployment
- Browser-based editor
- Free with limitations

**Setup:**
1. Go to [glitch.com](https://glitch.com)
2. New Project > Import from GitHub
3. Add `.env` file with credentials
4. Your URL: `https://your-project.glitch.me`

**Keep Alive:**
```javascript
const http = require('http');
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000); // Ping every 4.5 minutes
```

**Limitations:**
- Sleeps after 5 minutes
- Not suitable for production
- Rate limits on requests

#### Replit (Free with Limitations)

**Features:**
- Browser IDE
- Instant deployment
- Free tier available

**Setup:**
1. Create account at [replit.com](https://replit.com)
2. Import from GitHub
3. Add secrets (environment variables)
4. Run the repl
5. Keep alive with UptimeRobot

**Limitations:**
- Limited compute resources
- Requires external monitoring
- Can be unreliable

#### Fly.io (Minimal Free Tier)

**Features:**
- Global deployment
- Good performance
- Docker-based

**Setup:**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly secrets set FB_VERIFY_TOKEN=xxx
fly secrets set FB_PAGE_ACCESS_TOKEN=xxx
fly deploy
```

**Limitations:**
- Requires credit card
- Limited free resources
- More complex setup

#### Self-Hosting Options

**VPS (DigitalOcean, Linode, Vultr):**
- $5-10/month
- Full control
- Requires management

**Raspberry Pi:**
- One-time hardware cost
- Home hosting
- Requires static IP/DDNS

**Oracle Cloud Free Tier:**
- Always free tier
- 2 VMs with 1GB RAM
- Complex setup

### Deployment Recommendation Summary

| Platform               | Best For       | Cost  | Reliability |
| ---------------------- | -------------- | ----- | ----------- |
| **Vercel**             | Production     | Free  | Excellent   |
| **Google Apps Script** | Simple bots    | Free  | Good        |
| Render                 | Small projects | Free* | Good        |
| Glitch                 | Development    | Free  | Poor        |
| Replit                 | Learning       | Free  | Poor        |
| VPS                    | Full control   | $5+   | Excellent   |

*Free tier limitations apply

**Choosing the Right Platform:**

**For Production:**
- **Vercel**: Best free option
- **Google Apps Script**: Simple, reliable
- **Paid VPS**: Most control

**For Development/Testing:**
- **Glitch**: Quick prototypes
- **Replit**: Learning/teaching
- **Local ngrok**: Development

**For Scale:**
- **Vercel Pro**: $20/month
- **AWS/GCP/Azure**: Enterprise
- **Dedicated servers**: High volume

---

## Usage

### Basic Chat

Users can message your Facebook page and receive responses from your CustomGPT agent.

### Starter Questions

Type "help" or click "Get Started" to see starter questions.

### Commands

- `help` - Show starter questions
- `reset` - Start new conversation
- `about` - Bot information
- `examples` - Show example queries

---

## Configuration

### Rate Limiting

Adjust in environment variables:
- `RATE_LIMIT_REQUESTS`: Max requests per window (default: 20)
- `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds (default: 60000)

### Customize Responses

Edit `config.js` to modify:
- Welcome message
- Starter questions
- Error messages
- Typing delay

### Input Validation

```javascript
function validateInput(text) {
  // Length check
  if (text.length > 1000) {
    return { valid: false, reason: "Message too long" };
  }

  // Blocked patterns
  const blockedPatterns = [
    /\b(password|token|secret|key)\b/i,
    /<script/i,
    /DROP TABLE/i,
    /\.\.\//g
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(text)) {
      return { valid: false, reason: "Invalid content" };
    }
  }

  return { valid: true };
}
```

### User Whitelisting

```javascript
const ALLOWED_USERS = process.env.ALLOWED_USERS?.split(',') || [];
const BLOCKED_USERS = process.env.BLOCKED_USERS?.split(',') || [];

function isUserAllowed(userId) {
  if (BLOCKED_USERS.includes(userId)) return false;
  if (ALLOWED_USERS.length > 0) {
    return ALLOWED_USERS.includes(userId);
  }
  return true;
}
```

---

## Enhanced Features

### Dynamic Starter Questions from CustomGPT

Fetch starter questions from your agent settings:

```javascript
async function getStarterQuestions() {
  try {
    const response = await axios.get(
      `${config.CUSTOMGPT_API_URL}/projects/${config.CUSTOMGPT_AGENT_ID}/settings`,
      {
        headers: {
          'Authorization': `Bearer ${config.CUSTOMGPT_API_KEY}`
        }
      }
    );

    const settings = response.data.data;
    return settings.example_questions || defaultQuestions;
  } catch (error) {
    console.error('Failed to fetch starter questions');
    return defaultQuestions;
  }
}
```

### Persistent Menu

Configure in Facebook App Dashboard or via API:

```javascript
async function setPersistentMenu() {
  const menu = {
    persistent_menu: [{
      locale: "default",
      composer_input_disabled: false,
      call_to_actions: [
        {
          title: "Get Started",
          type: "postback",
          payload: "GET_STARTED"
        },
        {
          title: "Help",
          type: "postback",
          payload: "HELP"
        },
        {
          title: "Examples",
          type: "postback",
          payload: "EXAMPLES"
        }
      ]
    }]
  };

  // POST to Facebook API
}
```

### Rich Responses

#### Cards and Carousels

```javascript
async function sendProductCarousel(recipientId, products) {
  const elements = products.map(product => ({
    title: product.name,
    subtitle: product.description,
    image_url: product.image,
    buttons: [{
      type: "postback",
      title: "Learn More",
      payload: `PRODUCT_${product.id}`
    }]
  }));

  const messageData = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: elements
        }
      }
    }
  };

  await callSendAPI(messageData);
}
```

#### Media Responses

```javascript
async function sendImage(recipientId, imageUrl) {
  const messageData = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: imageUrl,
          is_reusable: true
        }
      }
    }
  };

  await callSendAPI(messageData);
}
```

### Multi-language Support

```javascript
async function detectLanguage(text) {
  // Use a language detection service or library
  return 'en';
}

async function respondInLanguage(userId, response, language) {
  const translations = {
    'es': {
      'sources': 'Fuentes',
      'help': 'Ayuda',
      'examples': 'Ejemplos'
    },
    'fr': {
      'sources': 'Sources',
      'help': 'Aide',
      'examples': 'Exemples'
    }
  };

  // Apply translations
  if (translations[language]) {
    // Translate UI elements
  }

  return response;
}
```

---

### Enhanced Rate Limiting

```javascript
class RateLimiter {
  constructor() {
    this.limits = new Map();
  }

  check(userId, limits = {
    minute: 5,
    hour: 50,
    day: 100
  }) {
    const now = Date.now();
    const userLimits = this.limits.get(userId) || {
      minute: { count: 0, reset: now + 60000 },
      hour: { count: 0, reset: now + 3600000 },
      day: { count: 0, reset: now + 86400000 }
    };

    // Check and update each limit
    for (const [period, limit] of Object.entries(limits)) {
      const periodData = userLimits[period];

      if (now > periodData.reset) {
        periodData.count = 1;
        periodData.reset = now + (period === 'minute' ? 60000 :
                                 period === 'hour' ? 3600000 : 86400000);
      } else {
        periodData.count++;
        if (periodData.count > limit) {
          return { allowed: false, period, resetIn: periodData.reset - now };
        }
      }
    }

    this.limits.set(userId, userLimits);
    return { allowed: true };
  }
}
```

---

## Analytics and Monitoring

### User Analytics

```javascript
class Analytics {
  constructor() {
    this.events = [];
  }

  track(userId, event, properties = {}) {
    this.events.push({
      userId,
      event,
      properties,
      timestamp: new Date().toISOString()
    });

    // Send to analytics service
    if (this.events.length >= 10) {
      this.flush();
    }
  }

  async flush() {
    // Send to Google Analytics, Mixpanel, etc.
    this.events = [];
  }
}

// Usage
analytics.track(userId, 'message_sent', {
  messageLength: text.length,
  hasAttachment: false,
  conversationId: sessionId
});
```

### Error Tracking

```javascript
function logError(error, context = {}) {
  console.error('Bot Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });

  // Send to error tracking service (Sentry, etc.)
}
```

### Monitoring

- Check logs in your hosting platform
- Monitor rate limit hits
- Track API usage in CustomGPT dashboard
- Set up error alerts
- View function performance metrics

---

## Performance Optimization

### Caching Strategy

```javascript
const responseCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60
});

async function getCachedResponse(query) {
  const cacheKey = crypto
    .createHash('md5')
    .update(query.toLowerCase())
    .digest('hex');

  const cached = responseCache.get(cacheKey);
  if (cached) return cached;

  const response = await sendToCustomGPT(sessionId, query);
  responseCache.set(cacheKey, response);

  return response;
}
```

### Async Processing

```javascript
// Process messages in background
async function processMessageAsync(senderId, message) {
  // Acknowledge immediately
  await sendTypingOn(senderId);

  // Process in background
  setImmediate(async () => {
    try {
      await handleCustomGPTQuery(senderId, message.text);
    } catch (error) {
      await sendTextMessage(senderId, "Sorry, an error occurred.");
    } finally {
      await sendTypingOff(senderId);
    }
  });
}
```

---

## Troubleshooting

### Bot not responding

- Check webhook subscription in Facebook
- Verify all environment variables are set correctly
- Check logs in your hosting platform
- Verify Facebook Page token is valid
- Test webhook verification with your verify token

### Rate limit errors

- Adjust limits in configuration
- Add user to whitelist
- Upgrade plan if necessary

### API errors

- Verify CustomGPT API key
- Check agent ID is correct
- Monitor API usage in CustomGPT dashboard
- Ensure CustomGPT project is active

### Webhook verification failed

- Check `FB_VERIFY_TOKEN` matches in both Facebook and your config
- Ensure webhook URL is correct and accessible
- View deployment logs for errors

### Vercel-Specific Issues

- Check environment variables are set in Vercel dashboard
- Verify function logs for errors
- Ensure serverless function timeout is appropriate

### Google Apps Script Issues

- Check execution logs in Apps Script dashboard
- Verify all Script Properties are set
- Ensure deployment is set to "Anyone" access
- Check for execution time limit errors

---

## Testing and Debugging

### Test Suite

```javascript
// test.js
const axios = require('axios');

async function testWebhook() {
  const response = await axios.get('http://localhost:3000/webhook', {
    params: {
      'hub.mode': 'subscribe',
      'hub.verify_token': process.env.FB_VERIFY_TOKEN,
      'hub.challenge': 'test123'
    }
  });

  console.assert(response.data === 'test123', 'Webhook verification failed');
}

async function testMessage() {
  const response = await axios.post('http://localhost:3000/webhook', {
    object: 'page',
    entry: [{
      messaging: [{
        sender: { id: 'TEST_USER' },
        message: { text: 'Hello bot' }
      }]
    }]
  });

  console.assert(response.status === 200, 'Message handling failed');
}
```

### Debug Mode

```javascript
const DEBUG = process.env.DEBUG === 'true';

function debug(message, data) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data);
  }
}

// Usage
debug('CustomGPT Response', response);
```

---

## Integration Features

### Webhook for External Systems

```javascript
app.post('/external-webhook', async (req, res) => {
  const { userId, message, metadata } = req.body;

  // Trigger bot response
  await handleCustomGPTQuery(userId, message);

  res.json({ success: true });
});
```

### API Endpoints

```javascript
// Get conversation history
app.get('/api/conversations/:userId', async (req, res) => {
  const { userId } = req.params;
  const history = await getConversationHistory(userId);
  res.json(history);
});

// Send broadcast message
app.post('/api/broadcast', async (req, res) => {
  const { userIds, message } = req.body;

  for (const userId of userIds) {
    await sendTextMessage(userId, message);
  }

  res.json({ sent: userIds.length });
});
```

---

## Support

### CustomGPT Links

- **[CustomGPT Landing Page](https://customgpt.ai?utm_source=github_integrations)**
- **[CustomGPT Starter Kit](https://github.com/Poll-The-People/customgpt-starter-kit)**
- **[CustomGPT Integrations](https://github.com/Poll-The-People/customgpt-integrations)**
- **[API Documentation](https://docs.customgpt.ai/reference/i-api-homepage?utm_source=github_integrations)**
- **[Postman Collection](https://customgpt.ai/postman-api-collection?utm_source=github_integrations)**
- **[MCP Documentation](https://docs.customgpt.ai/reference/customgptai-mcp-support#/?utm_source=github_integrations)**
- **[Developer Office Hours](https://lu.ma/customgpt)**
- **[YouTube Channel](https://www.youtube.com/channel/UC6HOk7Z9OwVPNYiC7SKMJ6g)**

### Platform Documentation

- Facebook Messenger Platform: [developers.facebook.com/docs/messenger-platform](https://developers.facebook.com/docs/messenger-platform)

---

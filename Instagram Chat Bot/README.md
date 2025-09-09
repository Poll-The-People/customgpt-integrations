# Instagram CustomGPT Bot

🚧 **Work in Progress** - Currently supports DMs, comment replies coming soon!

A powerful Instagram DM bot that integrates with CustomGPT's RAG platform to provide AI-powered responses from your knowledge bases.

## ✨ Current Features (DM Support)

- **🤖 Multi-Agent Support**: Switch between different CustomGPT agents
- **⚡ Real-time Messaging**: Instant responses with typing indicators
- **🛡️ Advanced Security**: Rate limiting, user authentication, webhook verification
- **📚 Smart Citations**: Source attribution for responses (optional)
- **❓ Starter Questions**: Contextual question suggestions for better UX
- **📊 Analytics Ready**: Built-in usage tracking and monitoring
- **🚀 Production Ready**: Redis caching, error handling, health checks

## 🚧 Planned Features (Coming Soon)

- **💬 Comment Replies**: Respond to Instagram post comments automatically
- **🔔 Comment Webhooks**: Real-time comment notifications and processing
- **👥 Mention Detection**: Reply when your account is mentioned in comments
- **🎯 Smart Filtering**: AI-powered comment filtering and moderation
- **📈 Comment Analytics**: Track engagement and response effectiveness

## 🔧 Quick Start

### Prerequisites

1. **Instagram Business Account** connected to a Facebook Page
2. **Facebook Developer Account** with an app created
3. **CustomGPT Account** with API access and at least one agent
4. **HTTPS endpoint** for webhook (ngrok for development)

### Installation

1. **Clone and Navigate**:
```bash
cd "Instagram Chat Bot"
pip install -r requirements.txt
```

2. **Configure Environment**:
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

3. **Required Environment Variables**:
```env
# Instagram/Meta API
INSTAGRAM_ACCESS_TOKEN=your_page_access_token
INSTAGRAM_APP_SECRET=your_app_secret
WEBHOOK_VERIFY_TOKEN=your_verification_token

# CustomGPT API
CUSTOMGPT_API_KEY=your_api_key
DEFAULT_AGENT_ID=your_default_agent_id
```

4. **Run the Bot**:
```bash
python bot.py
```

## 📋 Setup Guide

### Step 1: Facebook App Setup

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use existing one
3. Add **Instagram** product to your app
4. Configure webhook URL: `https://your-domain.com/webhook`
5. Subscribe to `messages` and `messaging_postbacks` webhook fields

### Step 2: Instagram Business Account

1. Connect your Instagram Business account to your Facebook Page
2. Generate a Page Access Token with required permissions:
   - `instagram_basic`
   - `instagram_manage_messages`
   - `pages_show_list`
   - `pages_messaging`

### Step 3: Webhook Verification

The bot will automatically handle webhook verification using your `WEBHOOK_VERIFY_TOKEN`.

### Step 4: CustomGPT Configuration

1. Get your API key from [CustomGPT](https://app.customgpt.ai)
2. Note your agent/project IDs you want to use
3. Set `DEFAULT_AGENT_ID` for new users

## 🚀 Deployment Options

### Option 1: Railway (Recommended - Free Tier Available)

**Pros**: ✅ Free tier, easy deployment, automatic HTTPS, Redis add-on
**Cons**: ⚠️ Limited free hours

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway up
```

**Setup**:
1. Connect your GitHub repository
2. Add environment variables in Railway dashboard
3. Optional: Add Redis plugin for production caching
4. Your webhook URL: `https://your-app.railway.app/webhook`

### Option 2: Render (Free Tier Available)

**Pros**: ✅ Free tier, simple setup, automatic HTTPS
**Cons**: ⚠️ Spins down after inactivity, slower cold starts

```yaml
# render.yaml
services:
  - type: web
    name: instagram-customgpt-bot
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "python bot.py"
    envVars:
      - key: PORT
        value: 10000
```

### Option 3: Google Cloud Platform

**Pros**: ✅ Generous free tier, scalable, reliable
**Cons**: ⚠️ More complex setup

```yaml
# app.yaml for Google App Engine
runtime: python39
service: instagram-bot

env_variables:
  INSTAGRAM_ACCESS_TOKEN: "your_token"
  CUSTOMGPT_API_KEY: "your_key"

automatic_scaling:
  target_cpu_utilization: 0.6
  min_instances: 0
  max_instances: 10
```

### Option 4: Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 3000

CMD ["python", "bot.py"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  instagram-bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped
  
  redis:
    image: redis:7-alpine
    restart: unless-stopped
```

### ❌ Google Apps Script (Not Recommended)

**Why not suitable for Instagram bots**:
- **6-minute execution limit** (Instagram expects quick responses)
- **No persistent connections** (can't maintain webhooks reliably)
- **Limited HTTP handling** (complex webhook verification)
- **No Redis support** (poor session management)
- **Cold start issues** (slow response times)

**Better for**: Simple webhook processors, not real-time chat bots

## 🛡️ Security Features

### Rate Limiting
- **Per-user limits**: 10 messages/minute, 50 messages/hour (configurable)
- **Automatic reset**: Time-based windows with graceful handling
- **Redis support**: Distributed rate limiting for multiple instances

### User Management
```env
# Whitelist specific users (optional)
ALLOWED_USER_IDS=user1,user2,user3

# Block specific users (optional)
BLOCKED_USER_IDS=spam_user1,blocked_user2
```

### Webhook Security
- **Signature verification**: All requests validated using Facebook's signature
- **Token verification**: Webhook endpoint protected with verify token

## 💬 Bot Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/help` | Show help and starter questions | `/help` |
| `/agent [id]` | Switch to different CustomGPT agent | `/agent 123` |
| `1`, `2`, `3...` | Select starter question by number | `1` |
| Any text | Ask the AI assistant | `What is machine learning?` |

## 📊 Monitoring

### Health Check Endpoint
```bash
curl https://your-domain.com/health
```

**Response includes**:
- CustomGPT API connectivity status
- Rate limiter statistics
- Redis connection status
- Configuration summary

### Analytics (Optional)
Enable usage tracking by setting:
```env
ANALYTICS_ENABLED=true
ANALYTICS_ENDPOINT=https://your-analytics-endpoint.com
```

## 🔧 Advanced Configuration

### Redis Caching (Production)
```env
REDIS_URL=redis://username:password@host:port/db
```

**Benefits**:
- Distributed session management
- Improved performance
- Persistent rate limiting across restarts

### Custom Features
```env
# Disable features for simpler setup
ENABLE_STARTER_QUESTIONS=false
ENABLE_CITATIONS=false
ENABLE_TYPING_INDICATOR=false

# Customize limits
MAX_MESSAGE_LENGTH=1000
RATE_LIMIT_PER_USER_PER_MINUTE=5
```

## 🐛 Troubleshooting

### Common Issues

**1. Webhook verification fails**
- Check `WEBHOOK_VERIFY_TOKEN` matches in both bot and Meta app
- Ensure URL is accessible and returns correct response

**2. Bot doesn't respond to messages**
- Verify Instagram Business account is connected to Facebook Page
- Check webhook subscription includes `messages` field
- Confirm bot has `instagram_manage_messages` permission

**3. "Agent not found" errors**
- Verify `CUSTOMGPT_API_KEY` is valid
- Check agent ID exists and is accessible with your API key
- Test API connection: `curl -H "Authorization: Bearer YOUR_KEY" https://app.customgpt.ai/api/v1/projects`

**4. Rate limiting issues**
- Check Redis connection if enabled
- Review user activity patterns
- Adjust limits in environment variables

### Debug Mode
```bash
export DEBUG=true
export LOG_LEVEL=DEBUG
python bot.py
```

## 💬 Instagram Comment Reply Bot - Technical Details

### How Comment Replies Work

**Instagram API Requirements (2025)**:
- **Business/Creator Account**: Required for comment management APIs
- **App Review**: Meta approval needed for production use
- **Webhook Subscription**: Subscribe to `comments` field for real-time notifications
- **Required Permissions**: `instagram_basic`, `instagram_manage_comments`

### Comment Reply Bot Implementation Options

#### Option 1: Automatic Replies (No Mentions Required)
```python
# Bot responds to ALL comments on your posts
def process_comment_webhook(comment_data):
    post_id = comment_data['media']['id']
    comment_text = comment_data['text']
    comment_id = comment_data['id']
    
    # Generate AI response
    response = customgpt_client.send_message(agent_id, session_id, comment_text)
    
    # Reply to comment
    instagram_api.create_comment_reply(comment_id, response['text'])
```

#### Option 2: Mention-Based Replies (Recommended)
```python
# Bot only responds when mentioned (@your_account)
def process_comment_webhook(comment_data):
    comment_text = comment_data['text']
    
    if '@your_instagram_handle' in comment_text.lower():
        # Remove mention and process
        clean_text = comment_text.replace('@your_instagram_handle', '').strip()
        # Generate and post reply...
```

### Current Limitations & 2025 Updates

**Instagram Graph API Changes**:
- **Basic Display API deprecated** (December 2024)
- **Migration to Graph API v22** required by April 21, 2025
- **Comment parent-child relationship** tracking has API limitations
- **Rate limits**: 200 API calls per hour for comments

**Webhook Challenges**:
- Parent comment ID not always provided in webhooks
- Need to treat all comments as top-level due to API limitations
- Requires proper webhook verification and HTTPS endpoints

## 🔮 Future Enhancements

**Phase 1 - Comment Support (Next Release)**:
- [ ] **Comment webhook processing** with real-time notifications
- [ ] **Mention-based replies** (@your_account to trigger responses)
- [ ] **Comment moderation** (hide/unhide inappropriate comments)
- [ ] **Thread-aware replies** (maintain conversation context)

**Phase 2 - Advanced Features**:
- [ ] **Voice message support** (when Instagram API supports it)
- [ ] **Image/media handling** capabilities
- [ ] **Multi-language support** for international audiences
- [ ] **Advanced analytics dashboard** with user insights
- [ ] **A/B testing framework** for response optimization
- [ ] **Scheduled messages** and automated campaigns
- [ ] **Integration with CRM systems** for business users

## 📄 License & Support

### CustomGPT Links
- **[CustomGPT Landing Page](https://customgpt.ai)**
- **[Live Demo](https://app.customgpt.ai/agents?demo=chat)**
- **[CustomGPT Starter Kit](https://github.com/Poll-The-People/customgpt-starter-kit)**
- **[CustomGPT Integrations](https://github.com/Poll-The-People/customgpt-integrations)**
- **[API Documentation](https://docs.customgpt.ai/api-reference)**
- **[Postman Collection](https://www.postman.com/customgpt/customgpt/overview)**
- **[MCP Documentation](https://docs.customgpt.ai/model-content-protocol)**
- **[Office Hours](https://calendly.com/pollthepeople/office-hours)**
- **[YouTube Channel](https://www.youtube.com/channel/UC6HOk7Z9OwVPNYiC7SKMJ6g)**

### Platform Documentation
- **Instagram Messaging API**: [developers.facebook.com/docs/messenger-platform/instagram](https://developers.facebook.com/docs/messenger-platform/instagram)

### Support
- **License**: MIT License
- **Issues**: Create issues in this repository

## 🚨 Important Notes

1. **Instagram Policies**: Users must initiate conversations (bots can only reply)
2. **Rate Limits**: Instagram has built-in rate limits (200 messages/hour per conversation)
3. **Business Account Required**: Only Instagram Business accounts can use messaging APIs
4. **HTTPS Required**: All webhook endpoints must use HTTPS
5. **App Review**: For production use, your Facebook app may need approval

---

**Ready to deploy?** Choose your hosting option above and follow the deployment guide! 🚀
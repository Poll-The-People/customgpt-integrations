# Instagram CustomGPT Bot

A powerful Instagram DM bot that integrates with CustomGPT's RAG platform to provide AI-powered responses from your knowledge bases.

Get your [CustomGPT.ai RAG API key here](https://app.customgpt.ai/register?utm_source=github_integrations), needed to use this integration.

## Current Features (DM Support)

- **Multi-Agent Support**: Switch between different CustomGPT agents
- **Real-time Messaging**: Instant responses with typing indicators
- **Advanced Security**: Rate limiting, user authentication, webhook verification
- **Smart Citations**: Source attribution for responses (optional)
- **Starter Questions**: Contextual question suggestions for better UX
- **Analytics Ready**: Built-in usage tracking and monitoring
- **Production Ready**: Redis caching, error handling, health checks

## Planned Features (Coming Soon)

- **Comment Replies**: Respond to Instagram post comments automatically
- **Comment Webhooks**: Real-time comment notifications and processing
- **Mention Detection**: Reply when your account is mentioned in comments
- **Smart Filtering**: AI-powered comment filtering and moderation
- **Comment Analytics**: Track engagement and response effectiveness

---

## Quick Start (15 minutes)

### Prerequisites (5 minutes)

1. **Instagram Business Account** linked to a Facebook Page
2. **Facebook Developer Account** ([create here](https://developers.facebook.com/))
3. **CustomGPT Account** with API access ([get API key](https://app.customgpt.ai/register?utm_source=github_integrations/))

### Step 1: Facebook App Setup (3 minutes)

1. **Create Facebook App**:
   - Go to [developers.facebook.com](https://developers.facebook.com/)
   - Click "Create App" → "Business" → Enter app name
   - Add "Instagram" product to your app

2. **Get Access Token**:
   - Go to Instagram → Basic Display
   - Generate access token for your connected Instagram Business account
   - Copy the token (starts with `EAAG...`)

3. **Get App Secret**:
   - Go to Settings → Basic
   - Copy your "App Secret" (click "Show")

### Step 2: Installation (2 minutes)

```bash
cd "Instagram Chat Bot"
pip install -r requirements.txt
cp .env.example .env
# Edit .env file with your credentials
```

### Step 3: Environment Variables (2 minutes)

Required variables in `.env` file:

```env
# Instagram/Meta API
INSTAGRAM_ACCESS_TOKEN=EAAG...your_token_here
INSTAGRAM_APP_SECRET=your_app_secret_here
WEBHOOK_VERIFY_TOKEN=any_random_string_123

# CustomGPT API
CUSTOMGPT_API_KEY=your_customgpt_api_key
DEFAULT_AGENT_ID=your_default_agent_id

# Optional
REDIS_URL=redis://localhost:6379  # For production caching
```

### Step 4: Run the Bot (1 minute)

```bash
python bot.py
```

### Step 5: Configure Webhook (3 minutes)

1. **Get your bot URL**:
   - Local: Use ngrok: `ngrok http 3000` → use the HTTPS URL
   - Production: Your deployed URL

2. **Set webhook in Facebook**:
   - Go to your Facebook App → Instagram → Webhooks
   - Callback URL: `https://your-domain.com/webhook`
   - Verify Token: Same as your `WEBHOOK_VERIFY_TOKEN`
   - Subscribe to: `messages` and `messaging_postbacks`

### Step 6: Test Your Bot (2 minutes)

1. **Health check**: Visit `https://your-domain.com/health`
2. **Send a DM** to your Instagram Business account
3. **Bot should respond** with a welcome message!

You're done! Your bot is now live and responding to Instagram DMs.

---

## Bot Commands

| Command          | Description                         | Example                     |
| ---------------- | ----------------------------------- | --------------------------- |
| `/help`          | Show help and starter questions     | `/help`                     |
| `/agent [id]`    | Switch to different CustomGPT agent | `/agent 123`                |
| `1`, `2`, `3...` | Select starter question by number   | `1`                         |
| Any text         | Ask the AI assistant                | `What is machine learning?` |

---

## Deployment Options

### Option 1: Railway (Recommended - Free Tier Available)

**Pros**: Free tier, easy deployment, automatic HTTPS, Redis add-on
**Cons**: Limited free hours

#### Setup Steps

1. **Install Railway CLI**:
```bash
npm install -g @railway/cli
```

2. **Deploy**:
```bash
railway login
railway init
railway up
```

3. **Configuration**:
   - Connect your GitHub repository
   - Add environment variables in Railway dashboard
   - Optional: Add Redis plugin for production caching
   - Your webhook URL: `https://your-app.railway.app/webhook`

4. **Environment Variables in Railway**:
```env
INSTAGRAM_ACCESS_TOKEN=your_instagram_token_here
INSTAGRAM_APP_SECRET=your_facebook_app_secret_here
WEBHOOK_VERIFY_TOKEN=your_custom_verification_token
CUSTOMGPT_API_KEY=your_customgpt_api_key_here
DEFAULT_AGENT_ID=your_default_agent_id
REDIS_URL=${{Redis.REDIS_URL}}
PORT=${{PORT}}
LOG_LEVEL=INFO
RATE_LIMIT_PER_USER_PER_MINUTE=10
```

5. **Add Redis (Optional but Recommended)**:
   - In Railway dashboard, click "+ New"
   - Select "Redis" from database options
   - Railway will automatically set `REDIS_URL` variable

6. **Custom Domain (Optional)**:
   - Go to Settings → Domains
   - Add custom domain or use Railway's provided URL
   - Update Meta webhook URL accordingly

### Option 2: Render (Free Tier Available)

**Pros**: Free tier, simple setup, automatic HTTPS
**Cons**: Spins down after inactivity, slower cold starts

#### Setup Steps

1. **Create render.yaml**:
```yaml
services:
  - type: web
    name: instagram-customgpt-bot
    runtime: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "python bot.py"
    plan: free
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: PORT
        sync: false
      - fromGroup: instagram-bot-secrets
```

2. **Sign Up and Connect**:
   - Go to [render.com](https://render.com)
   - Connect GitHub account
   - Click "New" → "Web Service"
   - Connect your repository

3. **Configure Service**:
   - **Name**: `instagram-customgpt-bot`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python bot.py`
   - **Plan**: `Free`

4. **Add Environment Variables**:
```env
INSTAGRAM_ACCESS_TOKEN=your_token
INSTAGRAM_APP_SECRET=your_secret
WEBHOOK_VERIFY_TOKEN=your_verify_token
CUSTOMGPT_API_KEY=your_api_key
DEFAULT_AGENT_ID=your_agent_id
LOG_LEVEL=INFO
```

5. **Deploy**:
   - Click "Create Web Service"
   - Monitor build logs
   - Your webhook URL: `https://your-app-name.onrender.com/webhook`

**Important**: Free tier spins down after 15 minutes. Consider upgrading for production.

### Option 3: Google Cloud Platform

**Pros**: Generous free tier, scalable, reliable
**Cons**: More complex setup

#### Option 3A: Google App Engine (Recommended)

1. **Install Google Cloud SDK**:
```bash
# macOS
brew install google-cloud-sdk

# Initialize
gcloud init
gcloud auth application-default login
```

2. **Create app.yaml**:
```yaml
runtime: python311
service: default

instance_class: F1
automatic_scaling:
  target_cpu_utilization: 0.6
  target_throughput_utilization: 0.6
  min_instances: 0
  max_instances: 10

env_variables:
  INSTAGRAM_ACCESS_TOKEN: "your_token_here"
  INSTAGRAM_APP_SECRET: "your_secret_here"
  WEBHOOK_VERIFY_TOKEN: "your_verify_token"
  CUSTOMGPT_API_KEY: "your_api_key"
  DEFAULT_AGENT_ID: "your_agent_id"
  LOG_LEVEL: "INFO"
  PORT: "8080"
```

3. **Update bot.py for App Engine**:
```python
# Add at the end of bot.py, replace the main() call:
if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 8080))
    Config.PORT = port
    main()
```

4. **Deploy**:
```bash
gcloud app deploy
gcloud app browse  # Get your URL
```

**Your webhook URL**: `https://your-project-id.uc.r.appspot.com/webhook`

#### Option 3B: Google Cloud Run

1. **Create Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD exec python bot.py
```

2. **Build and Deploy**:
```bash
# Set project ID
export PROJECT_ID=your-project-id

# Build image
gcloud builds submit --tag gcr.io/$PROJECT_ID/instagram-bot

# Deploy to Cloud Run
gcloud run deploy instagram-bot \
  --image gcr.io/$PROJECT_ID/instagram-bot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars INSTAGRAM_ACCESS_TOKEN=your_token,CUSTOMGPT_API_KEY=your_key
```

### Option 4: Docker/VPS Deployment

**Pros**: Full control over environment, consistent across platforms
**Cons**: Requires server management

#### Docker Setup

1. **Create Dockerfile**:
```dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Run application
EXPOSE 3000
CMD ["python", "bot.py"]
```

2. **Create docker-compose.yml**:
```yaml
version: '3.8'

services:
  instagram-bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - INSTAGRAM_ACCESS_TOKEN=${INSTAGRAM_ACCESS_TOKEN}
      - INSTAGRAM_APP_SECRET=${INSTAGRAM_APP_SECRET}
      - WEBHOOK_VERIFY_TOKEN=${WEBHOOK_VERIFY_TOKEN}
      - CUSTOMGPT_API_KEY=${CUSTOMGPT_API_KEY}
      - DEFAULT_AGENT_ID=${DEFAULT_AGENT_ID}
      - REDIS_URL=redis://redis:6379
      - LOG_LEVEL=INFO
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - bot-network

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - bot-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - instagram-bot
    restart: unless-stopped
    networks:
      - bot-network

volumes:
  redis_data:

networks:
  bot-network:
    driver: bridge
```

3. **Create nginx.conf**:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream bot {
        server instagram-bot:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl;
        server_name your-domain.com;

        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

        location / {
            proxy_pass http://bot;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

4. **Deploy**:
```bash
# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f instagram-bot

# Get SSL certificate (first time)
sudo certbot --nginx -d your-domain.com
```

### Deployment Comparison

| Platform           | Best For            | Cost                       | Reliability |
| ------------------ | ------------------- | -------------------------- | ----------- |
| **Railway**        | Quick deployment    | $5/month credit            | Excellent   |
| **Render**         | Simple projects     | 500 build hours/month free | Good        |
| **GCP App Engine** | Scalable production | 28 hours/day free          | Excellent   |
| **GCP Cloud Run**  | Event-driven bots   | 2M requests/month free     | Excellent   |
| **VPS/Docker**     | Full control        | $5-50+/month               | Excellent   |

### Recommended Strategy

1. **Development**: Railway (easy setup, free tier)
2. **Small production**: Render or GCP App Engine
3. **Large scale**: GCP Cloud Run or Kubernetes
4. **Enterprise**: Custom VPS/Docker setup

### Why Not Google Apps Script?

**Not recommended for Instagram bots**:
- 6-minute execution limit (Instagram expects quick responses)
- No persistent connections (can't maintain webhooks reliably)
- Limited HTTP handling (complex webhook verification)
- No Redis support (poor session management)
- Cold start issues (slow response times)

**Better for**: Simple webhook processors, not real-time chat bots

---

## Configuration

### Security Features

#### Rate Limiting

- **Per-user limits**: 10 messages/minute, 50 messages/hour (configurable)
- **Automatic reset**: Time-based windows with graceful handling
- **Redis support**: Distributed rate limiting for multiple instances

Configure in `.env`:
```env
RATE_LIMIT_PER_USER_PER_MINUTE=10
RATE_LIMIT_PER_USER_PER_HOUR=50
```

#### User Management

```env
# Whitelist specific users (optional)
ALLOWED_USER_IDS=user1,user2,user3

# Block specific users (optional)
BLOCKED_USER_IDS=spam_user1,blocked_user2
```

#### Webhook Security

- **Signature verification**: All requests validated using Facebook's signature
- **Token verification**: Webhook endpoint protected with verify token

### Advanced Features

#### Redis Caching (Production)

```env
REDIS_URL=redis://username:password@host:port/db
```

**Benefits**:
- Distributed session management
- Improved performance
- Persistent rate limiting across restarts

#### Custom Features

```env
# Disable features for simpler setup
ENABLE_STARTER_QUESTIONS=false
ENABLE_CITATIONS=false
ENABLE_TYPING_INDICATOR=false

# Customize limits
MAX_MESSAGE_LENGTH=1000
```

---

## Monitoring

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

Enable usage tracking:
```env
ANALYTICS_ENABLED=true
ANALYTICS_ENDPOINT=https://your-analytics-endpoint.com
```

---

## Troubleshooting

### Common Issues

#### 1. Webhook verification fails

- Check `WEBHOOK_VERIFY_TOKEN` matches in both bot and Meta app
- Ensure URL is accessible and returns correct response
- URL must be HTTPS (not HTTP)

**Test webhook**:
```bash
curl "https://your-domain.com/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=YOUR_VERIFY_TOKEN"
```

#### 2. Bot doesn't respond to messages

- Verify Instagram Business account is connected to Facebook Page
- Check webhook subscription includes `messages` field
- Confirm bot has `instagram_manage_messages` permission
- Check application logs

**Check health**:
```bash
curl https://your-domain.com/health
```

#### 3. "Agent not found" errors

- Verify `CUSTOMGPT_API_KEY` is valid
- Check agent ID exists and is accessible with your API key

**Test API connection**:
```bash
curl -H "Authorization: Bearer YOUR_KEY" https://app.customgpt.ai/api/v1/projects
```

#### 4. Rate limiting issues

- Check Redis connection if enabled
- Review user activity patterns
- Adjust limits in environment variables

### Debug Mode

```bash
export DEBUG=true
export LOG_LEVEL=DEBUG
python bot.py
```

### Platform-Specific Issues

**Railway**:
- Monitor in dashboard
- Check environment variables are set
- View deployment logs

**Render**:
- Check service logs
- Verify free tier hasn't spun down
- Monitor cold start times

**GCP**:
- Use Cloud Monitoring
- Check function logs
- Verify environment variables

**Docker**:
```bash
docker-compose logs -f instagram-bot
docker-compose ps
```

---

## Instagram Comment Reply Bot

### How Comment Replies Work

**Instagram API Requirements (2025)**:
- **Business/Creator Account**: Required for comment management APIs
- **App Review**: Meta approval needed for production use
- **Webhook Subscription**: Subscribe to `comments` field for real-time notifications
- **Required Permissions**: `instagram_basic`, `instagram_manage_comments`

### Implementation Options

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

- **Instagram Messaging API**: [developers.facebook.com/docs/messenger-platform/instagram](https://developers.facebook.com/docs/messenger-platform/instagram)

---

## Important Notes

1. **Instagram Policies**: Users must initiate conversations (bots can only reply)
2. **Rate Limits**: Instagram has built-in rate limits (200 messages/hour per conversation)
3. **Business Account Required**: Only Instagram Business accounts can use messaging APIs
4. **HTTPS Required**: All webhook endpoints must use HTTPS
5. **App Review**: For production use, your Facebook app may need approval

---

## License

MIT License - see LICENSE file for details

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.
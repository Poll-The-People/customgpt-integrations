# Instagram CustomGPT Bot - Deployment Guide

Comprehensive deployment guide for the Instagram CustomGPT Bot with step-by-step instructions for different hosting platforms.

## 🎯 Deployment Overview

**Recommended Order**:
1. **Railway** (Easiest, free tier)
2. **Render** (Good free option)  
3. **Google Cloud Platform** (Most scalable)
4. **VPS/Docker** (Full control)

## 🚀 Option 1: Railway Deployment (Recommended)

**Why Railway?**
- ✅ Free tier with $5 credit monthly
- ✅ Automatic HTTPS and custom domains
- ✅ Simple GitHub integration
- ✅ One-click Redis addon
- ✅ Environment variable management
- ✅ Automatic deployments

### Step-by-Step Railway Deployment

1. **Prepare Your Repository**
```bash
# Ensure all files are committed
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

2. **Sign Up and Connect**
- Go to [railway.app](https://railway.app)
- Sign up with GitHub
- Click "New Project" → "Deploy from GitHub repo"
- Select your Instagram bot repository

3. **Configure Environment Variables**
In Railway dashboard → Settings → Variables, add:

```env
# Required Variables
INSTAGRAM_ACCESS_TOKEN=your_instagram_token_here
INSTAGRAM_APP_SECRET=your_facebook_app_secret_here
WEBHOOK_VERIFY_TOKEN=your_custom_verification_token
CUSTOMGPT_API_KEY=your_customgpt_api_key_here
DEFAULT_AGENT_ID=your_default_agent_id

# Optional but Recommended
REDIS_URL=${{Redis.REDIS_URL}}
PORT=${{PORT}}
LOG_LEVEL=INFO
RATE_LIMIT_PER_USER_PER_MINUTE=10
```

4. **Add Redis (Optional but Recommended)**
- In Railway dashboard, click "+ New"
- Select "Redis" from database options
- Railway will automatically set `REDIS_URL` variable

5. **Custom Domain (Optional)**
- Go to Settings → Domains
- Add custom domain or use Railway's provided URL
- Update Meta webhook URL accordingly

6. **Deploy**
- Railway automatically deploys on git push
- Monitor deployment in "Deployments" tab
- Check logs for any issues

**Your webhook URL**: `https://your-app-name.up.railway.app/webhook`

## 🌐 Option 2: Render Deployment

**Why Render?**
- ✅ True free tier (500 build hours/month)
- ✅ Automatic HTTPS
- ✅ Git-based deployments
- ⚠️ Spins down after 15 minutes inactivity
- ⚠️ Slower cold starts (30+ seconds)

### Step-by-Step Render Deployment

1. **Create render.yaml**
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

2. **Sign Up and Connect**
- Go to [render.com](https://render.com)
- Connect GitHub account
- Click "New" → "Web Service"
- Connect your repository

3. **Configure Service**
- **Name**: `instagram-customgpt-bot`
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python bot.py`
- **Plan**: `Free`

4. **Add Environment Variables**
In Render dashboard → Environment:

```env
INSTAGRAM_ACCESS_TOKEN=your_token
INSTAGRAM_APP_SECRET=your_secret
WEBHOOK_VERIFY_TOKEN=your_verify_token
CUSTOMGPT_API_KEY=your_api_key
DEFAULT_AGENT_ID=your_agent_id
LOG_LEVEL=INFO
```

5. **Deploy**
- Click "Create Web Service"
- Monitor build logs
- Note the provided URL for webhook configuration

**Your webhook URL**: `https://your-app-name.onrender.com/webhook`

**Important**: Free tier spins down after 15 minutes. Consider upgrading for production.

## ☁️ Option 3: Google Cloud Platform

**Why GCP?**
- ✅ $300 free credit for new users
- ✅ Generous always-free tier
- ✅ Highly scalable and reliable
- ✅ Multiple deployment options
- ⚠️ More complex setup

### Option 3A: Google App Engine (Recommended)

1. **Install Google Cloud SDK**
```bash
# macOS
brew install google-cloud-sdk

# Initialize
gcloud init
gcloud auth application-default login
```

2. **Create app.yaml**
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

3. **Update bot.py for App Engine**
```python
# Add at the end of bot.py, replace the main() call:
if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 8080))
    Config.PORT = port
    main()
```

4. **Deploy**
```bash
gcloud app deploy
gcloud app browse  # Get your URL
```

**Your webhook URL**: `https://your-project-id.uc.r.appspot.com/webhook`

### Option 3B: Google Cloud Run

1. **Create Dockerfile**
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD exec python bot.py
```

2. **Build and Deploy**
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

## 🐳 Option 4: Docker/VPS Deployment

**Why Docker?**
- ✅ Full control over environment
- ✅ Consistent across platforms
- ✅ Easy scaling with docker-compose
- ⚠️ Requires server management

### Step-by-Step Docker Deployment

1. **Create Dockerfile**
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

2. **Create docker-compose.yml**
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

3. **Create nginx.conf**
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

4. **Deploy**
```bash
# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f instagram-bot

# Get SSL certificate (first time)
sudo certbot --nginx -d your-domain.com
```

## 🔧 Post-Deployment Configuration

### 1. Configure Instagram Webhook

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Navigate to your app → Instagram → Webhooks
3. Add webhook URL: `https://your-domain.com/webhook`
4. Verify token: Use your `WEBHOOK_VERIFY_TOKEN`
5. Subscribe to fields: `messages`, `messaging_postbacks`

### 2. Test Your Bot

```bash
# Health check
curl https://your-domain.com/health

# Test webhook (should return challenge)
curl "https://your-domain.com/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=YOUR_VERIFY_TOKEN"
```

### 3. Monitor Your Deployment

- **Railway**: Monitor in dashboard
- **Render**: Check service logs
- **GCP**: Use Cloud Monitoring
- **Docker**: `docker-compose logs -f`

## 🛡️ Production Checklist

### Security
- [ ] Enable HTTPS (automatically handled by platforms)
- [ ] Set strong `WEBHOOK_VERIFY_TOKEN`
- [ ] Configure user allowlists if needed
- [ ] Enable rate limiting with Redis
- [ ] Monitor for unusual activity

### Performance
- [ ] Enable Redis for session caching
- [ ] Set appropriate rate limits
- [ ] Monitor response times
- [ ] Set up health checks

### Monitoring
- [ ] Configure log aggregation
- [ ] Set up uptime monitoring
- [ ] Monitor CustomGPT API usage
- [ ] Track user engagement metrics

## 🐛 Common Deployment Issues

### Issue: "Webhook verification failed"
```bash
# Check environment variables
echo $WEBHOOK_VERIFY_TOKEN

# Test webhook endpoint
curl -X GET "https://your-domain.com/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=YOUR_TOKEN"
```

### Issue: "Bot not responding"
1. Check application logs
2. Verify Instagram webhook subscription
3. Test CustomGPT API connectivity:
```bash
curl -H "Authorization: Bearer YOUR_KEY" https://app.customgpt.ai/api/v1/projects
```

### Issue: "Rate limit errors"
- Enable Redis for distributed rate limiting
- Adjust rate limits in environment variables
- Check user activity patterns

### Issue: "App keeps crashing"
- Check memory limits (increase if needed)
- Review error logs for Python exceptions
- Verify all required environment variables are set

## 💰 Cost Comparison

| Platform | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| **Railway** | $5/month credit | $20+/month | Quick deployment |
| **Render** | 500 build hours | $7+/month | Simple projects |
| **GCP App Engine** | 28 hours/day free | Pay per use | Scalable production |
| **GCP Cloud Run** | 2M requests/month | Pay per request | Event-driven bots |
| **VPS** | $5+/month | $5-50+/month | Full control |

## 🎯 Recommended Deployment Strategy

1. **Development**: Railway (easy setup, free tier)
2. **Small production**: Render or GCP App Engine
3. **Large scale**: GCP Cloud Run or Kubernetes
4. **Enterprise**: Custom VPS/Docker setup

Choose based on your traffic expectations and technical requirements!

---

**Need help?** Check the main README.md or create an issue in the repository. 🚀
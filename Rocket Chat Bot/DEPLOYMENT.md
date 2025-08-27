# Deployment Guide for Rocket Chat CustomGPT Bot

Comprehensive deployment guide with multiple hosting options and security best practices.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Free Hosting Options](#free-hosting-options)
3. [Production Deployment](#production-deployment)
4. [Security Considerations](#security-considerations)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)

## Quick Start

### Local Testing

```bash
# Clone and setup
git clone <repository>
cd "Rocket Chat Bot"
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env with your credentials

# Run
python bot.py
```

## Free Hosting Options

### 1. Railway.app (Recommended for beginners)

**Pros**: Easy deployment, good free tier, automatic HTTPS
**Cons**: Limited hours on free tier

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway up

# Set environment variables
railway variables set CUSTOMGPT_API_KEY=your_key
railway variables set ROCKET_CHAT_URL=your_url
# ... set all variables from .env

# View logs
railway logs
```

### 2. Render.com

**Pros**: Generous free tier, easy setup
**Cons**: Sleeps after 15 minutes of inactivity

1. Fork repository to your GitHub
2. Sign up at [render.com](https://render.com)
3. Create New → Background Worker
4. Connect GitHub repository
5. Configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python bot.py`
6. Add environment variables in dashboard
7. Deploy

### 3. Fly.io

**Pros**: Global deployment, good performance
**Cons**: Requires credit card (but has free tier)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy
fly auth login
fly launch --dockerfile Dockerfile
fly secrets set CUSTOMGPT_API_KEY=your_key
fly secrets set ROCKET_CHAT_URL=your_url
# ... set all secrets

fly deploy
fly logs
```

### 4. Google Cloud Run

**Pros**: Auto-scaling, pay per use
**Cons**: Requires GCP account setup

```bash
# Install gcloud CLI
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT-ID/rocketchat-bot

# Deploy
gcloud run deploy rocketchat-bot \
  --image gcr.io/PROJECT-ID/rocketchat-bot \
  --platform managed \
  --region us-central1 \
  --set-env-vars-from-file .env.yaml

# Get URL
gcloud run services describe rocketchat-bot --region us-central1
```

### 5. Heroku (Alternative)

**Note**: No longer has free tier, but still popular

```bash
# Create app
heroku create rocketchat-customgpt-bot

# Set environment
heroku config:set CUSTOMGPT_API_KEY=your_key

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### 6. Google Apps Script (Serverless)

**Pros**: Completely free, no maintenance
**Cons**: Limited features, webhook-based only

See `google-apps-script/README.md` for detailed setup.

## Production Deployment

### VPS Deployment (DigitalOcean, Linode, etc.)

```bash
# 1. Setup Ubuntu server
ssh root@your-server-ip

# 2. Install dependencies
apt update && apt upgrade -y
apt install python3 python3-pip python3-venv nginx supervisor -y

# 3. Create user
useradd -m -s /bin/bash botuser
su - botuser

# 4. Clone and setup
git clone <repository>
cd rocketchat-customgpt-bot
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Configure
cp .env.example .env
nano .env  # Add your configuration

# 6. Setup systemd service
sudo cp rocketchat-bot.service /etc/systemd/system/
sudo systemctl enable rocketchat-bot
sudo systemctl start rocketchat-bot

# 7. Setup Nginx (optional, for webhook endpoints)
sudo nano /etc/nginx/sites-available/bot
# Add proxy configuration
sudo ln -s /etc/nginx/sites-available/bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Docker Deployment

```bash
# Build image
docker build -t rocketchat-bot .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Update
git pull
docker-compose build
docker-compose up -d
```

### Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rocketchat-bot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rocketchat-bot
  template:
    metadata:
      labels:
        app: rocketchat-bot
    spec:
      containers:
      - name: bot
        image: your-registry/rocketchat-bot:latest
        envFrom:
        - secretRef:
            name: bot-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
```

```bash
# Deploy
kubectl apply -f deployment.yaml
kubectl create secret generic bot-secrets --from-env-file=.env
```

## Security Considerations

### 1. API Key Security

```bash
# Never commit .env files
echo ".env" >> .gitignore

# Use environment variables
export CUSTOMGPT_API_KEY=your_key

# Or use secret management
# AWS Secrets Manager, Azure Key Vault, etc.
```

### 2. Rate Limiting Configuration

```python
# Adjust in .env
RATE_LIMIT_CALLS=20  # Global limit
RATE_LIMIT_PERIOD=60  # Time window
RATE_LIMIT_USER_CALLS=5  # Per user
```

### 3. Input Validation

- Maximum message length enforced
- Command injection protection
- User blocking capability

### 4. Network Security

```bash
# Firewall rules (UFW)
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

### 5. SSL/TLS

For production, always use HTTPS:
- Use Cloudflare for free SSL
- Or Let's Encrypt with Certbot
- Configure in Nginx/Apache

## Monitoring & Maintenance

### 1. Health Checks

```python
# Add health check endpoint
@app.route('/health')
def health():
    return {'status': 'healthy', 'timestamp': datetime.now()}
```

### 2. Logging

```bash
# View logs
journalctl -u rocketchat-bot -f  # systemd
docker logs container-name -f     # Docker
pm2 logs rocketchat-bot          # PM2
```

### 3. Monitoring Tools

- **Uptime Robot**: Free uptime monitoring
- **Grafana + Prometheus**: Metrics visualization
- **Sentry**: Error tracking
- **New Relic**: APM (free tier available)

### 4. Backup Strategy

```bash
# Backup configuration
cp .env .env.backup

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# Database backup (if using)
pg_dump bot_db > backup.sql
```

### 5. Updates

```bash
# Regular updates
cd /path/to/bot
git pull
source venv/bin/activate
pip install -r requirements.txt --upgrade
sudo systemctl restart rocketchat-bot
```

## Troubleshooting

### Common Issues

#### Bot Not Responding

```bash
# Check if running
systemctl status rocketchat-bot
ps aux | grep bot.py

# Check logs
journalctl -u rocketchat-bot -n 100

# Test connectivity
curl -X POST your-rocket-chat-url/api/v1/login \
  -d "user=bot&password=pass"
```

#### Authentication Errors

```bash
# Verify credentials
python -c "from config import Config; Config.validate()"

# Test API key
curl https://app.customgpt.ai/api/v1/projects/YOUR_ID \
  -H "Authorization: Bearer YOUR_KEY"
```

#### High Memory Usage

```bash
# Monitor resources
htop
docker stats

# Limit memory in systemd
# Add to [Service] section:
MemoryLimit=512M
```

#### Rate Limiting Issues

```python
# Adjust limits
RATE_LIMIT_CALLS=50  # Increase global
RATE_LIMIT_USER_CALLS=10  # Increase per user
```

### Debug Mode

```python
# Enable debug logging
LOG_LEVEL=DEBUG
ENABLE_LOGGING=true

# Add to bot.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Performance Optimization

1. **Use Redis for rate limiting** (for production)
2. **Implement caching** for frequent queries
3. **Use connection pooling** for API calls
4. **Enable response compression**

## Scaling Considerations

### Horizontal Scaling

- Use load balancer (Nginx, HAProxy)
- Multiple bot instances
- Shared Redis for state
- Message queue for distribution

### Vertical Scaling

- Increase server resources
- Optimize code performance
- Use async operations
- Implement caching layers

## Support Resources

- [Rocket Chat API Docs](https://docs.rocket.chat/reference/api)
- [CustomGPT Documentation](https://docs.customgpt.ai)
- [Python Async Best Practices](https://docs.python.org/3/library/asyncio.html)
- Repository Issues for bug reports
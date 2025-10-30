# Docker Hub Deployment Guide

This guide covers deploying the CustomGPT Widget using pre-built Docker images from Docker Hub. This is the simplest deployment method and works on any server with Docker installed.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment Methods](#deployment-methods)
  - [Method 1: One-Command Script (Recommended)](#method-1-one-command-script-recommended)
  - [Method 2: Docker Compose](#method-2-docker-compose)
  - [Method 3: Manual Docker Run](#method-3-manual-docker-run)
- [Configuration](#configuration)
- [Production Deployment](#production-deployment)
- [Server Recommendations](#server-recommendations)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- **Docker**: Version 20.10 or higher
  - [Install on macOS/Windows](https://www.docker.com/products/docker-desktop)
  - [Install on Linux](https://docs.docker.com/engine/install/)
- **API Keys**:
  - OpenAI API key (required for voice features)
  - CustomGPT Project ID + API Key (optional, for RAG responses)

### Optional
- **Domain name** for production deployment
- **SSL certificate** (free via Let's Encrypt)
- **Reverse proxy** (nginx or Caddy)

---

## Quick Start

The fastest way to get started is using the one-command deployment script:

```bash
# Download and run deployment script
curl -o deploy.sh https://raw.githubusercontent.com/yourorg/customgpt-widget/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. ✅ Check Docker installation
2. ✅ Guide you through configuration
3. ✅ Pull the latest image from Docker Hub
4. ✅ Start the container
5. ✅ Display embed code

**Total time**: ~3 minutes

---

## Deployment Methods

### Method 1: One-Command Script (Recommended)

**Best for**: First-time users, quick testing, automated deployment

#### Step 1: Download Script
```bash
curl -o deploy.sh https://raw.githubusercontent.com/yourorg/customgpt-widget/main/deploy.sh
chmod +x deploy.sh
```

#### Step 2: Run Interactive Setup
```bash
./deploy.sh
```

The script will prompt for:
- CustomGPT credentials (optional)
- OpenAI API key
- TTS provider preference
- Language settings
- Port configuration

#### Step 3: Access Widget
Once deployed, open:
- **Widget interface**: `http://localhost:8000`
- **API documentation**: `http://localhost:8000/docs`

#### Step 4: Embed on Website
Copy the embed code from the deployment output:

```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'http://localhost:8000/embed.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
```

---

### Method 2: Docker Compose

**Best for**: Production deployments, easy management, version control

#### Step 1: Download Files
```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/yourorg/customgpt-widget/main/docker-compose.yml
curl -o .env.example https://raw.githubusercontent.com/yourorg/customgpt-widget/main/.env.example
```

#### Step 2: Configure Environment
```bash
# Copy example and edit with your API keys
cp .env.example .env
nano .env  # or use your preferred editor
```

Required configuration in `.env`:
```bash
# CustomGPT Configuration (optional)
USE_CUSTOMGPT=true
CUSTOMGPT_PROJECT_ID=your_project_id
CUSTOMGPT_API_KEY=your_api_key

# OpenAI Configuration (required)
OPENAI_API_KEY=your_openai_key

# TTS Provider
TTS_PROVIDER=OPENAI
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova

# Network
HOST_PORT=8000
```

#### Step 3: Start Container
```bash
docker-compose up -d
```

#### Step 4: Verify Deployment
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Test endpoint
curl http://localhost:8000/docs
```

#### Management Commands
```bash
# Stop container
docker-compose stop

# Restart container
docker-compose restart

# Update to latest image
docker-compose pull
docker-compose up -d

# Remove container
docker-compose down
```

---

### Method 3: Manual Docker Run

**Best for**: Advanced users, custom configurations, CI/CD integration

#### Step 1: Pull Image
```bash
docker pull zriyansh/customgpt-widget:latest
```

#### Step 2: Run Container
```bash
docker run -d \
  --name customgpt-widget \
  --restart unless-stopped \
  -e OPENAI_API_KEY=your_openai_key \
  -e USE_CUSTOMGPT=true \
  -e CUSTOMGPT_PROJECT_ID=your_project_id \
  -e CUSTOMGPT_API_KEY=your_customgpt_key \
  -e CUSTOMGPT_STREAM=true \
  -e TTS_PROVIDER=OPENAI \
  -e OPENAI_TTS_MODEL=tts-1 \
  -e OPENAI_TTS_VOICE=nova \
  -e LANGUAGE=en \
  -p 8000:80 \
  zriyansh/customgpt-widget:latest
```

#### Step 3: Verify
```bash
docker logs -f customgpt-widget
```

---

## Configuration

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | - | OpenAI API key for STT/TTS |
| `USE_CUSTOMGPT` | ❌ | `false` | Enable CustomGPT for AI responses |
| `CUSTOMGPT_PROJECT_ID` | ⚠️ | - | Required if `USE_CUSTOMGPT=true` |
| `CUSTOMGPT_API_KEY` | ⚠️ | - | Required if `USE_CUSTOMGPT=true` |
| `CUSTOMGPT_STREAM` | ❌ | `true` | Enable streaming for faster responses |
| `AI_COMPLETION_MODEL` | ❌ | `gpt-4o-mini` | OpenAI model (when CustomGPT disabled) |
| `STT_MODEL` | ❌ | `gpt-4o-mini-transcribe` | Speech-to-text model |
| `TTS_PROVIDER` | ❌ | `OPENAI` | TTS provider: `OPENAI`, `gTTS`, `ELEVENLABS`, etc. |
| `OPENAI_TTS_MODEL` | ❌ | `tts-1` | OpenAI TTS model: `tts-1` or `tts-1-hd` |
| `OPENAI_TTS_VOICE` | ❌ | `nova` | Voice: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` |
| `LANGUAGE` | ❌ | `en` | ISO-639-1 language code |
| `HOST_PORT` | ❌ | `8000` | Port to expose on host |

### TTS Provider Options

**OpenAI TTS** (recommended):
```bash
TTS_PROVIDER=OPENAI
OPENAI_TTS_MODEL=tts-1        # or tts-1-hd for higher quality
OPENAI_TTS_VOICE=nova         # alloy, echo, fable, onyx, nova, shimmer
```

**Google TTS** (free, no API key):
```bash
TTS_PROVIDER=gTTS
```

**ElevenLabs** (premium quality):
```bash
TTS_PROVIDER=ELEVENLABS
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE=EXAVITQu4vr4xnSDxMaL
```

**Edge TTS** (Microsoft):
```bash
TTS_PROVIDER=EDGETTS
EDGETTS_VOICE=en-US-EricNeural
```

---

## Production Deployment

### Step 1: Choose a VPS Provider

Recommended providers and costs:

| Provider | Plan | Price | Specs |
|----------|------|-------|-------|
| [DigitalOcean](https://www.digitalocean.com/) | Basic Droplet | $6/mo | 1 vCPU, 1GB RAM, 25GB SSD |
| [Hetzner](https://www.hetzner.com/) | CX11 | $5/mo | 1 vCPU, 2GB RAM, 20GB SSD |
| [Linode](https://www.linode.com/) | Nanode | $5/mo | 1 vCPU, 1GB RAM, 25GB SSD |
| [Vultr](https://www.vultr.com/) | Regular Performance | $6/mo | 1 vCPU, 1GB RAM, 25GB SSD |

**Recommended**: DigitalOcean or Hetzner for reliability and performance.

### Step 2: Server Setup

#### 2.1 Connect to Server
```bash
ssh root@your-server-ip
```

#### 2.2 Install Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify installation
docker --version
```

#### 2.3 Deploy Widget
```bash
# Using deployment script
curl -o deploy.sh https://raw.githubusercontent.com/yourorg/customgpt-widget/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

Or using docker-compose:
```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/yourorg/customgpt-widget/main/docker-compose.yml
curl -o .env.example https://raw.githubusercontent.com/yourorg/customgpt-widget/main/.env.example
cp .env.example .env
nano .env  # Add your API keys
docker-compose up -d
```

### Step 3: Domain Setup

#### 3.1 Point Domain to Server
Add an A record in your DNS settings:
```
Type: A
Name: widget (or @ for root domain)
Value: your-server-ip
TTL: 300
```

#### 3.2 Install Nginx
```bash
apt update
apt install nginx -y
```

#### 3.3 Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/customgpt-widget`:
```nginx
server {
    listen 80;
    server_name widget.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/customgpt-widget /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 4: SSL Certificate (HTTPS)

#### 4.1 Install Certbot
```bash
apt install certbot python3-certbot-nginx -y
```

#### 4.2 Obtain Certificate
```bash
certbot --nginx -d widget.yourdomain.com
```

Follow prompts to:
- Enter email address
- Agree to Terms of Service
- Choose to redirect HTTP to HTTPS (recommended)

#### 4.3 Auto-Renewal
Certbot automatically creates a renewal cron job. Verify:
```bash
certbot renew --dry-run
```

### Step 5: Update Embed Code

Replace localhost with your domain:
```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://widget.yourdomain.com/embed.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
```

---

## Server Recommendations

### Minimum Requirements
- **CPU**: 1 vCPU (2 vCPU recommended for high traffic)
- **RAM**: 1GB (2GB recommended)
- **Storage**: 10GB SSD
- **Network**: 1TB/month bandwidth

### Recommended Configurations

**Small Site** (<1,000 conversations/month):
- DigitalOcean Basic Droplet: $6/mo
- 1 vCPU, 1GB RAM, 25GB SSD

**Medium Site** (1,000-10,000 conversations/month):
- DigitalOcean Standard Droplet: $12/mo
- 1 vCPU, 2GB RAM, 50GB SSD

**Large Site** (>10,000 conversations/month):
- DigitalOcean CPU-Optimized: $40/mo
- 2 vCPU, 4GB RAM, 80GB SSD

### Operating System
- **Recommended**: Ubuntu 22.04 LTS or 24.04 LTS
- **Also supported**: Debian 11/12, CentOS 8+, Rocky Linux 8+

---

## Troubleshooting

### Container Won't Start

**Check logs**:
```bash
docker logs customgpt-widget
```

**Common issues**:
1. **Port already in use**:
   ```bash
   # Check what's using port 8000
   lsof -i :8000

   # Change port in .env or deployment script
   HOST_PORT=8001
   ```

2. **Invalid API keys**:
   - Verify keys in `.env` file
   - Check for extra spaces or quotes
   - Ensure CustomGPT keys are provided if `USE_CUSTOMGPT=true`

3. **Docker daemon not running**:
   ```bash
   # Start Docker (Linux)
   systemctl start docker

   # macOS/Windows: Start Docker Desktop
   ```

### Widget Not Loading on Website

**Check CORS**:
- Ensure your domain is allowed in CORS settings
- Check browser console for CORS errors

**Check network**:
```bash
# Test from server
curl http://localhost:8000/docs

# Test from outside
curl http://your-domain.com/docs
```

**Check firewall**:
```bash
# Allow port 80 and 443 (Ubuntu/Debian)
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
```

### Voice Features Not Working

1. **Check OpenAI API key**:
   ```bash
   docker exec customgpt-widget env | grep OPENAI
   ```

2. **Check browser permissions**:
   - Microphone access required
   - Must be served over HTTPS in production

3. **Check TTS provider**:
   ```bash
   docker logs customgpt-widget | grep TTS
   ```

### High Memory Usage

**Monitor resources**:
```bash
docker stats customgpt-widget
```

**Set memory limits** in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 1G
    reservations:
      memory: 512M
```

### Update to Latest Version

**Docker Compose**:
```bash
docker-compose pull
docker-compose up -d
```

**Manual**:
```bash
docker pull zriyansh/customgpt-widget:latest
docker stop customgpt-widget
docker rm customgpt-widget
# Re-run docker run command with latest image
```

---

## Useful Commands

### Container Management
```bash
# View logs
docker logs -f customgpt-widget

# Enter container shell
docker exec -it customgpt-widget bash

# Restart container
docker restart customgpt-widget

# Stop container
docker stop customgpt-widget

# Remove container
docker rm -f customgpt-widget
```

### Monitoring
```bash
# Resource usage
docker stats customgpt-widget

# Process list
docker top customgpt-widget

# Inspect configuration
docker inspect customgpt-widget
```

### Cleanup
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove all unused data
docker system prune -a
```

---

## Next Steps

1. ✅ Deploy widget using preferred method
2. ✅ Configure API keys and settings
3. ✅ Test locally at `http://localhost:8000`
4. ✅ Set up production domain and SSL
5. ✅ Embed widget on your website
6. ✅ Monitor logs and performance

**Need Help?**
- GitHub Issues: [yourorg/customgpt-widget/issues](https://github.com/yourorg/customgpt-widget/issues)
- Documentation: [Full docs](../README.md)

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [CustomGPT API Docs](https://docs.customgpt.ai/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

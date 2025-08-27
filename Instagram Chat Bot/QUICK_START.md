# Instagram CustomGPT Bot - Quick Start Guide

Get your Instagram bot running in 15 minutes! 🚀

## ⚡ Prerequisites (5 minutes)

1. **Instagram Business Account** linked to a Facebook Page
2. **Facebook Developer Account** ([create here](https://developers.facebook.com/))
3. **CustomGPT Account** with API access ([get API key](https://app.customgpt.ai/))

## 🚀 Fast Setup

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

### Step 2: Deploy Bot (5 minutes)

**Option A: Railway (Recommended)**
1. Fork this repository to your GitHub
2. Go to [railway.app](https://railway.app) and sign in with GitHub
3. Click "Deploy from GitHub" → Select your fork
4. Add environment variables (see below)
5. Deploy! ✅

**Option B: Local Development**
```bash
cd "Instagram Chat Bot"
pip install -r requirements.txt
cp .env.example .env
# Edit .env file with your credentials
python bot.py
```

### Step 3: Environment Variables (2 minutes)

Add these in Railway dashboard or `.env` file:

```env
# Required
INSTAGRAM_ACCESS_TOKEN=EAAG...your_token_here
INSTAGRAM_APP_SECRET=your_app_secret_here
WEBHOOK_VERIFY_TOKEN=any_random_string_123
CUSTOMGPT_API_KEY=your_customgpt_api_key
DEFAULT_AGENT_ID=your_default_agent_id

# Optional
REDIS_URL=${{Redis.REDIS_URL}}  # Add Redis addon in Railway
```

### Step 4: Configure Webhook (3 minutes)

1. **Get your bot URL**:
   - Railway: `https://your-app.up.railway.app/webhook`
   - Local: Use ngrok: `ngrok http 3000` → use the HTTPS URL

2. **Set webhook in Facebook**:
   - Go to your Facebook App → Instagram → Webhooks
   - Callback URL: `https://your-domain.com/webhook`
   - Verify Token: Same as your `WEBHOOK_VERIFY_TOKEN`
   - Subscribe to: `messages` and `messaging_postbacks`

### Step 5: Test Your Bot (2 minutes)

1. **Health check**: Visit `https://your-domain.com/health`
2. **Send a DM** to your Instagram Business account
3. **Bot should respond** with a welcome message!

## 🎉 You're Done!

Your bot is now live and responding to Instagram DMs!

## 🤖 Bot Commands

| User Input | Bot Response |
|------------|-------------|
| Any message | AI-powered response from CustomGPT |
| `/help` | Show help and starter questions |
| `/agent 123` | Switch to agent with ID 123 |
| `1`, `2`, `3` | Select starter question by number |

## 🛟 Quick Troubleshooting

### Bot doesn't respond?
```bash
# Check bot health
curl https://your-domain.com/health

# Check logs in Railway dashboard or:
docker logs your-container
```

### Webhook verification fails?
- Double-check `WEBHOOK_VERIFY_TOKEN` matches in both places
- Ensure URL ends with `/webhook`
- URL must be HTTPS (not HTTP)

### "Agent not found" error?
- Verify `CUSTOMGPT_API_KEY` is valid
- Check `DEFAULT_AGENT_ID` exists in your CustomGPT account
- Test: `curl -H "Authorization: Bearer YOUR_KEY" https://app.customgpt.ai/api/v1/projects`

## ⚡ Quick Configuration

### Rate Limiting
```env
RATE_LIMIT_PER_USER_PER_MINUTE=10  # Default: 10
RATE_LIMIT_PER_USER_PER_HOUR=50    # Default: 50
```

### Security
```env
# Only allow specific users (comma-separated)
ALLOWED_USER_IDS=user1,user2,user3

# Block specific users (comma-separated)
BLOCKED_USER_IDS=spam_user1,blocked_user2
```

### Features
```env
ENABLE_STARTER_QUESTIONS=true     # Show question suggestions
ENABLE_CITATIONS=true             # Include source links
ENABLE_TYPING_INDICATOR=true      # Show "typing..." status
```

## 🚀 Next Steps

1. **Customize Starter Questions**: Edit `starter_questions.py`
2. **Add More Agents**: Users can switch with `/agent [id]`
3. **Monitor Usage**: Check `/health` endpoint regularly
4. **Scale Up**: Add Redis addon for better performance
5. **Go Production**: Review `DEPLOYMENT.md` for advanced setup

## 📖 Need More Help?

- **Full Documentation**: See `README.md`
- **Deployment Options**: See `DEPLOYMENT.md`
- **Issues**: Create a GitHub issue
- **CustomGPT API**: [docs.customgpt.ai](https://docs.customgpt.ai)

---

**Stuck?** The most common issue is webhook configuration. Double-check your URLs and tokens! 🕵️‍♀️
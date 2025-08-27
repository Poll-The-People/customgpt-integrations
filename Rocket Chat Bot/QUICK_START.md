# Quick Start Guide - Rocket Chat CustomGPT Bot

Get your bot running in 15 minutes!

## 🚀 Fastest Setup (Railway.app)

### 1. Prerequisites
- CustomGPT API key from [app.customgpt.ai](https://app.customgpt.ai)
- Rocket Chat server access (admin for bot creation)
- GitHub account

### 2. Create Bot User in Rocket Chat
1. Login as admin to Rocket Chat
2. Go to Administration → Users → New
3. Create user with:
   - Username: `customgpt-bot`
   - Email: `bot@example.com`
   - Password: (save this!)
   - Roles: Add `bot` role
4. Save and note the username/password

### 3. Deploy to Railway
1. Fork this repository to your GitHub
2. Go to [railway.app](https://railway.app)
3. Click "Start a New Project"
4. Choose "Deploy from GitHub repo"
5. Select your forked repository
6. Add these environment variables:
   ```
   ROCKET_CHAT_URL=https://your-rocketchat.com
   ROCKET_CHAT_USER=customgpt-bot
   ROCKET_CHAT_PASSWORD=your-bot-password
   CUSTOMGPT_API_KEY=your-api-key
   CUSTOMGPT_PROJECT_ID=your-project-id
   ```
7. Click "Deploy"

### 4. Test Your Bot
1. Go to any Rocket Chat channel
2. Type: `@customgpt-bot hello`
3. Bot should respond!

## 🎯 Free Hosting Options Comparison

| Platform | Setup Time | Pros | Cons | Best For |
|----------|------------|------|------|----------|
| Railway | 5 mins | Easy, reliable | Limited free hours | Quick testing |
| Render | 10 mins | Generous free tier | Sleeps after 15 min | Personal use |
| Fly.io | 15 mins | Global, fast | Needs credit card | Production |
| Google Apps Script | 20 mins | 100% free, no limits | Webhook only | Low traffic |
| VPS | 30 mins | Full control | Costs money | High traffic |

## 💡 Choose Your Path

### "I want it free forever"
→ Use **Google Apps Script** (see `google-apps-script/README.md`)
- ✅ No costs ever
- ✅ Google maintains it
- ❌ Limited features
- ❌ Webhook-based only

### "I want full features, free to start"
→ Use **Render.com** or **Railway**
- ✅ Full bot features
- ✅ Easy deployment
- ⚠️ Free tier limits
- 💰 Upgrade when needed

### "I want production-ready"
→ Use **Fly.io** or **VPS**
- ✅ Full control
- ✅ High performance
- ✅ Scalable
- 💰 Small monthly cost

## 🔧 Configuration Options

### Basic (Required)
```env
ROCKET_CHAT_URL=https://chat.example.com
ROCKET_CHAT_USER=bot-username
ROCKET_CHAT_PASSWORD=bot-password
CUSTOMGPT_API_KEY=cgpt_xxxxx
CUSTOMGPT_PROJECT_ID=12345
```

### Enhanced Features
```env
# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_USER_CALLS=10

# Features
ENABLE_STARTER_QUESTIONS=true
ENABLE_CITATIONS=true
ENABLE_THREADING=true

# Security
MAX_MESSAGE_LENGTH=2000
BLOCKED_USERS=user1,user2
```

## 📝 Common Commands

Users can interact with your bot using:

- `@bot help` - Show help message
- `@bot start` - Show starter questions
- `@bot clear` - Clear conversation
- `@bot quota` - Check rate limits
- `@bot your question` - Ask anything!

## 🚨 Troubleshooting

### Bot not responding?
1. Check bot is online in Rocket Chat
2. Verify credentials in environment
3. Check deployment logs
4. Ensure bot has channel permissions

### Rate limit errors?
- Adjust `RATE_LIMIT_USER_CALLS` higher
- Default is 5 requests/minute per user

### Wrong responses?
- Verify `CUSTOMGPT_PROJECT_ID` is correct
- Check agent is published in CustomGPT

## 📊 Monitoring Your Bot

### View Logs
- **Railway**: `railway logs`
- **Render**: Dashboard → Logs
- **Fly.io**: `fly logs`
- **Docker**: `docker logs container-name`

### Check Status
- Send `@bot help` - should respond instantly
- Check `@bot stats` for usage info

## 🎨 Customization

### Change Bot Personality
Edit `.env`:
```env
BOT_NAME=My AI Assistant
BOT_DESCRIPTION=Your friendly AI helper
DEFAULT_LANGUAGE=es  # Spanish responses
```

### Add Starter Questions
```env
STARTER_QUESTIONS=How can I help?|What's new?|Tell me a joke
```

### Modify Rate Limits
```env
RATE_LIMIT_CALLS=20  # Global: 20 per minute
RATE_LIMIT_USER_CALLS=10  # Per user: 10 per minute
```

## 🔐 Security Best Practices

1. **Never commit `.env` file**
2. **Use strong bot password**
3. **Limit bot to specific channels**:
   ```env
   ALLOWED_CHANNELS=channel1,channel2
   ```
4. **Block abusive users**:
   ```env
   BLOCKED_USERS=spammer1,spammer2
   ```

## 📚 Next Steps

1. **Enhance Features**: See `enhanced_bot.py` for advanced features
2. **Add Analytics**: Track usage patterns
3. **Custom Commands**: Extend bot functionality
4. **Multi-language**: Support multiple languages
5. **Integrate Webhooks**: Connect to other services

## 🆘 Get Help

- Check `README.md` for detailed documentation
- See `DEPLOYMENT.md` for production setup
- Visit CustomGPT docs: https://docs.customgpt.ai
- Open an issue in the repository

---

**Ready to customize?** Edit `config.py` for more options!

**Want advanced features?** Check out `enhanced_bot.py`!

**Need production deployment?** See `DEPLOYMENT.md`!
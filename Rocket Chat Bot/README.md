# Rocket Chat CustomGPT Bot

A powerful Rocket Chat bot that integrates with CustomGPT's API to provide AI-powered responses with built-in rate limiting, session management, and advanced features.

Get you [CustomGPT.ai RAG API key here](https://app.customgpt.ai/register?utm_source=github_integrations), needed to use this integration. 


## Features

- 🤖 **AI-Powered Responses**: Leverages CustomGPT's knowledge base for intelligent answers
- 🔒 **Security**: Built-in rate limiting, user blocking, and message validation
- 💬 **Conversation Management**: Maintains context across messages with session handling
- 📚 **Citation Support**: Includes sources and references in responses
- 🎯 **Starter Questions**: Contextual conversation starters for better engagement
- 🧵 **Thread Support**: Maintains conversation context in threads
- 📊 **Usage Analytics**: Track bot usage and performance metrics
- 🌐 **Multi-language**: Support for multiple languages
- ⚡ **Quick Actions**: Enhanced user interactions with follow-up suggestions

## Prerequisites

- Python 3.8 or higher
- Rocket Chat server (self-hosted or cloud)
- CustomGPT API key and project ID
- Bot user account in Rocket Chat

## Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd "Rocket Chat Bot"
```

2. **Create virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

### Required Settings

| Variable | Description | Example |
|----------|-------------|---------|
| `ROCKET_CHAT_URL` | Your Rocket Chat server URL | `https://chat.example.com` |
| `ROCKET_CHAT_USER` | Bot username | `customgpt-bot` |
| `ROCKET_CHAT_PASSWORD` | Bot password | `secure-password` |
| `CUSTOMGPT_API_KEY` | Your CustomGPT API key | `cgpt_...` |
| `CUSTOMGPT_PROJECT_ID` | Your CustomGPT project/agent ID | `12345` |

### Optional Settings

See `.env.example` for all available configuration options including rate limiting, security, and feature flags.

## Creating a Bot User in Rocket Chat

1. **Login as admin** to your Rocket Chat instance
2. **Navigate to** Administration → Users
3. **Click** "New" to create a new user
4. **Configure**:
   - Username: `customgpt-bot` (or your preference)
   - Email: `bot@example.com`
   - Password: Set a secure password
   - Roles: Add "bot" role
5. **Save** the user
6. **Get bot credentials**:
   - Username and password for `.env`
   - Or get auth token from user settings

## Running the Bot

### Local Development

```bash
python bot.py
```

### Using Enhanced Features

```bash
python enhanced_bot.py
```

### Production with Process Manager

Using systemd:
```bash
sudo cp rocketchat-bot.service /etc/systemd/system/
sudo systemctl enable rocketchat-bot
sudo systemctl start rocketchat-bot
```

Using PM2:
```bash
pm2 start bot.py --name rocketchat-bot --interpreter python3
pm2 save
pm2 startup
```

## Deployment Options

### 1. Self-Hosted Server

**Using Docker**:
```bash
docker build -t rocketchat-customgpt-bot .
docker run -d --env-file .env --name customgpt-bot rocketchat-customgpt-bot
```

**Using Docker Compose**:
```bash
docker-compose up -d
```

### 2. Free Hosting Providers

#### Railway.app
1. Fork this repository
2. Connect Railway to your GitHub
3. Create new project from repository
4. Add environment variables
5. Deploy

#### Render.com
1. Create new Web Service
2. Connect GitHub repository
3. Build command: `pip install -r requirements.txt`
4. Start command: `python bot.py`
5. Add environment variables

#### Fly.io
```bash
fly auth login
fly launch
fly secrets set CUSTOMGPT_API_KEY=your_key
fly deploy
```

#### Google Cloud Run
```bash
gcloud run deploy rocketchat-bot \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars-from-file .env.yaml
```

### 3. VPS Deployment

1. **Setup server** (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

2. **Deploy bot**:
```bash
git clone <repository>
cd "Rocket Chat Bot"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. **Run with systemd** (see rocketchat-bot.service)

## Usage

### Basic Commands

- `@bot help` - Show help message
- `@bot start` - Show starter questions  
- `@bot clear` - Clear conversation context
- `@bot stats` - Show usage statistics
- `@bot quota` - Check remaining quota

### Asking Questions

Simply mention the bot or send a direct message:
- `@bot What is machine learning?`
- `@customgpt-bot How do I create a REST API?`
- In DM: `Tell me about cloud computing`

### Using Threads

Reply to a bot message to continue the conversation in a thread while maintaining context.

## Advanced Features

### Rate Limiting

The bot includes sophisticated rate limiting:
- **Global limit**: 10 requests per minute (configurable)
- **Per-user limit**: 5 requests per minute (configurable)
- **API limit checking**: Monitors CustomGPT API usage

### Session Management

- Sessions timeout after 1 hour of inactivity
- Context is maintained within sessions
- Automatic cleanup of expired sessions

### Security Features

- User blocking capability
- Channel restrictions
- Message length validation
- Input sanitization

### Monitoring

Track bot performance with built-in analytics:
- Request counts
- Response times
- Error rates
- User engagement

## Troubleshooting

### Bot not responding

1. Check bot is online in Rocket Chat
2. Verify bot has permissions in channel
3. Check logs for errors
4. Ensure proper mention format

### Authentication errors

1. Verify Rocket Chat credentials
2. Check CustomGPT API key
3. Ensure bot user has correct roles

### Rate limit errors

1. Check rate limit configuration
2. Monitor API usage
3. Adjust limits as needed

## Google Apps Script Alternative

For lightweight deployments, see `google-apps-script/` directory for a GAS implementation that:
- Runs on Google's infrastructure (free)
- No server management required
- Limited to webhook-based responses
- Best for low-volume usage

## Development

### Project Structure

```
Rocket Chat Bot/
├── bot.py                 # Main bot implementation
├── enhanced_bot.py        # Enhanced features
├── config.py             # Configuration management
├── customgpt_client.py   # CustomGPT API client
├── rate_limiter.py       # Rate limiting logic
├── conversation_manager.py # Session management
├── requirements.txt      # Dependencies
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose setup
└── README.md           # Documentation
```

### Adding New Features

1. Extend `EnhancedRocketChatBot` class
2. Add configuration options to `Config`
3. Update command patterns
4. Add tests

### Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

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
- Rocket Chat API: [docs.rocket.chat/reference/api](https://docs.rocket.chat/reference/api)

### Support Channels
- Issues: Create an issue in the repository
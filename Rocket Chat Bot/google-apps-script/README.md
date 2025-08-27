# Google Apps Script Implementation for Rocket Chat CustomGPT Bot

A lightweight, serverless implementation of the Rocket Chat CustomGPT bot using Google Apps Script.

## Overview

This implementation uses Google Apps Script (GAS) to create a webhook-based bot that:
- Runs on Google's infrastructure (free)
- No server management required
- Responds to Rocket Chat outgoing webhooks
- Includes basic rate limiting and session management

## Limitations vs Full Python Bot

| Feature | Python Bot | GAS Bot |
|---------|-----------|---------|
| Real-time messaging | ✅ Full support | ❌ Webhook only |
| Session management | ✅ Advanced | ⚠️ Basic |
| Rate limiting | ✅ Advanced | ⚠️ Basic |
| Threading | ✅ Full support | ✅ Supported |
| Starter questions | ✅ Interactive | ✅ Text-based |
| Deployment | Requires server | Serverless |
| Cost | Server costs | Free |
| Scalability | Depends on server | Google handles it |

## Setup Instructions

### 1. Create Google Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click "New project"
3. Name it "Rocket Chat CustomGPT Bot"

### 2. Copy Code

1. Delete any existing code
2. Copy contents of `Code.gs` into the editor
3. Save the project (Ctrl+S or Cmd+S)

### 3. Configure Script Properties

1. In the editor, run the `setup()` function once
2. Go to Project Settings → Script Properties
3. Update these properties:
   - `CUSTOMGPT_API_KEY`: Your CustomGPT API key
   - `CUSTOMGPT_PROJECT_ID`: Your project/agent ID
   - `ROCKET_CHAT_URL`: Your Rocket Chat server URL
   - `ROCKET_CHAT_USER_ID`: Bot user ID
   - `ROCKET_CHAT_AUTH_TOKEN`: Bot auth token
   - `WEBHOOK_TOKEN`: Secret token for webhook security

### 4. Deploy as Web App

1. Click "Deploy" → "New Deployment"
2. Configuration:
   - Type: Web app
   - Description: "Rocket Chat Bot Webhook"
   - Execute as: Me
   - Who has access: Anyone
3. Click "Deploy"
4. Copy the Web app URL

### 5. Configure Rocket Chat Webhook

1. In Rocket Chat, go to Administration → Integrations
2. Create new "Outgoing WebHook"
3. Configure:
   - **Event Trigger**: Message Sent
   - **Enabled**: Yes
   - **Channel**: All public channels (or specific ones)
   - **Trigger Words**: Your bot name or @mention
   - **URLs**: Paste your GAS Web app URL + `?token=your-webhook-token`
   - **Post as**: Your bot user

### 6. Create Bot User in Rocket Chat

1. Create a new user for the bot
2. Get the user ID and auth token:
   ```javascript
   // In browser console while logged in as admin:
   fetch('/api/v1/users.info?username=bot-username', {
     headers: {
       'X-Auth-Token': 'your-admin-token',
       'X-User-Id': 'your-admin-id'
     }
   }).then(r => r.json()).then(console.log)
   ```

## Usage

Once configured, users can interact with the bot by:
- Mentioning the bot: `@bot-name your question`
- Using trigger words in channels
- Commands: `help`, `start`, `quota`

## Customization

### Adding Commands

Edit the switch statement in `doPost()`:
```javascript
case 'yourcommand':
  response = 'Your response';
  break;
```

### Modifying Rate Limits

Change in CONFIG:
```javascript
RATE_LIMIT_PER_USER: 10, // requests per window
RATE_LIMIT_WINDOW: 300, // 5 minutes
```

### Adding Features

You can extend the bot by:
1. Adding more CustomGPT API features
2. Implementing caching using Script Properties
3. Adding analytics using Google Sheets
4. Creating admin commands

## Troubleshooting

### Bot Not Responding

1. Check webhook URL is correct
2. Verify token matches in URL and script
3. Check execution logs in GAS editor
4. Ensure bot user has permissions

### Rate Limit Issues

- Rate limits reset every minute
- Stored in Script Properties (has limits)
- Consider using Cache Service for better performance

### API Errors

1. Verify API credentials
2. Check CustomGPT API status
3. Look at execution transcript in GAS

## Performance Considerations

- GAS has execution time limits (6 minutes)
- Script Properties have size limits
- Consider using Cache Service for temporary data
- URL Fetch has daily quotas

## Advanced Features

### Using Cache Service

```javascript
// For better rate limiting
const cache = CacheService.getScriptCache();
cache.put(key, value, expirationInSeconds);
```

### Logging to Sheets

```javascript
// Log interactions
function logToSheet(data) {
  const sheet = SpreadsheetApp.openById('sheet-id').getSheetByName('Logs');
  sheet.appendRow([new Date(), data.user, data.message, data.response]);
}
```

### Scheduled Cleanup

```javascript
// Add time-based trigger for cleanup
function cleanup() {
  // Clean old rate limit data
  const props = PropertiesService.getScriptProperties();
  const keys = props.getKeys();
  keys.forEach(key => {
    if (key.startsWith('rate_')) {
      // Check and clean old data
    }
  });
}
```

## When to Use GAS vs Python Bot

**Use GAS when:**
- Low to medium traffic
- Want zero infrastructure
- Budget constraints
- Simple integration needs

**Use Python bot when:**
- Need real-time features
- High traffic volume
- Advanced session management
- Complex integrations

## Support

For issues specific to the GAS implementation, check:
- [Apps Script Documentation](https://developers.google.com/apps-script)
- [Rocket Chat Webhooks](https://docs.rocket.chat/guides/administrator-guides/integrations)
- GAS execution logs and quotas
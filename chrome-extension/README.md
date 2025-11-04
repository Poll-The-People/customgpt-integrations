# CustomGPT Chrome Extension (White-Label Solution)

**Pure JavaScript Chrome extension with Vercel serverless proxy** for CustomGPT.ai API integration. Designed for your API customers to create their own branded Chrome extensions with zero user setup.

Get you [CustomGPT.ai RAG API key here](https://app.customgpt.ai/register?utm_source=github_integrations), needed to use this integration. 


![Chrome Extension Demo](../images/customgpt_chrome_extension_1.png)
![Chrome Extension Chat](../images/customgpt_chrome_extension_2.png)
---

## 🎯 Overview

This is a **white-label solution** enabling your CustomGPT.ai API customers to:

1. Deploy a Vercel proxy server with their CustomGPT API credentials
2. Configure the extension with their proxy URL
3. Publish to Chrome Web Store under their brand
4. End users install and use immediately (zero setup required!)


---

## Quick Start (5 Minutes)

### Step 1: Deploy Vercel Proxy

```bash
cd vercel-proxy

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your CustomGPT credentials
# CUSTOMGPT_API_KEY=your_key_here
# CUSTOMGPT_PROJECT_ID=your_project_id

# Deploy to Vercel
npm run deploy
# Or: vercel --prod

# Note the deployment URL: https://your-proxy.vercel.app
```

### Step 2: Configure Extension

```bash
cd extension/js

# Edit config.js
# Change line 19:
VERCEL_PROXY_URL: 'https://your-proxy.vercel.app'
```

### Step 3: Load Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `chrome-extension/extension/` folder
5. Extension icon appears in toolbar!

### Step 4: Test

1. Click extension icon
2. See suggested starter questions
3. Click a question OR type your own message
4. Watch AI respond with typing indicator
5. See timestamps, copy messages, react with thumbs up/down
6. View sources/citations when available

---

## Screenshots

### Chat Interface

- **Welcome Screen**: Clean welcome with agent avatar and suggested questions
- **Active Chat**: Modern message bubbles with timestamps and actions
- **Citations**: Collapsible sources section with rich previews
- **Send Button**: Prominent "Send" button with animated paper plane icon

### UI Features Showcase

- Purple gradient theme with smooth animations
- WCAG AA accessible color contrast
- Smooth scroll and fade-in animations
- Professional, emoji-free design

---

## 🏗️ Technical Architecture

**Frontend**: Vanilla JavaScript (ES6+), Chrome Manifest V3, CSS3 with theming
**Backend**: Vercel serverless functions, Node.js
**API**: CustomGPT integration via proxy (chat, health, settings, feedback, citations)
**Security**: Environment variables for secrets, CORS configured, no frontend API keys

---

## ⚙️ Configuration Guide

### Admin Configuration (Before Publishing)

#### 1. Extension Configuration

Edit `extension/js/config.js`:

```javascript
const CONFIG = {
  // REQUIRED: Your Vercel proxy URL
  VERCEL_PROXY_URL: 'https://your-proxy.vercel.app',

  // OPTIONAL: Branding
  EXTENSION_NAME: 'CustomGPT Assistant',
  EXTENSION_TAGLINE: 'Your AI-powered assistant',

  // OPTIONAL: Feature flags
  FEATURES: {
    AUTO_SCROLL: true
  }
};
```

**Note**: The agent name, avatar, and suggested questions are **automatically fetched** from your CustomGPT agent settings via the `/api/settings` endpoint. No hardcoded agent information in the extension.

#### 2. Host Permissions Configuration

**CRITICAL**: Update `extension/manifest.json` to match your proxy domain.

**Current default**:
```json
"host_permissions": [
  "https://*.vercel.app/*"
]
```

**⚠️ This MUST be updated if:**

- Using a custom domain (not Vercel)
- Using a specific subdomain for security
- Hosting on Railway, Render, or other platforms

**Examples for different hosting:**

**Vercel with custom domain:**
```json
"host_permissions": [
  "https://api.yourdomain.com/*"
]
```

**Railway:**
```json
"host_permissions": [
  "https://your-app.railway.app/*"
]
```

**Render:**
```json
"host_permissions": [
  "https://your-app.onrender.com/*"
]
```

**Multiple domains (development + production):**
```json
"host_permissions": [
  "https://your-proxy-dev.vercel.app/*",
  "https://api.yourdomain.com/*"
]
```

**🔒 Security Best Practice:**
- ✅ Use specific domain: `https://your-specific-app.vercel.app/*`
- ❌ Avoid wildcards: `https://*.vercel.app/*` (too broad, allows any Vercel app)

**Why this matters:**

- Chrome requires explicit permission for the extension to communicate with your proxy
- Wrong domain = Extension can't fetch responses from your API
- Users will see "Failed to fetch" errors if misconfigured

---

#### 3. Manifest Customization Checklist

Edit `extension/manifest.json` before publishing:

**Required Updates:**
- [ ] Update `host_permissions` to match your proxy URL (see above)
- [ ] Change `name` (line 3): Your extension name
- [ ] Change `description` (line 4): Your extension description
- [ ] Update `version` (line 5): Your version number (e.g., "1.0.0")

**Optional Updates:**
- [ ] Update `icons` paths if using custom icon filenames
- [ ] Change `action.default_title` (tooltip on extension icon)
- [ ] Modify `permissions` if adding features (be minimal!)

**Example manifest.json key fields:**
```json
{
  "name": "My Company AI Assistant",
  "description": "Get instant answers from our knowledge base",
  "version": "1.0.0",
  "host_permissions": [
    "https://api.mycompany.com/*"
  ]
}
```

**⚠️ Content Security Policy (CSP):**
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```
- **Purpose**: Security policy that only allows scripts from the extension itself
- **Don't modify** unless you know what you're doing
- **Why exists**: Chrome Manifest V3 security requirement
- **What it prevents**: Inline scripts, external scripts, eval()

---

#### 4. Branding Customization

**Extension Name & Description**:
- Edit `extension/manifest.json` (lines 3-5)

**Icons**:
- Add `icon16.png`, `icon48.png`, `icon128.png` to `extension/icons/`
- Use your brand colors

**Styling**:
- Edit `extension/css/popup.css` (CSS variables at top)

```css
:root {
  --primary-color: #8b5cf6;      /* Change to your brand color */
  --primary-hover: #7c3aed;
  /* ... */
}
```

---

## 🔧 Vercel Deployment Details

### Environment Variables

Set in Vercel dashboard or via CLI:

```bash
# Required
CUSTOMGPT_API_KEY=your_api_key_here
CUSTOMGPT_PROJECT_ID=your_project_id_here
```

### API Endpoints

Your deployed proxy provides:

- `POST /api/chat` - Send message, get AI response
- `GET /api/health` - Health check
- `GET /api/settings` - Get agent settings

Test health endpoint:
```bash
curl https://your-proxy.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "configured": true,
  "config": {
    "hasCustomGPTKey": true,
    "hasProjectId": true
  }
}
```

---

## Publishing to Chrome Web Store

### Prerequisites

1. Google Developer account ($5 one-time fee)
2. Register at: https://chrome.google.com/webstore/devconsole/

### Preparation Checklist

- [ ] Configure `config.js` with production Vercel URL
### Package Extension

```bash
cd extension/

# Create ZIP file
zip -r customgpt-extension.zip . -x "*.DS_Store" "*.git*"
```

### Upload to Chrome Web Store

1. Go to Chrome Web Store Developer Dashboard
2. Click "New Item"
3. Upload `customgpt-extension.zip`
4. Fill out listing:
   - **Name**: Your Extension Name
   - **Summary**: Short description (132 chars)
   - **Description**: Full description with features
   - **Category**: Productivity
   - **Language**: English (or your language)
   - **Screenshots**: At least 1 (1280x800px)
   - **Privacy Policy**: URL to your privacy policy (required!)
   - **Permissions Justification**: Explain why you need storage/activeTab

5. Click "Submit for Review"
6. Review time: 1-3 days typically

### CORS Configuration

Current `vercel.json` allows all origins (`*`). For production, consider restricting:

```json
{
  "headers": [{
    "key": "Access-Control-Allow-Origin",
    "value": "chrome-extension://YOUR_EXTENSION_ID"
  }]
}
```

Get extension ID after publishing to Chrome Web Store.

---

## Troubleshooting

### "Failed to fetch" Errors

- **Cause**: `host_permissions` in [manifest.json](extension/manifest.json) doesn't match your proxy URL
- **Fix**: Update `host_permissions` to match your deployed Vercel proxy domain (see [Host Permissions Configuration](#2-host-permissions-configuration))

### CORS Errors

- **Cause**: Incorrect proxy URL in [config.js](extension/js/config.js)
- **Fix**: Verify `VERCEL_PROXY_URL` matches your deployed Vercel URL exactly

### Extension Not Loading

- **Cause**: Invalid [manifest.json](extension/manifest.json) syntax
- **Fix**: Validate JSON syntax, ensure all required fields are present

### Agent Name Not Showing

- **Cause**: `/api/settings` endpoint not accessible
- **Fix**: Test endpoint with `curl https://your-proxy.vercel.app/api/settings`, verify API credentials in Vercel environment variables

### Manifest Validation Errors

- **Cause**: Incorrect CSP or permissions format
- **Fix**: Don't modify `content_security_policy` unless necessary, keep permissions minimal


# CustomGPT Chrome Extension (White-Label Solution)

**Pure JavaScript Chrome extension with Vercel serverless proxy** for CustomGPT API integration. Designed for your API customers to create their own branded Chrome extensions with zero user setup.

---

## 🎯 Overview

This is a **white-label solution** enabling your CustomGPT API customers to:

1. Deploy a Vercel proxy server with their CustomGPT API credentials
2. Configure the extension with their proxy URL
3. Publish to Chrome Web Store under their brand
4. End users install and use immediately (zero setup required!)


---

## 🚀 Quick Start (5 Minutes)

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

## 📸 Screenshots

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

### Frontend (Chrome Extension)

**Tech Stack**:
- Pure Vanilla JavaScript (ES6+)
- CSS3 with CSS Variables for theming
- Chrome Extension Manifest V3
- Chrome Storage API for persistence

**Key Components**:
- `popup.js` - Main UI logic and event handling
- `popup.css` - Modern styling with purple theme
- `config.js` - Configuration and feature flags
- `session.js` - Session and conversation management
- `markdown.js` - Markdown rendering for AI responses

**Performance Optimizations**:
- `requestAnimationFrame` for smooth animations
- Smooth scroll with `behavior: 'smooth'`
- Efficient event delegation
- Timestamp updates every 10 seconds (not on every render)
- Non-blocking initialization with loading screen

### Backend (Vercel Serverless)

**Tech Stack**:
- Node.js serverless functions
- Vercel deployment platform
- CustomGPT API integration

**API Endpoints**:
- `/api/chat` - Main chat endpoint with streaming support
- `/api/health` - Health check and configuration validation
- `/api/settings` - Agent configuration and metadata
- `/api/feedback` - Message reactions (thumbs up/down)
- `/api/citations` - Citation detail retrieval

**Security**:
- API keys stored in Vercel environment variables
- CORS configured for Chrome extension origin
- No sensitive data in frontend code

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
    AUTO_SCROLL: true,
    SHOW_USAGE_COUNTER: true,
    AUTO_SCROLL: true
  }
};
```

#### 3. Branding Customization

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

## 📦 Publishing to Chrome Web Store

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

## ✨ Features

### Core Functionality ✅

- **Chat Interface**: Clean, modern chat UI with CustomGPT API integration
- **Session Management**: UUID-based session tracking across conversations
- **Conversation History**: Persistent chat history using Chrome storage
- **Message Actions**: Copy messages, thumbs up/down reactions
- **Citations & Sources**: Collapsible sources section with citation details
- **Suggested Questions**: One-click starter questions for quick engagement
- **Real-time Typing Indicator**: Visual feedback during AI response
- **Markdown Support**: Rich text rendering for AI responses

### UI/UX Excellence ✅

- **World-Class Send Button**: Prominent, animated button with "Send" label
- **Message Timestamps**: Relative timestamps ("Just now", "2m ago", "5h ago") that auto-update
- **Smooth Animations**: Fade-in messages, smooth scrolling, hover effects
- **Professional Design**: No emojis, icon-based interface, WCAG AA accessible
- **Responsive Layout**: Optimized 400x600px popup with proper spacing
- **Purple Theme**: Modern purple color scheme with gradient effects
- **Auto-Focus**: Smart input focus management
- **Loading States**: Visual feedback during initialization and message sending

### Accessibility ✅

- **WCAG AA Compliant**: Proper color contrast ratios (4.5:1+)
- **ARIA Labels**: Complete screen reader support
- **Keyboard Navigation**: Full keyboard accessibility with focus indicators
- **Semantic HTML**: Proper roles and live regions

### Developer Experience ✅

- **Zero User Setup**: Pre-configured with Vercel proxy URL
- **White-Label Ready**: Easy branding customization
- **Modern Stack**: Vanilla JavaScript, no framework dependencies
- **Vercel Serverless**: Scalable proxy deployment
- **CORS Handled**: Pre-configured for Chrome extensions

---

## 🚧 Roadmap & Future Features

### Planned Enhancements

- [ ] Multi-language support for international users
- [ ] Voice input/output capabilities
- [ ] File upload support for document analysis
- [ ] Dark mode theme option
- [ ] Conversation export (JSON, PDF, TXT)
- [ ] Custom CSS theme injection
- [ ] Analytics dashboard integration
- [ ] Rate limiting & usage quotas
- [ ] Offline mode with queue

# Script Tag Embed Guide - CustomGPT Widget Voice Assistant

## ✅ Easiest Integration Method

This is the **simplest** way to add the voice assistant to any website - no build process, no dependencies, just copy-paste.

---

## 🎯 Quick Start with Ready-Made Scripts

We provide **production-ready embed scripts** in the [`examples/embed-scripts/`](../../examples/embed-scripts/) directory:

### Option 1: Floating Chatbot (Intercom-Style) ⭐ RECOMMENDED

**Features**:
- ✅ Floating button in bottom-right corner
- ✅ Auto-loads agent avatar from CustomGPT API
- ✅ Slides in like Intercom/Drift
- ✅ Mobile-responsive (full-screen on mobile)
- ✅ Zero configuration needed

**Usage**:
```html
<!-- Add before closing </body> tag -->
<script src="https://your-cdn.com/script-floating-chatbot.js"></script>
```

**Customize** by editing the `config` object in [script-floating-chatbot.js](../../examples/embed-scripts/script-floating-chatbot.js):
```javascript
const config = {
    apiUrl: 'https://customgpt-widget-production.up.railway.app',  // Your backend URL
    primaryColor: '#8b5cf6',    // Brand color
    buttonSize: '60px',         // Button size
    chatWidth: '400px',         // Widget width
    chatHeight: '600px',        // Widget height
    bottomOffset: '24px',       // Distance from bottom
    rightOffset: '24px'         // Distance from right
};
```

**Test it**: Open [examples/test-pages/test-floating-chatbot.html](../../examples/test-pages/test-floating-chatbot.html)

---

### Option 2: Inline Embed

**Features**:
- ✅ Embeds in page flow (scrollable)
- ✅ Full-width or custom width
- ✅ Natural part of page content

**Usage**:
```html
<!-- Add container where you want the assistant -->
<div id="customgpt-widget-embed"></div>

<!-- Load script -->
<script src="https://your-cdn.com/script-inline-embed.js"></script>
```

**Customize** by editing the `config` object in [script-inline-embed.js](../../examples/embed-scripts/script-inline-embed.js):
```javascript
const config = {
    apiUrl: 'http://localhost:8000',    // Your backend URL
    containerId: 'customgpt-widget-embed',
    height: '600px',
    width: '100%',
    borderRadius: '12px'
};
```

**Test it**: Open [examples/test-pages/test-inline-embed.html](../../examples/test-pages/test-inline-embed.html)

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend (Railway recommended)

```bash
# Deploy to Railway.app as shown in DEPLOYMENT_GUIDE.md
# Get your URL: https://customgpt-widget-production.up.railway.app
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed backend deployment instructions.

### Step 2: Host the Embed Scripts

**Option A: Self-Host**
```bash
# Copy scripts to your web server or static hosting
cp examples/embed-scripts/script-floating-chatbot.js /path/to/your-website/public/
cp examples/embed-scripts/script-inline-embed.js /path/to/your-website/public/
```

**Option B: Use CDN**
```bash
# Upload to CDN (Cloudflare, AWS S3, etc.)
# Example with AWS S3:
aws s3 cp examples/embed-scripts/script-floating-chatbot.js s3://your-bucket/
```

### Step 3: Update Script Configuration

Edit the `apiUrl` in the script file to point to your deployed backend:

```javascript
// In script-floating-chatbot.js or script-inline-embed.js
const config = {
    apiUrl: 'https://customgpt-widget-production.up.railway.app',  // ← Update this
    // ... other config
};
```

### Step 4: Add to Your Website

```html
<!-- For floating chatbot -->
<script src="/script-floating-chatbot.js"></script>

<!-- OR for inline embed -->
<div id="customgpt-widget-embed"></div>
<script src="/script-inline-embed.js"></script>
```

---

## 🎨 Customization Guide

### Agent Avatar Integration

The floating chatbot **automatically fetches** the agent avatar from your CustomGPT API:
- Displays `chatbot_avatar` from `/api/agent/settings` endpoint
- Updates header with `chatbot_title`
- Falls back to chat bubble SVG icon if avatar unavailable

**No configuration needed** - it works out of the box!

### Brand Colors

```javascript
// Update in config object
primaryColor: '#10b981',  // Your brand color
```

### Position & Size

```javascript
// Floating chatbot
bottomOffset: '100px',   // Distance from bottom
rightOffset: '20px',     // Distance from right
buttonSize: '70px',      // Make button larger
chatWidth: '500px',      // Wider chat widget
chatHeight: '700px',     // Taller chat widget
```

### Mobile Responsiveness

The floating chatbot automatically goes **full-screen on mobile** (screens < 768px wide). No configuration needed!

---

## 🔧 For Next.js / React Sites

### Using Next.js Script Component

```tsx
// app/about/page.tsx
import Script from 'next/script';

export default function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
      <p>Your content...</p>

      {/* Load floating widget */}
      <Script
        src="/script-floating-chatbot.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
```

### Inline Embed in React

```tsx
// app/support/page.tsx
import Script from 'next/script';

export default function SupportPage() {
  return (
    <div>
      <h1>Customer Support</h1>

      {/* Widget container */}
      <div id="customgpt-widget-embed"></div>

      {/* Load inline embed script */}
      <Script
        src="/script-inline-embed.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
```

---

## 🔒 Security Configuration

### CORS Setup

Ensure your backend allows your domain:

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-website.com",
        "https://www.your-website.com",
        "http://localhost:3000"  # For local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### HTTPS Requirement

Microphone access requires HTTPS:
- ✅ Railway/Render provide HTTPS automatically
- ✅ Make sure your website uses HTTPS
- ✅ Localhost works for testing (HTTP allowed)

---

## 📦 Script File Reference

### Floating Chatbot Features

**File**: [examples/embed-scripts/script-floating-chatbot.js](../../examples/embed-scripts/script-floating-chatbot.js)

- No dependencies - pure vanilla JavaScript
- Auto-loads agent avatar from CustomGPT API
- Smooth slide-in/slide-out animations
- Keyboard support (ESC to close)
- Click outside to close
- Mobile-responsive design
- Customizable colors, position, and size

### Inline Embed Features

**File**: [examples/embed-scripts/script-inline-embed.js](../../examples/embed-scripts/script-inline-embed.js)

- No dependencies - pure vanilla JavaScript
- Embeds directly in page flow
- Customizable width and height
- Rounded corners and shadow
- Responsive design

---

## 🧪 Testing Locally

### Step 1: Start Backend

```bash
cd /path/to/CustomGPT-Widget
bash run.sh
```

Backend runs on `http://localhost:8000`

### Step 2: Update Script Config

```javascript
// Temporarily use localhost for testing
const config = {
    apiUrl: 'http://localhost:8000',  // ← For local testing
    // ... rest of config
};
```

### Step 3: Open Test Page

```bash
# Open in browser
open examples/test-pages/test-floating-chatbot.html
# or
open examples/test-pages/test-inline-embed.html
```

### Step 4: Verify

- ✅ Agent avatar appears in button (or chat bubble SVG fallback)
- ✅ Widget opens when clicking button
- ✅ Microphone permissions requested
- ✅ Voice Mode activates
- ✅ Speech transcription works
- ✅ AI responds with voice

---

## 🎯 Recommended Setup for Production

**Best Practice**: Floating chatbot with CDN hosting

1. ✅ **Deploy backend** to Railway/Render (see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md))
2. ✅ **Copy script** to your CDN or static hosting
3. ✅ **Update `apiUrl`** in script to your production backend
4. ✅ **Add script tag** to your website
5. ✅ **Test on staging** before production
6. ✅ **Configure CORS** to allow your domain
7. ✅ **Monitor** via browser console for any errors

---

## 📊 Comparison: Embed Options

| Feature              | Floating Chatbot       | Inline Embed           |
| -------------------- | ---------------------- | ---------------------- |
| Setup Time           | ⭐⭐⭐ 5 min             | ⭐⭐⭐ 5 min             |
| User Experience      | ⭐⭐⭐ Excellent         | ⭐⭐ Good               |
| Page Integration     | Non-intrusive          | Part of content        |
| Mobile Experience    | Full-screen            | Scrollable             |
| Agent Avatar Support | ✅ Yes                  | ✅ Yes (in iframe)      |
| Customization        | High                   | Medium                 |
| Best For             | Site-wide assistant    | Support/FAQ pages      |

---

## 🆘 Troubleshooting

### Agent Avatar Not Showing

**Symptoms**: Chat bubble SVG shows instead of agent avatar

**Solutions**:
1. Check backend is running and accessible
2. Verify `/api/agent/settings` endpoint returns `chatbot_avatar`
3. Check browser console for CORS errors
4. Ensure `USE_CUSTOMGPT=true` in backend environment

### Widget Not Appearing

**Symptoms**: Button doesn't show on page

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify script is loaded: View Source → search for script file
3. Check `apiUrl` is correct in config
4. Ensure backend is running and accessible

### Microphone Permission Issues

**Symptoms**: Microphone permission denied

**Solutions**:
1. Ensure website uses HTTPS (required for microphone access)
2. Check browser microphone permissions
3. Try different browser
4. For localhost testing, HTTP is allowed

### CORS Errors

**Symptoms**: `Access-Control-Allow-Origin` errors in console

**Solutions**:
1. Add your domain to `allow_origins` in `backend/main.py`
2. Restart backend after CORS changes
3. Clear browser cache and reload

---

## 💡 Advanced Customization

### Custom Loading Indicator

Edit the `loadingDiv` in the script:

```javascript
loadingDiv.innerHTML = `
    <div style="font-size: 16px; color: #8b5cf6; font-weight: bold;">
        Loading your AI assistant...
    </div>
`;
```

### Custom Animations

Modify the `@keyframes` in the script:

```css
@keyframes slideIn {
    from {
        opacity: 0;
        transform: scale(0.9) translateX(100%);
    }
    to {
        opacity: 1;
        transform: scale(1) translateX(0);
    }
}
```

### Add Custom Branding

```javascript
// Add logo to header
const logo = document.createElement('img');
logo.src = 'https://your-website.com/logo.png';
logo.style.cssText = 'width: 24px; height: 24px; margin-right: 8px;';
header.insertBefore(logo, header.firstChild);
```

---

## 📚 Related Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment options
- **[examples/README.md](../../examples/README.md)** - Example files documentation
- **[CLAUDE.md](../../CLAUDE.md)** - Development setup and architecture

---

## ✅ Final Checklist

Before going live:

- [ ] Backend deployed and accessible via HTTPS
- [ ] Script file hosted on CDN or static server
- [ ] `apiUrl` updated to production backend URL
- [ ] CORS configured to allow your domain
- [ ] Tested on desktop and mobile
- [ ] Microphone permissions working
- [ ] Agent avatar loading correctly
- [ ] Voice interaction working end-to-end
- [ ] Error handling tested (network issues, etc.)

---

**Need help? Check the troubleshooting section above or review the example files in [`examples/`](../../examples/).**

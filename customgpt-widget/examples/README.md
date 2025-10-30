# CustomGPT Widget - Integration Guide & Examples

Complete guide for integrating the CustomGPT Voice Assistant widget into any website.

---

## 📁 What's Included

```
examples/
├── README.md                           # This file
├── embed-scripts/                      # Ready-to-use embed scripts
│   ├── script-floating-chatbot.js     # Intercom-style floating widget
│   └── script-inline-embed.js         # Inline page embed
└── test-pages/                         # Test HTML pages
    ├── test-floating-chatbot.html     # Test floating widget
    ├── test-inline-embed.html         # Test inline embed
    └── test-iframe.html               # Basic iframe test
```

---

## 🎯 What You're Getting

A **voice-enabled AI chatbot** that:
- ✅ Appears as a floating button in the bottom-right corner
- ✅ Expands to full chat interface when clicked
- ✅ Supports voice conversations (speech-to-text + text-to-speech)
- ✅ Powered by CustomGPT knowledge base
- ✅ Works on desktop and mobile devices
- ✅ Fully customizable with your branding

---

## 🚀 Quick Integration (2 Steps)

### Step 1: Copy the Embed Code

Replace `YOUR-WIDGET-URL` with your widget URL:

```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'YOUR-WIDGET-URL/embed.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
```

**Example**:
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

### Step 2: Add to Your Website

Paste in your HTML `<head>` section or before closing `</body>` tag:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>

    <!-- Add widget code here -->
    <script>
      (function() {
        var script = document.createElement('script');
        script.src = 'https://widget.yourdomain.com/embed.js';
        script.async = true;
        document.head.appendChild(script);
      })();
    </script>
</head>
<body>
    <!-- Your content -->
</body>
</html>
```

**That's it!** The floating chatbot will appear on your website.

---

## 🎨 Platform-Specific Instructions

### WordPress

1. Go to **Appearance → Theme Editor**
2. Select **header.php** or **footer.php**
3. Paste embed code before `</head>` or `</body>`
4. Click **Update File**

**Or use a plugin**:
- Install "Insert Headers and Footers" plugin
- Go to **Settings → Insert Headers and Footers**
- Paste code in "Scripts in Header"
- Save changes

### Shopify

1. **Online Store → Themes**
2. **Actions → Edit Code**
3. Open **theme.liquid**
4. Paste before `</head>` or `</body>`
5. **Save**

### Wix

1. **Settings → Custom Code**
2. **+ Add Custom Code**
3. Paste the embed code
4. Set to load on **All Pages**
5. Place in **Head** or **Body - End**
6. **Apply**

### Squarespace

1. **Settings → Advanced → Code Injection**
2. Paste in **Header** or **Footer**
3. **Save**

### Webflow

1. **Project Settings → Custom Code**
2. Paste in **Head Code** or **Footer Code**
3. **Save**

### HTML/Static Sites

Just paste the embed code in your HTML file's `<head>` or before `</body>`.

---

## 🎙️ Voice Features

### How It Works

1. Click **microphone icon** in chat
2. Allow browser microphone access (first time only)
3. Speak your question
4. AI responds with **voice + text**

### Browser Compatibility

- ✅ Chrome/Edge (best support)
- ✅ Safari (iOS/macOS)
- ✅ Firefox
- ⚠️ **HTTPS required** for voice features

---

## 🔧 Customization

### Change Widget Position

**Bottom-left corner**:
```html
<style>
  #customgpt-chatbot-button,
  #customgpt-chatbot-container {
    right: auto !important;
    left: 20px !important;
  }
</style>
```

**Top-right corner**:
```html
<style>
  #customgpt-chatbot-button,
  #customgpt-chatbot-container {
    bottom: auto !important;
    top: 20px !important;
  }
</style>
```

### Change Widget Colors

```html
<style>
  /* Button color */
  #customgpt-chatbot-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  }

  /* Header color */
  .chat-header {
    background: #667eea !important;
  }

  /* Send button */
  .send-button {
    background: #667eea !important;
  }
</style>
```

### Hide on Mobile

```html
<style>
  @media (max-width: 768px) {
    #customgpt-chatbot-button,
    #customgpt-chatbot-container {
      display: none !important;
    }
  }
</style>
```

### Hide on Specific Pages

```html
<script>
  if (window.location.pathname === '/checkout') {
    document.getElementById('customgpt-chatbot-button')?.style.display = 'none';
  }
</script>
```

---

## 🌍 Advanced Integration Options

### Option 1: Floating Chatbot (Default)

**Best for**: Site-wide assistant, always accessible

**Features**:
- Floating button in corner
- Slides in like Intercom
- Mobile responsive
- Auto-loads agent avatar

### Option 2: Inline Embed

**Best for**: Dedicated support/FAQ pages

```html
<div style="width: 100%; height: 600px;">
  <iframe
    src="https://widget.yourdomain.com"
    width="100%"
    height="100%"
    frameborder="0"
    allow="microphone"
    style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
  </iframe>
</div>
```

### Option 3: Custom Trigger Button

```html
<!-- Your custom button -->
<button id="open-chat-btn">Chat with AI</button>

<!-- Embed code -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://widget.yourdomain.com/embed.js';
    script.async = true;
    document.head.appendChild(script);
  })();

  // Trigger widget when button clicked
  document.getElementById('open-chat-btn').addEventListener('click', function() {
    document.getElementById('customgpt-chatbot-button')?.click();
  });
</script>
```

---

## 📊 Analytics & Tracking

### Track Widget Opens

```html
<script>
  document.addEventListener('click', function(e) {
    if (e.target.id === 'customgpt-chatbot-button') {
      // Google Analytics
      gtag('event', 'widget_opened', {
        'event_category': 'chatbot',
        'event_label': 'CustomGPT Widget'
      });
    }
  });
</script>
```

### Track Messages

```html
<script>
  window.addEventListener('message', function(e) {
    if (e.data.type === 'customgpt_message_sent') {
      console.log('User sent:', e.data.message);
      // Your tracking code here
    }
  });
</script>
```

---

## 🔍 Testing Checklist

Before going live:

- [ ] Widget URL received and accessible
- [ ] Embed code added to website
- [ ] Button appears on page
- [ ] Chat expands when clicked
- [ ] Text messages work
- [ ] Voice features work (HTTPS only)
- [ ] Tested on desktop browser
- [ ] Tested on mobile device
- [ ] Widget position correct
- [ ] Colors match branding
- [ ] Privacy notice added (if required)

---

## 🐛 Troubleshooting

### Widget doesn't appear
- ✅ Check embed code pasted correctly
- ✅ Verify widget URL accessible
- ✅ Check browser console (F12) for errors
- ✅ Clear cache and reload

### Voice doesn't work
- ✅ Must use **HTTPS** (not HTTP)
- ✅ Grant microphone permissions
- ✅ Test microphone in other apps
- ✅ Try Chrome browser

### Widget overlaps content
- ✅ Adjust position with CSS (see Customization)
- ✅ Add margin to page content
- ✅ Use z-index for layering

---

## 🧪 Local Testing

### Using Test Scripts

**Option 1: Floating Chatbot**
```bash
# Start backend
bash run.sh

# Open test page
open examples/test-pages/test-floating-chatbot.html
```

**Option 2: Inline Embed**
```bash
# Start backend
bash run.sh

# Open test page
open examples/test-pages/test-inline-embed.html
```

**Option 3: Basic iframe**
```bash
# Start backend
bash run.sh

# Open test page
open examples/test-pages/test-iframe.html
```

### Verify Features
- ✅ Microphone button appears
- ✅ Voice Mode activates
- ✅ Speech transcribed
- ✅ AI responds with voice

---

## 📝 Customizing Test Scripts

### Floating Chatbot Config

Edit [embed-scripts/script-floating-chatbot.js](embed-scripts/script-floating-chatbot.js):

```javascript
const config = {
    apiUrl: 'http://localhost:8000',    // Backend URL
    primaryColor: '#8b5cf6',            // Brand color
    buttonText: '🎤',                   // Button icon
    buttonSize: '60px',                 // Button size
    chatWidth: '400px',                 // Widget width
    chatHeight: '600px',                // Widget height
    bottomOffset: '24px',               // From bottom
    rightOffset: '24px'                 // From right
};
```

### Inline Embed Config

Edit [embed-scripts/script-inline-embed.js](embed-scripts/script-inline-embed.js):

```javascript
const config = {
    apiUrl: 'http://localhost:8000',
    containerId: 'customgpt-widget-embed',
    height: '600px',
    width: '100%',
    borderRadius: '12px'
};
```

---

## 🚀 Production Deployment

### 1. Update Script Configs

Change `apiUrl` from `localhost` to your production URL:

```javascript
apiUrl: 'https://widget.yourdomain.com'
```

### 2. Host Scripts

Upload embed scripts to your server or CDN.

### 3. Update CORS

Allow your domain in backend CORS settings.

### 4. Test on HTTPS

Voice features require secure connection.

---

## 💡 Framework-Specific Tips

### Next.js

```typescript
// app/layout.tsx
import Script from 'next/script';

export default function Layout() {
  return (
    <>
      {/* Your content */}
      <Script
        src="https://widget.yourdomain.com/embed.js"
        strategy="afterInteractive"
      />
    </>
  );
}
```

### React

```jsx
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://widget.yourdomain.com/embed.js';
  script.async = true;
  document.head.appendChild(script);

  return () => {
    document.head.removeChild(script);
  };
}, []);
```

### Vue

```vue
<script setup>
onMounted(() => {
  const script = document.createElement('script');
  script.src = 'https://widget.yourdomain.com/embed.js';
  script.async = true;
  document.head.appendChild(script);
});
</script>
```

---

## 🔒 Privacy & Compliance

### Microphone Permissions

- Users **always prompted** before access
- Permission per-session or remembered
- Audio processed in real-time, not recorded
- No personal data stored without consent

### GDPR Notice Example

```html
<div style="position: fixed; bottom: 0; width: 100%; background: #f5f5f5; padding: 15px; text-align: center;">
  This site uses a voice AI assistant. By using voice, you consent to microphone access.
  <button onclick="this.parentElement.style.display='none'">Got it</button>
</div>
```

---

## 📚 Additional Documentation

- **[Docker Hub Deployment](../docs/deployment/DOCKER_HUB_DEPLOYMENT.md)** - Deploy the widget server
- **[Script Tag Embed](../docs/deployment/SCRIPT_TAG_EMBED.md)** - Technical integration reference
- **[CLAUDE.md](../CLAUDE.md)** - Development setup & architecture

---

## 🆘 Support

**Widget not working?**

1. Check widget URL: `https://your-widget-url.com/docs`
2. Verify embed code syntax
3. Check browser console (F12)
4. Contact administrator

**Common Errors**:
- `"Failed to load resource"` → URL incorrect or server down
- `"CORS policy blocked"` → Domain not allowed
- `"Microphone denied"` → Grant browser permissions

---

**Ready to integrate?** Copy the embed code above and add it to your website! 🚀

For deployment help, see [docs/deployment/DOCKER_HUB_DEPLOYMENT.md](../docs/deployment/DOCKER_HUB_DEPLOYMENT.md)

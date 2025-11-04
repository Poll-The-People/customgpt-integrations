# CustomGPT Widget Next.js - Integration Guide & Examples

Complete guide for integrating the CustomGPT Voice Assistant widget (Next.js version) into any website.

---

## What's Included

```
examples/
├── README.md                           # This file
└── test-pages/                         # Test HTML pages
    ├── test-floating-chatbot.html     # Test floating widget
    └── test-inline-embed.html         # Test inline embed
```

---

## What You're Getting

A **voice-enabled AI chatbot** that:
- Works as a floating button or inline embed
- Expands to full chat interface when clicked
- Supports voice conversations (speech-to-text + text-to-speech)
- Powered by CustomGPT knowledge base
- Works on desktop and mobile devices
- Fully customizable with your branding

---

## Quick Integration (2 Steps)

### Option 1: Floating Widget (Recommended)

**Step 1: Add the configuration script**

```html
<script>
  window.customGPTConfig = {
    serverUrl: 'https://your-project.vercel.app',  // Your deployed widget URL
    position: 'bottom-right',
    theme: 'dark',
    initialMode: 'chat'
  };
</script>
<script src="https://your-project.vercel.app/widget.js" defer></script>
```

**Step 2: Add to Your Website**

Paste in your HTML `<head>` section or before closing `</body>` tag:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>

    <!-- Add widget code here -->
    <script>
      window.customGPTConfig = {
        serverUrl: 'https://your-project.vercel.app',
        position: 'bottom-right',
        theme: 'dark',
        initialMode: 'chat'
      };
    </script>
    <script src="https://your-project.vercel.app/widget.js" defer></script>
</head>
<body>
    <!-- Your content -->
</body>
</html>
```

**That's it!** The floating chatbot will appear on your website.

---

### Option 2: Inline Embed

**Best for**: Dedicated support/FAQ pages

```html
<div style="width: 100%; height: 600px;">
  <iframe
    src="https://your-project.vercel.app"
    width="100%"
    height="100%"
    frameborder="0"
    allow="microphone"
    style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
  </iframe>
</div>
```

---

## Deployment URLs

After deploying to Vercel or Railway, your widget will be accessible at:

- **Vercel**: `https://your-project.vercel.app`
- **Railway**: `https://your-project.railway.app`
- **Custom domain**: `https://yourdomain.com`

**Important**: HTTPS is required for microphone access in production.

---

## Platform-Specific Instructions

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

## Voice Features

### How It Works

1. Click **microphone icon** in chat
2. Allow browser microphone access (first time only)
3. Speak your question
4. AI responds with **voice + text**

### Browser Compatibility

- Chrome/Edge (best support)
- Safari (iOS/macOS)
- Firefox
- **HTTPS required** for voice features

---

## Customization

### Change Widget Position

**Bottom-left corner**:
```html
<script>
  window.customGPTConfig = {
    serverUrl: 'https://your-project.vercel.app',
    position: 'bottom-left',
    theme: 'dark',
    initialMode: 'chat'
  };
</script>
```

### Change Widget Theme

**Light theme**:
```html
<script>
  window.customGPTConfig = {
    serverUrl: 'https://your-project.vercel.app',
    position: 'bottom-right',
    theme: 'light',
    initialMode: 'chat'
  };
</script>
```

### Change Initial Mode

**Start in voice mode**:
```html
<script>
  window.customGPTConfig = {
    serverUrl: 'https://your-project.vercel.app',
    position: 'bottom-right',
    theme: 'dark',
    initialMode: 'voice'
  };
</script>
```

### Customize Colors with CSS

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

## Framework-Specific Integration

### Next.js

```typescript
// app/layout.tsx
import Script from 'next/script';

export default function Layout() {
  return (
    <>
      {/* Your content */}
      <Script id="customgpt-config" strategy="beforeInteractive">
        {`
          window.customGPTConfig = {
            serverUrl: 'https://your-project.vercel.app',
            position: 'bottom-right',
            theme: 'dark',
            initialMode: 'chat'
          };
        `}
      </Script>
      <Script
        src="https://your-project.vercel.app/widget.js"
        strategy="afterInteractive"
      />
    </>
  );
}
```

### React

```jsx
useEffect(() => {
  // Set config
  window.customGPTConfig = {
    serverUrl: 'https://your-project.vercel.app',
    position: 'bottom-right',
    theme: 'dark',
    initialMode: 'chat'
  };

  // Load widget script
  const script = document.createElement('script');
  script.src = 'https://your-project.vercel.app/widget.js';
  script.defer = true;
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
  // Set config
  window.customGPTConfig = {
    serverUrl: 'https://your-project.vercel.app',
    position: 'bottom-right',
    theme: 'dark',
    initialMode: 'chat'
  };

  // Load widget script
  const script = document.createElement('script');
  script.src = 'https://your-project.vercel.app/widget.js';
  script.defer = true;
  document.head.appendChild(script);
});
</script>
```

---

## Analytics & Tracking

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

## Testing Checklist

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

## Troubleshooting

### Widget doesn't appear
- Check embed code pasted correctly
- Verify widget URL accessible
- Check browser console (F12) for errors
- Clear cache and reload

### Voice doesn't work
- Must use **HTTPS** (not HTTP)
- Grant microphone permissions
- Test microphone in other apps
- Try Chrome browser

### Widget overlaps content
- Adjust position with CSS customization
- Add margin to page content
- Use z-index for layering

### CORS errors
- This should not happen - CORS is pre-configured
- If you see CORS errors, contact support

---

## Local Testing

### Test Floating Widget

```bash
# Start development server
npm run dev

# Open test page in browser
open examples/test-pages/test-floating-chatbot.html
```

### Test Inline Embed

```bash
# Start development server
npm run dev

# Open test page in browser
open examples/test-pages/test-inline-embed.html
```

### Verify Features
- Microphone button appears
- Voice Mode activates
- Speech transcribed
- AI responds with voice

---

## Privacy & Compliance

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

## Support

**Widget not working?**

1. Check widget URL: `https://your-widget-url.com`
2. Verify embed code syntax
3. Check browser console (F12)
4. Contact administrator

**Common Errors**:
- `"Failed to load resource"` → URL incorrect or server down
- `"CORS policy blocked"` → Contact support (should be pre-configured)
- `"Microphone denied"` → Grant browser permissions

---

**Ready to integrate?** Copy the embed code above and add it to your website!

For deployment instructions, see the main [README.md](../README.md)

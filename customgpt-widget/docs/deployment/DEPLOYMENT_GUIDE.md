# Embedding CustomGPT Widget Voice Assistant into customgpt.ai

## Executive Summary

You have **3 main deployment options** to embed this voice assistant into your static React website at customgpt.ai/about:

1. ✅ **RECOMMENDED**: Deploy backend to serverless platform + embed widget (easiest, cheapest)
2. **Option 2**: Full deployment on single server with Nginx (traditional)
3. **Option 3**: Use existing React components directly (most integrated)

---

## 📊 Deployment Options Comparison

| Option                       | Backend Server     | Frontend Integration        | Cost       | Complexity | Best For                    |
| ---------------------------- | ------------------ | --------------------------- | ---------- | ---------- | --------------------------- |
| **1. Serverless + Widget**   | Railway/Render     | `<iframe>` or Web Component | ~$5-10/mo  | ⭐ Easy     | Static sites, quick embed   |
| **2. Single Server + Nginx** | VPS (DigitalOcean) | Route `/api/*` to backend   | ~$12-24/mo | ⭐⭐ Medium  | Full control, custom domain |
| **3. Component Integration** | Serverless         | Import React components     | ~$5-10/mo  | ⭐⭐⭐ Hard   | Tight integration, branding |

---

## 🎯 OPTION 1: Serverless Backend + Widget Embed (RECOMMENDED)

**Perfect for your use case**: Static React site with minimal backend needs.

### Architecture
```
customgpt.ai (Static Vercel/Netlify)
    ↓
/about page
    ↓
<VoiceWidget /> (iframe or web component)
    ↓ API calls
Backend (Railway/Render/Fly.io)
    ↓
OpenAI + CustomGPT APIs
```

### Step 1: Deploy Backend to Serverless Platform

#### Option A: Railway.app (Easiest)

1. **Create Railway Account**: https://railway.app
2. **Deploy from GitHub**:
   ```bash
   # Push your code to GitHub
   git remote add origin https://github.com/yourusername/customgpt-widget.git
   git push -u origin main
   ```
3. **Railway Dashboard**:
   - New Project → Deploy from GitHub
   - Select your CustomGPT Widget repository
   - Railway auto-detects Dockerfile ✅
4. **Set Environment Variables** in Railway:
   ```
   OPENAI_API_KEY=sk-proj-...
   USE_CUSTOMGPT=true
   CUSTOMGPT_PROJECT_ID=69291
   CUSTOMGPT_API_KEY=8569|...
   CUSTOMGPT_STREAM=true
   TTS_PROVIDER=OPENAI
   OPENAI_TTS_MODEL=tts-1
   OPENAI_TTS_VOICE=nova
   STT_MODEL=gpt-4o-mini-transcribe
   LANGUAGE=en
   ```
5. **Get Your URL**: Railway gives you: `https://customgpt-widget-production.up.railway.app`

**Cost**: $5/month (500 hours free tier, then $0.01/hour)

#### Option B: Render.com

1. **Create Render Account**: https://render.com
2. **New Web Service**:
   - Connect GitHub repository
   - Build Command: `docker build -t customgpt-widget .`
   - Start Command: `docker run -p 8000:80 customgpt-widget`
3. **Environment Variables**: Same as Railway
4. **Get Your URL**: `https://customgpt-widget.onrender.com`

**Cost**: $7/month (free tier available but sleeps after inactivity)

#### Option C: Fly.io (Most Cost-Effective)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and launch
fly auth login
cd /path/to/CustomGPT Widget
fly launch

# Set secrets
fly secrets set OPENAI_API_KEY=sk-proj-...
fly secrets set CUSTOMGPT_API_KEY=8569|...
# ... (all other env vars)

# Deploy
fly deploy
```

**Cost**: $3-5/month (generous free tier)

---

### Step 2A: Embed as iframe (Simplest)

**In your customgpt.ai /about page**:

```tsx
// app/about/page.tsx (or wherever your about page is)
import React from 'react';

export default function AboutPage() {
  return (
    <div>
      {/* Your existing about content */}
      <h1>About CustomGPT</h1>
      <p>Your existing text content...</p>

      {/* Voice Assistant Section */}
      <div className="voice-assistant-section" style={{ marginTop: '3rem' }}>
        <h2>Try Our AI Assistant</h2>
        <p>Ask me anything about our services!</p>

        {/* Embedded Voice Assistant */}
        <iframe
          src="https://customgpt-widget-production.up.railway.app"
          width="100%"
          height="600px"
          frameBorder="0"
          allow="microphone"
          style={{
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxWidth: '800px',
            margin: '2rem auto',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
}
```

**Pros**:
- ✅ Zero code changes to CustomGPT Widget
- ✅ Complete isolation (no conflicts)
- ✅ 5-minute setup

**Cons**:
- ❌ iframe styling limitations
- ❌ Full page UI (might be too large)

---

### Step 2B: Embed as Floating Widget (Better UX)

**✨ EASIEST OPTION: Use our ready-made script tag embed!**

We provide two production-ready embed scripts in the `examples/embed-scripts/` directory:
- **[script-floating-chatbot.js](../../examples/embed-scripts/script-floating-chatbot.js)** - Intercom-style floating widget
- **[script-inline-embed.js](../../examples/embed-scripts/script-inline-embed.js)** - Inline scrollable embed

See the **[Script Tag Embed Guide](SCRIPT_TAG_EMBED.md)** for detailed integration instructions.

#### Alternative: Create Custom Widget Wrapper Component

```tsx
// components/VoiceAssistantWidget.tsx
'use client';

import React, { useState } from 'react';

export default function VoiceAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 overflow-hidden"
          aria-label="Open AI Assistant"
        >
          {/* Agent avatar fetched from CustomGPT API */}
          <img
            src="https://via.placeholder.com/64"
            alt="AI Assistant"
            className="w-full h-full object-cover rounded-full"
          />
        </button>
      )}

      {/* Widget Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] relative">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Embedded Assistant */}
            <iframe
              src="https://customgpt-widget-production.up.railway.app"
              className="w-full h-full rounded-2xl"
              frameBorder="0"
              allow="microphone"
            />
          </div>
        </div>
      )}
    </>
  );
}
```

#### Add to About Page

```tsx
// app/about/page.tsx
import VoiceAssistantWidget from '@/components/VoiceAssistantWidget';

export default function AboutPage() {
  return (
    <div>
      {/* Your existing content */}
      <h1>About CustomGPT</h1>
      <p>Your text content...</p>

      {/* Floating voice assistant */}
      <VoiceAssistantWidget />
    </div>
  );
}
```

**Pros**:
- ✅ Clean, modern UX
- ✅ Doesn't disrupt page layout
- ✅ Easy to implement
- ✅ Microphone permission handled properly

**Cons**:
- ❌ Still uses iframe (some styling limitations)

---

### Step 2C: Web Component (Most Flexible)

Create a custom web component that can be embedded anywhere.

#### Create Standalone Widget Build

```typescript
// frontend/src/widget.tsx (NEW FILE)
import React from 'react';
import ReactDOM from 'react-dom/client';
import VoiceMode from './components/VoiceMode';

class VoiceAssistantWidget extends HTMLElement {
  connectedCallback() {
    const shadowRoot = this.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    shadowRoot.appendChild(container);

    const apiUrl = this.getAttribute('api-url') || 'https://customgpt-widget-production.up.railway.app';

    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <VoiceMode
          onChatMode={() => {}}
          theme="light"
          setTheme={() => {}}
          capabilities={{
            voice_mode_enabled: true,
            stt_enabled: true,
            tts_enabled: true,
            ai_enabled: true
          }}
        />
      </React.StrictMode>
    );
  }
}

customElements.define('voice-assistant-widget', VoiceAssistantWidget);
```

#### Build Widget Bundle

```json
// package.json (add script)
{
  "scripts": {
    "build:widget": "vite build --config vite.widget.config.ts"
  }
}
```

```typescript
// vite.widget.config.ts (NEW FILE)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-widget',
    lib: {
      entry: 'src/widget.tsx',
      name: 'VoiceAssistantWidget',
      fileName: 'voice-widget',
      formats: ['iife']
    }
  }
});
```

#### Use in customgpt.ai

```html
<!-- In your about page HTML -->
<script src="https://cdn.jsdelivr.net/gh/yourusername/customgpt-widget@main/dist-widget/voice-widget.iife.js"></script>

<voice-assistant-widget api-url="https://customgpt-widget-production.up.railway.app"></voice-assistant-widget>
```

**Pros**:
- ✅ Framework-agnostic
- ✅ Can be used anywhere
- ✅ Shadow DOM isolation

**Cons**:
- ❌ Requires custom build setup
- ❌ More complex to maintain

---

## 🎯 OPTION 2: Single Server with Nginx

**Good for**: Full control, custom domain setup

### Architecture
```
customgpt.ai (Nginx on VPS)
    ├── / → React static files
    ├── /about → React static files
    └── /api/* → Proxy to backend:8000
```

### Step 1: Deploy to VPS (DigitalOcean, AWS, etc.)

```bash
# SSH into your server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone and deploy
git clone https://github.com/yourusername/customgpt-widget.git
cd customgpt-widget
cp .env.example .env
# Edit .env with your API keys
nano .env

# Build and run
docker build -t customgpt-widget .
docker run -d -p 8000:80 --env-file .env --restart unless-stopped customgpt-widget
```

### Step 2: Configure Nginx

```nginx
# /etc/nginx/sites-available/customgpt.ai
server {
    listen 80;
    server_name customgpt.ai www.customgpt.ai;

    # Your React static site
    root /var/www/customgpt.ai;
    index index.html;

    # React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to CustomGPT Widget backend
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
    }

    # Serve CustomGPT Widget voice assistant at /voice
    location /voice {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable and reload Nginx
sudo ln -s /etc/nginx/sites-available/customgpt.ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d customgpt.ai -d www.customgpt.ai
```

### Step 3: Embed in React

```tsx
// app/about/page.tsx
export default function AboutPage() {
  return (
    <div>
      <h1>About CustomGPT</h1>
      <p>Your content...</p>

      {/* Voice Assistant - Same domain, no CORS issues */}
      <iframe
        src="/voice"
        width="100%"
        height="600px"
        frameBorder="0"
        allow="microphone"
        className="rounded-xl shadow-lg"
      />
    </div>
  );
}
```

**Pros**:
- ✅ Same domain (no CORS issues)
- ✅ Full control over infrastructure
- ✅ Custom domain support

**Cons**:
- ❌ Requires VPS management
- ❌ More expensive ($12-24/month)
- ❌ More complex setup

---

## 🎯 OPTION 3: Direct React Component Integration

**Best for**: Tight integration with your brand/design system

### Step 1: Copy Components to Your Project

```bash
# Copy these files to your customgpt.ai project
cp -r frontend/src/components/VoiceMode.tsx your-site/components/
cp -r frontend/src/particle-manager.ts your-site/lib/
cp -r frontend/src/speech-manager-optimized.ts your-site/lib/
cp -r frontend/src/hooks/useMicVADWrapper.ts your-site/hooks/
cp frontend/src/Canvas.tsx your-site/components/
```

### Step 2: Update API Endpoint Configuration

```typescript
// lib/config.ts (NEW FILE)
export const VOICE_API_URL = process.env.NEXT_PUBLIC_VOICE_API_URL || 'https://customgpt-widget-production.up.railway.app';
```

### Step 3: Update Speech Manager

```typescript
// lib/speech-manager-optimized.ts
import { VOICE_API_URL } from './config';

const sendData = async (blob: Blob) => {
    // Update fetch URL
    const response = await fetch(`${VOICE_API_URL}/inference`, {
        method: 'POST',
        body: formData,
        headers: {
            'conversation': conversationHistory
        }
    });
    // ... rest of code
};
```

### Step 4: Embed in About Page

```tsx
// app/about/page.tsx
'use client';

import VoiceMode from '@/components/VoiceMode';
import { useState } from 'react';

export default function AboutPage() {
  const [showVoice, setShowVoice] = useState(false);

  return (
    <div>
      {/* Your content */}
      <h1>About CustomGPT</h1>
      <p>Your text content...</p>

      {/* Voice Assistant Section */}
      <div className="my-12">
        <h2>Chat with Our AI Assistant</h2>

        {!showVoice ? (
          <button
            onClick={() => setShowVoice(true)}
            className="bg-purple-600 text-white px-8 py-4 rounded-lg hover:bg-purple-700"
          >
            Start Voice Chat
          </button>
        ) : (
          <div className="w-full h-[600px] bg-white rounded-xl shadow-2xl overflow-hidden">
            <VoiceMode
              onChatMode={() => setShowVoice(false)}
              theme="light"
              setTheme={() => {}}
              capabilities={{
                voice_mode_enabled: true,
                stt_enabled: true,
                tts_enabled: true,
                ai_enabled: true
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 5: Install Dependencies

```bash
# In your customgpt.ai project
npm install @ricky0123/vad-react onnxruntime-web react-markdown remark-gfm remark-breaks
```

**Pros**:
- ✅ Full customization control
- ✅ Matches your brand perfectly
- ✅ No iframe limitations

**Cons**:
- ❌ Most complex to set up
- ❌ Need to maintain dependencies
- ❌ Larger bundle size

---

## 💰 Cost Breakdown

| Component | Serverless (Opt 1) | VPS (Opt 2)   | Component (Opt 3) |
| --------- | ------------------ | ------------- | ----------------- |
| Backend   | $5-10/mo           | $12-24/mo     | $5-10/mo          |
| Frontend  | Free (Vercel)      | Included      | Free (Vercel)     |
| API Costs | ~$20-50/mo         | ~$20-50/mo    | ~$20-50/mo        |
| **Total** | **$25-60/mo**      | **$32-74/mo** | **$25-60/mo**     |

*API costs depend on usage: OpenAI Whisper + TTS + CustomGPT*

---

## 🚀 Recommended Implementation Path

For customgpt.ai, I recommend **Option 1B: Serverless + Floating Widget**:

### Why This Is Best:
1. ✅ **Minimal Changes**: Your static site stays static
2. ✅ **Fast Setup**: 1-2 hours total
3. ✅ **Cost-Effective**: ~$5-10/month backend
4. ✅ **Great UX**: Floating widget doesn't disrupt page
5. ✅ **Easy Maintenance**: Backend updates don't affect frontend

### Quick Start Guide (30 minutes):

```bash
# 1. Deploy backend to Railway (10 min)
# - Push code to GitHub
# - Connect to Railway
# - Add environment variables
# - Get your URL: https://customgpt-widget-production.up.railway.app

# 2. Add widget to your site (20 min)
# Copy the VoiceAssistantWidget component above
# Add to your /about page
# Deploy to Vercel

# Done! 🎉
```

---

## 🔧 Environment Variables Reference

```bash
# Required
OPENAI_API_KEY=sk-proj-...              # For STT + TTS
CUSTOMGPT_PROJECT_ID=69291              # Your CustomGPT project
CUSTOMGPT_API_KEY=8569|...              # CustomGPT API key

# Optional (with defaults)
USE_CUSTOMGPT=true                      # Use CustomGPT for AI
CUSTOMGPT_STREAM=true                   # Enable streaming
TTS_PROVIDER=OPENAI                     # TTS provider
OPENAI_TTS_MODEL=tts-1                  # TTS model (tts-1 or tts-1-hd)
OPENAI_TTS_VOICE=nova                   # Voice (alloy/echo/fable/onyx/nova/shimmer)
STT_MODEL=gpt-4o-mini-transcribe        # STT model
LANGUAGE=en                             # Language code
AI_COMPLETION_MODEL=gpt-3.5-turbo       # Only if USE_CUSTOMGPT=false

# Avatar Mode (Optional)
VITE_AVATAR_GLB_URL=https://models.readyplayer.me/YOUR_AVATAR_ID.glb  # Custom avatar model
```

---

## 🎭 Avatar Mode Features

The widget includes a **3D Avatar Mode** with realistic lip-sync and interactive states:

**Features**:
- 3D animated avatar with facial expressions and gestures
- Real-time lip-sync synchronized with AI speech
- Four interactive states: Idle, Listening, Processing, Speaking
- WebGL-powered rendering using Ready Player Me avatars
- Automatic fallback to particle mode if WebGL unavailable

**Requirements**:
- WebGL 2.0 capable browser (Chrome/Firefox/Safari/Edge 90+)
- Minimum 4GB RAM recommended
- Loads from CDN (`@met4citizen/talkinghead@1.6.0`)

**Customization**:
- Set `VITE_AVATAR_GLB_URL` to use a custom Ready Player Me avatar
- Avatar automatically adapts performance (60 FPS desktop, 30 FPS mobile)
- No additional hosting required - uses CDN resources

**User Experience**:
- Toggle between Particle and Avatar modes using the mode selector
- Automatic state transitions during conversation
- Browser compatibility check with graceful fallback

For detailed avatar documentation, see [README.md Avatar Mode section](../../README.md#avatar-mode-3d-talking-avatar).

---

## 📝 Next Steps

1. **Choose your deployment option** (I recommend Option 1B)
2. **Deploy backend** to Railway/Render/Fly.io
3. **Test the deployed backend** at your URL
4. **Add widget** to customgpt.ai/about
5. **Update CustomGPT** knowledge base with CustomGPT-specific content
6. **Test end-to-end** on your site (including Avatar Mode)
7. **Monitor costs** and usage

---

## 🆘 Troubleshooting

### CORS Issues
If you get CORS errors, update `backend/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://customgpt.ai", "https://www.customgpt.ai"],  # Add your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Microphone Permissions
- Must use HTTPS (not HTTP)
- Railway/Render provide HTTPS by default ✅
- Update CustomGPT with CustomGPT content for relevant responses

### Performance Issues
- Use `TTS_PROVIDER=OPENAI` for fastest response
- Set `CUSTOMGPT_STREAM=true` for streaming
- Consider caching frequent questions

---

## 📊 Expected Performance

With the optimized unified pipeline:
- **STT**: ~1.6s (OpenAI Whisper)
- **AI**: ~2.5s (CustomGPT streaming)
- **TTS**: ~2.5s (OpenAI TTS)
- **Total**: **~6.6 seconds** from speech to audio response ✅

---

## 🎨 Customization Ideas

### Match CustomGPT Branding
```tsx
// Update colors in VoiceAssistantWidget
const VoiceAssistantWidget = () => {
  return (
    <button className="bg-[#your-brand-color] ...">
      {/* Your brand icon */}
    </button>
  );
};
```

### Add CustomGPT Logo
```tsx
<div className="absolute top-4 left-4">
  <img src="/CustomGPT-logo.svg" alt="CustomGPT" className="h-8" />
</div>
```

### Custom Welcome Message
Update `backend/ai.py` INITIAL_PROMPT to mention CustomGPT:
```python
INITIAL_PROMPT = "You are CustomGPT's AI assistant. Help visitors learn about CustomGPT's services..."
```


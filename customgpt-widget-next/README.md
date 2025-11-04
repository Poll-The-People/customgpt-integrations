# CustomGPT Widget - Next.js Version

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/customgpt-widget-next&env=OPENAI_API_KEY,CUSTOMGPT_PROJECT_ID,CUSTOMGPT_API_KEY&envDescription=API%20keys%20required%20for%20CustomGPT%20Widget&project-name=customgpt-widget)

A modern Next.js voice-enabled AI assistant widget with voice and chat interfaces. Built with TypeScript, React, and serverless API routes for easy deployment on Vercel or Railway.

Get you [CustomGPT.ai RAG API key here](https://app.customgpt.ai/register?utm_source=github_integrations), needed to use this integration. 

## Screenshots

<div align="center">
  <img src="images/widget-avatar.png" alt="Avatar Mode - 3D talking avatar with lip-sync" width="45%">
  <img src="images/widget-voice.png" alt="Voice Mode - Particle animation interface" width="45%">
</div>

<div align="center">
  <img src="images/widget-floating.png" alt="Floating Chatbot - Intercom-style widget" width="45%">
  <img src="images/windget-embed.png" alt="Inline Embed - Chat interface in page flow" width="45%">
</div>

*Clockwise from top-left: Avatar mode with 3D character, Voice mode with particle animations, Inline embedded chat, Floating chatbot widget*

## Quick Start

### Prerequisites

- Node.js 18+ installed
- OpenAI API key
- CustomGPT API key (optional, for AI completions)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   - Copy `.env.example` to `.env.local`
   - Fill in your API keys

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**:
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Test WebM audio recording compatibility

### Testing WebM Audio Recording

The current development page includes a WebM audio recording test component that:

- Detects browser support for audio formats (WebM Opus, WebM, MP4, MPEG)
- Tests MediaRecorder API functionality
- Validates audio recording and playback
- Provides fallback format detection

## Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Environment Variables

Create `.env.local` file:

```bash
# Required - OpenAI API Key
OPENAI_API_KEY=sk-your-key-here

# Optional - CustomGPT Integration
USE_CUSTOMGPT=false
CUSTOMGPT_PROJECT_ID=your_project_id
CUSTOMGPT_API_KEY=your_api_key

# Optional - AI Configuration
AI_COMPLETION_MODEL=gpt-4o-mini
LANGUAGE=en
STT_MODEL=gpt-4o-mini-transcribe

# Optional - TTS Configuration
TTS_PROVIDER=OPENAI
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova
EDGETTS_VOICE=en-US-EricNeural

# Optional - UI Configuration
NEXT_PUBLIC_UI_THEME=dark
NEXT_PUBLIC_ENABLE_VOICE_MODE=true
```

## Deployment

### Deploy to Vercel (Recommended)

**Option 1: One-Click Deploy**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/customgpt-widget-next)

**Option 2: Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Go to: Project Settings → Environment Variables
```

**Option 3: GitHub Integration**

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables
4. Deploy automatically on git push

### Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up

# Add environment variables
railway variables set OPENAI_API_KEY=sk-...
```

### Environment Variables for Production

Add these in your deployment platform:

```
OPENAI_API_KEY=sk-your-key-here
USE_CUSTOMGPT=false
AI_COMPLETION_MODEL=gpt-4o-mini
TTS_PROVIDER=OPENAI
LANGUAGE=en
```

### Important: Domain & CORS Configuration

**After deployment, your widget will be accessible at:**

- Vercel: `https://your-project.vercel.app`
- Railway: `https://your-project.railway.app`
- Custom domain: `https://yourdomain.com`

**CORS is pre-configured** - No additional setup needed. The widget automatically handles cross-origin requests from any domain.

**For Website Integration:**

If you want to embed this widget on your website:

```html
<!-- Add this to your website's HTML -->
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

**Note**: Replace `your-project.vercel.app` with your actual deployment URL.

### Working Examples

For complete integration examples and step-by-step guides, see the [`examples/`](examples/) directory:

- **[Integration Guide](examples/README.md)** - Complete documentation for website integration
- **[Floating Widget Example](examples/test-pages/test-floating-chatbot.html)** - Test floating chatbot interface
- **[Inline Embed Example](examples/test-pages/test-inline-embed.html)** - Test inline page embedding

The examples directory includes:

- Platform-specific integration instructions (WordPress, Shopify, Wix, etc.)
- Framework integration examples (Next.js, React, Vue)
- Customization options and CSS examples
- Analytics tracking setup
- Troubleshooting common issues

---

## Troubleshooting

### Build Issues

**"Module not found" errors**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors**:
```bash
npm run build
# Fix reported errors
```

### Runtime Issues

**Agent name not showing**:
- Check `CUSTOMGPT_PROJECT_ID` is set correctly
- Verify `CUSTOMGPT_API_KEY` is valid
- Ensure `USE_CUSTOMGPT=true` if using CustomGPT

**Audio recording not working**:
- Check browser supports MediaRecorder API
- Allow microphone permissions
- Try HTTPS (required for microphone access)

**TTS not playing**:
- Verify `OPENAI_API_KEY` is configured
- Check browser console for errors
- Test with different TTS provider

### Browser Compatibility

**Safari/iOS**:
- WebM not supported - automatic fallback to MP4
- Microphone requires HTTPS
- Check for codec support issues

**Firefox**:
- WebM Opus fully supported
- No known issues

**Chrome/Edge**:
- Full support for all features
- Recommended browsers

---

## Known Issues

### Security
- `google-tts-api` has vulnerable `axios` dependency
- Consider upgrading or using alternative TTS library

### Browser Compatibility
- Safari requires MP4 audio fallback
- iOS Safari specific testing needed
- WebM not supported on all platforms

---


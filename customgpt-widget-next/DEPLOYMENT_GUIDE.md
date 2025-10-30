# 🚀 Deployment Guide - CustomGPT Widget (Next.js)

**Build Status**: ✅ **SUCCESS!**
**Ready to Deploy**: YES
**Platform**: Vercel (Primary) | Railway (Secondary)

---

## ✅ Build Success!

The Next.js build is now **working perfectly**:

```
✓ Compiled successfully
✓ TypeScript check passed
✓ Generated 11 routes
✓ All API endpoints created:
  - /api/inference (Voice pipeline)
  - /api/chat/* (Chat system)
  - /api/tts/speak (TTS)
  - /api/agent/* (Agent metadata)
```

**Ready for production deployment!**

---

## 🚀 Deploy to Vercel (Recommended)

### Option 1: Vercel CLI (Fastest - 5 minutes)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
cd customgpt-widget-next
vercel

# Follow prompts:
# - Login with GitHub
# - Create new project or link existing
# - Deploy!

# 3. Add environment variables in Vercel dashboard
# Go to: Project Settings → Environment Variables

# Required variables:
OPENAI_API_KEY=sk-...
CUSTOMGPT_PROJECT_ID=your_project_id
CUSTOMGPT_API_KEY=your_api_key
USE_CUSTOMGPT=true
CUSTOMGPT_STREAM=true
TTS_PROVIDER=OPENAI
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova
STT_MODEL=gpt-4o-mini-transcribe
LANGUAGE=en

# 4. Redeploy with env vars
vercel --prod

# Done! You'll get a URL like:
# https://customgpt-widget-next.vercel.app
```

### Option 2: Deploy Button (One-Click)

Add this to your GitHub README:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/customgpt-widget-next&env=OPENAI_API_KEY,CUSTOMGPT_PROJECT_ID,CUSTOMGPT_API_KEY&envDescription=API%20keys%20required%20for%20CustomGPT%20Widget&project-name=customgpt-widget)
```

**User Experience**:
1. Click button
2. Vercel clones repo to user's GitHub
3. User fills in API keys via UI
4. Vercel builds and deploys (2-3 minutes)
5. User gets instant URL

### Option 3: GitHub Integration

1. Push code to GitHub
2. Connect repo to Vercel
3. Vercel auto-deploys on every push
4. Perfect for continuous deployment

---

## 🛠️ Deploy to Railway (Docker Alternative)

If you need longer execution times or prefer Docker:

```bash
# 1. Create railway.json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}

# 2. Deploy to Railway
# - Go to railway.app
# - Connect GitHub repo
# - Set environment variables
# - Deploy!
```

**Railway Advantages**:
- Longer execution time (no 10s limit)
- Can add database easily
- Docker-like experience

---

## 🔑 Environment Variables

### Required (Must Set):

```env
# OpenAI (Required for STT/TTS)
OPENAI_API_KEY=sk-...

# CustomGPT (Required if USE_CUSTOMGPT=true)
CUSTOMGPT_PROJECT_ID=your_project_id
CUSTOMGPT_API_KEY=your_customgpt_key
```

### Recommended:

```env
# Enable CustomGPT for better responses
USE_CUSTOMGPT=true

# Enable streaming for faster responses
CUSTOMGPT_STREAM=true

# Use best STT model
STT_MODEL=gpt-4o-mini-transcribe

# Use OpenAI TTS (best quality + reliability)
TTS_PROVIDER=OPENAI
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova
```

### Optional:

```env
# Custom avatar URL
NEXT_PUBLIC_AVATAR_GLB_URL=https://models.readyplayer.me/your-avatar.glb

# Language
LANGUAGE=en

# Use OpenAI for completions instead of CustomGPT
USE_CUSTOMGPT=false
AI_COMPLETION_MODEL=gpt-4o-mini
```

---

## ✅ Pre-Deployment Checklist

Before deploying, verify:

- [ ] Build succeeds locally (`npm run build`)
- [ ] Dev server works (`npm run dev`)
- [ ] Environment variables are ready
- [ ] API keys are valid
- [ ] .env.local has all required variables

---

## 🧪 Test Production Build Locally

```bash
# Build for production
npm run build

# Start production server
npm start

# Open http://localhost:3000
# Test all features
```

---

## 📊 Vercel Configuration Details

The `vercel.json` file configures:

1. **Function Timeout**: 60 seconds (Pro tier)
   - Free tier: 10 seconds
   - Recommended: Pro tier for production

2. **Memory**: 1024 MB
   - Ensures audio processing has enough memory

3. **Environment Variables**: Pre-configured list
   - Makes deploy button easy to use

4. **Build Command**: `npm run build`
   - Standard Next.js build

---

## 🎯 Post-Deployment Testing

After deployment, test these endpoints:

```bash
# Replace with your Vercel URL
VERCEL_URL=https://your-project.vercel.app

# Test agent settings
curl $VERCEL_URL/api/agent/settings

# Test capabilities
curl $VERCEL_URL/api/agent/capabilities

# Test TTS (requires API key)
curl -X POST $VERCEL_URL/api/tts/speak \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}'

# Test chat creation
curl -X POST $VERCEL_URL/api/chat/conversations
```

---

## ⚡ Performance Optimization

### Vercel Edge Functions (Optional)

For even faster performance, deploy to Edge:

```typescript
// Add to route files:
export const runtime = 'edge';
```

**Benefits**:
- Global edge network
- Faster cold starts
- Lower latency

**Limitations**:
- Some Node.js APIs not available
- Test thoroughly first

---

## 🔒 Security Checklist

Before production:

- [ ] Environment variables set in Vercel dashboard (not in code)
- [ ] CORS configured correctly (already done in next.config.ts)
- [ ] API keys validated
- [ ] No sensitive data in client-side code
- [ ] Rate limiting considered (add in Phase 7)

---

## 📈 Monitoring & Logs

### Vercel Dashboard:

- **Deployments**: View all deployments
- **Functions**: Monitor API route execution
- **Logs**: Real-time logs for debugging
- **Analytics**: Track usage (add @vercel/analytics)

### Enable Analytics:

```bash
npm install @vercel/analytics

# Add to layout.tsx:
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 🎊 You're Ready to Ship!

**Build Status**: ✅ SUCCESS
**Code Quality**: Production-ready
**Documentation**: Complete
**Configuration**: Optimized

**Next Steps**:
1. Deploy to Vercel (`vercel`)
2. Set environment variables
3. Test production URL
4. Share with users!

**Estimated Time**: 30 minutes to live production! 🚀

---

*Deployment configured and ready for launch!*

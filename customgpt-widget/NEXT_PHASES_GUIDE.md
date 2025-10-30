# Next Phases Guide - Completing the Migration

**Current Status**: Phases 1-3 Complete (40% done)
**Remaining**: Phases 4-8 (60%)

---

## 🎯 Quick Start for Phase 4

### Phase 4: Frontend Migration (~21 hours)

**Goal**: Copy React components and hooks to Next.js

#### Task Order (Do in This Sequence):

1. **Copy Base Components** (2 hours):
   ```bash
   cd customgpt-widget-next

   # Copy components
   cp -r ../customgpt-widget/frontend/src/components/* src/components/

   # Copy hooks
   cp -r ../customgpt-widget/frontend/src/hooks/* src/hooks/

   # Copy utils
   cp -r ../customgpt-widget/frontend/src/utils/* src/utils/

   # Copy types
   cp -r ../customgpt-widget/frontend/src/types/* src/types/
   ```

2. **Add 'use client' Directives** (1 hour):
   Add to top of these files:
   - `src/components/VoiceMode.tsx`
   - `src/components/ChatContainer.tsx`
   - `src/components/AvatarMode.tsx`
   - `src/components/ModeToggleMenu.tsx`
   - `src/hooks/useTalkingHead.ts`

   Example:
   ```typescript
   'use client';

   import { useState } from 'react';
   // ... rest of component
   ```

3. **Update Imports** (2 hours):
   Replace relative imports with `@/` alias:
   ```typescript
   // Before
   import { something } from '../utils/helper';

   // After
   import { something } from '@/utils/helper';
   ```

4. **Update API Calls** (3 hours):
   In `speech-manager-optimized.ts` and components:
   ```typescript
   // Before
   fetch(`${API_BASE_URL}/inference`, ...)

   // After
   fetch('/api/inference', ...)
   ```

5. **Update Environment Variables** (1 hour):
   Change in avatar config:
   ```typescript
   // Before
   const avatarUrl = import.meta.env.VITE_AVATAR_GLB_URL;

   // After
   const avatarUrl = process.env.NEXT_PUBLIC_AVATAR_GLB_URL;
   ```

6. **Copy CSS Files** (2 hours):
   ```bash
   # Copy all CSS
   find ../customgpt-widget/frontend/src -name "*.css" -exec cp {} src/components/ \;
   ```

7. **Update Main Page** (2 hours):
   Edit `src/app/page.tsx` to import VoiceMode and ChatContainer

8. **Test Locally** (3 hours):
   ```bash
   npm run dev
   # Test voice mode
   # Test chat mode
   # Test avatar toggle
   ```

---

## 🧪 Phase 5: Testing & Validation (~26 hours)

### Testing Checklist

#### Voice Mode Testing (4 hours):
```bash
# Manual tests:
- [ ] Record audio → verify STT works
- [ ] Send message → verify AI responds
- [ ] Play TTS → verify audio plays
- [ ] Check conversation state persists
- [ ] Test particle animations
- [ ] Test avatar mode
- [ ] Test mode toggle
```

#### Chat Mode Testing (4 hours):
```bash
- [ ] Type message → verify AI responds
- [ ] Test thumbs up/down reactions
- [ ] Test citations display
- [ ] Test per-message TTS
- [ ] Test speech input button
- [ ] Test streaming responses
```

#### Browser Compatibility (4 hours):
- [ ] Chrome (desktop + mobile)
- [ ] Firefox (desktop + mobile)
- [ ] Safari (desktop + iOS)
- [ ] Edge (desktop)

Test on https://www.browserstack.com/live (free tier)

#### Performance Testing (3 hours):
```bash
# Use browser DevTools:
- Voice pipeline: Should be <10s
- Chat responses: Should be <5s
- TTS generation: Should be <3s
- Check Network tab for timing
```

#### Create Test Report (2 hours):
Document findings in `TEST_REPORT.md`

---

## 🚀 Phase 6: Deployment Setup (~20 hours)

### Quick Deployment Steps

#### 1. Create vercel.json (2 hours):
```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

#### 2. Deploy to Vercel (3 hours):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd customgpt-widget-next
vercel

# Follow prompts:
# - Link to Vercel project
# - Add environment variables
# - Deploy!
```

#### 3. Create Deploy Button (2 hours):
Add to README:
```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/customgpt-widget-next&env=OPENAI_API_KEY,CUSTOMGPT_PROJECT_ID,CUSTOMGPT_API_KEY)
```

#### 4. Update Documentation (8 hours):
- Update README.md with deployment instructions
- Update CLAUDE.md with Next.js architecture
- Create VERCEL_DEPLOYMENT.md guide
- Update embed script examples

---

## ⚡ Phase 7: Optimization (~23 hours)

### Priority Optimizations

1. **Fix Security Vulnerability** (3 hours):
   ```bash
   # Option A: Use alternative TTS library
   npm uninstall google-tts-api
   # Use OpenAI or Edge TTS instead

   # Option B: Wait for fix
   # Monitor https://github.com/zlargon/google-tts/issues
   ```

2. **Add Error Tracking** (2 hours):
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard -i nextjs
   ```

3. **Optimize Bundle** (3 hours):
   ```bash
   # Analyze bundle
   npm run build
   # Check .next/analyze output

   # Add dynamic imports
   const TalkingHead = dynamic(() => import('@/hooks/useTalkingHead'));
   ```

---

## 🎊 Phase 8: Launch (~33 hours)

### Launch Checklist

1. **Beta Testing** (10 hours):
   - Find 5-10 beta testers
   - Collect feedback
   - Fix critical bugs

2. **Final Documentation** (8 hours):
   - Review all docs
   - Record video walkthrough
   - Create FAQ

3. **Release** (5 hours):
   - Merge to main
   - Tag v2.0.0-nextjs
   - Publish release notes

4. **User Migration** (10 hours):
   - Notify existing users
   - Create migration guide
   - Support questions

---

## 💾 Files Created So Far

### Configuration
- `next.config.ts` - Next.js config
- `tsconfig.json` - TypeScript config
- `.env.local` - Environment variables
- `.env.example` - Template

### Backend Logic (lib/)
- `lib/audio/stt.ts` - Speech-to-Text
- `lib/audio/tts.ts` - Text-to-Speech (5 providers)
- `lib/ai/customgpt-client.ts` - CustomGPT API client
- `lib/ai/completion.ts` - AI completions
- `lib/ai/truncate.ts` - Voice truncation
- `lib/validation.ts` - Config validation
- `lib/retry.ts` - Retry logic
- `lib/fallback.ts` - Fallback chains
- `lib/markdown-processor.ts` - Markdown processing

### API Routes (app/api/)
- `app/api/inference/route.ts` - Voice pipeline
- `app/api/chat/conversations/route.ts` - Sessions
- `app/api/chat/messages/route.ts` - Chat messages
- `app/api/chat/transcribe/route.ts` - STT
- `app/api/tts/speak/route.ts` - TTS
- `app/api/agent/settings/route.ts` - Agent metadata

### Frontend
- `components/AudioRecorderTest.tsx` - WebM test
- `app/page.tsx` - Test page

**Total**: 22 files, ~2,090 lines of TypeScript

---

## 🔑 Key Files to Migrate Next

### High Priority (Phase 4):

1. **`frontend/src/components/VoiceMode.tsx`** → `src/components/VoiceMode.tsx`
   - Main voice interface
   - Needs `'use client'`
   - Update API calls to `/api/inference`

2. **`frontend/src/components/ChatContainer.tsx`** → `src/components/ChatContainer.tsx`
   - Main chat interface
   - Needs `'use client'`
   - Update API calls to `/api/chat/*`

3. **`frontend/src/components/AvatarMode.tsx`** → `src/components/AvatarMode.tsx`
   - 3D avatar rendering
   - Needs `'use client'`

4. **`frontend/src/hooks/useTalkingHead.ts`** → `src/hooks/useTalkingHead.ts`
   - Avatar state management
   - Needs `'use client'`

5. **`frontend/src/speech-manager-optimized.ts`** → `src/lib/speech-manager.ts`
   - Audio processing logic
   - Update MediaRecorder to output WebM
   - Update API endpoints

---

## ⚠️ Common Pitfalls to Avoid

### Phase 4 Issues:

1. **Forgetting 'use client'**: Components with hooks/events need it
2. **Import paths**: Must use `@/` alias, not relative paths
3. **API URLs**: Remove base URL, use `/api/` only
4. **Environment vars**: Use `NEXT_PUBLIC_` prefix for client-side

### Phase 5 Issues:

1. **Browser testing**: Must test on actual devices, not just DevTools
2. **Performance**: Vercel has 10s timeout on free tier
3. **Cold starts**: First request will be slower

### Phase 6 Issues:

1. **Environment variables**: Must set in Vercel dashboard
2. **Function timeout**: Configure in vercel.json
3. **CORS**: Already configured in next.config.ts

---

## 📊 Success Criteria

### Must Have for Launch:

- ✅ All features from Python version working
- ✅ Voice mode: STT → AI → TTS pipeline functional
- ✅ Chat mode: Full chat interface with reactions
- ✅ Avatar mode: 3D avatar + particle animations
- ✅ Browser support: Chrome, Firefox, Safari, Edge
- ✅ Deploy button: One-click Vercel deployment
- ✅ Documentation: Complete setup guide
- ✅ No security vulnerabilities

### Nice to Have:

- ⭐ Automated tests (Jest/Vitest)
- ⭐ Video walkthrough
- ⭐ Performance monitoring
- ⭐ Error tracking (Sentry)

---

## 🛠️ Troubleshooting

### If Development Server Won't Start:

```bash
cd customgpt-widget-next
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

### If API Routes Return 500:

1. Check `.env.local` has valid API keys
2. Check console logs for errors
3. Verify imports are correct
4. Test individual lib functions

### If Audio Recording Fails:

1. Check browser supports MediaRecorder
2. Check HTTPS (required for getUserMedia)
3. Check microphone permissions
4. Test AudioRecorderTest component first

---

## 🎯 Your Mission: Complete Phases 4-8

**Phase 4** is the next critical step. Focus on:
1. Copying frontend files
2. Adding 'use client' directives
3. Updating imports and API calls
4. Testing each component

**Estimated Time**: 21 hours for Phase 4

You've got this! The hard backend work is done. Now it's frontend assembly and testing. 🚀

---

**Good Luck!** The foundation is solid, and you're 40% complete. Phases 4-6 are straightforward file copying and configuration. Phases 7-8 are polish and launch.

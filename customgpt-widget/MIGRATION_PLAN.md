# CustomGPT Widget - Next.js Migration Plan

**Version**: 1.0
**Status**: Planning
**Estimated Duration**: 8 weeks
**Estimated Effort**: 40-60 hours
**Total Tasks**: 99

---

## Quick Overview

| Phase | Week | Goal | Tasks | Hours |
|-------|------|------|-------|-------|
| [Phase 1](#phase-1-preparation--setup) | 1 | Project Setup | 7 | 9.5 |
| [Phase 2](#phase-2-backend-migration---core-services) | 2-3 | Core Services | 9 | 32 |
| [Phase 3](#phase-3-backend-migration---api-routes) | 3-4 | API Routes | 8 | 21 |
| [Phase 4](#phase-4-frontend-migration) | 4 | Frontend | 8 | 21 |
| [Phase 5](#phase-5-testing--validation) | 5 | Testing | 8 | 26 |
| [Phase 6](#phase-6-deployment-setup) | 6 | Deployment | 10 | 20 |
| [Phase 7](#phase-7-optimization--polish) | 7 | Optimization | 12 | 23 |
| [Phase 8](#phase-8-launch--migration) | 8 | Launch | 13 | 33 |

**Priority Distribution**:
- 🔴 Critical: 19 tasks
- 🟠 High: 35 tasks
- 🟡 Medium: 40 tasks
- 🟢 Low: 5 tasks

---

## Phase 1: Preparation & Setup

**Week**: 1
**Goal**: Set up Next.js project structure and validate core dependencies
**Estimated Hours**: 9.5

### Tasks

#### P1-T1: Create Next.js 14 project with TypeScript 🔴
**Priority**: Critical | **Hours**: 2 | **Status**: ⏳ Pending

**Commands**:
```bash
npx create-next-app@latest customgpt-widget-next --typescript --app --tailwind
```

**Dependencies**: None

---

#### P1-T2: Install core dependencies 🔴
**Priority**: Critical | **Hours**: 1 | **Status**: ⏳ Pending

**Commands**:
```bash
npm install openai google-tts-api elevenlabs edge-tts
npm install @vercel/blob @aws-sdk/client-s3
npm install formdata-node
```

**Dependencies**: P1-T1

---

#### P1-T3: Set up directory structure 🔴
**Priority**: Critical | **Hours**: 1 | **Status**: ⏳ Pending

**Directories to create**:
- `app/`
- `app/api/`
- `components/`
- `lib/`
- `lib/ai/`
- `lib/audio/`
- `public/`
- `public/avatars/`

**Dependencies**: P1-T1

---

#### P1-T4: Create .env.local with environment variables 🔴
**Priority**: Critical | **Hours**: 0.5 | **Status**: ⏳ Pending

**Environment Variables**:
- `OPENAI_API_KEY`
- `CUSTOMGPT_PROJECT_ID`
- `CUSTOMGPT_API_KEY`
- `TTS_PROVIDER`
- `STT_MODEL`
- `NEXT_PUBLIC_AVATAR_GLB_URL`

**Dependencies**: P1-T1

---

#### P1-T5: Test WebM audio recording in browser 🔴
**Priority**: Critical | **Hours**: 3 | **Status**: ⏳ Pending

**Test Cases**:
- Create test component with MediaRecorder
- Verify `audio/webm;codecs=opus` support
- Test on Chrome, Firefox, Safari
- Implement Safari fallback to MP4

**Dependencies**: P1-T3

---

#### P1-T6: Create next.config.js configuration 🟡
**Priority**: Medium | **Hours**: 1 | **Status**: ⏳ Pending

**Dependencies**: P1-T1

---

#### P1-T7: Set up TypeScript configuration 🟡
**Priority**: Medium | **Hours**: 1 | **Status**: ⏳ Pending

**Dependencies**: P1-T1

---

## Phase 2: Backend Migration - Core Services

**Week**: 2-3
**Goal**: Port all Python backend logic to TypeScript API Routes
**Estimated Hours**: 32

### Tasks

#### P2-T1: Port Speech-to-Text (lib/audio/stt.ts) 🔴
**Priority**: Critical | **Hours**: 4 | **Status**: ⏳ Pending

**Source**: `backend/stt.py` → `lib/audio/stt.ts`

**Subtasks**:
- Port `transcribe()` function
- Test with WebM audio (no FFmpeg)
- Test Safari fallback (MP4/MPEG)
- Add retry logic with exponential backoff
- Unit tests with mock audio files

**Dependencies**: P1-T2, P1-T5

---

#### P2-T2: Port Text-to-Speech (lib/audio/tts.ts) 🔴
**Priority**: Critical | **Hours**: 6 | **Status**: ⏳ Pending

**Source**: `backend/tts.py` → `lib/audio/tts.ts`

**Subtasks**:
- Port OpenAI TTS provider
- Port gTTS provider
- Port ElevenLabs provider
- Port Edge TTS provider
- Port StreamElements provider
- Implement provider factory pattern
- Unit tests for each provider

**Dependencies**: P1-T2

---

#### P2-T3: Port CustomGPT client (lib/ai/customgpt-client.ts) 🔴
**Priority**: Critical | **Hours**: 5 | **Status**: ⏳ Pending

**Source**: `backend/customgpt_client.py` → `lib/ai/customgpt-client.ts`

**Subtasks**:
- Port `CustomGPTClient` class
- Port session management
- Port streaming support (SSE)
- Port message reactions API
- Port citations API
- Unit tests with mocked API responses

**Dependencies**: P1-T2

---

#### P2-T4: Port AI completion logic (lib/ai/completion.ts) 🔴
**Priority**: Critical | **Hours**: 3 | **Status**: ⏳ Pending

**Source**: `backend/ai.py` → `lib/ai/completion.ts`

**Subtasks**:
- Port OpenAI completion logic
- Port response truncation for voice mode
- Port streaming optimization (early stop)
- Unit tests with mocked responses

**Dependencies**: P2-T3

---

#### P2-T5: Port response truncation (lib/ai/truncate.ts) 🟠
**Priority**: High | **Hours**: 2 | **Status**: ⏳ Pending

**Source**: `backend/ai.py` → `lib/ai/truncate.ts`

**Subtasks**:
- Port `_truncate_for_voice()` function
- Port sentence/word counting logic
- Unit tests for truncation edge cases

**Dependencies**: P1-T2

---

#### P2-T6: Port validation logic (lib/validation.ts) 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Source**: `backend/validation.py` → `lib/validation.ts`

**Subtasks**:
- Port startup validation
- Port API key validation
- Port configuration validation
- Unit tests for validation scenarios

**Dependencies**: P1-T2

---

#### P2-T7: Port retry utilities (lib/retry.ts) 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Source**: `backend/retry_utils.py` → `lib/retry.ts`

**Subtasks**:
- Port exponential backoff with jitter
- Port configurable retry attempts
- Port intelligent retry detection
- Unit tests for retry scenarios

**Dependencies**: P1-T2

---

#### P2-T8: Port fallback chains (lib/fallback.ts) 🟠
**Priority**: High | **Hours**: 4 | **Status**: ⏳ Pending

**Source**: `backend/fallback.py` → `lib/fallback.ts`

**Subtasks**:
- Port STT fallback logic
- Port AI completion fallback chain
- Port TTS fallback chain
- Integration tests for fallback chains

**Dependencies**: P2-T1, P2-T2, P2-T4

---

#### P2-T9: Port markdown processor (lib/markdown-processor.ts) 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Source**: `backend/markdown_processor.py` → `lib/markdown-processor.ts`

**Subtasks**:
- Port markdown fixing logic
- Port blockquote/list formatting
- Unit tests for markdown edge cases

**Dependencies**: P1-T2

---

## Phase 3: Backend Migration - API Routes

**Week**: 3-4
**Goal**: Create Next.js API routes for all endpoints
**Estimated Hours**: 21

### Tasks

#### P3-T1: Create voice mode endpoint (app/api/inference/route.ts) 🔴
**Priority**: Critical | **Hours**: 5 | **Status**: ⏳ Pending

**Source**: `backend/main.py` → `app/api/inference/route.ts`

**Subtasks**:
- Parse multipart form data
- Call `transcribe()` - STT
- Call `getCompletion()` - AI
- Call `textToSpeech()` - TTS
- Return audio + conversation headers
- Add error handling and logging

**Dependencies**: P2-T1, P2-T2, P2-T4

---

#### P3-T2: Create conversations endpoint (app/api/chat/conversations/route.ts) 🔴
**Priority**: Critical | **Hours**: 2 | **Status**: ⏳ Pending

**Source**: `backend/routes/chat.py` → `app/api/chat/conversations/route.ts`

**Subtasks**:
- Create session endpoint
- Return session ID
- Add error handling

**Dependencies**: P2-T3

---

#### P3-T3: Create messages endpoint (app/api/chat/messages/route.ts) 🔴
**Priority**: Critical | **Hours**: 5 | **Status**: ⏳ Pending

**Source**: `backend/routes/chat.py` → `app/api/chat/messages/route.ts`

**Subtasks**:
- Handle POST requests
- Support streaming and non-streaming
- Return message with citations
- Process markdown formatting
- Add error handling and logging

**Dependencies**: P2-T3, P2-T9

---

#### P3-T4: Create transcribe endpoint (app/api/chat/transcribe/route.ts) 🟠
**Priority**: High | **Hours**: 2 | **Status**: ⏳ Pending

**Source**: `backend/routes/chat.py` → `app/api/chat/transcribe/route.ts`

**Subtasks**:
- Handle audio upload
- Call `transcribe()` - STT only
- Return transcript
- Add error handling

**Dependencies**: P2-T1

---

#### P3-T5: Create message feedback endpoint (app/api/chat/messages/[id]/feedback/route.ts) 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Source**: `backend/routes/chat.py` → `app/api/chat/messages/[id]/feedback/route.ts`

**Subtasks**:
- Handle PUT requests
- Update message reaction
- Return updated status
- Add error handling

**Dependencies**: P2-T3

---

#### P3-T6: Create citations endpoint (app/api/chat/citations/[id]/route.ts) 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Source**: `backend/routes/chat.py` → `app/api/chat/citations/[id]/route.ts`

**Subtasks**:
- Handle GET requests
- Fetch citation details
- Return citation data
- Add error handling

**Dependencies**: P2-T3

---

#### P3-T7: Create TTS speak endpoint (app/api/tts/speak/route.ts) 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Source**: `backend/routes/tts.py` → `app/api/tts/speak/route.ts`

**Subtasks**:
- Handle POST requests
- Call `textToSpeech()`
- Return audio file
- Implement auto-cleanup
- Add error handling

**Dependencies**: P2-T2

---

#### P3-T8: Create agent settings endpoint (app/api/agent/settings/route.ts) 🟢
**Priority**: Low | **Hours**: 1 | **Status**: ⏳ Pending

**Source**: `backend/main.py` → `app/api/agent/settings/route.ts`

**Subtasks**:
- Return agent metadata
- Include avatar URL, name, etc.
- Add caching if needed

**Dependencies**: P1-T3

---

## Phase 4: Frontend Migration

**Week**: 4
**Goal**: Migrate React components to Next.js App Router
**Estimated Hours**: 21

### Tasks

#### P4-T1: Copy and migrate React components 🔴
**Priority**: Critical | **Hours**: 4 | **Status**: ⏳ Pending

**Components**:
- `VoiceMode.tsx`
- `ChatContainer.tsx`
- `AvatarMode.tsx`
- `ModeToggleMenu.tsx`

**Subtasks**:
- Copy `frontend/src/components/` to `components/`
- Update imports for Next.js
- Add `'use client'` to interactive components
- Convert to React Server Components where applicable

**Dependencies**: P1-T3

---

#### P4-T2: Update audio processing (speech-manager-optimized.ts) 🔴
**Priority**: Critical | **Hours**: 3 | **Status**: ⏳ Pending

**Source**: `frontend/src/speech-manager-optimized.ts` → `lib/speech-manager-optimized.ts`

**Subtasks**:
- Change `MediaRecorder` to output WebM
- Remove client-side FFmpeg dependencies
- Add Safari fallback (MP4)
- Test on all browsers

**Dependencies**: P1-T5

---

#### P4-T3: Update API calls in components 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Subtasks**:
- Change fetch URLs to `/api/`
- Update headers (remove base URL)
- Test streaming responses
- Add error handling

**Dependencies**: P4-T1, P3-T1, P3-T3

---

#### P4-T4: Migrate avatar integration 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Subtasks**:
- Update avatar config to use `NEXT_PUBLIC_AVATAR_GLB_URL`
- Add fallback avatar to `public/avatars/`
- Keep TalkingHead CDN approach
- Test avatar mode with all browsers

**Dependencies**: P4-T1

---

#### P4-T5: Create main page (app/page.tsx) 🟠
**Priority**: High | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Create main UI layout
- Import VoiceMode and ChatContainer
- Add mode switching logic
- Style with Tailwind CSS

**Dependencies**: P4-T1

---

#### P4-T6: Create root layout (app/layout.tsx) 🟠
**Priority**: High | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Set up HTML structure
- Add metadata
- Import global CSS
- Configure font loading

**Dependencies**: P1-T3

---

#### P4-T7: Migrate CSS styles 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Copy component CSS files
- Update CSS imports
- Test responsive design
- Verify dark/light mode

**Dependencies**: P4-T1

---

#### P4-T8: Migrate hooks (useTalkingHead.ts, etc.) 🟠
**Priority**: High | **Hours**: 2 | **Status**: ⏳ Pending

**Source**: `frontend/src/hooks/` → `hooks/`

**Subtasks**:
- Copy all custom hooks
- Update imports
- Test hook functionality

**Dependencies**: P4-T1

---

## Phase 5: Testing & Validation

**Week**: 5
**Goal**: Comprehensive testing across all features and browsers
**Estimated Hours**: 26

### Tasks

#### P5-T1: Voice Mode feature parity testing 🔴
**Priority**: Critical | **Hours**: 4 | **Status**: ⏳ Pending

**Test Cases**:
- Record audio → STT → AI → TTS → playback
- Conversation state persistence
- Particle animations
- Avatar mode toggle
- Error handling and retry logic

**Dependencies**: P4-T3

---

#### P5-T2: Chat Mode feature parity testing 🔴
**Priority**: Critical | **Hours**: 4 | **Status**: ⏳ Pending

**Test Cases**:
- Text input → AI response
- Message reactions (thumbs up/down)
- Citations display
- Per-message TTS playback
- Speech-to-text input
- Streaming responses

**Dependencies**: P4-T3

---

#### P5-T3: TTS Providers testing 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Test Cases**:
- Test OpenAI TTS
- Test gTTS
- Test ElevenLabs
- Test Edge TTS
- Test StreamElements
- Verify fallback chain

**Dependencies**: P3-T7

---

#### P5-T4: CustomGPT Integration testing 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Test Cases**:
- Session management
- Streaming responses
- Response truncation
- Message reactions API
- Citations API

**Dependencies**: P3-T3

---

#### P5-T5: Browser compatibility testing 🔴
**Priority**: Critical | **Hours**: 4 | **Status**: ⏳ Pending

**Browsers**:
- Chrome (desktop + mobile)
- Firefox (desktop + mobile)
- Safari (desktop + iOS)
- Edge (desktop)

**Test Cases**:
- WebM vs MP4 audio recording
- TalkingHead avatar rendering
- Responsive design
- Performance metrics

**Dependencies**: P5-T1, P5-T2

---

#### P5-T6: Performance testing 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Metrics**:
- Voice pipeline: <10s on Vercel free tier
- Chat responses: <5s
- TTS generation: <3s
- Function size: <50 MB compressed
- Load testing: 10 concurrent users

**Dependencies**: P5-T1, P5-T2

---

#### P5-T7: Error handling testing 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Test Cases**:
- Test retry logic (simulate API failures)
- Test fallback chains (STT→AI→TTS)
- Test timeout scenarios
- Test invalid audio formats
- Test network failures

**Dependencies**: P5-T1, P5-T2

---

#### P5-T8: Create test report 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Deliverables**:
- Test results summary
- Performance benchmarks
- Browser compatibility matrix
- Known issues and limitations

**Dependencies**: P5-T5, P5-T6, P5-T7

---

## Phase 6: Deployment Setup

**Week**: 6
**Goal**: Configure deployment platforms and create one-click deploy buttons
**Estimated Hours**: 20

### Tasks

#### P6-T1: Create vercel.json configuration 🔴
**Priority**: Critical | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Configure builds
- Set environment variables
- Configure function timeouts
- Set function regions

**Dependencies**: P5-T8

---

#### P6-T2: Test Vercel deployment 🔴
**Priority**: Critical | **Hours**: 3 | **Status**: ⏳ Pending

**Subtasks**:
- Run `vercel deploy`
- Verify production URL
- Test all features on Vercel
- Test edge function distribution
- Monitor function execution times

**Dependencies**: P6-T1

---

#### P6-T3: Create Deploy to Vercel button 🟠
**Priority**: High | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Create button with env var prompts
- Add to README.md
- Test button flow end-to-end
- Document required env vars

**Dependencies**: P6-T2

---

#### P6-T4: Create railway.json configuration 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Configure Docker build
- Set deployment options
- Configure environment variables

**Dependencies**: P5-T8

---

#### P6-T5: Create Deploy on Railway button 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Create Railway button
- Add to README.md
- Test button flow
- Document as Docker fallback

**Dependencies**: P6-T4

---

#### P6-T6: Update README.md with deployment instructions 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Subtasks**:
- Add deployment options section
- Document Vercel deployment
- Document Railway deployment
- Add environment variables guide
- Add troubleshooting section

**Dependencies**: P6-T3, P6-T5

---

#### P6-T7: Update CLAUDE.md with Next.js architecture 🟠
**Priority**: High | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Document new architecture
- Update file structure
- Update API routes
- Update development commands

**Dependencies**: P5-T8

---

#### P6-T8: Create docs/deployment/VERCEL_DEPLOYMENT.md 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Detailed Vercel setup guide
- Environment variables configuration
- Custom domain setup
- Troubleshooting common issues

**Dependencies**: P6-T2

---

#### P6-T9: Update embed script examples 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Update script URLs
- Test embed scripts with Next.js version
- Update integration documentation

**Dependencies**: P6-T2

---

#### P6-T10: Create migration guide for existing Docker users 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Document migration steps
- Environment variable changes
- Rollback instructions
- Feature comparison

**Dependencies**: P6-T6

---

## Phase 7: Optimization & Polish

**Week**: 7
**Goal**: Performance optimization and edge case handling
**Estimated Hours**: 23

### Tasks

#### P7-T1: Enable Next.js ISR and optimize bundle 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Subtasks**:
- Enable ISR where applicable
- Optimize bundle size (tree-shaking)
- Implement code splitting
- Add dynamic imports

**Dependencies**: P6-T2

---

#### P7-T2: Add response caching 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Cache agent settings
- Cache static resources
- Implement cache invalidation

**Dependencies**: P6-T2

---

#### P7-T3: Optimize avatar loading 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Implement lazy loading
- Add preload hints
- Optimize TalkingHead library loading

**Dependencies**: P6-T2

---

#### P7-T4: Add Vercel Analytics 🟡
**Priority**: Medium | **Hours**: 1 | **Status**: ⏳ Pending

**Subtasks**:
- Install `@vercel/analytics`
- Configure analytics
- Test data collection

**Dependencies**: P6-T2

---

#### P7-T5: Add custom logging for API routes 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Keep `[TIMING]` logs
- Add structured logging
- Add request/response logging

**Dependencies**: P6-T2

---

#### P7-T6: Add error tracking (Sentry or Vercel) 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Choose error tracking service
- Install and configure
- Test error reporting
- Set up alerts

**Dependencies**: P6-T2

---

#### P7-T7: Handle Safari audio format gracefully 🟠
**Priority**: High | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Improve format detection
- Better error messages
- Fallback UX improvements

**Dependencies**: P5-T5

---

#### P7-T8: Add timeout warnings 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Detect long-running operations
- Show timeout warnings to user
- Suggest Pro tier upgrade

**Dependencies**: P6-T2

---

#### P7-T9: Improve cold start experience 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Add loading states
- Improve initial page load
- Optimize first function invocation

**Dependencies**: P6-T2

---

#### P7-T10: Add rate limiting for API routes 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Implement rate limiting
- Configure limits per endpoint
- Add rate limit headers
- Handle rate limit errors

**Dependencies**: P6-T2

---

#### P7-T11: Validate all user inputs 🟠
**Priority**: High | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Add input validation for all endpoints
- Sanitize file uploads
- Add request size limits

**Dependencies**: P6-T2

---

#### P7-T12: Add CORS configuration 🟠
**Priority**: High | **Hours**: 1 | **Status**: ⏳ Pending

**Subtasks**:
- Configure CORS for production
- Add allowed origins
- Test cross-origin requests

**Dependencies**: P6-T2

---

## Phase 8: Launch & Migration

**Week**: 8
**Goal**: Launch Next.js version and migrate users
**Estimated Hours**: 33

### Tasks

#### P8-T1: Deploy to beta users 🔴
**Priority**: Critical | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Identify 5-10 beta testers
- Deploy beta version
- Provide testing instructions
- Collect initial feedback

**Dependencies**: P7-T12

---

#### P8-T2: Collect feedback and fix critical bugs 🔴
**Priority**: Critical | **Hours**: 8 | **Status**: ⏳ Pending

**Subtasks**:
- Monitor beta testing
- Prioritize bug reports
- Fix critical issues
- Deploy fixes

**Dependencies**: P8-T1

---

#### P8-T3: Validate one-click deploy UX 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Subtasks**:
- Test Deploy to Vercel button
- Measure time to deployment
- Collect user feedback
- Improve UX if needed

**Dependencies**: P8-T1

---

#### P8-T4: Final review of all documentation 🟠
**Priority**: High | **Hours**: 3 | **Status**: ⏳ Pending

**Subtasks**:
- Review README.md
- Review CLAUDE.md
- Review deployment guides
- Check for broken links

**Dependencies**: P6-T10

---

#### P8-T5: Record video walkthrough 🟡
**Priority**: Medium | **Hours**: 4 | **Status**: ⏳ Pending

**Subtasks**:
- Script video content
- Record deployment process
- Edit video
- Upload to YouTube/Vimeo
- Add to documentation

**Dependencies**: P8-T3

---

#### P8-T6: Create FAQ for common issues 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Compile common issues from beta testing
- Write FAQ entries
- Add to documentation

**Dependencies**: P8-T2

---

#### P8-T7: Update GitHub README with new badges 🟢
**Priority**: Low | **Hours**: 1 | **Status**: ⏳ Pending

**Subtasks**:
- Add deployment badges
- Add version badge
- Update screenshots if needed

**Dependencies**: P8-T4

---

#### P8-T8: Merge to main branch 🔴
**Priority**: Critical | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Create pull request
- Final code review
- Merge to main
- Verify production deployment

**Dependencies**: P8-T2, P8-T4

---

#### P8-T9: Tag release v2.0.0-nextjs 🟠
**Priority**: High | **Hours**: 1 | **Status**: ⏳ Pending

**Subtasks**:
- Create git tag
- Write release notes
- Publish GitHub release

**Dependencies**: P8-T8

---

#### P8-T10: Notify existing Docker users 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Draft announcement
- Send notifications
- Provide migration guide link

**Dependencies**: P8-T9

---

#### P8-T11: Create side-by-side comparison guide 🟡
**Priority**: Medium | **Hours**: 2 | **Status**: ⏳ Pending

**Subtasks**:
- Compare Python vs Next.js versions
- Document pros/cons of each
- Provide migration decision tree

**Dependencies**: P8-T9

---

#### P8-T12: Keep Python/Docker version as v1.x branch 🟠
**Priority**: High | **Hours**: 1 | **Status**: ⏳ Pending

**Subtasks**:
- Create v1.x branch
- Tag final Python version
- Update branch documentation

**Dependencies**: P8-T8

---

#### P8-T13: Set deprecation timeline 🟢
**Priority**: Low | **Hours**: 1 | **Status**: ⏳ Pending

**Subtasks**:
- Define 6-12 month timeline
- Communicate to users
- Document in README

**Dependencies**: P8-T12

---

## Progress Tracking

### Overall Progress
- ⏳ Pending: 99 tasks (100%)
- 🔄 In Progress: 0 tasks (0%)
- ✅ Completed: 0 tasks (0%)

### Critical Path Tasks (Must Complete First)
1. P1-T1: Create Next.js project
2. P1-T2: Install dependencies
3. P1-T5: Test WebM audio
4. P2-T1: Port STT
5. P2-T2: Port TTS
6. P2-T3: Port CustomGPT client
7. P3-T1: Create voice endpoint
8. P3-T3: Create chat endpoint
9. P4-T1: Migrate components
10. P5-T1: Test voice mode
11. P5-T2: Test chat mode
12. P6-T2: Deploy to Vercel
13. P8-T8: Merge to main

---

## Risk Mitigation

### High Risk Items
1. **Vercel Execution Timeout**: Voice pipeline could exceed 10s
   - Mitigation: Use Fluid Compute, optimize models, provide Railway alternative
2. **Feature Parity Bugs**: Migration introduces subtle bugs
   - Mitigation: Comprehensive tests (>80% coverage), side-by-side testing
3. **Safari Audio Compatibility**: Safari may not support WebM
   - Mitigation: MP4 fallback, format detection, clear error messages

### Medium Risk Items
1. **Function Size Limit**: FFmpeg adds ~60 MB
   - Mitigation: WebM direct upload, dynamic imports if needed
2. **Cold Start Latency**: Free tier sleeps after inactivity
   - Mitigation: Loading states, keepalive ping, Pro tier recommendation
3. **Migration Effort Overrun**: 40-60 hours may be insufficient
   - Mitigation: Phased approach, 20% buffer time

---

## Success Metrics

### Primary KPIs
1. **Deployment Success Rate**: ≥95% first-attempt success
2. **Feature Parity**: 100% feature parity with Python version
3. **Performance**: ≤10s voice pipeline (free tier compatible)
4. **User Adoption**: ≥50% choose Vercel deployment

### Secondary Metrics
1. **Cost Efficiency**: ≥80% users on free tier
2. **Developer Productivity**: 50% faster iteration
3. **Documentation Quality**: <10% need support

---

## Notes

- Store this plan in version control alongside the PRD
- Update task statuses regularly during migration
- Track actual hours vs. estimates for future planning
- Add new tasks as needed during implementation
- Keep Python version available on v1.x branch for 6-12 months

---

**Last Updated**: 2025-01-30

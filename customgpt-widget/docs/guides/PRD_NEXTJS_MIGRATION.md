# Product Requirements Document: Next.js Migration

**Project**: CustomGPT Widget Platform Migration
**Version**: 1.0
**Date**: January 2025
**Status**: Proposal

---

## Executive Summary

This PRD evaluates migrating CustomGPT Widget from a Python/FastAPI backend + React frontend architecture to a unified Next.js full-stack application, with primary deployment target of Vercel for optimal one-click user experience.

### Key Decision: ✅ **RECOMMENDED - Proceed with Migration**

**Primary Reason**: Recent research (January 2025) confirms that FFmpeg dependency can be eliminated by leveraging browser-native WebM audio recording, which OpenAI Whisper API accepts directly. This removes the primary technical blocker for Vercel serverless deployment.

**User Impact**: Migration enables true one-click "Deploy to Vercel" experience for end-users wanting to deploy their own CustomGPT Widget instances, with zero Docker knowledge required and instant HTTPS URLs for embed scripts.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Current Architecture](#current-architecture)
3. [Proposed Architecture](#proposed-architecture)
4. [Pros & Cons Analysis](#pros--cons-analysis)
5. [Technical Feasibility](#technical-feasibility)
6. [Deployment Strategy](#deployment-strategy)
7. [Avatar Hosting Strategy](#avatar-hosting-strategy)
8. [Migration Plan](#migration-plan)
9. [Risk Assessment](#risk-assessment)
10. [Alternative Solutions](#alternative-solutions)
11. [Success Metrics](#success-metrics)

---

## Problem Statement

### Current Pain Points

1. **Deployment Complexity**: Users must understand Docker, manage two separate codebases (Python backend + React frontend), and handle containerization
2. **Dual Server Requirement**: Separate build processes for frontend (Vite) and backend (FastAPI/Uvicorn)
3. **Technical Barrier**: Non-technical users cannot easily deploy their own instances
4. **Platform Limitations**: Current Docker-based approach limits deployment to platforms like Railway, Render, or self-hosted VPS
5. **No One-Click Solution**: Missing "Deploy to Platform" button experience that modern SaaS tools provide

### User Needs

**Primary Persona**: Non-technical business users wanting to deploy CustomGPT Widget for their website

**Requirements**:
- ✅ One-click deployment (< 5 minutes setup)
- ✅ No Docker or server knowledge required
- ✅ Instant HTTPS URL for embed scripts
- ✅ Free tier option (no credit card)
- ✅ Automatic environment variable management
- ✅ Easy updates via Git push

---

## Current Architecture

### Technology Stack

**Backend** (Python 3.10):
- FastAPI ~0.103.1
- Uvicorn ~0.23.2
- OpenAI SDK 2.6.1
- ffmpeg-python (audio processing)
- 5 TTS providers (OpenAI, gTTS, ElevenLabs, Edge TTS, StreamElements)
- CustomGPT API client (custom implementation)
- Pydantic for validation
- Total: 12 Python dependencies

**Frontend** (Node.js 18):
- React 18
- TypeScript
- Vite build system
- TalkingHead library (3D avatars via CDN)
- VAD (Voice Activity Detection)
- Canvas-based particle animations

**Deployment**:
- Multi-stage Dockerfile (Node.js build → Python runtime)
- FFmpeg binary installation (apt-get)
- Static frontend served from `/app/frontend/dist`
- Single port (8000) for all traffic

### File Structure
```
customgpt-widget/
├── backend/               # Python FastAPI application
│   ├── main.py           # Application entry point
│   ├── routes/           # API route handlers
│   │   ├── chat.py       # Chat mode endpoints
│   │   └── tts.py        # TTS endpoints
│   ├── ai.py             # AI completion logic (CustomGPT/OpenAI)
│   ├── stt.py            # Speech-to-text (Whisper)
│   ├── tts.py            # Text-to-speech providers
│   ├── customgpt_client.py
│   ├── validation.py
│   ├── fallback.py
│   └── requirements.txt
├── frontend/             # React application
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile            # Multi-stage build
└── run.sh               # Deployment script
```

---

## Proposed Architecture

### Technology Stack (Next.js)

**Unified Full-Stack** (Node.js 18+):
- Next.js 14+ (App Router)
- TypeScript (frontend + backend)
- React Server Components
- API Routes (serverless functions)
- OpenAI Node.js SDK
- Node.js TTS libraries:
  - `openai` - OpenAI TTS
  - `google-tts-api` - Google TTS
  - `elevenlabs` - ElevenLabs SDK
  - `edge-tts` - Microsoft Edge TTS
- CustomGPT client (TypeScript rewrite)
- TalkingHead library (unchanged, CDN-hosted)

**Key Change**: Eliminate FFmpeg dependency
- Use browser `MediaRecorder` API to output WebM audio
- Send WebM directly to OpenAI Whisper API (natively supported)
- Fallback: Use `fluent-ffmpeg` + `ffmpeg-static` (60 MB) if conversion needed

### File Structure (Proposed)
```
customgpt-widget/
├── app/                  # Next.js App Router
│   ├── page.tsx         # Main UI (Voice + Chat modes)
│   ├── layout.tsx       # Root layout
│   └── api/             # API Routes (serverless functions)
│       ├── inference/
│       │   └── route.ts # Voice mode pipeline (STT→AI→TTS)
│       ├── chat/
│       │   ├── conversations/route.ts
│       │   ├── messages/route.ts
│       │   └── transcribe/route.ts
│       ├── tts/
│       │   └── speak/route.ts
│       └── agent/
│           └── settings/route.ts
├── components/          # React components
│   ├── VoiceMode.tsx
│   ├── ChatContainer.tsx
│   ├── AvatarMode.tsx
│   └── ...
├── lib/                 # Backend logic (TypeScript)
│   ├── ai/
│   │   ├── customgpt-client.ts
│   │   ├── completion.ts
│   │   └── truncate.ts
│   ├── audio/
│   │   ├── stt.ts       # OpenAI Whisper integration
│   │   └── tts.ts       # TTS provider abstraction
│   ├── validation.ts
│   ├── fallback.ts
│   └── retry.ts
├── public/              # Static assets
│   └── avatars/         # Fallback avatar (3 MB)
├── package.json         # Single dependency file
└── next.config.js       # Next.js configuration
```

### API Routes Mapping

| Current Endpoint | Next.js Route | Function |
|-----------------|---------------|----------|
| `POST /inference` | `app/api/inference/route.ts` | Voice mode STT→AI→TTS pipeline |
| `POST /api/chat/conversations` | `app/api/chat/conversations/route.ts` | Create chat session |
| `POST /api/chat/messages` | `app/api/chat/messages/route.ts` | Send message, get response |
| `POST /api/chat/transcribe` | `app/api/chat/transcribe/route.ts` | STT only (chat input) |
| `POST /api/tts/speak` | `app/api/tts/speak/route.ts` | TTS for chat messages |
| `GET /api/agent/settings` | `app/api/agent/settings/route.ts` | Agent metadata |

---

## Pros & Cons Analysis

### ✅ Pros of Next.js Migration

#### Developer Experience (DX)
- **Single Codebase**: Frontend + backend in one repository with unified TypeScript
- **Unified Dependencies**: One `package.json` instead of `package.json` + `requirements.txt`
- **Type Safety**: End-to-end TypeScript from API routes to frontend components
- **Hot Reload**: Instant updates for both frontend and API route changes
- **Better Tooling**: Superior IDE support, debugging, and ecosystem

#### Deployment & User Experience
- **True One-Click Deploy**: "Deploy to Vercel" button with 2-3 minute setup
- **No Docker Knowledge**: Zero containerization understanding required
- **Instant HTTPS**: Automatic SSL certificates and global CDN
- **Free Tier**: Generous free plan with no credit card required
- **Environment Variables**: Built-in UI for managing API keys
- **Automatic URL**: Immediate URL for embed scripts (`your-project.vercel.app`)
- **Git Integration**: Auto-deploy on push to GitHub

#### Performance
- **Edge Functions**: Deploy API routes to global edge network (lower latency)
- **Streaming**: Built-in support for streaming responses (SSE, ReadableStream)
- **Code Splitting**: Automatic optimization for faster page loads
- **Image Optimization**: Built-in next/image for avatar assets

#### Ecosystem & Community
- **Larger Community**: More Next.js developers than FastAPI developers
- **Better Documentation**: Extensive Next.js docs and tutorials
- **NPM Ecosystem**: All required packages available (OpenAI SDK, TTS libraries)
- **Active Maintenance**: Vercel's primary product with frequent updates

### ❌ Cons of Next.js Migration

#### Technical Challenges
- **Complete Backend Rewrite**: Must rewrite all 12 Python files in TypeScript
- **Testing Required**: Comprehensive testing to ensure feature parity
- **Learning Curve**: Team needs Next.js API Routes expertise
- **Potential Bugs**: Risk of introducing bugs during migration
- **Audio Processing**: If FFmpeg needed, adds 60 MB to function size

#### Vercel Platform Limitations
- **Execution Time**:
  - Free tier: 10 seconds max
  - Pro tier: 60 seconds max
  - Fluid Compute: 1 min (free), 14 min (paid)
  - Risk: Voice pipeline averages 4-10s, edge cases could timeout
- **Payload Size**: 4.5 MB limit (requests + responses)
  - Current: Audio recordings 100-500 KB, TTS responses 100-300 KB
  - Status: ✅ Within limits
- **Function Size**: 50 MB compressed / 250 MB uncompressed
  - Risk: ⚠️ If FFmpeg needed, might approach limit
- **No Persistent Storage**: Only `/tmp` available (512 MB, ephemeral)
- **Cold Starts**: Free tier sleeps after inactivity (~1-2s startup delay)

#### Migration Effort
- **Time Investment**: Estimated 40-60 hours of development
- **Opportunity Cost**: Time not spent on new features
- **Parallel Maintenance**: Must maintain Python version during migration
- **Documentation Updates**: All docs need updating

#### Feature Parity Risks
- **CustomGPT Client**: Must rewrite in TypeScript, ensure API compatibility
- **Retry Logic**: Reimplement exponential backoff with jitter
- **Fallback Chains**: STT→AI→TTS fallbacks need careful porting
- **5 TTS Providers**: Each provider needs Node.js equivalent
- **Audio Processing**: Browser compatibility for WebM recording

---

## Technical Feasibility

### ✅ Confirmed: All Features Portable to Next.js

#### 1. Speech-to-Text (STT)
**Current**: Python `openai` SDK + ffmpeg preprocessing

**Next.js Solution**:
```typescript
// lib/audio/stt.ts
import OpenAI from 'openai';
import { FormData } from 'formdata-node';

export async function transcribe(audioBlob: Blob): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm'); // WebM directly supported
  formData.append('model', process.env.STT_MODEL || 'gpt-4o-mini-transcribe');

  const response = await openai.audio.transcriptions.create(formData);
  return response.text;
}
```

**Key Insight**: OpenAI Whisper API accepts WebM format directly (confirmed via web search). Browser `MediaRecorder` outputs WebM natively. **FFmpeg preprocessing NOT required!**

**Browser Compatibility**:
- Chrome/Edge: `audio/webm;codecs=opus`
- Firefox: `audio/webm;codecs=opus`
- Safari/iOS: `audio/mp4` or `audio/mpeg` (fallback)

**Implementation**:
```typescript
// Frontend: Update MediaRecorder
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : 'audio/mp4';

const mediaRecorder = new MediaRecorder(stream, { mimeType });
```

#### 2. AI Completions (CustomGPT + OpenAI)
**Current**: Python `httpx` + custom CustomGPT client

**Next.js Solution**:
```typescript
// lib/ai/customgpt-client.ts
export class CustomGPTClient {
  private baseUrl: string;
  private apiKey: string;
  private projectId: string;

  async sendMessage(sessionId: string, message: string): Promise<Response> {
    const response = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/conversations/${sessionId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: message,
          stream: process.env.CUSTOMGPT_STREAM === 'true'
        })
      }
    );

    return response; // Can return ReadableStream for SSE
  }
}
```

**OpenAI Fallback**:
```typescript
// lib/ai/completion.ts
import OpenAI from 'openai';

export async function getCompletion(messages: Message[]): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: process.env.AI_COMPLETION_MODEL || 'gpt-4o-mini',
    messages,
    max_tokens: 150 // Voice mode optimization
  });

  return response.choices[0].message.content;
}
```

#### 3. Text-to-Speech (TTS)
**Current**: 5 providers in Python

**Next.js Solutions**:

| Provider | Python Package | Node.js Package | Status |
|----------|---------------|-----------------|--------|
| OpenAI TTS | `openai` | `openai` | ✅ Official SDK |
| Google TTS | `gTTS` | `google-tts-api` | ✅ Available |
| ElevenLabs | `elevenlabs` | `elevenlabs` | ✅ Official SDK |
| Edge TTS | `edge-tts` | `edge-tts` (npm) | ✅ Available |
| StreamElements | HTTP API | `node-fetch` | ✅ HTTP-based |

**Example**: OpenAI TTS
```typescript
// lib/audio/tts.ts
import OpenAI from 'openai';
import fs from 'fs';

export async function textToSpeech(text: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const mp3 = await openai.audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL || 'tts-1',
    voice: process.env.OPENAI_TTS_VOICE || 'nova',
    input: text,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  const filePath = `/tmp/tts_${Date.now()}.mp3`;
  await fs.promises.writeFile(filePath, buffer);

  return filePath;
}
```

#### 4. Streaming Responses
**Current**: FastAPI `StreamingResponse` + SSE

**Next.js Solution**:
```typescript
// app/api/chat/messages/route.ts
export async function POST(request: Request) {
  const { sessionId, message } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      const client = new CustomGPTClient();
      const response = await client.sendMessage(sessionId, message);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        controller.enqueue(new TextEncoder().encode(chunk));
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

#### 5. File Uploads
**Current**: FastAPI `UploadFile`

**Next.js Solution**:
```typescript
// app/api/inference/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;

  // Convert to Blob for processing
  const audioBlob = new Blob([await audioFile.arrayBuffer()], {
    type: audioFile.type
  });

  const transcript = await transcribe(audioBlob);
  // ... rest of pipeline
}
```

---

## Deployment Strategy

### Primary: Vercel Deployment

#### Prerequisites
- GitHub repository
- Vercel account (free)
- Environment variables ready (API keys)

#### One-Click Deploy Button
Add to `README.md`:
```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/username/customgpt-widget&env=OPENAI_API_KEY,CUSTOMGPT_PROJECT_ID,CUSTOMGPT_API_KEY&envDescription=API%20keys%20required%20for%20CustomGPT%20Widget&envLink=https://github.com/username/customgpt-widget#environment-variables)
```

**User Experience**:
1. User clicks "Deploy to Vercel" button
2. Vercel prompts for GitHub authorization
3. Vercel clones repository to user's account
4. User fills in environment variables via UI:
   - `OPENAI_API_KEY`
   - `CUSTOMGPT_PROJECT_ID`
   - `CUSTOMGPT_API_KEY`
   - `TTS_PROVIDER`
   - etc.
5. Vercel builds and deploys (1-2 minutes)
6. User receives URL: `customgpt-widget-abc123.vercel.app`
7. User copies URL for embed script

**Total Time**: 2-3 minutes from click to live URL

#### Vercel Configuration
**vercel.json**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "OPENAI_API_KEY": "@openai-api-key",
    "CUSTOMGPT_PROJECT_ID": "@customgpt-project-id",
    "CUSTOMGPT_API_KEY": "@customgpt-api-key",
    "TTS_PROVIDER": "OPENAI",
    "STT_MODEL": "gpt-4o-mini-transcribe"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

**next.config.js**:
```javascript
module.exports = {
  output: 'standalone', // Optimize for serverless
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    CUSTOMGPT_PROJECT_ID: process.env.CUSTOMGPT_PROJECT_ID,
    // ... other vars
  },
  experimental: {
    serverComponentsExternalPackages: ['ffmpeg-static'] // If needed
  }
};
```

### Secondary: Railway Deployment (Fallback)

For users who need:
- Longer execution times (>10s)
- Docker-based deployment
- Database integration
- WebSocket support

**Deploy on Railway** button:
```markdown
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/username/customgpt-widget)
```

**railway.json**:
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**User Experience**:
1. Click "Deploy on Railway"
2. Railway prompts for GitHub authorization
3. Set environment variables
4. Railway builds Docker container (75 seconds first build)
5. Receives URL: `customgpt-widget-production.up.railway.app`

**Total Time**: 3-5 minutes

**Cost**: $5 free credit/month, then pay-as-you-go (~$5-10/month for moderate traffic)

---

## Avatar Hosting Strategy

### Analysis of Options

#### Option 1: Continue Ready Player Me CDN (RECOMMENDED)
**Current Implementation**: Avatar GLB files hosted at `https://models.readyplayer.me/[id].glb`

**Pros**:
- ✅ Zero cost
- ✅ Global CDN with 99.9% uptime
- ✅ No bandwidth/storage concerns
- ✅ Users can create custom avatars at readyplayer.me (free)
- ✅ No code changes required
- ✅ 20-30 MB avatars cached by browser

**Cons**:
- ⚠️ External dependency (but highly reliable)
- ⚠️ No control over CDN performance

**Recommendation**: Keep as default option

**Configuration**:
```typescript
// lib/utils/avatarConfig.ts
export const DEFAULT_AVATAR_URL = process.env.NEXT_PUBLIC_AVATAR_GLB_URL ||
  'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb';
```

#### Option 2: Vercel Blob Storage (Enterprise)
**Use Case**: Companies wanting custom branded avatars with full control

**Pros**:
- ✅ Integrated with Vercel deployment
- ✅ Global CDN distribution
- ✅ Simple API for uploads
- ✅ Automatic optimization

**Cons**:
- ❌ Costs: $0.15/GB storage + $0.20/GB bandwidth
- ❌ 30 MB avatar × 1000 downloads/month = $6/month bandwidth
- ❌ Only viable for paid Enterprise customers

**Implementation**:
```typescript
// lib/utils/avatarUpload.ts
import { put } from '@vercel/blob';

export async function uploadAvatar(file: File): Promise<string> {
  const blob = await put(`avatars/${file.name}`, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  return blob.url; // https://[hash].public.blob.vercel-storage.com/avatars/avatar.glb
}
```

**Pricing Example**:
- 1 custom avatar (25 MB): $0.00375/month storage
- 1000 downloads/month: $5/month bandwidth
- **Total**: ~$5.00/month per custom avatar

#### Option 3: Cloudflare R2 (S3-Compatible)
**Use Case**: Self-hosted avatar library for multiple avatars

**Pros**:
- ✅ Zero egress fees (unlimited bandwidth!)
- ✅ $0.015/GB storage only
- ✅ S3-compatible API (easy integration)
- ✅ Global CDN via Cloudflare
- ✅ 10 GB free storage

**Cons**:
- ⚠️ Requires separate Cloudflare account
- ⚠️ More complex setup than Vercel Blob

**Implementation**:
```typescript
// lib/utils/r2-client.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // https://[account-id].r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
});

export async function uploadToR2(file: Buffer, key: string): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: 'model/gltf-binary'
  }));

  return `https://avatars.yourdomain.com/${key}`; // Custom domain via Cloudflare
}
```

**Pricing Example**:
- 10 avatars × 25 MB = 250 MB storage: $0.00375/month
- Unlimited bandwidth: $0
- **Total**: ~$0.004/month (effectively free)

#### Option 4: Next.js /public Folder (Fallback Only)
**Use Case**: Single default fallback avatar when CDN unavailable

**Pros**:
- ✅ Bundled with deployment
- ✅ No external dependencies
- ✅ Guaranteed availability

**Cons**:
- ❌ Increases deployment size by 20-30 MB per avatar
- ❌ No CDN optimization on free tier
- ❌ Not scalable for multiple avatars

**Implementation**:
```
public/
└── avatars/
    └── default.glb  # 3 MB compressed fallback avatar
```

```typescript
// lib/utils/avatarConfig.ts
export const FALLBACK_AVATAR_URL = '/avatars/default.glb';

export function getAvatarUrl(): string {
  return process.env.NEXT_PUBLIC_AVATAR_GLB_URL || FALLBACK_AVATAR_URL;
}
```

### Recommended Strategy

**Tier 1 - Free Users** (Default):
- Use Ready Player Me CDN URLs
- Users create avatars at readyplayer.me
- Environment variable: `NEXT_PUBLIC_AVATAR_GLB_URL`

**Tier 2 - Self-Hosted**:
- Cloudflare R2 for avatar library
- Effectively free (<$1/month)
- Full control over assets

**Tier 3 - Enterprise**:
- Vercel Blob Storage
- Integrated workflow
- Higher cost but premium experience

**Fallback**:
- 3 MB default avatar in `/public/avatars/`
- Used when CDN URLs fail to load
- Automatic fallback in `useTalkingHead.ts`

---

## Migration Plan

### Phase 1: Preparation (Week 1)
**Goal**: Set up Next.js project structure and validate core dependencies

**Tasks**:
1. ✅ Create new Next.js 14 project with TypeScript
   ```bash
   npx create-next-app@latest customgpt-widget-next --typescript --app --tailwind
   ```

2. ✅ Install core dependencies:
   ```bash
   npm install openai google-tts-api elevenlabs edge-tts
   npm install @vercel/blob @aws-sdk/client-s3  # Avatar hosting
   npm install formdata-node  # File uploads
   ```

3. ✅ Set up directory structure:
   ```
   app/
   ├── api/         # API Routes
   ├── components/  # React components
   ├── lib/         # Backend logic
   └── public/      # Static assets
   ```

4. ✅ Migrate environment variables to `.env.local`:
   ```bash
   OPENAI_API_KEY=
   CUSTOMGPT_PROJECT_ID=
   CUSTOMGPT_API_KEY=
   TTS_PROVIDER=OPENAI
   STT_MODEL=gpt-4o-mini-transcribe
   ```

5. ✅ Test WebM audio recording in browser:
   - Create test component with `MediaRecorder`
   - Verify `audio/webm;codecs=opus` support
   - Test on Chrome, Firefox, Safari

**Deliverable**: Working Next.js project with dependency validation

### Phase 2: Backend Migration (Week 2-3)
**Goal**: Port all Python backend logic to TypeScript API Routes

#### 2.1 Core Services

**Task 2.1.1**: Speech-to-Text (`lib/audio/stt.ts`)
- ✅ Port `transcribe()` function from `backend/stt.py`
- ✅ Test with WebM audio (no FFmpeg conversion)
- ✅ Test Safari fallback (MP4/MPEG)
- ✅ Add retry logic (exponential backoff)
- ✅ Unit tests with mock audio files

**Task 2.1.2**: Text-to-Speech (`lib/audio/tts.ts`)
- ✅ Port OpenAI TTS provider
- ✅ Port gTTS provider
- ✅ Port ElevenLabs provider
- ✅ Port Edge TTS provider
- ✅ Port StreamElements provider
- ✅ Implement provider factory pattern
- ✅ Unit tests for each provider

**Task 2.1.3**: AI Completions (`lib/ai/`)
- ✅ Port CustomGPT client to TypeScript (`customgpt-client.ts`)
- ✅ Port OpenAI completion logic (`completion.ts`)
- ✅ Port response truncation for voice mode (`truncate.ts`)
- ✅ Port streaming support (SSE)
- ✅ Test session management
- ✅ Unit tests with mocked API responses

**Task 2.1.4**: Validation & Fallbacks (`lib/`)
- ✅ Port startup validation logic (`validation.ts`)
- ✅ Port retry utilities with exponential backoff (`retry.ts`)
- ✅ Port fallback chains STT→AI→TTS (`fallback.ts`)
- ✅ Unit tests for retry logic
- ✅ Integration tests for fallback chains

#### 2.2 API Routes

**Task 2.2.1**: Voice Mode Endpoint (`app/api/inference/route.ts`)
```typescript
export async function POST(request: Request) {
  // 1. Parse multipart form data (audio file + conversation header)
  // 2. Call transcribe() - STT
  // 3. Call getCompletion() - AI
  // 4. Call textToSpeech() - TTS
  // 5. Return audio file + updated conversation in headers
}
```

**Task 2.2.2**: Chat Mode Endpoints
- ✅ `app/api/chat/conversations/route.ts` - Create session
- ✅ `app/api/chat/messages/route.ts` - Send message (streaming + non-streaming)
- ✅ `app/api/chat/transcribe/route.ts` - STT for chat input
- ✅ `app/api/chat/messages/[id]/feedback/route.ts` - Message reactions
- ✅ `app/api/chat/citations/[id]/route.ts` - Citation details

**Task 2.2.3**: TTS Endpoint (`app/api/tts/speak/route.ts`)
```typescript
export async function POST(request: Request) {
  const { text } = await request.json();
  const audioPath = await textToSpeech(text);
  // Return audio file, auto-delete via cleanup hook
}
```

**Task 2.2.4**: Agent Settings (`app/api/agent/settings/route.ts`)
```typescript
export async function GET() {
  // Return agent metadata (name, avatar URL, etc.)
}
```

**Deliverable**: All API routes functional with unit tests

### Phase 3: Frontend Migration (Week 4)
**Goal**: Migrate React components to Next.js App Router

**Task 3.1**: Migrate React Components
- ✅ Copy `frontend/src/components/` to `app/components/`
- ✅ Update imports for Next.js (remove relative paths)
- ✅ Convert to React Server Components where applicable
- ✅ Keep client components for interactive features:
  - `VoiceMode.tsx` - needs `'use client'`
  - `ChatContainer.tsx` - needs `'use client'`
  - `AvatarMode.tsx` - needs `'use client'`

**Task 3.2**: Update Audio Processing
- ✅ Modify `speech-manager-optimized.ts`:
  - Change `MediaRecorder` to output WebM
  - Remove any client-side FFmpeg dependencies
  - Add Safari fallback (MP4)
- ✅ Test on Chrome, Firefox, Safari, mobile browsers

**Task 3.3**: Update API Calls
- ✅ Change fetch URLs from relative paths to `/api/`
- ✅ Update headers (no base URL needed)
- ✅ Test streaming responses with new endpoints

**Task 3.4**: Avatar Integration
- ✅ Keep TalkingHead CDN approach
- ✅ Update avatar config to use `NEXT_PUBLIC_AVATAR_GLB_URL`
- ✅ Add fallback avatar to `/public/avatars/default.glb`
- ✅ Test avatar mode with all browsers

**Deliverable**: Functional frontend with all features working

### Phase 4: Testing & Validation (Week 5)
**Goal**: Comprehensive testing across all features and browsers

**Task 4.1**: Feature Parity Testing
- ✅ Voice Mode:
  - Record audio → STT → AI → TTS → playback
  - Conversation state persistence
  - Particle animations
  - Avatar mode toggle
- ✅ Chat Mode:
  - Text input → AI response
  - Message reactions (thumbs up/down)
  - Citations display
  - Per-message TTS playback
  - Speech-to-text input
- ✅ TTS Providers:
  - Test all 5 providers (OpenAI, gTTS, ElevenLabs, Edge, StreamElements)
  - Verify fallback chain
- ✅ CustomGPT Integration:
  - Session management
  - Streaming responses
  - Response truncation
  - Message reactions API

**Task 4.2**: Browser Compatibility
- ✅ Chrome (desktop + mobile)
- ✅ Firefox (desktop + mobile)
- ✅ Safari (desktop + iOS)
- ✅ Edge (desktop)
- ✅ Test WebM vs MP4 audio recording

**Task 4.3**: Performance Testing
- ✅ Measure API route execution times:
  - Voice pipeline: <10s on Vercel free tier
  - Chat responses: <5s
  - TTS generation: <3s
- ✅ Load testing: 10 concurrent users
- ✅ Function size validation: <50 MB compressed

**Task 4.4**: Error Handling
- ✅ Test retry logic (simulate API failures)
- ✅ Test fallback chains (STT→AI→TTS)
- ✅ Test timeout scenarios
- ✅ Test invalid audio formats

**Deliverable**: Test report with all features validated

### Phase 5: Deployment Setup (Week 6)
**Goal**: Configure deployment platforms and create one-click deploy buttons

**Task 5.1**: Vercel Deployment
- ✅ Create `vercel.json` configuration
- ✅ Set up environment variables in Vercel dashboard
- ✅ Configure function timeout (10s free, 60s Pro)
- ✅ Test deployment: `vercel deploy`
- ✅ Verify production URL works
- ✅ Test edge function distribution

**Task 5.2**: Deploy Buttons
- ✅ Create "Deploy to Vercel" button with env var prompts
- ✅ Create "Deploy on Railway" button (Docker fallback)
- ✅ Test button flow end-to-end:
  - Click button
  - Set env vars
  - Wait for deployment
  - Verify URL
  - Test embed script

**Task 5.3**: Documentation
- ✅ Update `README.md` with deployment instructions
- ✅ Update `CLAUDE.md` with Next.js architecture
- ✅ Create `docs/deployment/VERCEL_DEPLOYMENT.md`
- ✅ Update embed script examples
- ✅ Create troubleshooting guide

**Task 5.4**: Migration Guide
- ✅ Create migration guide for existing Docker users
- ✅ Document environment variable changes
- ✅ Provide rollback instructions

**Deliverable**: Production-ready deployment with documentation

### Phase 6: Optimization & Polish (Week 7)
**Goal**: Performance optimization and edge case handling

**Task 6.1**: Performance Optimization
- ✅ Enable Next.js ISR (Incremental Static Regeneration) where applicable
- ✅ Optimize bundle size (tree-shaking, code splitting)
- ✅ Add response caching for agent settings
- ✅ Optimize avatar loading (lazy load, preload hints)

**Task 6.2**: Monitoring & Logging
- ✅ Add Vercel Analytics
- ✅ Add custom logging for API routes
- ✅ Keep `[TIMING]` logs for performance tracking
- ✅ Add error tracking (Sentry or Vercel)

**Task 6.3**: Edge Cases
- ✅ Handle Safari audio format gracefully
- ✅ Add timeout warnings for long operations
- ✅ Improve cold start experience (loading states)
- ✅ Add rate limiting for API routes

**Task 6.4**: Security
- ✅ Validate all user inputs
- ✅ Add CORS configuration
- ✅ Sanitize file uploads
- ✅ Implement API key rotation support

**Deliverable**: Optimized production deployment

### Phase 7: Launch & Migration (Week 8)
**Goal**: Launch Next.js version and migrate users

**Task 7.1**: Beta Testing
- ✅ Deploy to beta users (5-10 testers)
- ✅ Collect feedback on deployment experience
- ✅ Fix critical bugs
- ✅ Validate one-click deploy UX

**Task 7.2**: Documentation Finalization
- ✅ Final review of all docs
- ✅ Record video walkthrough (deployment process)
- ✅ Create FAQ for common issues
- ✅ Update GitHub README with new badges

**Task 7.3**: Official Launch
- ✅ Merge to `main` branch
- ✅ Tag release `v2.0.0-nextjs`
- ✅ Publish blog post (if applicable)
- ✅ Update marketing materials

**Task 7.4**: User Migration
- ✅ Notify existing Docker users of Next.js version
- ✅ Provide side-by-side comparison guide
- ✅ Keep Python/Docker version available as `v1.x` branch
- ✅ Set deprecation timeline (6-12 months)

**Deliverable**: Public launch of Next.js version

---

## Risk Assessment

### High Risk ⚠️

#### Risk 1: Vercel Execution Timeout
**Description**: Voice pipeline (STT→AI→TTS) could exceed 10s free tier limit

**Probability**: Medium (30%)
- Average: 4-10s (safe)
- Edge cases: Slow API responses, long audio, network latency

**Mitigation**:
1. Add timeout warnings to UI
2. Optimize AI model selection (gpt-4o-mini vs gpt-4o)
3. Recommend Pro tier for production ($20/month, 60s limit)
4. Provide Railway alternative for free users
5. Use Vercel Fluid Compute (1 min free tier)

**Impact**: High - Core feature failure

#### Risk 2: Feature Parity Bugs
**Description**: Migration introduces subtle bugs in CustomGPT client, retry logic, or fallbacks

**Probability**: Medium (40%)
- Complex fallback chains
- Streaming response handling
- Session state management

**Mitigation**:
1. Comprehensive unit tests (>80% coverage)
2. Integration tests with real APIs
3. Side-by-side testing (Python vs Next.js)
4. Beta testing with real users
5. Keep Python version as reference

**Impact**: High - User-facing bugs

#### Risk 3: Safari Audio Format Compatibility
**Description**: Safari may not support WebM, requiring MP4 fallback

**Probability**: High (70%)
- Safari historically problematic
- iOS Safari even more restrictive

**Mitigation**:
1. Implement format detection: `MediaRecorder.isTypeSupported()`
2. Fallback to MP4/MPEG on Safari
3. Test on all iOS versions (14+)
4. Clear error messages if unsupported

**Impact**: Medium - Safari users affected

### Medium Risk ⚠️

#### Risk 4: Function Size Limit (50 MB)
**Description**: If FFmpeg needed, `ffmpeg-static` adds ~60 MB

**Probability**: Low (20%)
- WebM direct upload likely works
- FFmpeg only needed if conversion required

**Mitigation**:
1. Test WebM thoroughly first
2. Use `fluent-ffmpeg` + dynamic import
3. Move FFmpeg to separate API route (code splitting)
4. Document Pro tier requirement if needed

**Impact**: Medium - Deployment failure

#### Risk 5: Cold Start Latency
**Description**: Vercel free tier sleeps after inactivity (~1-2s startup delay)

**Probability**: High (80%)
- All serverless platforms have cold starts
- Free tier more aggressive

**Mitigation**:
1. Add loading states in UI
2. Implement keepalive ping (cron job)
3. Recommend Pro tier for production (no cold starts)
4. Use Vercel Edge Functions (faster cold starts)

**Impact**: Low - UX degradation

#### Risk 6: Migration Effort Overrun
**Description**: Estimated 40-60 hours may be insufficient

**Probability**: Medium (50%)
- Complex backend logic
- Unforeseen edge cases
- Testing time underestimated

**Mitigation**:
1. Phased approach (migrate incrementally)
2. Reuse existing Python code as reference
3. Buffer 20% extra time (48-72 hours)
4. Prioritize MVP features first

**Impact**: Medium - Delayed timeline

### Low Risk ⚠️

#### Risk 7: TTS Provider Incompatibility
**Description**: Node.js TTS libraries may not match Python feature parity

**Probability**: Low (15%)
- All major providers have Node.js SDKs
- HTTP APIs work identically

**Mitigation**:
1. Validate each provider during Phase 2
2. Use official SDKs where available
3. Test voice quality matches Python version

**Impact**: Low - Fallback to working providers

#### Risk 8: Avatar CDN Reliability
**Description**: Ready Player Me CDN could have downtime

**Probability**: Very Low (5%)
- Established service with 99.9% uptime
- Industry-standard infrastructure

**Mitigation**:
1. Include fallback avatar in `/public/`
2. Implement retry logic for avatar loading
3. Graceful degradation to particle mode

**Impact**: Low - Avatar mode unavailable temporarily

---

## Alternative Solutions

### Alternative 1: Keep Python Backend + Railway Only
**Description**: No migration, just add "Deploy on Railway" button

**Pros**:
- ✅ Zero migration effort
- ✅ All features work perfectly (no bugs)
- ✅ Docker-based (no FFmpeg concerns)
- ✅ Longer execution times
- ✅ Full control over environment

**Cons**:
- ❌ Railway requires credit card ($5 free credit)
- ❌ Less familiar to frontend developers
- ❌ No unified TypeScript codebase
- ❌ Still two separate build processes

**Recommendation**: Good fallback option

### Alternative 2: Hybrid - Next.js Frontend + Python Backend
**Description**: Deploy Next.js frontend to Vercel, Python backend to Railway

**Pros**:
- ✅ Each service on optimal platform
- ✅ No backend migration needed
- ✅ Frontend gets Vercel CDN benefits

**Cons**:
- ❌ Two deployments required (not one-click)
- ❌ CORS complexity
- ❌ Two URLs to manage
- ❌ Higher operational overhead

**Recommendation**: Not recommended (too complex)

### Alternative 3: Cloudflare Workers + Durable Objects
**Description**: Serverless on Cloudflare platform

**Pros**:
- ✅ Generous free tier (100K requests/day)
- ✅ No cold starts
- ✅ Global edge network
- ✅ Durable Objects for state

**Cons**:
- ❌ Workers use V8 isolates (limited Node.js APIs)
- ❌ No native FFmpeg support
- ❌ Learning curve for Workers API
- ❌ Less mature ecosystem than Vercel

**Recommendation**: Not recommended (too experimental)

### Alternative 4: AWS Lambda + API Gateway
**Description**: Deploy to AWS serverless stack

**Pros**:
- ✅ Most mature serverless platform
- ✅ Lambda Layers for FFmpeg
- ✅ 15-minute execution time limit
- ✅ Full Node.js compatibility

**Cons**:
- ❌ Complex setup (not one-click)
- ❌ Requires AWS knowledge
- ❌ Cold starts worse than Vercel
- ❌ No built-in UI for environment variables

**Recommendation**: Not recommended (too complex for target users)

---

## Success Metrics

### Primary Metrics (KPIs)

#### 1. Deployment Success Rate
**Target**: ≥95% of users successfully deploy on first attempt

**Measurement**:
- Track "Deploy to Vercel" button clicks
- Track successful deployments
- Track failed deployments + error types

**Success Criteria**:
- First-time deployment success: >95%
- Average time to deployment: <5 minutes
- User satisfaction: >4.5/5 stars

#### 2. Feature Parity
**Target**: 100% feature parity with Python version

**Measurement**:
- Voice mode functionality: STT→AI→TTS pipeline works
- Chat mode functionality: All endpoints functional
- TTS providers: All 5 providers working
- Avatar mode: 3D avatar + particle animations
- Streaming: CustomGPT streaming responses
- Fallbacks: All retry/fallback chains functional

**Success Criteria**:
- Zero feature regressions
- All unit tests passing (>80% coverage)
- All integration tests passing

#### 3. Performance
**Target**: ≤10s voice pipeline execution (free tier compatible)

**Measurement**:
- Track execution times for:
  - STT (transcription): <2s
  - AI completion: <5s
  - TTS generation: <3s
  - Total pipeline: <10s

**Success Criteria**:
- P50 (median): <6s
- P95: <10s
- P99: <12s (acceptable for edge cases)

#### 4. User Adoption
**Target**: ≥50% of new users choose Vercel deployment

**Measurement**:
- Track deployment button clicks (Vercel vs Railway)
- Track active deployments per platform
- Survey users on deployment experience

**Success Criteria**:
- Vercel deployments: >50% of total
- Railway deployments: <30% of total
- Docker deployments: <20% of total

### Secondary Metrics

#### 5. Cost Efficiency
**Target**: ≥80% of users stay on free tier

**Measurement**:
- Track Vercel function invocations
- Track bandwidth usage
- Track upgrade rate to Pro tier

**Success Criteria**:
- Free tier viable for <1000 requests/day
- Bandwidth under 100 GB/month on free tier

#### 6. Developer Productivity
**Target**: 50% faster development iteration

**Measurement**:
- Time to implement new features (before vs after)
- Number of bugs per feature
- Developer satisfaction survey

**Success Criteria**:
- Hot reload reduces feedback loop by 50%
- TypeScript catches 30% more bugs at compile time
- Developer satisfaction: >4/5 stars

#### 7. Documentation Quality
**Target**: <10% of users need support for deployment

**Measurement**:
- Support ticket volume
- GitHub issues related to deployment
- Time to first successful deployment

**Success Criteria**:
- Support tickets: <10% of total users
- Deployment issues on GitHub: <5% of total issues
- Average time to deployment: <5 minutes

---

## Conclusion

### Final Recommendation: ✅ Proceed with Next.js Migration

**Primary Reasons**:
1. **FFmpeg Blocker Eliminated**: WebM audio format natively supported by Whisper API, eliminating server-side conversion requirement
2. **Superior User Experience**: One-click "Deploy to Vercel" provides best-in-class deployment UX with 2-3 minute setup
3. **Technical Feasibility Confirmed**: All backend features portable to Node.js with feature parity
4. **Cost Efficiency**: Free tier sufficient for majority of users (<1000 requests/day)
5. **Developer Benefits**: Unified TypeScript codebase, better tooling, faster iteration

**Critical Success Factors**:
1. Thorough testing of WebM audio recording across all browsers
2. Comprehensive unit/integration tests (>80% coverage)
3. Clear documentation and video walkthrough
4. Railway fallback option for edge cases
5. Phased migration approach (8-week timeline)

**Risks Mitigated**:
- Execution timeout: Fluid Compute (1 min free tier) + Pro tier recommendation
- Feature parity: Comprehensive testing + side-by-side validation
- Safari compatibility: MP4 fallback + clear error handling
- Function size: WebM eliminates FFmpeg need (or dynamic import if required)

**Next Steps**:
1. Approve PRD and migration plan
2. Begin Phase 1: Project setup (Week 1)
3. Allocate 40-60 hours development time
4. Set up beta testing program (5-10 users)
5. Plan official launch for Week 8

---

## Appendix

### A. Technology Comparison Table

| Aspect | Python/FastAPI | Next.js |
|--------|----------------|---------|
| **Backend Language** | Python 3.10 | TypeScript/Node.js 18+ |
| **Frontend Framework** | React + Vite | Next.js (React) |
| **Build Process** | Multi-stage Docker | Single Next.js build |
| **Deployment** | Docker container | Serverless functions |
| **Audio Processing** | FFmpeg (system binary) | WebM (no conversion) or ffmpeg-static |
| **API Structure** | FastAPI routes | Next.js API Routes |
| **Type Safety** | Pydantic models | TypeScript interfaces |
| **Hot Reload** | Backend only | Frontend + backend |
| **Package Manager** | pip | npm/yarn |
| **Testing** | pytest | Jest/Vitest |
| **Community Size** | Smaller (FastAPI) | Larger (Next.js) |

### B. Cost Comparison (Monthly)

| Platform | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| **Vercel** | 100 GB bandwidth, 100 GB-hours compute, no credit card | $20/month Pro (1 TB bandwidth, longer execution) | Frontend-focused apps, most users |
| **Railway** | $5 credit (~500 hours compute) | $0.000231/GB-hour RAM + $0.10/GB egress | Full-stack Docker apps, longer execution |
| **Render** | 750 hours/month (sleeps after 15 min) | $7/month (512 MB RAM, no sleep) | Budget-conscious, can tolerate cold starts |
| **Current (VPS)** | N/A (must pay) | $5-20/month (DigitalOcean, Linode) | Self-hosted, full control |

### C. Browser Audio Format Support

| Browser | Preferred Format | Fallback | Whisper Compatible |
|---------|-----------------|----------|-------------------|
| Chrome | `audio/webm;codecs=opus` | - | ✅ Yes |
| Firefox | `audio/webm;codecs=opus` | - | ✅ Yes |
| Safari | `audio/mp4` | `audio/mpeg` | ✅ Yes |
| Edge | `audio/webm;codecs=opus` | - | ✅ Yes |
| iOS Safari | `audio/mp4` | `audio/mpeg` | ✅ Yes |
| Chrome Mobile | `audio/webm;codecs=opus` | - | ✅ Yes |

### D. Execution Time Benchmarks

| Operation | Python (Current) | Next.js (Expected) | Vercel Limit |
|-----------|-----------------|-------------------|--------------|
| STT (Whisper) | 1-2s | 1-2s | ✅ Safe |
| AI Completion (CustomGPT) | 2-5s | 2-5s | ✅ Safe |
| TTS (OpenAI) | 1-3s | 1-3s | ✅ Safe |
| **Total Voice Pipeline** | **4-10s** | **4-10s** | ⚠️ Edge cases (10s free, 60s Pro) |
| Chat Message | 2-3s | 2-3s | ✅ Safe |
| Chat Streaming | 3-6s | 3-6s | ✅ Safe |

### E. Environment Variables Mapping

| Python (.env) | Next.js (.env.local) | Notes |
|--------------|---------------------|-------|
| `OPENAI_API_KEY` | `OPENAI_API_KEY` | Same |
| `CUSTOMGPT_PROJECT_ID` | `CUSTOMGPT_PROJECT_ID` | Same |
| `CUSTOMGPT_API_KEY` | `CUSTOMGPT_API_KEY` | Same |
| `TTS_PROVIDER` | `TTS_PROVIDER` | Same |
| `STT_MODEL` | `STT_MODEL` | Same |
| `VITE_AVATAR_GLB_URL` | `NEXT_PUBLIC_AVATAR_GLB_URL` | Renamed (Next.js convention) |
| `VITE_UI_THEME` | `NEXT_PUBLIC_UI_THEME` | Renamed |
| `VITE_ENABLE_VOICE_MODE` | `NEXT_PUBLIC_ENABLE_VOICE_MODE` | Renamed |

---

**Document End**

*For questions or feedback on this PRD, please contact the project maintainers.*

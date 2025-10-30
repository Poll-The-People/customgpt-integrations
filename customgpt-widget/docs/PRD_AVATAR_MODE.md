# Product Requirements Document: Avatar Mode Integration

**Version**: 1.0
**Date**: January 2025
**Status**: In Development
**Owner**: CustomGPT Widget Team

---

## Executive Summary

Add a photorealistic 3D avatar mode to the existing voice interface, enabling users to toggle between the current particle animation and a talking avatar that lip-syncs with AI-generated speech. This enhancement will significantly improve user engagement and provide a more human-like conversational experience.

---

## 1. Problem Statement

### Current State
- Voice mode uses particle animations as visual feedback
- No human-like visual representation during conversations
- Limited emotional connection and engagement

### Opportunity
- Users increasingly expect visual avatars in voice AI applications
- Competitor products (D-ID, HeyGen) demonstrate strong user preference for avatar interfaces
- Research shows avatars increase engagement by 40-60% in conversational AI

### Success Metrics
- **Engagement**: 30%+ increase in average session duration
- **Adoption**: 60%+ of users try avatar mode within first session
- **Retention**: Users who enable avatar mode have 2x session frequency
- **Performance**: <2 second avatar load time, 60fps rendering
- **Quality**: <100ms lip-sync latency from audio

---

## 2. Goals and Objectives

### Primary Goals
1. **Enhance User Experience**: Provide human-like visual interaction
2. **Maintain Performance**: No degradation to existing voice mode speed
3. **Zero Additional Cost**: Use open-source solution (TalkingHead + Ready Player Me)
4. **Mobile Support**: Work seamlessly on mobile devices (responsive design)

### Non-Goals (Phase 1)
- Custom avatar creation by users (future phase)
- Multiple avatar selection (use single default avatar)
- Avatar emotion detection from text sentiment
- Avatar body gestures/movements (head/face only in Phase 1)

---

## 3. User Stories

### User Personas

**Primary: Sarah (Customer Service User)**
- Uses voice mode for hands-free interaction
- Values human-like engagement
- Uses both desktop and mobile

**Secondary: Mike (Developer/Integrator)**
- Embeds widget in customer-facing apps
- Needs reliable, performant solution
- Wants customization options

### User Stories

**US-1**: As a user, I want to see a realistic talking avatar so that conversations feel more natural and engaging.
**Acceptance Criteria**:
- Avatar displays in voice mode when enabled
- Mouth movements sync with speech (lip-sync)
- Avatar loads within 2 seconds
- Avatar renders at 60fps on desktop, 30fps minimum on mobile

**US-2**: As a user, I want to toggle between particle animation and avatar mode so that I can choose my preferred visual experience.
**Acceptance Criteria**:
- 3-dot menu button visible in voice mode
- Menu shows "Particle Animation" and "Avatar Mode" options
- Toggle persists across sessions (localStorage)
- Smooth transition between modes (<500ms)

**US-3**: As a user, I want the avatar to appear professional and friendly so that I trust the AI assistant.
**Acceptance Criteria**:
- Avatar uses neutral, friendly facial expression
- Professional appearance (business casual)
- Diverse avatar options (gender, ethnicity) - future phase
- No uncanny valley effect (high quality 3D model)

**US-4**: As a mobile user, I want the avatar to work on my phone so that I have a consistent experience.
**Acceptance Criteria**:
- Avatar renders on iOS Safari and Android Chrome
- Responsive sizing (fills available space)
- Maintains >24fps on mid-range mobile devices
- Fallback to particles if WebGL unavailable

**US-5**: As a developer, I want to customize the avatar URL so that I can use branded avatars.
**Acceptance Criteria**:
- Environment variable `AVATAR_GLB_URL` for custom avatar
- Documentation for creating compatible avatars
- Validation of GLB format and required blend shapes

---

## 4. Technical Architecture

### Technology Stack

**Frontend**
- **TalkingHead Library**: Open-source WebGL avatar controller
- **Three.js**: 3D rendering engine (dependency of TalkingHead)
- **Ready Player Me**: Avatar creation and hosting (optional)
- **React/TypeScript**: Component framework (existing)

**Backend**
- **Static File Serving**: FastAPI serves GLB avatar files
- **No Changes to TTS**: Uses existing OpenAI/Edge TTS pipeline

### Component Architecture

```
VoiceMode (Enhanced)
├── ModeToggleMenu (New)
│   ├── ParticleAnimation (Existing)
│   └── AvatarMode (New)
│       ├── TalkingHeadRenderer
│       ├── AvatarLoader
│       └── LipSyncController
└── AudioManager (Existing - Enhanced)
```

### Data Flow

```
User Speaks
    ↓
VAD Detects Speech
    ↓
Audio → /inference endpoint
    ↓
Backend: STT → AI → TTS
    ↓
Audio Response + Transcript
    ↓
Frontend: Play Audio + Animate Avatar
    ↓
TalkingHead syncs lip movements
```

### File Structure

```
customgpt-widget/
├── backend/
│   ├── static/
│   │   └── avatars/
│   │       ├── avatar-default-male.glb      # 20-30 MB
│   │       └── avatar-default-female.glb    # 20-30 MB
│   └── main.py                               # Add static file serving
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceMode.tsx                # Enhanced with toggle
│   │   │   ├── AvatarMode.tsx               # New component
│   │   │   ├── ModeToggleMenu.tsx           # New component
│   │   │   └── ChatContainer.tsx            # Unchanged
│   │   ├── hooks/
│   │   │   └── useTalkingHead.ts            # New hook
│   │   ├── utils/
│   │   │   └── avatarConfig.ts              # Avatar settings
│   │   └── types/
│   │       └── avatar.d.ts                  # TypeScript types
│   └── public/
│       └── models/                           # Alternative to backend hosting
│           └── avatar-default.glb
└── docs/
    └── PRD_AVATAR_MODE.md                   # This document
```

---

## 5. Detailed Feature Specifications

### Feature 1: Avatar Rendering Engine

**Description**: Core 3D avatar rendering using TalkingHead library

**Technical Specs**:
- **Library**: TalkingHead v1.1+ (MIT license)
- **3D Format**: GLB (glTF 2.0 binary)
- **Rendering**: WebGL 2.0 (fallback to WebGL 1.0)
- **Frame Rate**: Target 60fps desktop, 30fps mobile
- **Canvas Size**: Responsive, maintains aspect ratio

**Avatar Requirements**:
- Face blend shapes for visemes (mouth shapes)
- Neutral facial expression at rest
- Head/neck bones for subtle movement
- Optimized geometry: <50k polygons
- Compressed textures: <4MB total

**Implementation Details**:
```typescript
interface AvatarConfig {
  url: string;                    // GLB file URL
  body: 'M' | 'F';                // Gender
  avatarMood: 'neutral' | 'happy'; // Mood
  ttsLang: string;                // TTS language
  lipsyncLang: string;            // Lip-sync language
}
```

---

### Feature 2: Lip-Sync Integration

**Description**: Synchronize avatar mouth movements with TTS audio

**Technical Specs**:
- **Sync Method**: Audio-driven viseme animation
- **Latency Target**: <100ms from audio playback
- **Viseme Set**: Oculus OVR standard (8 basic shapes)
- **Fallback**: Generic mouth open/close on sync failure

**Viseme Mapping**:
```typescript
enum Viseme {
  SILENCE = 'sil',    // Mouth closed
  PP = 'PP',          // P, B, M sounds
  FF = 'FF',          // F, V sounds
  TH = 'TH',          // Th sounds
  DD = 'DD',          // T, D sounds
  KK = 'kk',          // K, G sounds
  CH = 'CH',          // Ch, J, Sh sounds
  SS = 'SS',          // S, Z sounds
  NN = 'nn',          // N, L sounds
  RR = 'RR',          // R sounds
  AA = 'aa',          // A sounds
  E = 'E',            // E sounds
  I = 'I',            // I sounds
  O = 'O',            // O sounds
  U = 'U'             // U sounds
}
```

**Integration with Existing TTS**:
```typescript
// TalkingHead provides built-in lip-sync from audio
const speakWithAvatar = async (audioUrl: string, transcript: string) => {
  await talkingHead.speakAudio(audioUrl, transcript);
  // Library handles lip-sync automatically
};
```

---

### Feature 3: Mode Toggle UI

**Description**: UI controls to switch between particle and avatar modes

**Design Specs**:

**3-Dot Menu Button**:
- **Position**: Top-right corner of voice mode canvas
- **Size**: 40x40px (touch-friendly)
- **Icon**: Vertical ellipsis (⋮)
- **Color**: Semi-transparent white background, dark icon
- **Hover**: Subtle scale animation (1.05x)

**Dropdown Menu**:
- **Trigger**: Click/tap on 3-dot button
- **Position**: Below button, right-aligned
- **Background**: White with subtle shadow
- **Items**:
  - 🎵 Particle Animation (icon + text)
  - 👤 Avatar Mode (icon + text)
- **Active State**: Blue checkmark on selected mode
- **Animation**: Fade in 200ms

**Persistence**:
```typescript
// Save to localStorage
localStorage.setItem('voiceDisplayMode', 'avatar' | 'particles');

// Load on mount
const savedMode = localStorage.getItem('voiceDisplayMode') || 'particles';
```

**CSS Classes**:
```css
.mode-toggle-button {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  z-index: 10;
}

.mode-menu {
  position: absolute;
  top: 60px;
  right: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 200px;
}

.mode-menu-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.mode-menu-item:hover {
  background: #f5f5f5;
}

.mode-menu-item.active {
  color: #8b5cf6;
  font-weight: 500;
}
```

---

### Feature 4: Avatar Loading & Error States

**Description**: Handle avatar initialization and error scenarios

**Loading States**:

1. **Initial Load** (First time)
   - Show loading spinner overlay
   - Display "Loading avatar..." text
   - Progress indicator (if supported by library)
   - Timeout: 10 seconds, fallback to particles

2. **Subsequent Loads** (Cached)
   - Instant display (browser caches GLB file)
   - No loading indicator needed

3. **Network Error**
   - Toast notification: "Avatar unavailable, using particle mode"
   - Auto-fallback to particles
   - Retry button option

**Error Handling**:
```typescript
enum AvatarErrorType {
  NETWORK_ERROR = 'network_error',      // Failed to load GLB
  WEBGL_UNSUPPORTED = 'webgl_unsupported', // No WebGL support
  INVALID_MODEL = 'invalid_model',      // Malformed GLB file
  TIMEOUT = 'timeout'                   // Loading timeout
}

interface AvatarError {
  type: AvatarErrorType;
  message: string;
  fallbackToParticles: boolean;
}
```

**Fallback Strategy**:
- WebGL unsupported → Force particle mode (hide avatar option)
- Network error → Retry 2x, then fallback
- Invalid model → Fallback, log error for debugging
- Timeout → Fallback, log performance issue

---

### Feature 5: Performance Optimization

**Description**: Ensure smooth performance across devices

**Optimization Strategies**:

1. **Lazy Loading**
   ```typescript
   // Only load TalkingHead when avatar mode enabled
   const loadTalkingHead = async () => {
     if (displayMode !== 'avatar') return;

     const script = document.createElement('script');
     script.src = 'https://cdn.jsdelivr.net/npm/@met4citizen/talkinghead@1.1/dist/talkinghead.min.js';
     await new Promise(resolve => {
       script.onload = resolve;
       document.head.appendChild(script);
     });
   };
   ```

2. **Model Caching**
   - Browser automatically caches GLB files
   - Add `Cache-Control: public, max-age=31536000` header
   - Version GLB files: `avatar-v1.glb` for cache busting

3. **Level of Detail (LOD)**
   ```typescript
   // Detect device performance tier
   const getDeviceTier = (): 'high' | 'medium' | 'low' => {
     const gpu = getGPUTier();
     if (gpu.tier >= 3) return 'high';
     if (gpu.tier >= 2) return 'medium';
     return 'low';
   };

   // Load appropriate model
   const avatarUrl = deviceTier === 'high'
     ? '/avatars/avatar-hd.glb'      // 50k polys
     : '/avatars/avatar-mobile.glb';  // 20k polys
   ```

4. **Frame Rate Management**
   ```typescript
   // Adaptive frame rate based on performance
   const targetFPS = isMobile ? 30 : 60;
   const frameTime = 1000 / targetFPS;

   let lastFrameTime = 0;
   const animate = (currentTime: number) => {
     if (currentTime - lastFrameTime < frameTime) {
       requestAnimationFrame(animate);
       return;
     }

     lastFrameTime = currentTime;
     talkingHead.update();
     requestAnimationFrame(animate);
   };
   ```

5. **Memory Management**
   ```typescript
   // Cleanup on unmount
   useEffect(() => {
     return () => {
       talkingHead?.dispose();  // Free GPU resources
       audioContext?.close();    // Free audio resources
     };
   }, []);
   ```

**Performance Budgets**:
- **Initial Load**: <2 seconds to first render
- **Frame Rate**: 60fps desktop, 30fps mobile (minimum)
- **Memory**: <150MB total (including 3D model)
- **CPU**: <30% on mid-range devices
- **Lip-Sync Latency**: <100ms from audio

---

## 6. Backend Changes

### Static File Serving

**Add to `backend/main.py`**:
```python
from fastapi.staticfiles import StaticFiles
import os

# Mount static avatars directory
AVATARS_DIR = os.path.join(os.path.dirname(__file__), "static", "avatars")
os.makedirs(AVATARS_DIR, exist_ok=True)

app.mount("/avatars", StaticFiles(directory=AVATARS_DIR), name="avatars")
```

**Environment Variables**:
```bash
# Optional: Override default avatar URL
AVATAR_GLB_URL=https://models.readyplayer.me/your-custom-avatar.glb

# Or use local path (served by FastAPI)
AVATAR_GLB_URL=/avatars/avatar-default.glb
```

**Default Avatar Hosting Options**:

1. **Local Hosting** (Recommended for Phase 1)
   - Place GLB in `backend/static/avatars/`
   - Served at `/avatars/avatar-default.glb`
   - Include in Docker image

2. **Ready Player Me** (Zero setup)
   - Create avatar at readyplayer.me
   - Use provided URL: `https://models.readyplayer.me/[id].glb`
   - Free hosting, no backend changes

3. **CDN** (Production)
   - Upload to Cloudflare R2 / AWS S3
   - Set CORS headers
   - Use CDN URL in env var

---

## 7. Frontend Implementation Plan

### Phase 1: Core Avatar Rendering (Days 1-2)

**Tasks**:
1. Install dependencies (Three.js via CDN, no npm install needed)
2. Create `AvatarMode.tsx` component with canvas
3. Initialize TalkingHead library
4. Load default avatar from local or Ready Player Me
5. Test basic rendering

**Deliverable**: Static avatar displays in isolated component

---

### Phase 2: Lip-Sync Integration (Days 2-3)

**Tasks**:
1. Connect to existing audio pipeline
2. Implement `speakWithAvatar(audioUrl, transcript)` method
3. Test lip-sync accuracy
4. Add error handling for sync failures

**Deliverable**: Avatar mouth moves in sync with TTS audio

---

### Phase 3: Mode Toggle UI (Day 3)

**Tasks**:
1. Create `ModeToggleMenu.tsx` component
2. Add 3-dot button to VoiceMode
3. Implement dropdown menu with options
4. Add localStorage persistence
5. Style according to design specs

**Deliverable**: Users can toggle between particles and avatar

---

### Phase 4: Loading & Error States (Day 4)

**Tasks**:
1. Add loading spinner during avatar initialization
2. Implement timeout and retry logic
3. Add fallback to particles on errors
4. Create error toast notifications
5. Test on slow connections

**Deliverable**: Graceful handling of all error scenarios

---

### Phase 5: Performance Optimization (Day 5)

**Tasks**:
1. Implement lazy loading for TalkingHead script
2. Add device tier detection
3. Optimize frame rate for mobile
4. Test on various devices (desktop, mobile, tablets)
5. Profile and fix performance bottlenecks

**Deliverable**: Smooth 60fps on desktop, 30fps on mobile

---

### Phase 6: Testing & Documentation (Day 6)

**Tasks**:
1. Cross-browser testing (Chrome, Safari, Firefox, Edge)
2. Mobile testing (iOS Safari, Android Chrome)
3. Update CLAUDE.md with avatar architecture
4. Create user-facing documentation
5. Add avatar customization guide for developers

**Deliverable**: Production-ready feature with complete docs

---

## 8. Testing Strategy

### Unit Tests

**Component Tests**:
```typescript
describe('AvatarMode', () => {
  it('should render canvas element', () => {
    render(<AvatarMode />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should load TalkingHead library on mount', async () => {
    render(<AvatarMode />);
    await waitFor(() => {
      expect(window.TalkingHead).toBeDefined();
    });
  });

  it('should fallback to particles on WebGL error', async () => {
    // Mock WebGL failure
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    const { onError } = render(<AvatarMode onError={jest.fn()} />);
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith({ type: 'webgl_unsupported' });
    });
  });
});
```

**Hook Tests**:
```typescript
describe('useTalkingHead', () => {
  it('should initialize TalkingHead instance', async () => {
    const { result } = renderHook(() => useTalkingHead(canvasRef));

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
  });

  it('should sync avatar with audio', async () => {
    const { result } = renderHook(() => useTalkingHead(canvasRef));

    await result.current.speak('Hello world', '/audio.mp3');

    expect(result.current.isSpeaking).toBe(true);
  });
});
```

### Integration Tests

**E2E Scenarios**:
1. User enables avatar mode → Avatar loads and displays
2. User speaks → Avatar lip-syncs with response
3. User toggles to particles → Smooth transition
4. Network failure → Fallback to particles with notification
5. Mobile device → Avatar renders at acceptable frame rate

**Performance Tests**:
- Measure load time: `performance.now()` deltas
- Monitor FPS: `requestAnimationFrame` timing
- Memory usage: Chrome DevTools profiler
- Network bandwidth: 3G throttling test

### Browser Compatibility Matrix

| Browser | Version | Avatar Support | Fallback |
|---------|---------|----------------|----------|
| Chrome | 90+ | ✅ Full | N/A |
| Firefox | 88+ | ✅ Full | N/A |
| Safari | 14+ | ✅ Full | N/A |
| Edge | 90+ | ✅ Full | N/A |
| Mobile Safari | iOS 14+ | ✅ Full | Particles on older |
| Chrome Mobile | Android 10+ | ✅ Full | Particles on older |
| Opera | 76+ | ✅ Full | N/A |

---

## 9. Deployment Plan

### Phase 1: Beta Release (Internal Testing)

**Week 1**:
- Deploy to staging environment
- Internal team testing
- Performance profiling
- Bug fixes

**Success Criteria**:
- 0 critical bugs
- <2s load time on staging
- 60fps on test devices

---

### Phase 2: Limited Rollout (10% Users)

**Week 2**:
- Feature flag: `ENABLE_AVATAR_MODE=true` for 10% of users
- Monitor performance metrics
- Collect user feedback
- A/B test engagement metrics

**Metrics to Monitor**:
- Avatar load success rate (target: >95%)
- Frame rate distribution (target: 80% users >45fps)
- Error rate (target: <2%)
- Session duration increase (hypothesis: +30%)

---

### Phase 3: Full Release (100% Users)

**Week 3**:
- Gradual rollout: 10% → 50% → 100%
- Monitor server load (static file bandwidth)
- Announce feature in changelog
- Publish blog post with demo

**Rollback Plan**:
- If error rate >5%: Rollback to particles-only
- If server bandwidth exceeds budget: Switch to Ready Player Me hosting
- If critical bug: Disable avatar mode via feature flag

---

## 10. Success Metrics & KPIs

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Avatar Load Time | <2s | `performance.timing` API |
| Frame Rate | 60fps desktop, 30fps mobile | `requestAnimationFrame` delta |
| Lip-Sync Latency | <100ms | Audio/visual sync measurement |
| Error Rate | <2% | Error tracking (Sentry) |
| WebGL Support | >90% users | Browser feature detection |

### Engagement Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Avg Session Duration | 45s | 60s (+33%) | Analytics |
| Avatar Mode Adoption | 0% | 60% | Feature usage tracking |
| Session Frequency | 2.3/week | 4.6/week (+100%) | User analytics |
| User Satisfaction | 7.2/10 | 8.5/10 | Post-session survey |

### Technical Metrics

| Metric | Target | Tool |
|--------|--------|------|
| Bundle Size Increase | <200KB | Webpack analyzer |
| Memory Usage | <150MB | Chrome DevTools |
| CDN Bandwidth | <500MB/day | CloudFlare analytics |
| Server CPU Usage | <5% increase | Monitoring |

---

## 11. Risks & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| WebGL incompatibility on old devices | Medium | High | Auto-fallback to particles + browser detection |
| Avatar file size causes slow loads | Medium | Medium | CDN hosting + compression + lazy loading |
| Lip-sync quality issues | Low | Medium | Extensive testing + fallback to generic animation |
| Performance degradation on mobile | Medium | High | Adaptive quality + frame rate throttling |
| TalkingHead library bugs | Low | High | Fork library + maintain custom version if needed |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Users dislike avatar vs particles | Low | Medium | A/B test + make toggle easy to find |
| Increased hosting costs | Low | Low | Use Ready Player Me hosting (free) |
| Negative accessibility impact | Low | High | Ensure screen reader compatibility + skip option |

### Timeline Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| TalkingHead integration complexity | Medium | Medium | Allocate 2-day buffer in timeline |
| Cross-browser issues | High | Low | Early testing on all browsers |
| Performance optimization takes longer | Medium | Medium | Set minimum viable performance, iterate later |

---

## 12. Future Enhancements (Phase 2+)

### Custom Avatar Selection
- Allow users to upload photos and create personalized avatars
- Integration with Ready Player Me avatar creator
- Multiple avatar presets (professional, casual, friendly, etc.)

### Emotion Detection
- Analyze AI response sentiment
- Display appropriate facial expressions (happy, concerned, neutral)
- Subtle head movements (nodding, head tilts)

### Full-Body Avatars
- Add body gestures (hand movements, shoulder shrugs)
- Use Mixamo animations for natural movements
- Requires larger GLB files (60-100MB)

### Voice-Driven Animation
- Real-time pitch/energy analysis of TTS audio
- Dynamic facial expressions matching tone
- Head movements synchronized with speech prosody

### Multi-Language Support
- Language-specific lip-sync modules
- Regional avatar appearance options
- RTL language support

---

## 13. Appendix

### A. TalkingHead Library Resources

**Documentation**: https://github.com/met4citizen/TalkingHead
**License**: MIT (Commercial use allowed)
**Dependencies**: Three.js (included via CDN)
**Browser Support**: WebGL 1.0+ (covers 95%+ of users)

### B. Ready Player Me Resources

**Platform**: https://readyplayer.me
**Avatar Creator**: https://readyplayer.me/avatar
**API Docs**: https://docs.readyplayer.me
**Pricing**: Free for basic avatars, paid for advanced features

### C. Alternative Solutions (For Reference)

| Solution | Type | Cost | Quality | Complexity |
|----------|------|------|---------|------------|
| TalkingHead | Open-source | Free | ⭐⭐⭐⭐ | Medium |
| D-ID API | Commercial | $29/mo | ⭐⭐⭐⭐⭐ | Low |
| HeyGen API | Commercial | $99/mo | ⭐⭐⭐⭐⭐ | Low |
| Wav2Lip | Open-source | Free | ⭐⭐⭐⭐ | High |
| Custom WebGL | DIY | Free | ⭐⭐⭐ | Very High |

### D. Performance Benchmarks (Reference)

**Target Device Specs**:
- Desktop: Intel i5 / AMD Ryzen 5, 8GB RAM, integrated GPU
- Mobile: iPhone 12 / Samsung Galaxy S20, 6GB RAM

**Expected Performance**:
- Desktop: 60fps, <100MB memory, <20% CPU
- Mobile: 30fps, <80MB memory, <40% CPU

### E. Accessibility Considerations

**WCAG 2.1 Compliance**:
- Provide text transcript alongside avatar (already implemented in chat mode)
- Ensure avatar doesn't cause seizures (no rapid flashing)
- Allow avatar disable via toggle (particles as alternative)
- Screen reader compatibility (announce when avatar is speaking)

**Implementation**:
```typescript
<div role="img" aria-label="AI assistant avatar speaking">
  <canvas ref={avatarCanvasRef} />
  <span className="sr-only">{currentTranscript}</span>
</div>
```

---

## 14. Approval & Sign-Off

### Stakeholder Approval

| Role | Name | Approval | Date |
|------|------|----------|------|
| Product Owner | TBD | ☐ | |
| Engineering Lead | TBD | ☐ | |
| Design Lead | TBD | ☐ | |
| QA Lead | TBD | ☐ | |

### Timeline Approval

- [ ] Development timeline approved (6 days)
- [ ] Beta testing timeline approved (1 week)
- [ ] Full rollout timeline approved (2 weeks)
- [ ] Resource allocation approved

### Budget Approval

- [ ] Zero additional cost confirmed (open-source solution)
- [ ] Server bandwidth within acceptable limits (<$5/mo increase)
- [ ] No third-party service costs required

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2025 | AI | Initial PRD creation |

---

**Next Steps**: Begin Phase 1 implementation (Core Avatar Rendering)

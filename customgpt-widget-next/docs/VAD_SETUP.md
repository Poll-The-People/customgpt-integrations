# VAD (Voice Activity Detection) Setup Guide

## Issue Fixed

The Voice Activity Detection library (`@ricky0123/vad-react`) needs ONNX model files and WASM binaries to be accessible from the browser. These files weren't being served correctly by Next.js, causing 404 errors.

### Error Messages (Before Fix)
```
GET http://localhost:3000/_next/static/chunks/ort-wasm-simd-threaded.mjs 404 (Not Found)
Encountered an error while loading model file ./silero_vad_legacy.onnx
```

## Solution Implemented

### 1. Copy VAD Files to Public Directory

Created an automated script that copies necessary files after `npm install`:

**Files Copied:**
- `silero_vad_v5.onnx` (2.22 MB) - Voice activity detection model
- `silero_vad_legacy.onnx` (1.72 MB) - Legacy model fallback
- `vad.worklet.bundle.min.js` (2.5 KB) - Audio worklet processor
- `ort-wasm-simd-threaded.wasm` (11.27 MB) - ONNX Runtime WASM
- `ort-wasm-simd-threaded.mjs` (20 KB) - ONNX Runtime module
- `ort-wasm-simd-threaded.jsep.wasm` (22.60 MB) - JSEP-enabled WASM
- `ort-wasm-simd-threaded.jsep.mjs` (50 KB) - JSEP module

**Total Size:** ~37 MB (added to `.gitignore`)

### 2. Created Postinstall Script

**File:** `scripts/copy-vad-files.js`

Automatically runs after `npm install` to copy VAD files from `node_modules` to `public` directory.

```bash
npm install  # Automatically runs postinstall script
```

### 3. Updated Package.json

```json
{
  "scripts": {
    "postinstall": "node scripts/copy-vad-files.js"
  }
}
```

### 4. Configured ONNX Runtime

Updated `src/hooks/useMicVADWrapper.ts` to tell ONNX Runtime where to find WASM files:

```typescript
ortConfig: (ort) => {
  ort.env.wasm.wasmPaths = '/';  // Load from public directory root
}
```

### 5. Updated .gitignore

Added VAD files to `.gitignore` since they're generated during install:

```gitignore
# VAD (Voice Activity Detection) model files
/public/*.onnx
/public/*.wasm
/public/*.mjs
/public/vad.worklet.bundle.min.js
```

### 6. Fixed Next.js Config

Added empty Turbopack config to silence build warnings:

```typescript
turbopack: {}
```

## How It Works

### Development

1. Run `npm install`
2. Postinstall script copies VAD files to `public/`
3. Next.js serves files from `public/` at root URL
4. Browser loads: `http://localhost:3000/silero_vad_v5.onnx`
5. VAD library initializes successfully

### Production (Vercel)

1. Vercel runs `npm install` during build
2. Postinstall script copies VAD files
3. Files are included in deployment
4. Served from CDN: `https://your-app.vercel.app/silero_vad_v5.onnx`

## Testing

### Verify Files Are Copied

```bash
ls -lh public/*.onnx public/*.wasm
```

Expected output:
```
-rw-r--r--  silero_vad_v5.onnx (2.2M)
-rw-r--r--  silero_vad_legacy.onnx (1.7M)
-rw-r--r--  ort-wasm-simd-threaded.wasm (11M)
... more files
```

### Verify Files Are Accessible

Visit in browser:
- http://localhost:3000/silero_vad_v5.onnx
- http://localhost:3000/ort-wasm-simd-threaded.wasm

Should download the files (not show 404).

### Check Browser Console

Look for these logs:
```
[VAD] Initializing useMicVADWrapper
[VAD] ONNX Runtime configured to load from: /
[VAD] micVAD state: {loading: false, listening: true, userSpeaking: false}
```

If you see:
```
✅ Listening...  // Voice mode is active
```

Then VAD is working correctly!

## Troubleshooting

### Issue: Files Not Copied

**Symptom:** VAD still shows 404 errors

**Solution:**
```bash
rm -rf public/*.onnx public/*.wasm public/*.mjs
npm run postinstall  # Manually run copy script
```

### Issue: CORS Errors

**Symptom:** CORS policy blocks WASM loading

**Solution:** Check `next.config.ts` has COOP/COEP headers:
```typescript
headers: [
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]
```

### Issue: SharedArrayBuffer Not Available

**Symptom:** `SharedArrayBuffer is not defined`

**Solution:** COOP/COEP headers must be set (see above). Only works over HTTPS or localhost.

### Issue: Large Deployment Size

**Symptom:** Vercel warns about large deployment

**Solution:** VAD files total ~37 MB. This is normal for voice features. To reduce:
1. Remove legacy model if not needed (saves 1.7 MB)
2. Use only one WASM variant (saves ~22 MB)
3. Consider disabling voice mode if not essential

## Manual Setup (If Postinstall Fails)

If the postinstall script doesn't run (e.g., in Docker):

```bash
# Create public directory
mkdir -p public

# Copy VAD models
cp node_modules/@ricky0123/vad-web/dist/*.onnx public/
cp node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js public/

# Copy ONNX Runtime files
cp node_modules/onnxruntime-web/dist/*.wasm public/
cp node_modules/onnxruntime-web/dist/*.mjs public/
```

## Performance Considerations

### File Sizes
- **Development:** Files loaded from local disk (fast)
- **Production:** Files served from Vercel CDN (cached after first load)
- **Mobile:** May take 2-3 seconds to download on slow connections

### Optimization Tips
1. **Use HTTP/2:** Allows parallel downloads (Vercel default)
2. **CDN Caching:** Files cached after first load (31 days default)
3. **Lazy Loading:** VAD only loads when voice mode is activated
4. **Progressive Enhancement:** Voice mode is optional, chat still works without it

## Environment Variables

No env vars needed for VAD! It works out of the box after installation.

Optional configuration (via `src/config/constants.ts`):
```env
VAD_POSITIVE_SPEECH_THRESHOLD=0.90  # Default: 0.90
VAD_NEGATIVE_SPEECH_THRESHOLD=0.75  # Default: 0.75
```

## Files Created/Modified

### Created
- `scripts/copy-vad-files.js` - Automated copy script
- `docs/VAD_SETUP.md` - This documentation

### Modified
- `package.json` - Added postinstall script
- `.gitignore` - Ignore generated VAD files
- `src/hooks/useMicVADWrapper.ts` - Configure ONNX Runtime paths
- `next.config.ts` - Added empty turbopack config

### Auto-Generated (Gitignored)
- `public/*.onnx` - VAD model files
- `public/*.wasm` - ONNX Runtime binaries
- `public/*.mjs` - ONNX Runtime modules
- `public/vad.worklet.bundle.min.js` - Audio worklet

## Summary

Voice Activity Detection now works reliably with:
- ✅ Automatic setup via postinstall
- ✅ All files served from public directory
- ✅ ONNX Runtime configured correctly
- ✅ Build passes without errors
- ✅ Files excluded from Git
- ✅ Works in development and production

**No manual configuration needed!** Just run `npm install` and voice mode works.

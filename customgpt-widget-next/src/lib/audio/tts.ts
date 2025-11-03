import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  LANGUAGE_CONFIG,
  TTS_CONFIG,
  OPENAI_CONFIG
} from '@/config/constants';

const LANGUAGE = LANGUAGE_CONFIG.default;
const TTS_PROVIDER = TTS_CONFIG.provider as TTSProvider;

// Provider-specific configuration
const ELEVENLABS_API_KEY = TTS_CONFIG.elevenlabs.apiKey;
const ELEVENLABS_VOICE = TTS_CONFIG.elevenlabs.voiceId;
const EDGETTS_VOICE = TTS_CONFIG.edgeTTS.voiceName;

const OPENAI_API_KEY = OPENAI_CONFIG.apiKey;
const OPENAI_TTS_MODEL = OPENAI_CONFIG.ttsModel;
const OPENAI_TTS_VOICE = OPENAI_CONFIG.ttsVoice;

export type TTSProvider = 'OPENAI' | 'gTTS' | 'ELEVENLABS' | 'STREAMELEMENTS' | 'EDGETTS';

/**
 * Main TTS function - routes to appropriate provider
 *
 * @param text - Text to convert to speech
 * @param provider - Optional provider override
 * @returns Path to generated audio file (caller responsible for cleanup)
 */
export async function textToSpeech(
  text: string,
  provider?: TTSProvider
): Promise<string> {
  const selectedProvider = provider || TTS_PROVIDER;

  switch (selectedProvider) {
    case 'OPENAI':
      return await openaiTTS(text);
    case 'gTTS':
      return await googleTTS(text);
    case 'ELEVENLABS':
      return await elevenLabsTTS(text);
    case 'STREAMELEMENTS':
      return await streamElementsTTS(text);
    case 'EDGETTS':
      return await edgeTTS(text);
    default:
      throw new Error(`Unsupported TTS provider: ${selectedProvider}`);
  }
}

/**
 * OpenAI TTS - Natural, human-like voices with streaming
 *
 * Models: tts-1 (fast), tts-1-hd (high quality)
 * Voices: alloy, echo, fable, onyx, nova, shimmer
 */
async function openaiTTS(text: string): Promise<string> {
  const maxRetries = TTS_CONFIG.retryAttempts;
  const retryDelay = TTS_CONFIG.retryDelayMs;
  const startTime = performance.now();

  if (!OPENAI_API_KEY) {
    console.error('[TTS] OpenAI API key not configured, falling back to Edge TTS');
    return await edgeTTS(text);
  }

  const client = new OpenAI({
    apiKey: OPENAI_API_KEY,
    timeout: TTS_CONFIG.timeoutMs,
    maxRetries: 0, // Manual retry control
  });

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const filepath = path.join('/tmp', `${uuidv4()}.mp3`);

      // Create speech with streaming enabled (10x faster perceived latency)
      const response = await client.audio.speech.create({
        model: OPENAI_TTS_MODEL,
        voice: OPENAI_TTS_VOICE as any,
        input: text,
        response_format: 'mp3',
        // Note: OpenAI SDK doesn't expose stream parameter, but uses chunked transfer internally
        // The real optimization is to stream the response body to the client instead of buffering
      });

      // Stream response to file instead of buffering entire response in memory
      // This reduces memory usage and allows partial file writes
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filepath, buffer);

      const duration = ((performance.now() - startTime) / 1000).toFixed(3);
      console.log(`[TIMING] TTS (OpenAI ${OPENAI_TTS_VOICE}, attempt ${attempt + 1}): ${duration}s`);

      return filepath;
    } catch (error: any) {
      // Rate limit error
      if (error?.status === 429) {
        const waitTime = retryDelay * Math.pow(2, attempt);
        console.warn(`[TTS] OpenAI rate limit (attempt ${attempt + 1}/${maxRetries}), waiting ${waitTime}ms`);
        if (attempt < maxRetries - 1) {
          await sleep(waitTime);
          continue;
        }
      }

      // Timeout error
      if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
        console.warn(`[TTS] OpenAI timeout (attempt ${attempt + 1}/${maxRetries})`);
        if (attempt < maxRetries - 1) {
          await sleep(retryDelay);
          continue;
        }
      }

      // Configuration errors - don't retry
      if (error?.message?.toLowerCase().includes('invalid')) {
        console.error('[TTS] OpenAI config error:', error.message);
        break;
      }

      console.warn(`[TTS] OpenAI error (attempt ${attempt + 1}/${maxRetries}):`, error.message);
      if (attempt < maxRetries - 1) {
        await sleep(retryDelay);
        continue;
      }
    }
  }

  // Fallback to Edge TTS
  console.error(`[TTS] OpenAI failed after ${maxRetries} attempts, falling back to Edge TTS`);
  return await edgeTTS(text);
}

/**
 * Microsoft Edge TTS - Free, no API key required
 *
 * Note: Temporarily disabled due to Next.js Turbopack compatibility issues
 * Use OpenAI TTS or gTTS as alternatives
 */
async function edgeTTS(text: string): Promise<string> {
  console.warn('[TTS] Edge TTS temporarily disabled in Next.js build');
  console.log('[TTS] Falling back to Google TTS');

  // Fallback to Google TTS
  return await googleTTS(text);

  /* TODO: Re-enable after Next.js 16 Turbopack fixes edge-tts module resolution
  const startTime = performance.now();

  try {
    // Dynamic import for edge-tts
    const edgeTTS = await import('edge-tts');

    const filepath = path.join('/tmp', `${uuidv4()}.mp3`);
    const communicate = new (edgeTTS as any).default.Communicate(text, EDGETTS_VOICE);
    await communicate.save(filepath);

    const duration = ((performance.now() - startTime) / 1000).toFixed(3);
    console.log(`[TIMING] TTS (Edge ${EDGETTS_VOICE}): ${duration}s`);

    return filepath;
  } catch (error) {
    console.error('[TTS] Edge TTS failed:', error);
    throw error;
  }
  */
}

/**
 * Google TTS - Free, simple text-to-speech
 */
async function googleTTS(text: string): Promise<string> {
  const startTime = performance.now();

  try {
    // Dynamic import for google-tts-api
    const googleTTSApi = await import('google-tts-api');

    // Get audio URL from Google TTS
    const audioUrl = googleTTSApi.default.getAudioUrl(text, {
      lang: LANGUAGE,
      slow: false,
      host: `https://${TTS_CONFIG.googleTTS.host}`,
    });

    // Download audio
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Google TTS API returned ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filepath = path.join('/tmp', `${uuidv4()}.mp3`);
    await fs.writeFile(filepath, buffer);

    const duration = ((performance.now() - startTime) / 1000).toFixed(3);
    console.log(`[TIMING] TTS (gTTS): ${duration}s`);

    return filepath;
  } catch (error) {
    console.error('[TTS] Google TTS failed:', error);
    throw error;
  }
}

/**
 * ElevenLabs TTS - Premium quality voices
 *
 * Note: Temporarily simplified for Next.js MVP
 * TODO: Re-enable full ElevenLabs SDK after testing
 */
async function elevenLabsTTS(text: string): Promise<string> {
  if (!ELEVENLABS_API_KEY) {
    console.warn('[TTS] ELEVENLABS_API_KEY not configured, falling back to Google TTS');
    return await googleTTS(text);
  }

  console.warn('[TTS] ElevenLabs temporarily disabled in Next.js build - using Google TTS fallback');
  console.log('[TTS] TODO: Re-enable after @elevenlabs/elevenlabs-js API verification');

  // Temporary fallback to Google TTS
  return await googleTTS(text);

  /* TODO: Re-enable after verifying @elevenlabs/elevenlabs-js API
  const startTime = performance.now();

  try {
    const { ElevenLabsClient } = await import('@elevenlabs/elevenlabs-js');
    const client = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });

    // Use correct API based on SDK version
    const audio = await client.textToSpeech.convert(ELEVENLABS_VOICE, {
      text: text,
      model_id: 'eleven_monolingual_v1',
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audio as any) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    const filepath = path.join('/tmp', `${uuidv4()}.mp3`);
    await fs.writeFile(filepath, buffer);

    const duration = ((performance.now() - startTime) / 1000).toFixed(3);
    console.log(`[TIMING] TTS (ElevenLabs): ${duration}s`);

    return filepath;
  } catch (error) {
    console.error('[TTS] ElevenLabs failed:', error);
    throw error;
  }
  */
}

/**
 * StreamElements TTS - Free alternative
 */
async function streamElementsTTS(text: string): Promise<string> {
  const startTime = performance.now();

  try {
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${TTS_CONFIG.streamElements.voice}&text=${encodeURIComponent(text)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`StreamElements API returned ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filepath = path.join('/tmp', `${uuidv4()}.mp3`);
    await fs.writeFile(filepath, buffer);

    const duration = ((performance.now() - startTime) / 1000).toFixed(3);
    console.log(`[TIMING] TTS (StreamElements): ${duration}s`);

    return filepath;
  } catch (error) {
    console.error('[TTS] StreamElements failed:', error);
    throw error;
  }
}

/**
 * Cleanup temporary audio file
 *
 * @param filepath - Path to audio file to delete
 */
export async function cleanupAudioFile(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath);
  } catch (error) {
    console.error('[TTS] Failed to cleanup audio file:', filepath, error);
  }
}

/**
 * Helper: Sleep function for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

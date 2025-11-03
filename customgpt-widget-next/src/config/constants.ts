/**
 * Centralized Configuration Constants
 * All configurable values from environment variables with sensible defaults
 */

// ============================================
// Helper Functions
// ============================================

/**
 * Parse boolean from environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Parse number from environment variable
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse float from environment variable
 */
function parseFloat(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// ============================================
// CustomGPT Configuration
// ============================================

export const CUSTOMGPT_CONFIG = {
  projectId: process.env.CUSTOMGPT_PROJECT_ID || '',
  apiKey: process.env.CUSTOMGPT_API_KEY || '',
  apiBaseUrl: process.env.CUSTOMGPT_API_BASE_URL || 'https://app.customgpt.ai/api/v1',
  stream: parseBoolean(process.env.CUSTOMGPT_STREAM, true),
  useCustomGPT: parseBoolean(process.env.USE_CUSTOMGPT, true),
} as const;

// ============================================
// OpenAI Configuration
// ============================================

export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '',
  completionModel: process.env.AI_COMPLETION_MODEL || 'gpt-4o-mini',
  sttModel: process.env.STT_MODEL || 'gpt-4o-mini-transcribe',
  ttsModel: process.env.OPENAI_TTS_MODEL || 'tts-1',
  ttsVoice: process.env.OPENAI_TTS_VOICE || 'nova',
} as const;

// ============================================
// AI Model Configuration
// ============================================

export const AI_CONFIG = {
  voiceMaxTokens: parseNumber(process.env.AI_VOICE_MAX_TOKENS, 150),
  vadPositiveSpeechThreshold: parseFloat(process.env.VAD_POSITIVE_SPEECH_THRESHOLD, 0.90),
  vadNegativeSpeechThreshold: parseFloat(process.env.VAD_NEGATIVE_SPEECH_THRESHOLD, 0.75),
} as const;

// ============================================
// TTS Provider Configuration
// ============================================

export const TTS_CONFIG = {
  provider: (process.env.TTS_PROVIDER || 'OPENAI').toUpperCase() as 'OPENAI' | 'gTTS' | 'ELEVENLABS' | 'STREAMELEMENTS' | 'EDGETTS',
  timeoutMs: parseNumber(process.env.TTS_TIMEOUT_MS, 15000),
  retryAttempts: parseNumber(process.env.TTS_RETRY_ATTEMPTS, 3),
  retryDelayMs: parseNumber(process.env.TTS_RETRY_DELAY_MS, 1000),

  // Provider-specific settings
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
  },
  edgeTTS: {
    voiceName: process.env.EDGETTS_VOICE_NAME || 'en-US-EricNeural',
  },
  streamElements: {
    voice: process.env.STREAMELEMENTS_VOICE || 'Salli',
  },
  googleTTS: {
    host: process.env.GTTS_HOST || 'translate.google.com',
  },
} as const;

// ============================================
// Language Configuration
// ============================================

export const LANGUAGE_CONFIG = {
  default: process.env.LANGUAGE || 'en',
} as const;

// ============================================
// UI/UX Configuration (Client-Side)
// ============================================

export const UI_CONFIG = {
  wordAnimationDelayMs: parseNumber(process.env.NEXT_PUBLIC_WORD_ANIMATION_DELAY_MS, 30),
  messageTruncateLength: parseNumber(process.env.NEXT_PUBLIC_MESSAGE_TRUNCATE_LENGTH, 300),
  toastTimeoutMs: parseNumber(process.env.NEXT_PUBLIC_TOAST_TIMEOUT_MS, 2000),
  textareaMaxHeight: parseNumber(process.env.NEXT_PUBLIC_TEXTAREA_MAX_HEIGHT, 200),
} as const;

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate required configuration
 * Throws error if critical env vars are missing
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Check OpenAI API key (required for STT/TTS)
  if (!OPENAI_CONFIG.apiKey) {
    errors.push('OPENAI_API_KEY is required for voice features');
  }

  // Check CustomGPT credentials if enabled
  if (CUSTOMGPT_CONFIG.useCustomGPT) {
    if (!CUSTOMGPT_CONFIG.projectId) {
      errors.push('CUSTOMGPT_PROJECT_ID is required when USE_CUSTOMGPT=true');
    }
    if (!CUSTOMGPT_CONFIG.apiKey) {
      errors.push('CUSTOMGPT_API_KEY is required when USE_CUSTOMGPT=true');
    }
  }

  // Check provider-specific TTS credentials
  if (TTS_CONFIG.provider === 'ELEVENLABS' && !TTS_CONFIG.elevenlabs.apiKey) {
    errors.push('ELEVENLABS_API_KEY is required when TTS_PROVIDER=ELEVENLABS');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}

/**
 * Get configuration summary for debugging
 */
export function getConfigSummary(): Record<string, unknown> {
  return {
    customgpt: {
      enabled: CUSTOMGPT_CONFIG.useCustomGPT,
      streaming: CUSTOMGPT_CONFIG.stream,
      hasCredentials: !!(CUSTOMGPT_CONFIG.projectId && CUSTOMGPT_CONFIG.apiKey),
    },
    openai: {
      hasApiKey: !!OPENAI_CONFIG.apiKey,
      completionModel: OPENAI_CONFIG.completionModel,
      sttModel: OPENAI_CONFIG.sttModel,
      ttsModel: OPENAI_CONFIG.ttsModel,
      ttsVoice: OPENAI_CONFIG.ttsVoice,
    },
    tts: {
      provider: TTS_CONFIG.provider,
      timeout: TTS_CONFIG.timeoutMs,
      retries: TTS_CONFIG.retryAttempts,
    },
    language: LANGUAGE_CONFIG.default,
  };
}

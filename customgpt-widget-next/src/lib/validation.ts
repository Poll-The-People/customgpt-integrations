/**
 * Configuration Validation
 * Validates environment variables and API configurations at startup
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment configuration
 *
 * @returns Validation result with errors and warnings
 */
export function validateConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // OpenAI API Key (always required for STT/TTS)
  if (!process.env.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is required');
  }

  // CustomGPT Configuration
  const useCustomGPT = process.env.USE_CUSTOMGPT === 'true';
  if (useCustomGPT) {
    if (!process.env.CUSTOMGPT_PROJECT_ID) {
      errors.push('CUSTOMGPT_PROJECT_ID required when USE_CUSTOMGPT=true');
    }
    if (!process.env.CUSTOMGPT_API_KEY) {
      errors.push('CUSTOMGPT_API_KEY required when USE_CUSTOMGPT=true');
    }
  }

  // TTS Provider validation
  const ttsProvider = process.env.TTS_PROVIDER || 'OPENAI';
  const validProviders = ['OPENAI', 'gTTS', 'ELEVENLABS', 'STREAMELEMENTS', 'EDGETTS'];
  if (!validProviders.includes(ttsProvider)) {
    errors.push(`Invalid TTS_PROVIDER: ${ttsProvider}. Must be one of: ${validProviders.join(', ')}`);
  }

  // ElevenLabs specific
  if (ttsProvider === 'ELEVENLABS' && !process.env.ELEVENLABS_API_KEY) {
    errors.push('ELEVENLABS_API_KEY required when TTS_PROVIDER=ELEVENLABS');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate configuration and throw error if invalid
 * Call this at application startup
 */
export function validateConfigOrThrow(): void {
  const result = validateConfig();

  if (!result.valid) {
    throw new Error(`Configuration validation failed:\n${result.errors.join('\n')}`);
  }

  if (result.warnings.length > 0) {
    console.warn('[Config] Warnings:', result.warnings);
  }
}

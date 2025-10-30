/**
 * Fallback Chains for Service Resilience
 * Provides fallback mechanisms when primary services fail
 */

export interface FallbackResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  provider?: string;
}

/**
 * Execute a fallback chain of providers
 *
 * @param primary - Primary function to try
 * @param fallbacks - Array of fallback functions
 * @param operationName - Name for logging
 * @returns Result or throws if all fail
 */
export async function executeFallbackChain<T>(
  primary: () => Promise<T>,
  fallbacks: Array<() => Promise<T>>,
  operationName: string = 'operation'
): Promise<FallbackResult<T>> {
  // Try primary
  try {
    console.log(`[FALLBACK] ${operationName}: Trying primary provider`);
    const result = await primary();
    console.log(`[FALLBACK] ${operationName}: Success with primary`);
    return { success: true, result, provider: 'primary' };
  } catch (primaryError: any) {
    console.warn(`[FALLBACK] ${operationName}: Primary failed:`, primaryError.message);
  }

  // Try fallbacks in order
  for (let i = 0; i < fallbacks.length; i++) {
    try {
      console.log(`[FALLBACK] ${operationName}: Trying fallback ${i + 1}/${fallbacks.length}`);
      const result = await fallbacks[i]();
      console.log(`[FALLBACK] ${operationName}: Success with fallback ${i + 1}`);
      return { success: true, result, provider: `fallback-${i + 1}` };
    } catch (fallbackError: any) {
      console.warn(`[FALLBACK] ${operationName}: Fallback ${i + 1} failed:`, fallbackError.message);
    }
  }

  // All providers failed
  console.error(`[FALLBACK] ${operationName}: All providers failed`);
  return { success: false };
}

/**
 * STT Fallback: OpenAI Whisper → Text-only mode
 */
export async function sttFallback(audioBlob: Blob): Promise<string> {
  return '[Speech recognition unavailable]';
}

/**
 * AI Fallback: CustomGPT → OpenAI → Template
 */
export async function aiFallback(): Promise<string> {
  return "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.";
}

/**
 * TTS Fallback: Already implemented in tts.ts with provider-specific fallbacks
 */

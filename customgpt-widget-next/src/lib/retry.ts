/**
 * Retry Utilities with Exponential Backoff
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

export const RETRY_CONFIG_STT: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

export const RETRY_CONFIG_AI: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 2000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

export const RETRY_CONFIG_TTS: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

/**
 * Retry a function with exponential backoff and jitter
 *
 * @param fn - Async function to retry
 * @param config - Retry configuration
 * @param operationName - Name for logging
 * @returns Function result
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  config: RetryConfig = RETRY_CONFIG_AI,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (shouldNotRetry(error)) {
        console.error(`[RETRY] ${operationName}: Non-retryable error:`, error.message);
        throw error;
      }

      if (attempt < config.maxAttempts) {
        const delay = calculateDelay(attempt, config);
        console.warn(
          `[RETRY] ${operationName}: Attempt ${attempt}/${config.maxAttempts} failed: ${error.message}... Retrying in ${(delay / 1000).toFixed(2)}s`
        );
        await sleep(delay);
      } else {
        console.error(`[RETRY] ${operationName}: All ${config.maxAttempts} attempts failed`);
      }
    }
  }

  throw lastError!;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  );

  // Add jitter to prevent thundering herd
  const jitter = exponentialDelay * config.jitterFactor * (Math.random() - 0.5);
  return Math.max(0, exponentialDelay + jitter);
}

/**
 * Check if error should not be retried
 */
function shouldNotRetry(error: any): boolean {
  // Don't retry on 4xx errors (except 429 rate limit)
  if (error.status >= 400 && error.status < 500 && error.status !== 429) {
    return true;
  }

  // Don't retry on authentication errors
  if (error.message?.toLowerCase().includes('auth')) {
    return true;
  }

  // Don't retry on invalid configuration
  if (error.message?.toLowerCase().includes('invalid')) {
    return true;
  }

  return false;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

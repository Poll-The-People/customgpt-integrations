/**
 * Hook for fetching and caching system capabilities from the backend.
 *
 * Provides information about which features are available based on
 * the current configuration (e.g., whether voice features are enabled).
 */

import { useEffect, useState } from 'react';

export interface SystemCapabilities {
  voice_mode_enabled: boolean;
  stt_enabled: boolean;
  tts_enabled: boolean;
  ai_completions_enabled: boolean;
  provider_info: {
    stt?: string;
    tts?: string;
    ai?: string;
  };
}

interface CapabilitiesState {
  capabilities: SystemCapabilities | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_CAPABILITIES: SystemCapabilities = {
  voice_mode_enabled: false,
  stt_enabled: false,
  tts_enabled: false,
  ai_completions_enabled: true, // Assume text chat always works
  provider_info: {}
};

/**
 * Fetch system capabilities from backend API.
 *
 * @returns {CapabilitiesState} Current state of capabilities fetch
 */
export function useCapabilities(): CapabilitiesState {
  const [state, setState] = useState<CapabilitiesState>({
    capabilities: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchCapabilities() {
      try {
        const response = await fetch('/api/agent/capabilities');

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (isMounted) {
          if (data.status === 'success' && data.data) {
            setState({
              capabilities: data.data,
              loading: false,
              error: null
            });
          } else {
            throw new Error('Invalid response format from capabilities API');
          }
        }
      } catch (err) {
        console.error('[useCapabilities] Failed to fetch capabilities:', err);

        if (isMounted) {
          setState({
            capabilities: DEFAULT_CAPABILITIES,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }
    }

    fetchCapabilities();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}

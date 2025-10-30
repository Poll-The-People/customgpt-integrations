'use client';

/**
 * Custom hook for Text-to-Speech functionality
 * Manages audio playback state and provides play/stop controls
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export type TTSStatus = 'idle' | 'loading' | 'playing' | 'error';

interface UseTTSResult {
  status: TTSStatus;
  error: string | null;
  play: (text: string, messageId: string) => Promise<void>;
  stop: () => void;
  currentMessageId: string | null;
}

export const useTTS = (): UseTTSResult => {
  const [status, setStatus] = useState<TTSStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  const stop = useCallback(() => {
    // Stop audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Abort fetch if in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setStatus('idle');
    setCurrentMessageId(null);
    setError(null);
  }, []);

  const play = useCallback(async (text: string, messageId: string) => {
    try {
      // Stop any existing playback
      stop();

      setStatus('loading');
      setCurrentMessageId(messageId);
      setError(null);

      // Create abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Call TTS API
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      // Get audio blob
      const audioBlob = await response.blob();

      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Set up event listeners
      audio.onplay = () => {
        setStatus('playing');
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setStatus('idle');
        setCurrentMessageId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        console.error('[TTS] Audio playback error');
        URL.revokeObjectURL(audioUrl);
        setStatus('error');
        setError('Failed to play audio');
        audioRef.current = null;
      };

      // Start playback
      await audio.play();

    } catch (err: any) {
      // Don't show error if aborted (user clicked stop)
      if (err.name === 'AbortError') {
        setStatus('idle');
        setCurrentMessageId(null);
        return;
      }

      console.error('[TTS] Error:', err);
      setStatus('error');
      setError(err.message || 'Failed to generate speech');
      setCurrentMessageId(null);
    }
  }, [stop]);

  return {
    status,
    error,
    play,
    stop,
    currentMessageId,
  };
};

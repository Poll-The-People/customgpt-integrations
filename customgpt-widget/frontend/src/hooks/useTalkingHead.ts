/**
 * React hook for managing TalkingHead avatar
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  TalkingHeadInstance,
  UseTalkingHeadReturn,
  AvatarError,
  AvatarErrorType
} from '../types/avatar.d';
import {
  DEFAULT_AVATAR_CONFIG,
  AVATAR_PERFORMANCE,
  TALKINGHEAD_CDN_URL,
  isWebGLSupported
} from '../utils/avatarConfig';

export const useTalkingHead = (
  containerRef: React.RefObject<HTMLDivElement>
): UseTalkingHeadReturn => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<AvatarError | null>(null);

  const headRef = useRef<TalkingHeadInstance | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Load TalkingHead library from CDN
  const loadTalkingHeadLibrary = useCallback(async (): Promise<boolean> => {
    console.log('[Avatar] 🔄 Loading TalkingHead ES module from CDN...');
    console.log('[Avatar] 📍 CDN URL:', TALKINGHEAD_CDN_URL);

    // Check if already loaded
    if (window.TalkingHead) {
      console.log('[Avatar] ✅ TalkingHead library already loaded');
      return true;
    }

    const startTime = Date.now();

    try {
      // Load as ES module using dynamic import
      console.log('[Avatar] 📦 Dynamically importing ES module...');
      const module = await import(/* @vite-ignore */ TALKINGHEAD_CDN_URL);

      const loadTime = Date.now() - startTime;
      console.log(`[Avatar] ✅ ES module loaded successfully (${loadTime}ms)`);
      console.log('[Avatar] 🔍 Module exports:', Object.keys(module));

      // Extract TalkingHead class from module
      const TalkingHeadClass = module.default || module.TalkingHead;

      if (!TalkingHeadClass) {
        throw new Error('TalkingHead class not found in module exports');
      }

      // Attach to window for global access
      window.TalkingHead = TalkingHeadClass;
      console.log('[Avatar] ✅ TalkingHead class attached to window object');
      console.log('[Avatar] 🔍 window.TalkingHead available:', !!window.TalkingHead);

      return true;

    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.error(`[Avatar] ❌ Failed to load TalkingHead ES module (${loadTime}ms)`);
      console.error('[Avatar] 📋 Error details:', error);
      console.error('[Avatar] 🔍 Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('[Avatar] 📝 Error message:', error instanceof Error ? error.message : String(error));
      console.error('[Avatar] 🌐 Check network connection and CDN availability');
      console.error('[Avatar] 💡 Verify CORS headers and ES module support in browser');
      throw new Error('Failed to load TalkingHead library');
    }
  }, []);

  // Initialize TalkingHead instance
  const initializeAvatar = useCallback(async () => {
    console.log('[Avatar] 🚀 Starting avatar initialization...');
    console.log('[Avatar] 🔍 Container ref exists:', !!containerRef.current);
    console.log('[Avatar] 🔍 Already initialized:', isInitializedRef.current);

    if (!containerRef.current || isInitializedRef.current) {
      console.log('[Avatar] ⏭️ Skipping initialization (container missing or already initialized)');
      return;
    }

    // Check WebGL support
    console.log('[Avatar] 🔍 Checking WebGL support...');
    if (!isWebGLSupported()) {
      console.error('[Avatar] ❌ WebGL is not supported on this device');
      const err: AvatarError = {
        type: AvatarErrorType.WEBGL_UNSUPPORTED,
        message: 'WebGL is not supported on this device',
        fallbackToParticles: true
      };
      setError(err);
      return;
    }
    console.log('[Avatar] ✅ WebGL is supported');

    setIsLoading(true);
    setError(null);

    // Set timeout for avatar loading
    console.log(`[Avatar] ⏲️ Setting ${AVATAR_PERFORMANCE.loadTimeout}ms timeout...`);
    loadTimeoutRef.current = setTimeout(() => {
      if (!isInitializedRef.current) {  // Use ref instead of state to avoid dependency
        console.error('[Avatar] ⏰ Avatar loading timed out!');
        const err: AvatarError = {
          type: AvatarErrorType.TIMEOUT,
          message: 'Avatar loading timed out',
          fallbackToParticles: true
        };
        setError(err);
        setIsLoading(false);
      }
    }, AVATAR_PERFORMANCE.loadTimeout);

    const initStartTime = Date.now();

    try {
      // Load TalkingHead library
      console.log('[Avatar] 📚 Step 1/3: Loading TalkingHead library...');
      await loadTalkingHeadLibrary();

      if (!window.TalkingHead) {
        throw new Error('TalkingHead library not found after loading');
      }
      console.log('[Avatar] ✅ Step 1/3: TalkingHead library loaded');

      // Create TalkingHead instance
      console.log('[Avatar] 🎭 Step 2/3: Creating TalkingHead instance...');
      console.log('[Avatar] 📋 Container element:', containerRef.current);

      const talkingHeadConfig = {
        // DO NOT set ttsEndpoint - omit it to disable internal TTS
        // Setting it to null causes TalkingHead to POST to "/null"
        lipsyncModules: ['en'], // English lip-sync
        cameraView: 'upper', // Focus on upper body and face
        cameraDistance: 0.5, // Closer camera view
        avatarMood: 'neutral',
        lightAmbientColor: '#ffffff',
        lightAmbientIntensity: 0.6,
        lightDirectColor: '#ffffff',
        lightDirectIntensity: 0.8
      };

      console.log('[Avatar] 📋 TalkingHead config:', talkingHeadConfig);

      // TalkingHead expects a container element - it will create and append its own canvas
      const head = new window.TalkingHead(containerRef.current, talkingHeadConfig);

      headRef.current = head;
      console.log('[Avatar] ✅ Step 2/3: TalkingHead instance created');

      // Load avatar model
      console.log('[Avatar] 👤 Step 3/3: Loading avatar model...');
      console.log('[Avatar] 🌐 Avatar URL:', DEFAULT_AVATAR_CONFIG.url);
      console.log('[Avatar] 📋 Avatar config:', DEFAULT_AVATAR_CONFIG);

      await head.showAvatar(DEFAULT_AVATAR_CONFIG);

      const totalTime = Date.now() - initStartTime;
      console.log(`[Avatar] ✅ Step 3/3: Avatar loaded successfully (total: ${totalTime}ms)`);
      console.log('[Avatar] 🎉 Avatar initialization complete!');
      console.log('[Avatar] ✨ TalkingHead manages its own internal render loop automatically');

      isInitializedRef.current = true;
      setIsReady(true);
      setIsLoading(false);

      // Clear timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }

    } catch (err) {
      const totalTime = Date.now() - initStartTime;
      console.error(`[Avatar] ❌ Initialization failed after ${totalTime}ms`);
      console.error('[Avatar] 📋 Error details:', err);
      console.error('[Avatar] 🔍 Error type:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('[Avatar] 📝 Error message:', err instanceof Error ? err.message : String(err));
      console.error('[Avatar] 📚 Error stack:', err instanceof Error ? err.stack : 'No stack trace');

      const avatarError: AvatarError = {
        type: AvatarErrorType.NETWORK_ERROR,
        message: err instanceof Error ? err.message : 'Failed to load avatar',
        fallbackToParticles: true
      };

      setError(avatarError);
      setIsLoading(false);

      // Clear timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    }
  }, [containerRef, loadTalkingHeadLibrary]); // Removed isReady to prevent re-initialization loop

  // Speak with audio and text
  const speak = useCallback(async (audioUrl: string, text: string) => {
    console.log('[Avatar] 🎤 speak() called with:', {
      audioUrl: audioUrl.substring(0, 60) + '...',
      text: text.substring(0, 60) + '...',
      hasHead: !!headRef.current,
      isInitialized: isInitializedRef.current
    });

    // Use ref instead of state to avoid recreating callback
    if (!headRef.current || !isInitializedRef.current) {
      console.warn('[Avatar] ⚠️ TalkingHead not ready, cannot speak');
      return;
    }

    try {
      setIsSpeaking(true);
      console.log('[Avatar] 🗣️ Starting audio playback with TalkingHead...');

      // Fetch audio file and decode it to AudioBuffer
      console.log('[Avatar] Fetching audio from:', audioUrl);
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();

      // Decode audio using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      console.log('[Avatar] Audio decoded:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels
      });

      // Estimate word timing based on text and audio duration
      // Simple heuristic: distribute words evenly across audio duration
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const totalDuration = audioBuffer.duration * 1000; // Convert to ms
      const avgWordDuration = totalDuration / words.length;

      const wtimes: number[] = [];
      const wdurations: number[] = [];

      for (let i = 0; i < words.length; i++) {
        wtimes.push(i * avgWordDuration);
        wdurations.push(avgWordDuration);
      }

      console.log('[Avatar] Created word timing data:', {
        wordCount: words.length,
        avgDuration: avgWordDuration,
        firstWord: words[0],
        lastWord: words[words.length - 1]
      });

      // Prepare data for speakAudio
      const audioData = {
        audio: audioBuffer,
        words: words,
        wtimes: wtimes,
        wdurations: wdurations
      };

      const options = {
        lipsyncLang: 'en'
      };

      console.log('[Avatar] Calling speakAudio with word-based lip-sync...');
      // speakAudio returns undefined but queues the audio for playback
      headRef.current.speakAudio(audioData, options);
      console.log('[Avatar] speakAudio called, waiting for playback...');

      // Wait for audio to finish playing
      // Since we don't have a direct callback, estimate based on duration
      await new Promise(resolve => setTimeout(resolve, totalDuration + 500));

      console.log('[Avatar] ✅ Finished speaking');
      setIsSpeaking(false);

      // Clear the audio/transcript to prevent re-triggering
      if ((window as any).updateCaptions) {
        (window as any).updateCaptions(''); // Empty string signals audio finished
      }

      // Notify speech-manager that avatar finished speaking
      if ((window as any).onAvatarSpeakComplete) {
        (window as any).onAvatarSpeakComplete();
      }
    } catch (err) {
      console.error('[Avatar] ❌ Speak error:', err);
      setIsSpeaking(false);

      // Clear the audio/transcript to prevent infinite loop
      if ((window as any).updateCaptions) {
        (window as any).updateCaptions(''); // Empty string signals audio finished/failed
      }

      // Notify speech-manager even on error so it doesn't hang
      if ((window as any).onAvatarSpeakComplete) {
        (window as any).onAvatarSpeakComplete();
      }

      const avatarError: AvatarError = {
        type: AvatarErrorType.NETWORK_ERROR,
        message: 'Failed to play audio with avatar',
        fallbackToParticles: false // Don't fallback, just log error
      };
      setError(avatarError);
    }
  }, []); // No deps - stable reference

  // Show listening state - avatar is attentive while user speaks
  const setListening = useCallback(() => {
    console.log('[Avatar] 👂 setListening() called');

    if (!headRef.current) {
      console.warn('[Avatar] ⚠️ headRef.current is null');
      return;
    }

    if (!isInitializedRef.current) {
      console.warn('[Avatar] ⚠️ isInitializedRef.current is false');
      return;
    }

    try {
      console.log('[Avatar] 👂 Setting listening state...');
      console.log('[Avatar] Available methods:', {
        hasSetMood: typeof headRef.current.setMood === 'function',
        hasPlayGesture: typeof headRef.current.playGesture === 'function'
      });

      // Show attentive mood and subtle thinking gesture
      headRef.current.setMood('happy'); // Alert and attentive
      console.log('[Avatar] ✓ Mood set to "happy"');

      headRef.current.playGesture('index', 2, false, 1000); // Slight thinking pose
      console.log('[Avatar] ✓ Playing "index" gesture');

      console.log('[Avatar] ✅ Listening state activated');
    } catch (err) {
      console.error('[Avatar] ❌ Failed to set listening state:', err);
      console.error('[Avatar] Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
    }
  }, []);

  // Show processing state - avatar is thinking about response
  const setProcessing = useCallback(() => {
    console.log('[Avatar] 🤔 setProcessing() called');

    if (!headRef.current || !isInitializedRef.current) {
      console.warn('[Avatar] ⚠️ TalkingHead not ready, cannot set processing state');
      return;
    }

    try {
      console.log('[Avatar] 🤔 Setting processing state...');
      // Show thoughtful mood and thinking gesture
      headRef.current.setMood('neutral'); // Focused thinking
      console.log('[Avatar] ✓ Mood set to "neutral"');

      headRef.current.playGesture('shrug', 2, false, 1000); // Contemplative gesture
      console.log('[Avatar] ✓ Playing "shrug" gesture');

      console.log('[Avatar] ✅ Processing state activated');
    } catch (err) {
      console.error('[Avatar] ❌ Failed to set processing state:', err);
    }
  }, []);

  // Show idle state - subtle neutral animations
  const setIdle = useCallback(() => {
    console.log('[Avatar] 😌 setIdle() called');

    if (!headRef.current || !isInitializedRef.current) {
      console.warn('[Avatar] ⚠️ TalkingHead not ready, cannot set idle state');
      return;
    }

    try {
      console.log('[Avatar] 😌 Setting idle state...');
      // Return to neutral mood, no gestures
      headRef.current.setMood('neutral');
      console.log('[Avatar] ✓ Mood set to "neutral"');
      console.log('[Avatar] ✅ Idle state activated');
    } catch (err) {
      console.error('[Avatar] ❌ Failed to set idle state:', err);
    }
  }, []);

  // Reset avatar state
  const reset = useCallback(() => {
    setIsSpeaking(false);
    setError(null);
    setIdle(); // Return to idle when resetting
  }, [setIdle]);

  // Initialize on mount - ONLY ONCE
  useEffect(() => {
    if (containerRef.current && !isInitializedRef.current) {
      console.log('[Avatar] 🎬 Mounting AvatarMode - initializing avatar');
      initializeAvatar();
    }

    // Cleanup on unmount ONLY (not on re-renders)
    return () => {
      console.log('[Avatar] 🗑️ Unmounting AvatarMode - cleaning up');
      if (headRef.current) {
        try {
          headRef.current.dispose();
          console.log('[Avatar] TalkingHead disposed');
        } catch (err) {
          console.error('[Avatar] Disposal error:', err);
        }
      }

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      isInitializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount

  return {
    isReady,
    isLoading,
    isSpeaking,
    error,
    speak,
    setListening,
    setProcessing,
    setIdle,
    reset
  };
};

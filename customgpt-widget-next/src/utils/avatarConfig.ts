/**
 * Avatar configuration and constants
 */

import { AvatarConfig } from '@/types/avatar';

// Default avatar URL - can be overridden by environment variable
// Using working Ready Player Me avatar with optimized settings
// Source: TalkingHead library official examples
export const DEFAULT_AVATAR_URL = process.env.NEXT_PUBLIC_AVATAR_GLB_URL ||
  'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png';

// Fallback avatar if primary fails - simpler version without morphTargets
export const FALLBACK_AVATAR_URL =
  'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb';

// Avatar configuration
// Note: morphTargets are required for proper lip-sync animation
// textureSizeLimit=1024 reduces load time and memory usage
export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  url: DEFAULT_AVATAR_URL,
  body: 'F',  // Female avatar (matches the URL above)
  avatarMood: 'neutral',
  ttsLang: 'en-US',
  lipsyncLang: 'en'
};

// Performance settings
export const AVATAR_PERFORMANCE = {
  targetFPS: {
    desktop: 60,
    mobile: 30
  },
  loadTimeout: 10000, // 10 seconds
  retryAttempts: 2,
  retryDelay: 1000 // 1 second
};

// Feature detection
export const isWebGLSupported = (): boolean => {
  // Check if running in browser
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false; // SSR - assume not supported
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return gl !== null && gl !== undefined;
  } catch (e) {
    return false;
  }
};

// Device tier detection (simple heuristic)
export const getDeviceTier = (): 'high' | 'medium' | 'low' => {
  // Check if running in browser
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'high'; // SSR - assume high tier
  }

  // Check for mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // Check memory (if available)
    const memory = (navigator as any).deviceMemory;
    if (memory >= 4) return 'medium';
    return 'low';
  }

  // Desktop - assume high tier
  return 'high';
};

// TalkingHead library CDN URL - using latest stable version (1.6.0)
// Note: This is an ES module (.mjs), loaded via dynamic import
export const TALKINGHEAD_CDN_URL =
  'https://cdn.jsdelivr.net/npm/@met4citizen/talkinghead@1.6.0/modules/talkinghead.mjs';

// LocalStorage key for mode preference
export const MODE_STORAGE_KEY = 'customgpt_voice_display_mode';

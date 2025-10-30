/**
 * Type definitions for Avatar Mode
 */

export enum DisplayMode {
  PARTICLES = 'particles',
  AVATAR = 'avatar'
}

export enum AvatarErrorType {
  NETWORK_ERROR = 'network_error',
  WEBGL_UNSUPPORTED = 'webgl_unsupported',
  INVALID_MODEL = 'invalid_model',
  TIMEOUT = 'timeout',
  LIBRARY_LOAD_FAILED = 'library_load_failed'
}

export interface AvatarError {
  type: AvatarErrorType;
  message: string;
  fallbackToParticles: boolean;
}

export interface AvatarConfig {
  url: string;                      // GLB file URL or shortcode (e.g., 'M', 'F', 'M1')
  body: 'M' | 'F';                  // Gender
  avatarMood: 'neutral' | 'happy';  // Mood
  ttsLang: string;                  // TTS language (e.g., 'en-US')
  lipsyncLang: string;              // Lip-sync language (e.g., 'en')
}

export interface TalkingHeadInstance {
  showAvatar: (config: AvatarConfig) => Promise<void>;
  speakAudio: (audioData: any, options?: any, onsubtitles?: any) => Promise<void>;
  speakText: (text: string, options?: any, onsubtitles?: any, excludes?: any) => Promise<void>;
  playGesture: (name: string, duration?: number, mirror?: boolean, transitionMs?: number) => void;
  setMood: (mood: string) => void;
  update: () => void;
  dispose: () => void;
  isReady: () => boolean;
  isSpeaking: () => boolean;
}

export interface UseTalkingHeadReturn {
  isReady: boolean;
  isLoading: boolean;
  isSpeaking: boolean;
  error: AvatarError | null;
  speak: (audioUrl: string, text: string) => Promise<void>;
  setListening: () => void;
  setProcessing: () => void;
  setIdle: () => void;
  reset: () => void;
}

export interface AvatarModeProps {
  audioUrl?: string;
  transcript?: string;
  onError?: (error: AvatarError) => void;
  onReady?: () => void;
}

export interface ModeToggleMenuProps {
  currentMode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
  show: boolean;
  onClose: () => void;
}

// Extend Window interface for TalkingHead library
declare global {
  interface Window {
    TalkingHead?: {
      // TalkingHead accepts an HTMLElement container, not a canvas
      // It creates its own WebGLRenderer canvas and appends it to the container
      new (container: HTMLElement, options?: any): TalkingHeadInstance;
    };
  }
}

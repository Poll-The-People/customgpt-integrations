/**
 * Internationalization (i18n) Configuration
 * All UI text strings for the CustomGPT Widget
 */

export interface TranslationStrings {
  // Mode Selection
  mode: {
    chat: string;
    voice: string;
    backToChat: string;
  };

  // Chat Interface
  chat: {
    inputPlaceholder: string;
    sendButton: string;
    likeButton: string;
    dislikeButton: string;
    copyButton: string;
    copiedToast: string;
    emptyState: {
      title: string;
      subtitle: string;
    };
    thinking: string;
    typing: string;
  };

  // Voice Mode
  voice: {
    transcribing: string;
    listening: string;
    processing: string;
    speaking: string;
    tapToSpeak: string;
    release: string;
  };

  // Error Messages
  errors: {
    generic: string;
    network: string;
    audioNotSupported: string;
    microphoneAccess: string;
    recordingFailed: string;
    transcriptionFailed: string;
    ttsUnavailable: string;
    sendMessageFailed: string;
    invalidInput: string;
  };

  // Time Formatting
  time: {
    justNow: string;
    minutesAgo: (minutes: number) => string;
    hoursAgo: (hours: number) => string;
  };

  // Accessibility
  a11y: {
    closeButton: string;
    menuButton: string;
    settingsButton: string;
    themeToggle: string;
  };
}

export const translations: Record<string, TranslationStrings> = {
  en: {
    mode: {
      chat: 'Chat',
      voice: 'Voice',
      backToChat: 'Back to Chat',
    },
    chat: {
      inputPlaceholder: 'Type your message...',
      sendButton: 'Send',
      likeButton: 'Like',
      dislikeButton: 'Dislike',
      copyButton: 'Copy to clipboard',
      copiedToast: 'Copied to clipboard!',
      emptyState: {
        title: 'Start a conversation',
        subtitle: 'Ask me anything!',
      },
      thinking: 'Thinking...',
      typing: 'Typing...',
    },
    voice: {
      transcribing: 'Transcribing...',
      listening: 'Listening...',
      processing: 'Processing...',
      speaking: 'Speaking...',
      tapToSpeak: 'Tap to speak',
      release: 'Release to send',
    },
    errors: {
      generic: 'Something went wrong. Please try again.',
      network: 'Network error. Please check your connection.',
      audioNotSupported: 'Audio recording is not supported in this browser.',
      microphoneAccess: 'Microphone access denied. Please enable microphone permissions.',
      recordingFailed: 'Recording failed. Please try again.',
      transcriptionFailed: 'Could not transcribe audio. Please try again.',
      ttsUnavailable: 'Text-to-speech is currently unavailable.',
      sendMessageFailed: 'Failed to send message. Please try again.',
      invalidInput: 'Please enter a valid message.',
    },
    time: {
      justNow: 'Just now',
      minutesAgo: (minutes: number) => `${minutes}m ago`,
      hoursAgo: (hours: number) => `${hours}h ago`,
    },
    a11y: {
      closeButton: 'Close',
      menuButton: 'Menu',
      settingsButton: 'Settings',
      themeToggle: 'Toggle theme',
    },
  },
  // Additional languages can be added here
  // es: { ... Spanish translations ... },
  // fr: { ... French translations ... },
};

/**
 * Get translation strings for the specified language
 * Falls back to English if language not found
 */
export function getTranslations(language: string = 'en'): TranslationStrings {
  return translations[language] || translations['en'];
}

/**
 * Get current language from environment or default to English
 */
export function getCurrentLanguage(): string {
  return process.env.LANGUAGE || 'en';
}

'use client';

/**
 * Client-side i18n hook for React components
 * Provides access to translated strings based on language configuration
 */

import { useMemo } from 'react';
import { getTranslations, TranslationStrings } from '@/config/i18n';

/**
 * Get current language from environment (client-side)
 * Falls back to English if not configured
 */
function getClientLanguage(): string {
  // Check if NEXT_PUBLIC_LANGUAGE is available (client-side env var)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LANGUAGE) {
    return process.env.NEXT_PUBLIC_LANGUAGE;
  }

  // Fallback to browser language
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.split('-')[0]; // Get 'en' from 'en-US'
    return browserLang;
  }

  return 'en';
}

/**
 * React hook to access translations in client components
 *
 * @returns Translation strings for the configured language
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const t = useTranslations();
 *   return <button>{t.chat.sendButton}</button>;
 * }
 * ```
 */
export function useTranslations(): TranslationStrings {
  const language = useMemo(() => getClientLanguage(), []);
  return useMemo(() => getTranslations(language), [language]);
}

/**
 * Get translations synchronously (for use outside React components)
 */
export function getClientTranslations(): TranslationStrings {
  const language = getClientLanguage();
  return getTranslations(language);
}

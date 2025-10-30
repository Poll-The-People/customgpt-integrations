/**
 * Text processing utilities for TTS
 */

/**
 * Strip markdown formatting from text
 */
export function stripMarkdown(text: string): string {
  return text
    // Remove headers
    .replace(/#{1,6}\s+/g, '')
    // Remove bold/italic
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove bullet points and list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove blockquotes
    .replace(/^\s*>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Truncate text to a reasonable length for voice playback
 * Aims for ~2-3 sentences or 150 words maximum
 */
export function truncateForVoice(text: string, maxWords: number = 150): string {
  // First strip markdown
  const cleanText = stripMarkdown(text);

  // Split into sentences
  const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];

  // Take first 2-3 sentences
  let result = '';
  let sentenceCount = 0;
  let wordCount = 0;

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).length;

    // Stop if we've hit word limit or have 3 sentences
    if (wordCount + words > maxWords || sentenceCount >= 3) {
      break;
    }

    result += sentence;
    wordCount += words;
    sentenceCount++;
  }

  // If we truncated, add ellipsis
  if (sentenceCount < sentences.length || wordCount >= maxWords) {
    result = result.trim();
    if (!result.match(/[.!?]$/)) {
      result += '...';
    }
  }

  return result.trim() || cleanText.slice(0, 500) + '...';
}

/**
 * Prepare text for TTS: strip markdown and truncate
 */
export function prepareForTTS(text: string): string {
  return truncateForVoice(text, 150);
}

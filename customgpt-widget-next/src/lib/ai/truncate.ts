/**
 * Response Truncation for Voice Mode
 *
 * Truncates long text responses to be suitable for voice interface
 */

/**
 * Truncate long text responses for voice interface
 *
 * Strategy:
 * 1. Remove markdown formatting
 * 2. Split by sentences (., !, ?)
 * 3. Take first 1-2 sentences
 * 4. Ensure total doesn't exceed max_words
 *
 * @param text - Raw text response
 * @param maxSentences - Maximum number of sentences (default: 2)
 * @param maxWords - Maximum total words (default: 50)
 * @returns Truncated text suitable for TTS
 */
export function truncateForVoice(
  text: string,
  maxSentences: number = 2,
  maxWords: number = 50
): string {
  // Remove markdown formatting
  let cleaned = text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
    .replace(/https?:\/\/\S+/g, '') // Remove bare URLs
    .replace(/www\.\S+/g, '') // Remove www URLs
    .replace(/#+\s/g, '') // Remove headers
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();

  // Split into sentences (. ! ?)
  const sentences = cleaned
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Take first maxSentences
  const resultSentences: string[] = [];
  let totalWords = 0;

  for (const sentence of sentences.slice(0, maxSentences)) {
    const words = sentence.split(/\s+/);

    if (totalWords + words.length > maxWords) {
      // Add partial sentence if we haven't added anything yet
      if (resultSentences.length === 0) {
        const remainingWords = maxWords - totalWords;
        resultSentences.push(words.slice(0, remainingWords).join(' '));
      }
      break;
    }

    resultSentences.push(sentence);
    totalWords += words.length;

    // Stop if we've reached maxSentences
    if (resultSentences.length >= maxSentences) {
      break;
    }
  }

  let result = resultSentences.join('. ');
  if (result && !result.endsWith('.')) {
    result += '.';
  }

  // Log truncation for monitoring
  if (text.length > result.length) {
    const originalWords = text.split(/\s+/).length;
    const truncatedWords = result.split(/\s+/).length;
    console.log(
      `[Truncate] ${text.length} chars → ${result.length} chars (${originalWords} words → ${truncatedWords} words)`
    );
  }

  return result;
}

/**
 * Markdown Preprocessor for CustomGPT Responses
 *
 * Fixes common markdown formatting issues from CustomGPT:
 * - Missing spaces after markdown syntax (###, **, -, etc.)
 * - Missing line breaks around headings
 * - Improperly formatted lists
 * - Over-bold content (entire response wrapped in **)
 */

export function preprocessMarkdown(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let processed = text;

  // CRITICAL FIX: Remove wrapping ** if entire response is bold
  // Check if response starts and ends with **
  if (processed.trim().startsWith('**') && processed.trim().endsWith('**')) {
    // Count how many ** pairs - if just one pair wrapping everything, remove it
    const boldMatches = processed.match(/\*\*/g);
    if (boldMatches && boldMatches.length === 2) {
      processed = processed.trim().slice(2, -2).trim();
    }
  }

  // Fix headings: Add space after # if missing (but not newlines)
  // ###SecureGuard → ### SecureGuard
  processed = processed.replace(/(#{1,6})([^\s#\n])/g, '$1 $2');

  // Ensure blank line before headings (but not if already at start or after blank line)
  processed = processed.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');

  // Fix orphaned ** markers (remove trailing ** that don't have opening pair)
  // "text** " or "text**:" → "text "
  processed = processed.replace(/([^\*])\*\*([^\*])/g, '$1$2');

  // Fix bold/italic: Add space after closing marker if followed by alphanumeric
  // **bold**word → **bold** word
  // Use non-greedy matching and don't cross newlines
  processed = processed.replace(/(\*\*[^*\n]+?\*\*)([a-zA-Z0-9])/g, '$1 $2');
  processed = processed.replace(/(?<!\*)(\*[^*\n]+?\*)(?!\*)([a-zA-Z0-9])/g, '$1 $2');

  // Fix numbered lists: Ensure space after period
  // 1.Item → 1. Item
  processed = processed.replace(/^(\d+\.)([^\s])/gm, '$1 $2');

  // Fix bullet lists: Ensure space after marker
  // -Item → - Item, *Item → * Item, +Item → + Item
  processed = processed.replace(/^([-*+])([^\s])/gm, '$1 $2');

  // Ensure line break before lists
  processed = processed.replace(/([^\n])(^\d+\.\s)/gm, '$1\n$2');
  processed = processed.replace(/([^\n])(^[-*+]\s)/gm, '$1\n$2');

  // Fix colons that appear alone (artifacts from bad formatting)
  // Remove standalone colons on their own lines
  processed = processed.replace(/\n\s*:\s*\n/g, '\n');

  // Fix multiple consecutive line breaks (keep max 2 for readability)
  processed = processed.replace(/\n{3,}/g, '\n\n');

  // Clean up any leading/trailing whitespace
  processed = processed.trim();

  return processed;
}

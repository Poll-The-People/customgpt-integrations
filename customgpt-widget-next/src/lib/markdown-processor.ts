/**
 * Markdown Processor
 * Fixes CustomGPT markdown formatting issues
 */

/**
 * Process markdown from CustomGPT to fix formatting issues
 *
 * Issues fixed:
 * - Blockquote formatting
 * - List formatting
 * - Extra whitespace
 *
 * @param markdown - Raw markdown text
 * @returns Processed markdown
 */
export function processMarkdown(markdown: string): string {
  let processed = markdown;

  // Fix blockquotes (ensure proper spacing)
  processed = processed.replace(/^>\s*/gm, '> ');

  // Fix lists (ensure proper spacing)
  processed = processed.replace(/^([*-])\s*/gm, '$1 ');
  processed = processed.replace(/^(\d+\.)\s*/gm, '$1 ');

  // Remove excessive whitespace
  processed = processed.replace(/\n{3,}/g, '\n\n');
  processed = processed.trim();

  return processed;
}

/**
 * Strip markdown formatting for plain text
 *
 * @param markdown - Markdown text
 * @returns Plain text
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
    .replace(/^#+\s+/gm, '') // Headers
    .replace(/^>\s+/gm, '') // Blockquotes
    .replace(/^[*-]\s+/gm, '') // Lists
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .trim();
}

/**
 * Simple Markdown Renderer
 * Converts markdown text to HTML for message display
 */

function renderMarkdown(text) {
  if (!text) return '';

  let html = text;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\_\_(.*?)\_\_/gim, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  html = html.replace(/\_(.*?)\_/gim, '<em>$1</em>');

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>');

  // Line breaks
  html = html.replace(/\n/gim, '<br>');

  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');

  // Wrap list items
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Code blocks
  html = html.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  return html;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderMarkdown };
}

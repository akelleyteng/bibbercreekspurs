import DOMPurify from 'dompurify';

const URL_REGEX = /(https?:\/\/[^\s<>"')+]+)/g;

/**
 * Format an event description for safe HTML rendering.
 * - Sanitizes any existing HTML (Google Calendar descriptions often contain <br>, <a>, etc.)
 * - Auto-linkifies bare URLs that aren't already inside <a> tags
 * - Converts plain-text newlines to <br> for descriptions without HTML
 */
export function formatDescription(text: string): string {
  if (!text) return '';

  let html = text;

  // If the text has no HTML tags at all, convert newlines to <br>
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    html = html.replace(/\n/g, '<br>');
  }

  // Auto-linkify bare URLs that aren't already inside href="..." or >...</a>
  // We do this before sanitization so DOMPurify can validate the links
  html = html.replace(URL_REGEX, (url, _offset, fullStr) => {
    // Check if this URL is already inside an <a> tag by looking for preceding href="
    const before = fullStr.substring(0, fullStr.indexOf(url));
    if (before.match(/href=["'][^"']*$/)) return url;
    // Check if we're inside tag content that already has a closing </a>
    if (before.match(/<a [^>]*>[^<]*$/)) return url;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['a', 'br', 'b', 'strong', 'i', 'em', 'u', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

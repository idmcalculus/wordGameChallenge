const SINGLE_LETTER_REGEX = /[a-z]/i;
const NON_ALPHA_REGEX = /[^a-z]/gi;

/**
 * Extracts a single alphabetic character for input cells.
 */
export function sanitizeSingleLetter(value: string): string {
  const normalized = String(value ?? '').trim();
  const matched = normalized.match(SINGLE_LETTER_REGEX);
  return matched ? matched[0].toLowerCase() : '';
}

/**
 * Normalizes a word to lowercase alphabetic characters only.
 */
export function sanitizeWord(value: string, maxLength?: number): string {
  const normalized = String(value ?? '').toLowerCase().replace(NON_ALPHA_REGEX, '');
  if (typeof maxLength === 'number' && Number.isFinite(maxLength) && maxLength >= 0) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

/**
 * Escapes HTML-sensitive characters for safe interpolation in innerHTML templates.
 */
export function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

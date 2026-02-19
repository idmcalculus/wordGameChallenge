import { describe, expect, it } from 'vitest';
import { escapeHtml, sanitizeSingleLetter, sanitizeWord } from '../inputSanitizer';

describe('inputSanitizer', () => {
  it('sanitizes a single input-cell letter', () => {
    expect(sanitizeSingleLetter('A')).toBe('a');
    expect(sanitizeSingleLetter('1<script>z')).toBe('s');
    expect(sanitizeSingleLetter('***')).toBe('');
    expect(sanitizeSingleLetter(undefined as unknown as string)).toBe('');
  });

  it('sanitizes full words to lowercase alpha only', () => {
    expect(sanitizeWord('Cr0wn!')).toBe('crwn');
    expect(sanitizeWord('<img src=x onerror=1>', 5)).toBe('imgsr');
    expect(sanitizeWord('AlphaBeta', 4)).toBe('alph');
    expect(sanitizeWord('Gamma', Number.NaN)).toBe('gamma');
    expect(sanitizeWord(null as unknown as string, 2)).toBe('');
  });

  it('escapes html-sensitive characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(escapeHtml('O\'Reilly & sons')).toBe('O&#39;Reilly &amp; sons');
  });
});

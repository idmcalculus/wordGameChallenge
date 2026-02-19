import { describe, expect, it } from 'vitest';
import { getAvailableLetterHints, getAvailablePositionHints, pickRandom } from '../hintEngine';

describe('hintEngine', () => {
  it('returns duplicate-capable letters when not all occurrences are revealed', () => {
    const available = getAvailableLetterHints('letter', {
      usedLetters: new Set(['l', 'e', 't']),
      revealedLetters: ['l', 'e', 't']
    });

    expect(available).toEqual(expect.arrayContaining(['e', 't', 'r']));
    expect(available).not.toContain('l');
  });

  it('returns positions that are not yet correct in the current row', () => {
    const available = getAvailablePositionHints({
      targetWord: 'crown',
      currentRowLetters: ['c', '', 'o', 'x', ''],
      correctPositions: { 0: 'c', 2: 'o' }
    });

    expect(available).toEqual([1, 3, 4]);
  });

  it('selects deterministic random items when random function is injected', () => {
    const items = ['a', 'b', 'c'];

    expect(pickRandom(items, () => 0)).toBe('a');
    expect(pickRandom(items, () => 0.34)).toBe('b');
    expect(pickRandom(items, () => 0.99)).toBe('c');
    expect(pickRandom([], () => 0.5)).toBeNull();
  });

  it('supports usedLetters as an array and handles empty words', () => {
    const fromArray = getAvailableLetterHints('apple', {
      usedLetters: ['a', 'p'],
      revealedLetters: ['a', 'p', 'p']
    });
    expect(fromArray).toEqual(expect.arrayContaining(['l', 'e']));

    const emptyWord = getAvailableLetterHints('', {
      usedLetters: ['a']
    });
    expect(emptyWord).toEqual([]);

    const withoutUsedLetters = getAvailableLetterHints('abc', {});
    expect(withoutUsedLetters).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });

  it('returns empty position hints when row length does not match target', () => {
    const available = getAvailablePositionHints({
      targetWord: 'stone',
      currentRowLetters: ['s', 't'],
      correctPositions: {}
    });

    expect(available).toEqual([]);
  });
});

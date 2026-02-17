import type { LetterHintContext, PositionHintParams } from '../types/interface';

function normalizeWord(word: string) {
  return (word || '').toLowerCase();
}

function toSet(values: Set<string> | string[] | undefined) {
  if (values instanceof Set) {
    return values;
  }

  if (Array.isArray(values)) {
    return new Set(values.map((value) => String(value).toLowerCase()));
  }

  return new Set();
}

function buildLetterCounts(text: string) {
  const counts: Record<string, number> = {};

  for (const letter of normalizeWord(text)) {
    counts[letter] = (counts[letter] || 0) + 1;
  }

  return counts;
}

/**
 * Returns letters in the target word that still have revealable occurrences.
 * @param {string} targetWord
 * @param {{ usedLetters?: Set<string>|string[], revealedLetters?: string[] }} previousInfo
 * @returns {string[]}
 */
export function getAvailableLetterHints(
  targetWord: string,
  previousInfo: LetterHintContext = {}
) {
  const word = normalizeWord(targetWord);
  if (!word) {
    return [];
  }

  const wordLetterCounts = buildLetterCounts(word);
  const usedLetters = toSet(previousInfo.usedLetters);
  const revealedCounts: Record<string, number> = {};

  const revealedLetters = Array.isArray(previousInfo.revealedLetters)
    ? previousInfo.revealedLetters
    : [];

  for (const letter of revealedLetters) {
    const normalized = String(letter).toLowerCase();
    if (wordLetterCounts[normalized]) {
      revealedCounts[normalized] = (revealedCounts[normalized] || 0) + 1;
    }
  }

  return Object.keys(wordLetterCounts).filter((letter) => {
    const totalOccurrences = wordLetterCounts[letter];
    const revealedOccurrences = revealedCounts[letter] || 0;

    if (!usedLetters.has(letter)) {
      return true;
    }

    return revealedOccurrences < totalOccurrences;
  });
}

/**
 * Returns candidate positions for position-reveal hints.
 * @param {{ targetWord: string, currentRowLetters: string[], correctPositions?: Record<number, string> }} params
 * @returns {number[]}
 */
export function getAvailablePositionHints({
  targetWord,
  currentRowLetters,
  correctPositions = {}
}: PositionHintParams) {
  const word = normalizeWord(targetWord);
  if (!word || !Array.isArray(currentRowLetters) || currentRowLetters.length !== word.length) {
    return [];
  }

  const available: number[] = [];

  for (let i = 0; i < word.length; i++) {
    if (correctPositions[i]) {
      continue;
    }

    const currentLetter = String(currentRowLetters[i] || '').toLowerCase();
    if (currentLetter !== word[i]) {
      available.push(i);
    }
  }

  return available;
}

/**
 * Returns a deterministic random item when randomFn is injected for tests.
 * @template T
 * @param {T[]} items
 * @param {() => number} randomFn
 * @returns {T|null}
 */
export function pickRandom<T>(items: T[], randomFn = Math.random) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const index = Math.floor(randomFn() * items.length);
  return items[Math.max(0, Math.min(items.length - 1, index))];
}

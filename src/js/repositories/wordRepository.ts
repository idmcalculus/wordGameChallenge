import { assessPuzzleDifficulty } from '../core/difficultyEngine';
import { LOCAL_VALIDATION_OVERRIDE_WORDS } from '../data/localValidationOverrides';
import { sanitizeWord } from '../utils/inputSanitizer';
import type { WordRepositoryEntry } from '../types/interface';
import type { WordFamiliarity } from '../types/types';
import type { PackedWordPool } from '../data/wordPools/shared';

const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 10;

type PackedWordModule = {
  WORD_POOL_PACK: PackedWordPool;
};

const WORD_POOL_LOADERS: Readonly<Record<number, () => Promise<PackedWordModule>>> = {
  3: async () => import('../data/wordPools/length3'),
  4: async () => import('../data/wordPools/length4'),
  5: async () => import('../data/wordPools/length5'),
  6: async () => import('../data/wordPools/length6'),
  7: async () => import('../data/wordPools/length7'),
  8: async () => import('../data/wordPools/length8'),
  9: async () => import('../data/wordPools/length9'),
  10: async () => import('../data/wordPools/length10')
};

const POOL_CACHE = new Map<number, Promise<readonly WordRepositoryEntry[]>>();
const LOCAL_ALLOWED_WORDS_CACHE = new Map<number, Promise<ReadonlySet<string>>>();
const MAX_SELECTION_AMBIGUITY_BY_LENGTH: Readonly<Record<number, number>> = {
  3: 5,
  4: 5,
  5: 5,
  6: 3,
  7: 3,
  8: 3,
  9: 2,
  10: 2
};
const MIN_FAIR_SELECTION_RATIO = 0.1;

const EXTRA_ALLOWED_WORDS = new Set<string>(
  LOCAL_VALIDATION_OVERRIDE_WORDS
    .map((word) => sanitizeWord(word))
    .filter((word) => word.length > 0)
);

function getWordFamiliarity(index: number, packedPool: PackedWordPool): WordFamiliarity {
  if (index < packedPool.commonCount) {
    return 'common';
  }

  if (index < packedPool.standardCount) {
    return 'standard';
  }

  return 'stretch';
}

function normalizePackedWords(
  packedWords: string,
  wordLength: number,
  errorMessage: string
): readonly string[] {
  const rawWords = packedWords.split(' ').filter((word) => word.length > 0);
  const seenWords = new Set<string>();

  return rawWords.map((rawWord) => {
    const normalizedWord = sanitizeWord(rawWord);
    if (normalizedWord !== rawWord || normalizedWord.length !== wordLength || seenWords.has(normalizedWord)) {
      throw new Error(errorMessage);
    }

    seenWords.add(normalizedWord);
    return normalizedWord;
  });
}

function buildAmbiguityFamilySizeMap(words: readonly string[]): ReadonlyMap<string, number> {
  const wildcardPatternCounts = new Map<string, number>();

  words.forEach((word) => {
    for (let index = 0; index < word.length; index += 1) {
      const pattern = `${word.slice(0, index)}*${word.slice(index + 1)}`;
      wildcardPatternCounts.set(pattern, (wildcardPatternCounts.get(pattern) ?? 0) + 1);
    }
  });

  return new Map<string, number>(
    words.map((word) => {
      let familySize = 1;

      for (let index = 0; index < word.length; index += 1) {
        const pattern = `${word.slice(0, index)}*${word.slice(index + 1)}`;
        familySize = Math.max(familySize, wildcardPatternCounts.get(pattern) ?? 0);
      }

      return [word, familySize];
    })
  );
}

function unpackWordPool(wordLength: number, packedPool: PackedWordPool): readonly WordRepositoryEntry[] {
  const normalizedWords = normalizePackedWords(
    packedPool.answerWords,
    wordLength,
    `Packed repository words must be unique ASCII words of length ${wordLength}`
  );
  const ambiguityFamilySizes = buildAmbiguityFamilySizeMap(normalizedWords);

  return normalizedWords.map((normalizedWord, index) => {
    const familiarity = getWordFamiliarity(index, packedPool);
    return {
      word: normalizedWord,
      wordLength,
      familiarity,
      ...assessPuzzleDifficulty(normalizedWord, familiarity, {
        ambiguityFamilySize: ambiguityFamilySizes.get(normalizedWord)
      })
    };
  });
}

function unpackLocalGuessWords(wordLength: number, packedPool: PackedWordPool): readonly string[] {
  return normalizePackedWords(
    packedPool.allowedGuessWords,
    wordLength,
    `Packed local guess words must be unique ASCII words of length ${wordLength}`
  );
}

function getSelectionMaxAmbiguity(wordLength: number): number {
  return MAX_SELECTION_AMBIGUITY_BY_LENGTH[wordLength] ?? Number.MAX_SAFE_INTEGER;
}

function getFairSelectionPool(pool: readonly WordRepositoryEntry[], wordLength: number): readonly WordRepositoryEntry[] {
  const preferredFamiliarityPool = pool.filter((entry) => entry.familiarity !== 'stretch');
  const basePool = preferredFamiliarityPool.length > 0 ? preferredFamiliarityPool : pool;
  const maxAmbiguityFamilySize = getSelectionMaxAmbiguity(wordLength);
  const fairPool = basePool.filter((entry) => entry.ambiguityFamilySize <= maxAmbiguityFamilySize);

  if (fairPool.length === 0) {
    return basePool;
  }

  if (fairPool.length / basePool.length < MIN_FAIR_SELECTION_RATIO) {
    return basePool;
  }

  return fairPool;
}

async function loadAnswerPoolByLength(wordLength: number): Promise<readonly WordRepositoryEntry[]> {
  const loader = WORD_POOL_LOADERS[wordLength];
  /* v8 ignore start -- guarded by public length validation */
  if (!loader) {
    return [];
  }
  /* v8 ignore stop */

  const cachedPool = POOL_CACHE.get(wordLength);
  if (cachedPool) {
    return cachedPool;
  }

  const poolPromise = loader().then(({ WORD_POOL_PACK }) => unpackWordPool(wordLength, WORD_POOL_PACK));
  POOL_CACHE.set(wordLength, poolPromise);
  return poolPromise;
}

async function loadLocalAllowedWords(wordLength: number): Promise<ReadonlySet<string>> {
  const cachedAllowedWords = LOCAL_ALLOWED_WORDS_CACHE.get(wordLength);
  if (cachedAllowedWords) {
    return cachedAllowedWords;
  }

  const allowedWordsPromise = loadAnswerPoolByLength(wordLength).then((pool) => {
    const allowedWords = new Set<string>(pool.map((entry) => entry.word));
    const loader = WORD_POOL_LOADERS[wordLength];
    /* v8 ignore start -- guarded by public length validation */
    if (!loader) {
      return allowedWords;
    }
    /* v8 ignore stop */

    return loader().then(({ WORD_POOL_PACK }) => {
      unpackLocalGuessWords(wordLength, WORD_POOL_PACK).forEach((word) => {
        allowedWords.add(word);
      });

      return allowedWords;
    });
  });

  LOCAL_ALLOWED_WORDS_CACHE.set(wordLength, allowedWordsPromise);
  return allowedWordsPromise;
}

export async function getAnswerPoolByLength(wordLength: number): Promise<WordRepositoryEntry[]> {
  if (!Number.isInteger(wordLength) || wordLength < MIN_WORD_LENGTH || wordLength > MAX_WORD_LENGTH) {
    return [];
  }

  const pool = await loadAnswerPoolByLength(wordLength);
  return [...pool];
}

export async function pickCuratedAnswer(
  wordLength: number,
  randomFn: () => number = Math.random
): Promise<WordRepositoryEntry | null> {
  const pool = await getAnswerPoolByLength(wordLength);
  if (pool.length === 0) {
    return null;
  }

  const selectionPool = getFairSelectionPool(pool, wordLength);

  const randomValue = randomFn();
  const safeRandomValue = Number.isFinite(randomValue) ? randomValue : 0;
  const normalizedIndex = Math.min(selectionPool.length - 1, Math.max(0, Math.floor(safeRandomValue * selectionPool.length)));
  return selectionPool[normalizedIndex] ?? null;
}

export async function isWordAllowedLocally(word: string): Promise<boolean> {
  const normalizedWord = sanitizeWord(word);
  if (!normalizedWord) {
    return false;
  }

  if (EXTRA_ALLOWED_WORDS.has(normalizedWord)) {
    return true;
  }

  if (normalizedWord.length < MIN_WORD_LENGTH || normalizedWord.length > MAX_WORD_LENGTH) {
    return false;
  }

  const allowedWords = await loadLocalAllowedWords(normalizedWord.length);
  return allowedWords.has(normalizedWord);
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAnswerPoolByLength, isWordAllowedLocally, pickCuratedAnswer } from './wordRepository';

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../data/wordPools/length3');
});

describe('wordRepository', () => {
  it('returns curated pools grouped by word length', async () => {
    for (let wordLength = 3; wordLength <= 10; wordLength += 1) {
      const pool = await getAnswerPoolByLength(wordLength);
      expect(pool.every((entry) => entry.wordLength === wordLength)).toBe(true);
      expect(pool.length).toBeGreaterThanOrEqual(500);
    }
  });

  it('picks a deterministic answer from the curated answer pool when given a fixed random value', async () => {
    const pool = await getAnswerPoolByLength(4);
    const selected = await pickCuratedAnswer(4, () => 0);

    expect(selected).toEqual(pool[0]);
  });

  it('annotates curated answers with ambiguity-family metadata', async () => {
    const pool = await getAnswerPoolByLength(4);

    expect(pool.every((entry) => entry.ambiguityFamilySize >= 1)).toBe(true);
    expect(pool.some((entry) => entry.ambiguityFamilySize > 1)).toBe(true);
  });

  it('falls back safely for invalid lengths and invalid random values', async () => {
    expect(await getAnswerPoolByLength(0)).toEqual([]);
    expect(await pickCuratedAnswer(99)).toBeNull();
    expect((await pickCuratedAnswer(3, () => Number.NaN))?.wordLength).toBe(3);
  });

  it('uses the local allow-list for fast validation checks', async () => {
    expect(await isWordAllowedLocally('CROWN')).toBe(true);
    expect(await isWordAllowedLocally('melt')).toBe(true);
    expect(await isWordAllowedLocally('hi')).toBe(false);
    expect(await isWordAllowedLocally('encyclopedia')).toBe(false);
    expect(await isWordAllowedLocally('madeupword')).toBe(false);
    expect(await isWordAllowedLocally('   ')).toBe(false);
  });

  it('supports broader local guesses than the curated answer pool', async () => {
    const pool = await getAnswerPoolByLength(4);

    expect(pool.some((entry) => entry.word === 'that')).toBe(false);
    expect(await isWordAllowedLocally('that')).toBe(true);
  });

  it('keeps acronyms and proper nouns out of the local repository', async () => {
    expect(await isWordAllowedLocally('ibm')).toBe(false);
    expect(await isWordAllowedLocally('donald')).toBe(false);
    expect(await isWordAllowedLocally('brooklyn')).toBe(false);
    expect(await isWordAllowedLocally('ukrainian')).toBe(false);
  });

  it('falls back to standard entries when a length has no common pool', async () => {
    vi.resetModules();
    vi.doMock('../data/wordPools/length3', () => ({
      WORD_POOL_PACK: {
        commonCount: 0,
        standardCount: 2,
        answerWords: 'dry wry',
        allowedGuessWords: 'dry wry the'
      }
    }));

    const repository = await import('./wordRepository');
    const selected = await repository.pickCuratedAnswer(3, () => 0);

    expect(selected?.word).toBe('dry');
    expect(selected?.familiarity).toBe('standard');
  });

  it('falls back to stretch entries when a length has no easier pool', async () => {
    vi.resetModules();
    vi.doMock('../data/wordPools/length3', () => ({
      WORD_POOL_PACK: {
        commonCount: 0,
        standardCount: 0,
        answerWords: 'wry dry',
        allowedGuessWords: 'wry dry'
      }
    }));

    const repository = await import('./wordRepository');
    const selected = await repository.pickCuratedAnswer(3, () => 0);

    expect(selected?.word).toBe('wry');
    expect(selected?.familiarity).toBe('stretch');
  });

  it('avoids high-ambiguity answer families when enough fairer options exist', async () => {
    vi.resetModules();
    vi.doMock('../data/wordPools/length3', () => ({
      WORD_POOL_PACK: {
        commonCount: 7,
        standardCount: 7,
        answerWords: 'bag rag sag tag lag wag dry',
        allowedGuessWords: 'bag rag sag tag lag wag dry'
      }
    }));

    const repository = await import('./wordRepository');
    const selected = await repository.pickCuratedAnswer(3, () => 0);

    expect(selected?.word).toBe('dry');
    expect(selected?.ambiguityFamilySize).toBe(1);
  });

  it('falls back to the base pool when every candidate is a high-ambiguity outlier', async () => {
    vi.resetModules();
    vi.doMock('../data/wordPools/length3', () => ({
      WORD_POOL_PACK: {
        commonCount: 6,
        standardCount: 6,
        answerWords: 'bag rag sag tag lag wag',
        allowedGuessWords: 'bag rag sag tag lag wag'
      }
    }));

    const repository = await import('./wordRepository');
    const selected = await repository.pickCuratedAnswer(3, () => 0);

    expect(selected?.word).toBe('bag');
    expect(selected?.ambiguityFamilySize).toBeGreaterThan(5);
  });

  it('falls back to the base pool when the fair subset is too small to sustain variety', async () => {
    vi.resetModules();
    vi.doMock('../data/wordPools/length3', () => ({
      WORD_POOL_PACK: {
        commonCount: 11,
        standardCount: 11,
        answerWords: 'bag rag sag tag lag wag fag hag jag nag dry',
        allowedGuessWords: 'bag rag sag tag lag wag fag hag jag nag dry'
      }
    }));

    const repository = await import('./wordRepository');
    const selected = await repository.pickCuratedAnswer(3, () => 0);

    expect(selected?.word).toBe('bag');
    expect(selected?.ambiguityFamilySize).toBeGreaterThan(5);
  });

  it('rejects invalid generated repository data during module setup', async () => {
    vi.resetModules();
    vi.doMock('../data/wordPools/length3', () => ({
      WORD_POOL_PACK: {
        commonCount: 1,
        standardCount: 1,
        answerWords: '123',
        allowedGuessWords: '123'
      }
    }));

    const repository = await import('./wordRepository');
    await expect(repository.getAnswerPoolByLength(3)).rejects.toThrow('Packed repository words must be unique ASCII words of length 3');
  });

  it('rejects invalid local guess data during module setup', async () => {
    vi.resetModules();
    vi.doMock('../data/wordPools/length3', () => ({
      WORD_POOL_PACK: {
        commonCount: 1,
        standardCount: 1,
        answerWords: 'dry',
        allowedGuessWords: 'dry 123'
      }
    }));

    const repository = await import('./wordRepository');
    await expect(repository.isWordAllowedLocally('dry')).rejects.toThrow('Packed local guess words must be unique ASCII words of length 3');
  });
});

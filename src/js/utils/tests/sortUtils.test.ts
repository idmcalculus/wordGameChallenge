import { describe, expect, it } from 'vitest';
import { SORT_DIRECTIONS, SORT_FIELDS } from '../../constants/statConstants';
import { compareValues, getNextSortDirection, getSortIndicatorClass, sortStats } from '../sortUtils';
import type { IndexedStatEntry } from '../../types/interface';
import type { SortField } from '../../types/types';

const sampleStats: IndexedStatEntry[] = [
  {
    __originalIndex: 0,
    word: 'zeta',
    time: 40,
    attempts: 4,
    wordLength: 4,
    date: '2026-01-02T10:00:00.000Z'
  },
  {
    __originalIndex: 1,
    word: 'alpha',
    time: 20,
    attempts: 2,
    wordLength: 5,
    date: '2026-01-01T10:00:00.000Z'
  },
  {
    __originalIndex: 2,
    word: 'beta',
    time: 20,
    attempts: 3,
    wordLength: 4,
    date: '2026-01-03T10:00:00.000Z'
  }
];

describe('sortUtils', () => {
  it('cycles sort directions in the expected order', () => {
    expect(getNextSortDirection(SORT_DIRECTIONS.DEFAULT)).toBe(SORT_DIRECTIONS.ASC);
    expect(getNextSortDirection(SORT_DIRECTIONS.ASC)).toBe(SORT_DIRECTIONS.DESC);
    expect(getNextSortDirection(SORT_DIRECTIONS.DESC)).toBe(SORT_DIRECTIONS.DEFAULT);
  });

  it('compares values by direction', () => {
    expect(compareValues(1, 2, SORT_DIRECTIONS.ASC)).toBeLessThan(0);
    expect(compareValues(1, 2, SORT_DIRECTIONS.DESC)).toBeGreaterThan(0);
    expect(compareValues(1, 2, SORT_DIRECTIONS.DEFAULT)).toBe(0);
    expect(compareValues(2, 2, SORT_DIRECTIONS.ASC)).toBe(0);
  });

  it('sorts by each supported field', () => {
    const byWordAsc = sortStats(sampleStats, SORT_FIELDS.WORD, SORT_DIRECTIONS.ASC);
    expect(byWordAsc.map((entry) => entry.word)).toEqual(['alpha', 'beta', 'zeta']);

    const byTimeDesc = sortStats(sampleStats, SORT_FIELDS.TIME, SORT_DIRECTIONS.DESC);
    expect(byTimeDesc.map((entry) => entry.time)).toEqual([40, 20, 20]);

    const byAttemptsAsc = sortStats(sampleStats, SORT_FIELDS.ATTEMPTS, SORT_DIRECTIONS.ASC);
    expect(byAttemptsAsc.map((entry) => entry.attempts)).toEqual([2, 3, 4]);

    const byDateDesc = sortStats(sampleStats, SORT_FIELDS.DATE, SORT_DIRECTIONS.DESC);
    expect(byDateDesc.map((entry) => entry.date)).toEqual([
      '2026-01-03T10:00:00.000Z',
      '2026-01-02T10:00:00.000Z',
      '2026-01-01T10:00:00.000Z'
    ]);

    const bySerialAsc = sortStats(sampleStats, SORT_FIELDS.SERIAL, SORT_DIRECTIONS.ASC);
    expect(bySerialAsc.map((entry) => entry.__originalIndex)).toEqual([0, 1, 2]);

    const byLengthAsc = sortStats(sampleStats, SORT_FIELDS.WORD_LENGTH, SORT_DIRECTIONS.ASC);
    expect(byLengthAsc.map((entry) => entry.wordLength)).toEqual([4, 4, 5]);
  });

  it('returns source array on default direction and handles invalid dates/serial fallback', () => {
    const withFallbacks = [
      {
        word: 'one',
        time: 1,
        attempts: 1,
        wordLength: 3,
        date: 'not-a-date'
      } as IndexedStatEntry,
      {
        __originalIndex: 3,
        word: 'two',
        time: 2,
        attempts: 2,
        wordLength: 3,
        date: '2026-01-02T00:00:00.000Z'
      } as IndexedStatEntry
    ];

    const sameReference = sortStats(withFallbacks, SORT_FIELDS.TIME, SORT_DIRECTIONS.DEFAULT);
    expect(sameReference).toBe(withFallbacks);

    const byDate = sortStats(withFallbacks, SORT_FIELDS.DATE, SORT_DIRECTIONS.ASC);
    expect(byDate[0].date).toBe('not-a-date');

    const bySerial = sortStats(withFallbacks, SORT_FIELDS.SERIAL, SORT_DIRECTIONS.ASC);
    expect(bySerial[0].word).toBe('one');
  });

  it('handles invalid dates and missing serial indexes across comparators', () => {
    const entries = [
      {
        word: 'x',
        time: 1,
        attempts: 1,
        wordLength: 1,
        date: 'invalid-date'
      } as IndexedStatEntry,
      {
        word: 'y',
        time: 2,
        attempts: 2,
        wordLength: 1,
        date: 'invalid-date'
      } as IndexedStatEntry,
      {
        __originalIndex: 5,
        word: 'z',
        time: 3,
        attempts: 3,
        wordLength: 1,
        date: '2026-01-01T00:00:00.000Z'
      } as IndexedStatEntry
    ];

    const byDateDesc = sortStats(entries, SORT_FIELDS.DATE, SORT_DIRECTIONS.DESC);
    expect(byDateDesc[0].word).toBe('z');

    const bySerialDesc = sortStats(entries, SORT_FIELDS.SERIAL, SORT_DIRECTIONS.DESC);
    expect(bySerialDesc[0].word).toBe('z');
  });

  it('returns default indicator class when no direction is active', () => {
    expect(getSortIndicatorClass(SORT_DIRECTIONS.DEFAULT)).toBe('sort-indicator--default');
    expect(getSortIndicatorClass(SORT_DIRECTIONS.ASC)).toBe('sort-indicator--asc');
    expect(getSortIndicatorClass(SORT_DIRECTIONS.DESC)).toBe('sort-indicator--desc');
  });

  it('falls back safely on unsupported sort fields', () => {
    const invalidField = 'unsupported' as SortField;
    const result = sortStats(sampleStats, invalidField, SORT_DIRECTIONS.ASC);
    expect(result).toEqual(sampleStats);
  });
});

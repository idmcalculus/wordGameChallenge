import { beforeEach, describe, expect, it } from 'vitest';
import { FILTER_TYPES } from '../../constants/statConstants';
import { applyFilters, getAvailableFilters, loadFilterPreferences, saveFilterPreferences } from '../filterUtils';
import type { ActiveFilters, IndexedStatEntry } from '../../types/interface';

function createStat(index: number, overrides: Partial<IndexedStatEntry> = {}): IndexedStatEntry {
  return {
    __originalIndex: index,
    word: `word${index}`,
    time: 10,
    attempts: 2,
    wordLength: 4,
    date: '2026-02-17T12:00:00.000Z',
    difficultyLabel: 'Medium',
    hintsUsed: 0,
    solvedWithoutHints: true,
    averageFreshLettersPerGuess: 3,
    averageEliminatedLetterReusePerGuess: 0,
    ...overrides
  };
}

function createMockLocalStorage(): Storage {
  let store: Record<string, string> = {};

  const storage: Storage = {
    get length() {
      return Object.keys(store).length;
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string): void {
      store[key] = String(value);
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      store = {};
    }
  };

  return storage;
}

function startOfWeek(date: Date): Date {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
}

function toIso(date: Date): string {
  return date.toISOString();
}

function buildStats(referenceDate = new Date()): IndexedStatEntry[] {
  const now = new Date(referenceDate);
  const weekStart = startOfWeek(referenceDate);

  const thisWeekDate = new Date(now);

  const lastWeekDate = new Date(weekStart);
  lastWeekDate.setDate(lastWeekDate.getDate() - 1);

  const lastMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 15, 10, 0, 0, 0);
  const withinLastThreeMonthsDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 2, 10, 10, 0, 0, 0);
  const withinLastSixMonthsDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 5, 5, 10, 0, 0, 0);
  const olderThanSixMonthsDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 8, 20, 10, 0, 0, 0);

  return [
    createStat(0, { word: 'fur', time: 19, attempts: 5, wordLength: 3, date: toIso(thisWeekDate) }),
    createStat(1, { word: 'adage', time: 27, attempts: 3, wordLength: 5, date: toIso(lastWeekDate) }),
    createStat(2, { word: 'jaguar', time: 190, attempts: 2, wordLength: 6, date: toIso(lastMonthDate) }),
    createStat(3, { word: 'amber', time: 73, attempts: 4, wordLength: 5, date: toIso(withinLastThreeMonthsDate) }),
    createStat(4, { word: 'mango', time: 120, attempts: 2, wordLength: 5, date: toIso(withinLastSixMonthsDate) }),
    createStat(5, { word: 'planet', time: 280, attempts: 1, wordLength: 6, date: toIso(olderThanSixMonthsDate) })
  ];
}

describe('filterUtils', () => {
  const referenceDate = new Date('2026-02-17T12:00:00.000Z');
  const stats = buildStats(referenceDate);

  beforeEach(() => {
    globalThis.localStorage = createMockLocalStorage();
  });

  it('returns original stats when no filters are active', () => {
    expect(applyFilters(stats, {})).toEqual(stats);
    expect(applyFilters(stats, { [FILTER_TYPES.TIME]: [] })).toEqual(stats);
  });

  it('ignores out-of-range filter indexes', () => {
    const activeFilters: ActiveFilters = {
      [FILTER_TYPES.TIME]: [999]
    };

    const result = applyFilters(stats, activeFilters);
    expect(result).toEqual([]);
  });

  it('returns no matches for invalid legacy numeric filter indexes', () => {
    const activeFilters: ActiveFilters = {
      [FILTER_TYPES.WORD_LENGTH]: [999]
    };

    const result = applyFilters(stats, activeFilters);
    expect(result).toEqual([]);
  });

  it('ignores unsupported filter types at runtime', () => {
    const invalidFilters = {
      INVALID: [0]
    } as ActiveFilters;

    const result = applyFilters(stats, invalidFilters);
    expect(result).toEqual(stats);
  });

  it('filters by word length and attempts', () => {
    const activeFilters: ActiveFilters = {
      [FILTER_TYPES.WORD_LENGTH]: [5, 5],
      [FILTER_TYPES.ATTEMPTS]: [3, 4]
    };

    const result = applyFilters(stats, activeFilters);
    expect(result.map((entry) => entry.word)).toEqual(['adage', 'amber']);
  });

  it('filters by exact attempts with slider-style range values', () => {
    const activeFilters: ActiveFilters = {
      [FILTER_TYPES.ATTEMPTS]: [1, 1]
    };

    const result = applyFilters(stats, activeFilters);
    expect(result.map((entry) => entry.word)).toEqual(['planet']);
  });

  it('supports legacy grouped range indexes for numeric filters', () => {
    const activeFilters: ActiveFilters = {
      [FILTER_TYPES.WORD_LENGTH]: [0],
      [FILTER_TYPES.ATTEMPTS]: [1]
    };

    const result = applyFilters(stats, activeFilters);
    expect(result.map((entry) => entry.word)).toEqual(['adage', 'amber']);
  });

  it('filters by time range correctly', () => {
    const activeFilters: ActiveFilters = {
      [FILTER_TYPES.TIME]: [4]
    };

    const result = applyFilters(stats, activeFilters);
    expect(result.map((entry) => entry.word)).toEqual(['jaguar']);
  });

  it('filters by date ranges correctly', () => {
    expect(applyFilters(stats, { [FILTER_TYPES.DATE]: [0] }, referenceDate).map((entry) => entry.word)).toEqual(['fur']);
    expect(applyFilters(stats, { [FILTER_TYPES.DATE]: [1] }, referenceDate).map((entry) => entry.word)).toEqual(['adage']);
    expect(applyFilters(stats, { [FILTER_TYPES.DATE]: [2] }, referenceDate).map((entry) => entry.word)).toEqual(['jaguar']);
    expect(applyFilters(stats, { [FILTER_TYPES.DATE]: [3] }, referenceDate).map((entry) => entry.word)).toEqual(['jaguar', 'amber']);
    expect(applyFilters(stats, { [FILTER_TYPES.DATE]: [4] }, referenceDate).map((entry) => entry.word))
      .toEqual(['jaguar', 'amber', 'mango']);
    expect(applyFilters(stats, { [FILTER_TYPES.DATE]: [5] }, referenceDate)).toHaveLength(stats.length);
  });

  it('handles invalid date values and invalid date filter indexes safely', () => {
    const malformedDateStats: IndexedStatEntry[] = [
      createStat(0, {
        word: 'melt',
        time: 42,
        attempts: 2,
        wordLength: 4,
        date: 'not-a-date'
      })
    ];

    expect(applyFilters(malformedDateStats, { [FILTER_TYPES.DATE]: [0] }, referenceDate)).toEqual([]);
    expect(applyFilters(stats, { [FILTER_TYPES.DATE]: [999] }, referenceDate)).toEqual([]);
  });

  it('calculates available filters from stats', () => {
    const available = getAvailableFilters(stats, referenceDate);

    expect(Array.from(available[FILTER_TYPES.WORD_LENGTH].values())).toEqual([0, 1]);
    expect(Array.from(available[FILTER_TYPES.TIME].values())).toEqual([0, 4, 2, 3, 5]);
    expect(Array.from(available[FILTER_TYPES.ATTEMPTS].values())).toEqual([2, 1, 0]);
    expect(Array.from(available[FILTER_TYPES.DATE].values()).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('saves and loads sanitized filter preferences', () => {
    const preferences: ActiveFilters = {
      [FILTER_TYPES.TIME]: [0, 1, 1],
      [FILTER_TYPES.WORD_LENGTH]: [6, 8],
      [FILTER_TYPES.ATTEMPTS]: [3, 3],
      [FILTER_TYPES.DATE]: [4]
    };

    saveFilterPreferences(preferences);
    expect(loadFilterPreferences()).toEqual({
      [FILTER_TYPES.TIME]: [0, 1],
      [FILTER_TYPES.WORD_LENGTH]: [6, 8],
      [FILTER_TYPES.ATTEMPTS]: [3, 3],
      [FILTER_TYPES.DATE]: [4]
    });

    localStorage.setItem('statFilters', JSON.stringify({
      INVALID: [1, 2],
      [FILTER_TYPES.TIME]: [0, 9, -1, 0],
      [FILTER_TYPES.DATE]: [2, 99, 4],
      [FILTER_TYPES.ATTEMPTS]: ['bad', 2],
      [FILTER_TYPES.WORD_LENGTH]: [1]
    }));

    expect(loadFilterPreferences()).toEqual({
      [FILTER_TYPES.TIME]: [0],
      [FILTER_TYPES.DATE]: [2],
      [FILTER_TYPES.ATTEMPTS]: [5, 5],
      [FILTER_TYPES.WORD_LENGTH]: [6, 8]
    });

    localStorage.setItem('statFilters', JSON.stringify({
      [FILTER_TYPES.WORD_LENGTH]: [3, 10],
      [FILTER_TYPES.ATTEMPTS]: [1, 5]
    }));

    expect(loadFilterPreferences()).toEqual({});
  });

  it('returns empty preferences for malformed/non-object storage values', () => {
    expect(loadFilterPreferences()).toEqual({});

    localStorage.setItem('statFilters', '{bad json');
    expect(loadFilterPreferences()).toEqual({});

    localStorage.setItem('statFilters', JSON.stringify(['not-an-object']));
    expect(loadFilterPreferences()).toEqual({});

    localStorage.setItem('statFilters', JSON.stringify({
      [FILTER_TYPES.TIME]: 'invalid'
    }));
    expect(loadFilterPreferences()).toEqual({});

    localStorage.setItem('statFilters', JSON.stringify({
      [FILTER_TYPES.TIME]: [1.5]
    }));
    expect(loadFilterPreferences()).toEqual({});
  });
});

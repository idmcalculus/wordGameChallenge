import { beforeEach, describe, expect, it } from 'vitest';
import { FILTER_TYPES } from '../constants/statConstants';
import { applyFilters, getAvailableFilters, loadFilterPreferences, saveFilterPreferences } from './filterUtils';
import type { ActiveFilters, IndexedStatEntry } from '../types/interface';

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

const stats: IndexedStatEntry[] = [
  {
    __originalIndex: 0,
    word: 'fur',
    time: 19,
    attempts: 5,
    wordLength: 3,
    date: '2026-01-01T00:00:00.000Z'
  },
  {
    __originalIndex: 1,
    word: 'adage',
    time: 27,
    attempts: 3,
    wordLength: 5,
    date: '2026-01-02T00:00:00.000Z'
  },
  {
    __originalIndex: 2,
    word: 'jaguar',
    time: 190,
    attempts: 2,
    wordLength: 6,
    date: '2026-01-03T00:00:00.000Z'
  }
];

describe('filterUtils', () => {
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

  it('ignores unsupported filter types at runtime', () => {
    const invalidFilters = {
      INVALID: [0]
    } as ActiveFilters;

    const result = applyFilters(stats, invalidFilters);
    expect(result).toEqual(stats);
  });

  it('filters by word length and attempts', () => {
    const activeFilters: ActiveFilters = {
      [FILTER_TYPES.WORD_LENGTH]: [0],
      [FILTER_TYPES.ATTEMPTS]: [1]
    };

    const result = applyFilters(stats, activeFilters);
    expect(result.map((entry) => entry.word)).toEqual(['adage']);
  });

  it('filters by time range correctly', () => {
    const activeFilters: ActiveFilters = {
      [FILTER_TYPES.TIME]: [4]
    };

    const result = applyFilters(stats, activeFilters);
    expect(result.map((entry) => entry.word)).toEqual(['jaguar']);
  });

  it('calculates available filters from stats', () => {
    const available = getAvailableFilters(stats);

    expect(Array.from(available[FILTER_TYPES.WORD_LENGTH].values())).toEqual([0, 1]);
    expect(Array.from(available[FILTER_TYPES.TIME].values())).toEqual([0, 4]);
    expect(Array.from(available[FILTER_TYPES.ATTEMPTS].values())).toEqual([2, 1, 0]);
  });

  it('saves and loads sanitized filter preferences', () => {
    const preferences: ActiveFilters = {
      [FILTER_TYPES.TIME]: [0, 1],
      [FILTER_TYPES.WORD_LENGTH]: [1]
    };

    saveFilterPreferences(preferences);
    expect(loadFilterPreferences()).toEqual(preferences);

    localStorage.setItem('statFilters', JSON.stringify({
      INVALID: [1, 2],
      [FILTER_TYPES.TIME]: [0, 9, -1],
      [FILTER_TYPES.ATTEMPTS]: ['bad', 2]
    }));

    expect(loadFilterPreferences()).toEqual({
      [FILTER_TYPES.TIME]: [0],
      [FILTER_TYPES.ATTEMPTS]: [2]
    });
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

import { beforeEach, describe, expect, it } from 'vitest';
import { addStat, loadStats, saveStats } from './statsRepository';
import type { StatEntry } from '../types/interface';

function createStat(overrides: Partial<StatEntry>): StatEntry {
  return {
    word: 'test',
    time: 10,
    attempts: 2,
    wordLength: 4,
    date: '2026-01-01T00:00:00.000Z',
    difficultyLabel: 'Medium',
    hintsUsed: 0,
    solvedWithoutHints: true,
    averageFreshLettersPerGuess: 3,
    averageEliminatedLetterReusePerGuess: 0,
    ...overrides
  };
}

function createMockLocalStorage() {
  let store: Record<string, string> = {};

  const storage = {
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

  return storage as Storage;
}

describe('statsRepository', () => {
  beforeEach(() => {
    globalThis.localStorage = createMockLocalStorage();
  });

  it('loads, migrates, deduplicates, and sorts legacy/current stats', () => {
    localStorage.setItem('highScores', JSON.stringify([
      {
        score: 42,
        word: 'Fur',
        wordLength: 3,
        attempts: 5,
        date: '2026-01-01T10:00:00.000Z'
      },
      {
        score: 15,
        word: 'Apex',
        wordLength: 4,
        attempts: 3,
        date: '2026-01-03T10:00:00.000Z'
      }
    ]));

    localStorage.setItem('stats', JSON.stringify([
      {
        time: 42,
        word: 'fur',
        wordLength: 3,
        attempts: 5,
        date: '2026-01-01T10:00:00.000Z',
        difficultyLabel: 'Easy',
        hintsUsed: 0,
        solvedWithoutHints: true,
        averageFreshLettersPerGuess: 3,
        averageEliminatedLetterReusePerGuess: 0
      },
      {
        time: 20,
        word: 'adage',
        wordLength: 5,
        attempts: 4,
        date: '2026-01-02T10:00:00.000Z',
        difficultyLabel: 'Hard',
        hintsUsed: 1,
        solvedWithoutHints: false,
        averageFreshLettersPerGuess: 2.5,
        averageEliminatedLetterReusePerGuess: 0.5
      }
    ]));

    const loaded = loadStats();

    expect(loaded.map((entry) => entry.word)).toEqual(['apex', 'adage', 'fur']);
    expect(loaded.map((entry) => entry.time)).toEqual([15, 20, 42]);
    expect(localStorage.getItem('highScores')).toBeNull();

    const persisted = JSON.parse(localStorage.getItem('stats') ?? '[]') as StatEntry[];
    expect(persisted).toHaveLength(3);
  });

  it('adds a new stat and preserves tie-break sorting order', () => {
    const base = [
      createStat({
        time: 30,
        word: 'slow',
        wordLength: 4,
        attempts: 3,
        date: '2026-01-01T00:00:00.000Z'
      }),
      createStat({
        time: 30,
        word: 'sled',
        wordLength: 4,
        attempts: 3,
        date: '2026-01-03T00:00:00.000Z'
      })
    ];

    const updated = addStat(base, createStat({
      time: 30,
      word: 'slam',
      wordLength: 4,
      attempts: 2,
      date: '2026-01-02T00:00:00.000Z'
    }));

    expect(updated.map((entry) => entry.word)).toEqual(['slam', 'sled', 'slow']);

    const persisted = JSON.parse(localStorage.getItem('stats') ?? '[]') as StatEntry[];
    expect(persisted.map((entry) => entry.word)).toEqual(['slam', 'sled', 'slow']);
  });

  it('normalizes values and drops invalid stats when saving', () => {
    const saved = saveStats([
      createStat({
        word: '',
        time: 11,
        attempts: 1,
        wordLength: 1,
        date: '2026-01-01T00:00:00.000Z'
      }),
      createStat({
        word: 'TeSt',
        time: '9',
        attempts: '2',
        wordLength: '4',
        date: '2026-01-05T00:00:00.000Z'
      } as unknown as Partial<StatEntry>)
    ]);

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      word: 'test',
      time: 9,
      attempts: 2,
      wordLength: 4
    });
  });

  it('returns empty arrays for malformed/non-array stored values', () => {
    localStorage.setItem('highScores', '{invalid json');
    localStorage.setItem('stats', JSON.stringify({ bad: true }));

    const loaded = loadStats();
    expect(loaded).toEqual([]);
  });

  it('drops non-object raw stats entries', () => {
    localStorage.setItem('stats', JSON.stringify([
      null,
      12,
      'text',
      {
        word: 'ok',
        time: 9,
        attempts: 2,
        wordLength: 2,
        date: '2026-01-01T00:00:00.000Z',
        difficultyLabel: 'Unknown',
        hintsUsed: 0,
        solvedWithoutHints: true,
        averageFreshLettersPerGuess: 0,
        averageEliminatedLetterReusePerGuess: 0
      }
    ]));

    const loaded = loadStats();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].word).toBe('ok');
  });

  it('normalizes invalid date and non-numeric values when loading raw stats', () => {
    localStorage.setItem('stats', JSON.stringify([
      {
        word: 'Gamma',
        time: 'not-a-number',
        attempts: 'NaN',
        wordLength: 'NaN',
        date: 'invalid-date'
      }
    ]));

    const loaded = loadStats();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].word).toBe('gamma');
    expect(loaded[0].time).toBe(0);
    expect(loaded[0].attempts).toBe(0);
    expect(loaded[0].wordLength).toBe(5);
    expect(loaded[0].difficultyLabel).toBe('Unknown');
    expect(loaded[0].solvedWithoutHints).toBe(true);
    expect(Number.isNaN(new Date(loaded[0].date).getTime())).toBe(false);
  });

  it('normalizes missing date/wordLength and drops non-string words', () => {
    localStorage.setItem('stats', JSON.stringify([
      {
        word: 'delta',
        time: 12,
        attempts: 3
      },
      {
        word: 42,
        time: 1,
        attempts: 1,
        date: '2026-01-01T00:00:00.000Z'
      }
    ]));

    const loaded = loadStats();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].word).toBe('delta');
    expect(loaded[0].wordLength).toBe(5);
    expect(Number.isNaN(new Date(loaded[0].date).getTime())).toBe(false);
  });

  it('defaults missing ability metrics and difficulty safely for legacy entries', () => {
    localStorage.setItem('stats', JSON.stringify([
      {
        word: 'crown',
        time: 12,
        attempts: 3,
        wordLength: 5,
        date: '2026-01-01T00:00:00.000Z'
      }
    ]));

    const loaded = loadStats();
    expect(loaded[0]).toMatchObject({
      difficultyLabel: 'Unknown',
      hintsUsed: 0,
      solvedWithoutHints: true,
      averageFreshLettersPerGuess: 0,
      averageEliminatedLetterReusePerGuess: 0
    });
  });

  it('accepts string boolean values for legacy solved-without-hints fields', () => {
    localStorage.setItem('stats', JSON.stringify([
      {
        word: 'clean',
        time: 14,
        attempts: 2,
        wordLength: 5,
        date: '2026-01-02T00:00:00.000Z',
        solvedWithoutHints: 'true'
      },
      {
        word: 'canny',
        time: 18,
        attempts: 3,
        wordLength: 5,
        date: '2026-01-03T00:00:00.000Z',
        solvedWithoutHints: 'false'
      }
    ]));

    const loaded = loadStats();
    expect(loaded[0]?.solvedWithoutHints).toBe(true);
    expect(loaded[1]?.solvedWithoutHints).toBe(false);
  });
});

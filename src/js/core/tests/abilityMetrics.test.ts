import { describe, expect, it } from 'vitest';
import { buildAbilityMetrics, buildStatsSummary } from '../abilityMetrics';
import type { StatEntry } from '../../types/interface';

describe('abilityMetrics', () => {
  it('computes per-game coverage and eliminated-letter reuse from guess history', () => {
    const metrics = buildAbilityMetrics([
      {
        guess: 'crane',
        letterStates: ['correct', 'correct', 'notContains', 'notContains', 'notContains']
      },
      {
        guess: 'cared',
        letterStates: ['correct', 'contains', 'contains', 'contains', 'notContains']
      }
    ], 1);

    expect(metrics).toEqual({
      hintsUsed: 1,
      solvedWithoutHints: false,
      averageFreshLettersPerGuess: 3,
      averageEliminatedLetterReusePerGuess: 1
    });
  });

  it('returns safe zeroed metrics for empty histories and negative hint counts', () => {
    expect(buildAbilityMetrics([], -3)).toEqual({
      hintsUsed: 0,
      solvedWithoutHints: true,
      averageFreshLettersPerGuess: 0,
      averageEliminatedLetterReusePerGuess: 0
    });
  });

  it('ignores malformed guess-state pairs without breaking metric computation', () => {
    expect(buildAbilityMetrics([
      {
        guess: 'ab',
        letterStates: ['correct']
      }
    ], 0)).toEqual({
      hintsUsed: 0,
      solvedWithoutHints: true,
      averageFreshLettersPerGuess: 2,
      averageEliminatedLetterReusePerGuess: 0
    });
  });

  it('summarizes ability-focused stats for the stats dashboard', () => {
    const stats: StatEntry[] = [
      {
        word: 'crown',
        time: 21,
        attempts: 3,
        wordLength: 5,
        date: '2026-03-01T09:00:00.000Z',
        difficultyLabel: 'Medium',
        hintsUsed: 0,
        solvedWithoutHints: true,
        averageFreshLettersPerGuess: 3.5,
        averageEliminatedLetterReusePerGuess: 0.25
      },
      {
        word: 'planet',
        time: 48,
        attempts: 4,
        wordLength: 6,
        date: '2026-03-02T09:00:00.000Z',
        difficultyLabel: 'Hard',
        hintsUsed: 2,
        solvedWithoutHints: false,
        averageFreshLettersPerGuess: 3,
        averageEliminatedLetterReusePerGuess: 1
      }
    ];

    expect(buildStatsSummary(stats)).toEqual({
      totalWins: 2,
      noHintWins: 1,
      noHintWinRate: 50,
      totalHintsUsed: 2,
      trackedFreshLetterWins: 2,
      averageHintsUsed: 1,
      averageFreshLettersPerGuess: 3.25,
      averageEliminatedLetterReusePerGuess: 0.63
    });
  });

  it('normalizes non-finite summary values to zero', () => {
    const stats: StatEntry[] = [
      {
        word: 'drift',
        time: 10,
        attempts: 2,
        wordLength: 5,
        date: '2026-03-03T09:00:00.000Z',
        difficultyLabel: 'Unknown',
        hintsUsed: Number.NaN,
        solvedWithoutHints: false,
        averageFreshLettersPerGuess: Number.POSITIVE_INFINITY,
        averageEliminatedLetterReusePerGuess: Number.NaN
      }
    ];

    expect(buildStatsSummary(stats)).toEqual({
      totalWins: 1,
      noHintWins: 0,
      noHintWinRate: 0,
      totalHintsUsed: 0,
      trackedFreshLetterWins: 1,
      averageHintsUsed: 0,
      averageFreshLettersPerGuess: 0,
      averageEliminatedLetterReusePerGuess: 0
    });
  });
});

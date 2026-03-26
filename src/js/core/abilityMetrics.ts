import type {
  AbilityMetrics,
  GuessHistoryEntry,
  StatEntry,
  StatsSummary
} from '../types/interface';
import type { LetterState } from '../types/types';

const LETTER_STATE_PRIORITY: Record<LetterState, number> = {
  notContains: 1,
  contains: 2,
  correct: 3
};

function getHigherPriorityState(current: LetterState | undefined, next: LetterState): LetterState {
  if (!current) {
    return next;
  }

  return LETTER_STATE_PRIORITY[next] > LETTER_STATE_PRIORITY[current] ? next : current;
}

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

function sanitizeAggregate(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function getUniqueLetters(word: string): string[] {
  return [...new Set(word.split(''))];
}

export function buildAbilityMetrics(
  guessHistory: readonly GuessHistoryEntry[],
  hintCount: number
): AbilityMetrics {
  const sanitizedHintCount = Math.max(0, Math.floor(hintCount));

  if (guessHistory.length === 0) {
    return {
      hintsUsed: sanitizedHintCount,
      solvedWithoutHints: sanitizedHintCount === 0,
      averageFreshLettersPerGuess: 0,
      averageEliminatedLetterReusePerGuess: 0
    };
  }

  let totalFreshLetters = 0;
  let totalEliminatedLetterReuse = 0;
  const keyboardStates: Record<string, LetterState> = {};

  guessHistory.forEach(({ guess, letterStates }) => {
    const uniqueLetters = getUniqueLetters(guess);

    totalFreshLetters += uniqueLetters.filter((letter) => keyboardStates[letter] === undefined).length;
    totalEliminatedLetterReuse += uniqueLetters.filter((letter) => keyboardStates[letter] === 'notContains').length;

    for (let index = 0; index < guess.length; index += 1) {
      const letter = guess[index];
      const nextState = letterStates[index];

      if (!letter || !nextState) {
        continue;
      }

      keyboardStates[letter] = getHigherPriorityState(keyboardStates[letter], nextState);
    }
  });

  return {
    hintsUsed: sanitizedHintCount,
    solvedWithoutHints: sanitizedHintCount === 0,
    averageFreshLettersPerGuess: roundMetric(totalFreshLetters / guessHistory.length),
    averageEliminatedLetterReusePerGuess: roundMetric(totalEliminatedLetterReuse / guessHistory.length)
  };
}

export function buildStatsSummary(stats: readonly StatEntry[]): StatsSummary {
  if (stats.length === 0) {
    return {
      totalWins: 0,
      noHintWins: 0,
      noHintWinRate: 0,
      totalHintsUsed: 0,
      trackedFreshLetterWins: 0,
      averageHintsUsed: 0,
      averageFreshLettersPerGuess: 0,
      averageEliminatedLetterReusePerGuess: 0
    };
  }

  const noHintWins = stats.filter((stat) => stat.solvedWithoutHints).length;
  const totalHintsUsed = sanitizeAggregate(stats.reduce((total, stat) => total + stat.hintsUsed, 0));
  const trackedFreshLetterStats = stats.filter((stat) => stat.averageFreshLettersPerGuess > 0);
  const totalFreshLetters = trackedFreshLetterStats.reduce((total, stat) => total + stat.averageFreshLettersPerGuess, 0);
  const totalEliminatedLetterReuse = stats.reduce(
    (total, stat) => total + stat.averageEliminatedLetterReusePerGuess,
    0
  );

  return {
    totalWins: stats.length,
    noHintWins,
    noHintWinRate: roundMetric((noHintWins / stats.length) * 100),
    totalHintsUsed,
    trackedFreshLetterWins: trackedFreshLetterStats.length,
    averageHintsUsed: roundMetric(totalHintsUsed / stats.length),
    averageFreshLettersPerGuess: trackedFreshLetterStats.length > 0
      ? roundMetric(totalFreshLetters / trackedFreshLetterStats.length)
      : 0,
    averageEliminatedLetterReusePerGuess: roundMetric(totalEliminatedLetterReuse / stats.length)
  };
}

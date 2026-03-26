import { evaluateGuess } from './gameEngine';
import type { GuessHistoryEntry, StrategyInsight } from '../types/interface';
import type { LetterState } from '../types/types';

const LETTER_STATE_PRIORITY: Record<LetterState, number> = {
  notContains: 1,
  contains: 2,
  correct: 3
};

const MAX_SUGGESTED_LETTERS = 5;

function getHigherPriorityState(current: LetterState | undefined, next: LetterState): LetterState {
  if (!current) {
    return next;
  }

  return LETTER_STATE_PRIORITY[next] > LETTER_STATE_PRIORITY[current] ? next : current;
}

function buildKeyboardStates(guessHistory: readonly GuessHistoryEntry[]): Record<string, LetterState> {
  return guessHistory.reduce<Record<string, LetterState>>((keyboardStates, entry) => {
    for (let index = 0; index < entry.guess.length; index += 1) {
      const letter = entry.guess[index];
      const state = entry.letterStates[index];

      if (!letter || !state) {
        continue;
      }

      keyboardStates[letter] = getHigherPriorityState(keyboardStates[letter], state);
    }

    return keyboardStates;
  }, {});
}

function getUniqueLetters(word: string): string[] {
  return [...new Set(word.split(''))];
}

function matchesGuessHistory(candidate: string, guessHistory: readonly GuessHistoryEntry[]): boolean {
  return guessHistory.every((entry) => {
    const evaluation = evaluateGuess(candidate, entry.guess);
    if (evaluation.letterStates.length !== entry.letterStates.length) {
      return false;
    }

    return evaluation.letterStates.every((state, index) => state === entry.letterStates[index]);
  });
}

function getRemainingCandidates(answerPool: readonly string[], guessHistory: readonly GuessHistoryEntry[]): string[] {
  if (guessHistory.length === 0) {
    return [...answerPool];
  }

  return answerPool.filter((candidate) => matchesGuessHistory(candidate, guessHistory));
}

function getTopUntriedLetters(candidates: readonly string[], usedLetters: ReadonlySet<string>): string[] {
  const letterCounts = new Map<string, number>();

  candidates.forEach((candidate) => {
    getUniqueLetters(candidate).forEach((letter) => {
      if (usedLetters.has(letter)) {
        return;
      }

      letterCounts.set(letter, (letterCounts.get(letter) ?? 0) + 1);
    });
  });

  return [...letterCounts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, MAX_SUGGESTED_LETTERS)
    .map(([letter]) => letter);
}

function getCoachMessage(
  wordLength: number,
  guessHistory: readonly GuessHistoryEntry[],
  remainingCandidateCount: number,
  previousCandidateCount: number | null,
  duplicateLetterStillPossible: boolean,
  freshLettersInLastGuess: number,
  reusedEliminatedLettersInLastGuess: number
): string {
  if (guessHistory.length === 0) {
    return `Open with broad coverage. Aim for ${Math.min(wordLength, 4)} fresh letters in the first guess.`;
  }

  if (remainingCandidateCount <= 1) {
    return 'Only one local answer still fits. Commit to the pattern you have built.';
  }

  if (remainingCandidateCount <= 3) {
    return `Only ${remainingCandidateCount} local answers still fit. Prioritize position-confirming guesses.`;
  }

  if (reusedEliminatedLettersInLastGuess >= 2) {
    return `You reused ${reusedEliminatedLettersInLastGuess} eliminated letters last turn. Probe fresher letters next.`;
  }

  if (
    previousCandidateCount !== null &&
    previousCandidateCount > remainingCandidateCount &&
    freshLettersInLastGuess >= Math.min(wordLength, 4)
  ) {
    return `Strong coverage. That guess cut the local pool from ${previousCandidateCount} to ${remainingCandidateCount}.`;
  }

  if (duplicateLetterStillPossible) {
    return 'A repeated letter is still possible, so do not assume every slot maps to a unique character.';
  }

  return `${remainingCandidateCount} local answers still fit. Keep trading for new information before locking in.`;
}

function getCoachDetail(
  remainingCandidateCount: number,
  previousCandidateCount: number | null,
  topUntriedLetters: readonly string[],
  duplicateLetterStillPossible: boolean
): string {
  const detailParts: string[] = [];

  if (previousCandidateCount !== null && previousCandidateCount > remainingCandidateCount) {
    detailParts.push(`Pool change: ${previousCandidateCount} to ${remainingCandidateCount}`);
  } else {
    detailParts.push(`Local answers left: ${remainingCandidateCount}`);
  }

  if (topUntriedLetters.length > 0) {
    detailParts.push(`Best new letters: ${topUntriedLetters.map((letter) => letter.toUpperCase()).join(', ')}`);
  }

  if (duplicateLetterStillPossible) {
    detailParts.push('Duplicate letters remain plausible');
  }

  return detailParts.join(' • ');
}

export function buildStrategyInsight(
  answerPool: readonly string[],
  guessHistory: readonly GuessHistoryEntry[],
  wordLength: number
): StrategyInsight {
  const remainingCandidates = getRemainingCandidates(answerPool, guessHistory);
  const previousCandidates = guessHistory.length > 0
    ? getRemainingCandidates(answerPool, guessHistory.slice(0, -1))
    : null;
  const previousCandidateCount = previousCandidates ? previousCandidates.length : null;
  const usedLetters = new Set<string>(guessHistory.flatMap((entry) => getUniqueLetters(entry.guess)));
  const topUntriedLetters = getTopUntriedLetters(remainingCandidates, usedLetters);
  const duplicateLetterStillPossible = remainingCandidates.some((candidate) => getUniqueLetters(candidate).length < candidate.length);
  const lastGuess = guessHistory[guessHistory.length - 1];
  const previousKeyboardStates = buildKeyboardStates(guessHistory.slice(0, -1));
  const lastGuessLetters = lastGuess ? getUniqueLetters(lastGuess.guess) : [];
  const freshLettersInLastGuess = lastGuessLetters.filter((letter) => previousKeyboardStates[letter] === undefined).length;
  const reusedEliminatedLettersInLastGuess = lastGuessLetters.filter(
    (letter) => previousKeyboardStates[letter] === 'notContains'
  ).length;

  return {
    remainingCandidateCount: remainingCandidates.length,
    previousCandidateCount,
    topUntriedLetters,
    duplicateLetterStillPossible,
    freshLettersInLastGuess,
    reusedEliminatedLettersInLastGuess,
    coachMessage: getCoachMessage(
      wordLength,
      guessHistory,
      remainingCandidates.length,
      previousCandidateCount,
      duplicateLetterStillPossible,
      freshLettersInLastGuess,
      reusedEliminatedLettersInLastGuess
    ),
    coachDetail: getCoachDetail(
      remainingCandidates.length,
      previousCandidateCount,
      topUntriedLetters,
      duplicateLetterStillPossible
    )
  };
}

import type { GuessEvaluationResult } from '../types/interface';
import type { LetterState } from '../types/types';

export const LETTER_STATES = {
  CORRECT: 'correct',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'notContains'
} as const;

const STATE_PRIORITY = {
  [LETTER_STATES.NOT_CONTAINS]: 1,
  [LETTER_STATES.CONTAINS]: 2,
  [LETTER_STATES.CORRECT]: 3
};

function normalizeWord(word: string) {
  return (word || '').toLowerCase();
}

/**
 * Evaluate a guess against a target word using Wordle-style duplicate handling.
 * @param {string} targetWord
 * @param {string} guessWord
 * @returns {{ letterStates: string[], keyboardStates: Record<string, string>, totalCorrect: number, isWin: boolean }}
 */
export function evaluateGuess(targetWord: string, guessWord: string): GuessEvaluationResult {
  const target = normalizeWord(targetWord);
  const guess = normalizeWord(guessWord);

  if (!target || !guess || target.length !== guess.length) {
    return {
      letterStates: [],
      keyboardStates: {},
      totalCorrect: 0,
      isWin: false
    };
  }

  const letterStates: LetterState[] = new Array(guess.length);
  const remainingCounts: Record<string, number> = {};
  const keyboardStates: Record<string, LetterState> = {};

  for (let i = 0; i < target.length; i++) {
    const letter = target[i];
    remainingCounts[letter] = (remainingCounts[letter] || 0) + 1;
  }

  let totalCorrect = 0;

  // Pass 1: mark exact matches.
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === target[i]) {
      letterStates[i] = LETTER_STATES.CORRECT;
      remainingCounts[guess[i]] -= 1;
      totalCorrect += 1;
      keyboardStates[guess[i]] = LETTER_STATES.CORRECT;
    }
  }

  // Pass 2: mark misplaced/absent letters using remaining counts.
  for (let i = 0; i < guess.length; i++) {
    if (letterStates[i]) {
      continue;
    }

    const letter = guess[i];
    const nextState = remainingCounts[letter] > 0
      ? LETTER_STATES.CONTAINS
      : LETTER_STATES.NOT_CONTAINS;

    letterStates[i] = nextState;

    if (nextState === LETTER_STATES.CONTAINS) {
      remainingCounts[letter] -= 1;
    }

    const previousState = keyboardStates[letter];
    if (!previousState || STATE_PRIORITY[nextState] > STATE_PRIORITY[previousState]) {
      keyboardStates[letter] = nextState;
    }
  }

  return {
    letterStates,
    keyboardStates,
    totalCorrect,
    isWin: totalCorrect === target.length
  };
}

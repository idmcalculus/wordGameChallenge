import { evaluateGuess } from './gameEngine';
import { getAvailableLetterHints, getAvailablePositionHints } from './hintEngine';
import type {
  GameSessionGuessResult,
  GameSessionHintContext,
  GameSessionStartConfig,
  GuessEvaluationResult,
  GuessHistoryEntry
} from '../types/interface';
import type { LetterState } from '../types/types';
import { sanitizeSingleLetter, sanitizeWord } from '../utils/inputSanitizer';

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

export class GameSession {
  private readonly maximumAttempts: number;
  private targetWord: string;
  private wordLength: number;
  private attemptsUsed: number;
  private startedAt: Date | null;
  private guessHistory: GuessHistoryEntry[];
  private keyboardStates: Record<string, LetterState>;
  private hintedLetters: string[];

  constructor(maximumAttempts = 5) {
    this.maximumAttempts = Math.max(1, maximumAttempts);
    this.targetWord = '';
    this.wordLength = 0;
    this.attemptsUsed = 0;
    this.startedAt = null;
    this.guessHistory = [];
    this.keyboardStates = {};
    this.hintedLetters = [];
  }

  start({ targetWord, wordLength, startTime = new Date() }: GameSessionStartConfig): void {
    const normalizedWord = sanitizeWord(targetWord);
    if (!normalizedWord || normalizedWord.length !== wordLength) {
      throw new Error('Invalid target word for game session');
    }

    this.targetWord = normalizedWord;
    this.wordLength = wordLength;
    this.attemptsUsed = 0;
    this.startedAt = startTime;
    this.guessHistory = [];
    this.keyboardStates = {};
    this.hintedLetters = [];
  }

  clear(): void {
    this.targetWord = '';
    this.wordLength = 0;
    this.attemptsUsed = 0;
    this.startedAt = null;
    this.guessHistory = [];
    this.keyboardStates = {};
    this.hintedLetters = [];
  }

  isActive(): boolean {
    return this.targetWord.length > 0 && this.wordLength > 0;
  }

  getTargetWord(): string {
    return this.targetWord;
  }

  getWordLength(): number {
    return this.wordLength;
  }

  getAttemptsUsed(): number {
    return this.attemptsUsed;
  }

  getMaximumAttempts(): number {
    return this.maximumAttempts;
  }

  getCurrentRowNumber(): number {
    return this.attemptsUsed + 1;
  }

  hasAttemptsRemaining(): boolean {
    return this.attemptsUsed < this.maximumAttempts;
  }

  getStartTime(): Date | null {
    return this.startedAt;
  }

  getElapsedSeconds(referenceTime = new Date()): number {
    if (!this.startedAt) {
      return 0;
    }

    const elapsed = Math.floor((referenceTime.getTime() - this.startedAt.getTime()) / 1000);
    return Math.max(0, elapsed);
  }

  getKeyboardStates(): Record<string, LetterState> {
    return { ...this.keyboardStates };
  }

  getHintCount(): number {
    return this.hintedLetters.length;
  }

  getGuessHistory(): GuessHistoryEntry[] {
    return this.guessHistory.map((entry) => ({
      guess: entry.guess,
      letterStates: [...entry.letterStates]
    }));
  }

  submitGuess(guessWord: string): GameSessionGuessResult {
    if (!this.isActive()) {
      throw new Error('Game session is not active');
    }

    if (!this.hasAttemptsRemaining()) {
      throw new Error('No attempts remaining');
    }

    const sanitizedGuess = sanitizeWord(guessWord, this.wordLength);
    if (sanitizedGuess.length !== this.wordLength) {
      throw new Error('Guess length does not match current word length');
    }

    const evaluation: GuessEvaluationResult = evaluateGuess(this.targetWord, sanitizedGuess);

    this.attemptsUsed += 1;
    this.guessHistory.push({
      guess: sanitizedGuess,
      letterStates: [...evaluation.letterStates]
    });

    Object.entries(evaluation.keyboardStates).forEach(([letter, state]) => {
      const normalizedLetter = sanitizeSingleLetter(letter);
      if (!normalizedLetter) {
        return;
      }

      this.keyboardStates[normalizedLetter] = getHigherPriorityState(this.keyboardStates[normalizedLetter], state);
    });

    return {
      evaluation,
      attemptsUsed: this.attemptsUsed,
      hasAttemptsRemaining: this.hasAttemptsRemaining()
    };
  }

  registerLetterHint(letter: string, hintState: LetterState = 'contains'): void {
    const normalizedLetter = sanitizeSingleLetter(letter);
    if (!normalizedLetter) {
      return;
    }

    this.hintedLetters.push(normalizedLetter);
    this.keyboardStates[normalizedLetter] = getHigherPriorityState(this.keyboardStates[normalizedLetter], hintState);
  }

  getHintContext(): GameSessionHintContext {
    const correctPositions: Record<number, string> = {};
    const usedLetters = new Set<string>();
    const revealedLetters: string[] = [];

    this.guessHistory.forEach(({ guess, letterStates }) => {
      for (let index = 0; index < guess.length; index++) {
        const letter = guess[index];
        if (!letter) {
          continue;
        }

        usedLetters.add(letter);

        const state = letterStates[index];
        if (state === 'correct') {
          correctPositions[index] = letter;
          revealedLetters.push(letter);
        } else if (state === 'contains') {
          revealedLetters.push(letter);
        }
      }
    });

    this.hintedLetters.forEach((letter) => {
      usedLetters.add(letter);
      revealedLetters.push(letter);
    });

    return {
      correctPositions,
      usedLetters,
      revealedLetters
    };
  }

  getAvailableLetterHints(): string[] {
    if (!this.isActive()) {
      return [];
    }

    return getAvailableLetterHints(this.targetWord, this.getHintContext());
  }

  getAvailablePositionHints(currentRowLetters: string[]): number[] {
    if (!this.isActive()) {
      return [];
    }

    return getAvailablePositionHints({
      targetWord: this.targetWord,
      currentRowLetters,
      correctPositions: this.getHintContext().correctPositions
    });
  }
}

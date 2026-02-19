/* eslint-disable no-unused-vars */
import type {
  FilterType,
  GameState,
  HintType,
  KeyboardKey,
  JsonObject,
  LetterState,
  SortDirection,
  SortField
} from './types';

export interface GuessEvaluationResult {
  letterStates: LetterState[];
  keyboardStates: Record<string, LetterState>;
  totalCorrect: number;
  isWin: boolean;
}

export interface GuessHistoryEntry {
  guess: string;
  letterStates: LetterState[];
}

export interface StatEntry {
  word: string;
  time: number;
  attempts: number;
  wordLength: number;
  date: string;
}

export interface IndexedStatEntry extends StatEntry {
  __originalIndex: number;
}

export interface RangeDefinition {
  label: string;
  min: number;
  max: number;
}

export type ActiveFilters = Partial<Record<FilterType, number[]>>;

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export interface CapturedErrorEntry {
  timestamp: string;
  name: string;
  message: string;
  stack: string;
  details: JsonObject;
  url: string;
  userAgent: string;
}

export interface LetterHintContext {
  usedLetters?: Set<string> | string[];
  revealedLetters?: string[];
}

export interface PositionHintParams {
  targetWord: string;
  currentRowLetters: string[];
  correctPositions?: Record<number, string>;
}

export interface GameStateMachine {
  canTransition(nextState: GameState): boolean;
  transition(nextState: GameState): GameState;
  getState(): GameState;
}

export interface SetupModalsOptions {
  onOpenStats?: () => void;
}

export interface ModalTeardown {
  (): void;
}

export type AlertVariant = 'success' | 'failure' | 'invalid';

export interface AlertParagraph {
  text: string;
  emphasis?: string;
}

export interface AlertContent {
  variant: AlertVariant;
  icon: string;
  title: string;
  paragraphs: AlertParagraph[];
}

export interface ShowAlertOptions {
  isGameResult?: boolean;
  onClose?: () => void;
}

export interface GameSessionStartConfig {
  targetWord: string;
  wordLength: number;
  startTime?: Date;
}

export interface GameSessionHintContext {
  correctPositions: Record<number, string>;
  usedLetters: Set<string>;
  revealedLetters: string[];
}

export interface GameSessionGuessResult {
  evaluation: GuessEvaluationResult;
  attemptsUsed: number;
  hasAttemptsRemaining: boolean;
}

export type HintProvider = () => void;

export type GetRowNumber = () => number;

export type OnKeyboardInput = (key: KeyboardKey) => void;

export interface HintButtonState {
  type: HintType | null;
  rowNumber: number;
  totalHintsUsed: number;
}

declare global {
  interface Window {
    getWordGameClientErrors?: () => CapturedErrorEntry[];
    clearWordGameClientErrors?: () => void;
  }
}

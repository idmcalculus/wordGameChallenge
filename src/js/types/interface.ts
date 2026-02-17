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

export interface ModalGameAccessor {
  displayStats: () => void;
}

export interface SetupModalsOptions {
  getGame?: () => ModalGameAccessor | null;
}

export interface ShowAlertOptions {
  isGameResult?: boolean;
  onClose?: () => void;
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
    game?: ModalGameAccessor | null;
    getWordGameClientErrors?: () => CapturedErrorEntry[];
    clearWordGameClientErrors?: () => void;
  }
}

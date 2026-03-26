/* eslint-disable no-unused-vars */
import type {
  DifficultyLabel,
  FilterType,
  GameState,
  HintType,
  KeyboardKey,
  JsonObject,
  LetterState,
  StatDifficultyLabel,
  SortDirection,
  SortField,
  WordFamiliarity
} from './types';

export interface GuessEvaluationResult {
  letterStates: LetterState[];
  keyboardStates: Record<string, LetterState>;
  totalCorrect: number;
  isWin: boolean;
}

export interface PuzzleDifficultyInfo {
  label: DifficultyLabel;
  score: number;
  summary: string;
  guidance: string;
}

export interface StrategyInsight {
  remainingCandidateCount: number;
  previousCandidateCount: number | null;
  topUntriedLetters: string[];
  duplicateLetterStillPossible: boolean;
  freshLettersInLastGuess: number;
  reusedEliminatedLettersInLastGuess: number;
  coachMessage: string;
  coachDetail: string;
}

export interface WordDifficultyAnalysis extends PuzzleDifficultyInfo {
  hasDuplicateLetters: boolean;
  rareLetterCount: number;
  uniqueLetterCount: number;
  ambiguityFamilySize: number;
}

export interface WordRepositoryEntry extends WordDifficultyAnalysis {
  word: string;
  wordLength: number;
  familiarity: WordFamiliarity;
}

export interface GuessHistoryEntry {
  guess: string;
  letterStates: LetterState[];
}

export interface AbilityMetrics {
  hintsUsed: number;
  solvedWithoutHints: boolean;
  averageFreshLettersPerGuess: number;
  averageEliminatedLetterReusePerGuess: number;
}

export interface StatEntry extends AbilityMetrics {
  word: string;
  time: number;
  attempts: number;
  wordLength: number;
  date: string;
  difficultyLabel: StatDifficultyLabel;
}

export interface IndexedStatEntry extends StatEntry {
  __originalIndex: number;
}

export interface StatsSummary {
  totalWins: number;
  noHintWins: number;
  noHintWinRate: number;
  totalHintsUsed: number;
  trackedFreshLetterWins: number;
  averageHintsUsed: number;
  averageFreshLettersPerGuess: number;
  averageEliminatedLetterReusePerGuess: number;
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

export interface HintPolicy {
  totalRevealLimit: number;
  letterCooldownMs: number;
  positionCooldownMs: number;
  maxPositionReveals: number;
  minRowForPositionReveal: number;
}

export type HintProvider = () => boolean;

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

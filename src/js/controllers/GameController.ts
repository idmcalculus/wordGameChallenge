import { showAlert } from '../modals';
import {
  resetGameUI,
  updateDifficulty
} from '../uiHandler';
import { fetchPossibleWords, validateWord } from '../apiHandler';
import {
  createHintButtonsContainer,
  resetHintButtons,
  resetHintButtonStates,
  updateCurrentRow
} from '../hintHandler';
import { StatsManager } from '../components/StatsManager';
import { logger } from '../utils/logger';
import { addStat, loadStats } from '../repositories/statsRepository';
import { pickRandom } from '../core/hintEngine';
import { createGameStateMachine, GAME_STATES } from '../core/gameStateMachine';
import { sanitizeSingleLetter, sanitizeWord } from '../utils/inputSanitizer';
import { GameSession } from '../core/gameSession';
import { BoardController } from './BoardController';
import { KeyboardController } from './KeyboardController';
import { TimerController } from './TimerController';
import type { GameState } from '../types/types';
import type { GameStateMachine, StatEntry } from '../types/interface';

class GameController {
  private possibleWords: string[];
  private readonly alphabet: string[];
  private rowCount: number;
  private readonly maximumAttempts: number;
  private wordLength: number;
  private isCheckingRow: boolean;
  private readonly isTouchDevice: boolean;
  private isVirtualInputMode: boolean;
  private readonly gameStateMachine: GameStateMachine;
  private gameState: GameState;
  private stats: StatEntry[];
  private statsManager: StatsManager | null;
  private readonly session: GameSession;
  private readonly boardController: BoardController;
  private readonly keyboardController: KeyboardController;
  private readonly timerController: TimerController;

  constructor() {
    this.possibleWords = [];
    this.alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    this.rowCount = 0;
    this.maximumAttempts = 5;
    this.wordLength = 0;
    this.isCheckingRow = false;
    this.isTouchDevice = this.detectTouchDevice();
    this.isVirtualInputMode = false;
    this.gameStateMachine = createGameStateMachine(GAME_STATES.IDLE);
    this.gameState = this.gameStateMachine.getState();
    this.stats = loadStats();
    this.statsManager = null;

    this.session = new GameSession(this.maximumAttempts);
    this.boardController = new BoardController();
    this.keyboardController = new KeyboardController(this.alphabet);
    this.timerController = new TimerController();

    this.init();
  }

  /**
   * Provides a hint for a letter that exists in the word (may not be in correct position)
   */
  getLetterHint(): void {
    if (!this.session.isActive() || !this.boardController.getCurrentRow() || this.gameState !== GAME_STATES.RUNNING) {
      return;
    }

    const hintLetter = pickRandom(this.session.getAvailableLetterHints());
    if (!hintLetter) {
      return;
    }

    this.session.registerLetterHint(hintLetter, 'contains');
    this.updateAlphabetContainer(hintLetter, 'contains');
  }

  /**
   * Provides a hint for a letter in its correct position.
   */
  getPositionHint(): void {
    if (!this.session.isActive() || !this.boardController.getCurrentRow() || this.gameState !== GAME_STATES.RUNNING) {
      return;
    }

    const inputs = this.getCurrentRowInputs();
    const currentRowLetters = inputs.map((input) => sanitizeSingleLetter(input.value));
    const targetPosition = pickRandom(this.session.getAvailablePositionHints(currentRowLetters));

    if (targetPosition === null) {
      return;
    }

    const targetInput = inputs[targetPosition];
    if (!targetInput) {
      return;
    }

    const targetWord = this.session.getTargetWord();
    targetInput.value = targetWord[targetPosition] ?? '';
    targetInput.classList.add('hint-provided');
    window.setTimeout(() => targetInput.classList.remove('hint-provided'), 2000);
  }

  private detectTouchDevice(): boolean {
    const hasCoarsePointer = typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false;

    return (
      typeof window !== 'undefined' &&
      (
        hasCoarsePointer ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
      )
    );
  }

  private stopActiveTimer(): void {
    this.timerController.stop();
  }

  private updateStartGameButtonState(): void {
    const startGameButton = document.getElementById('startGame') as HTMLButtonElement | null;
    const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;

    if (!startGameButton || !wordLengthInput) {
      return;
    }

    const rawValue = wordLengthInput.value.trim();
    const parsedValue = Number.parseInt(rawValue, 10);
    const isValidWordLength = rawValue !== '' &&
      Number.isInteger(parsedValue) &&
      parsedValue >= 3 &&
      parsedValue <= 10;

    startGameButton.disabled = !isValidWordLength;
  }

  private syncGameUiForState(): void {
    const startButton = document.getElementById('startGame');
    const wordLengthContainer = document.querySelector<HTMLElement>('.wordLengthInputContainer');
    const resetButton = document.getElementById('resetGame');
    const difficulty = document.getElementById('difficulty');

    if (!startButton || !wordLengthContainer || !resetButton || !difficulty) {
      return;
    }

    if (this.gameState === GAME_STATES.IDLE) {
      startButton.style.display = 'block';
      wordLengthContainer.style.display = 'block';
      resetButton.style.display = 'none';
      difficulty.style.display = 'none';
      this.updateStartGameButtonState();
      return;
    }

    startButton.style.display = 'none';
    wordLengthContainer.style.display = 'none';
    resetButton.style.display = 'block';
    difficulty.style.display = this.wordLength ? 'inline-flex' : 'none';
  }

  private transitionGameState(nextState: GameState): boolean {
    try {
      this.gameStateMachine.transition(nextState);
      this.gameState = this.gameStateMachine.getState();
      this.syncGameUiForState();
      return true;
    } catch (error) {
      logger.warn(this.normalizeError(error as Error | string | object | null | undefined), {
        source: 'GameController.transitionGameState',
        from: this.gameState,
        to: nextState
      });
      return false;
    }
  }

  private showMainPlayAgainButton(): void {
    const playAgainMainButton = document.getElementById('playAgainMain');
    if (playAgainMainButton) {
      playAgainMainButton.style.display = 'inline-flex';
    }
  }

  private hideMainPlayAgainButton(): void {
    const playAgainMainButton = document.getElementById('playAgainMain');
    if (playAgainMainButton) {
      playAgainMainButton.style.display = 'none';
    }
  }

  private handleGameResultModalClose(): void {
    this.stopActiveTimer();
    this.showMainPlayAgainButton();
  }

  private enableVirtualInputMode(): void {
    if (!this.isTouchDevice || !this.boardController.getCurrentRow()) {
      return;
    }

    this.isVirtualInputMode = true;
    this.getCurrentRowInputs().forEach((input) => {
      if (!input.disabled) {
        input.readOnly = true;
      }
    });

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement) {
      activeElement.blur();
    }
  }

  private enableNativeInputMode({ preserveFocus = false }: { preserveFocus?: boolean } = {}): void {
    if (!this.boardController.getCurrentRow()) {
      return;
    }

    this.isVirtualInputMode = false;

    if (this.isTouchDevice) {
      this.getCurrentRowInputs().forEach((input) => {
        if (!input.disabled) {
          input.readOnly = false;
        }
      });
    }

    if (!preserveFocus) {
      this.boardController.focusFirstInput();
    }
  }

  private setupCurrentRowInputMode(): void {
    if (!this.boardController.getCurrentRow() || !this.isTouchDevice) {
      return;
    }

    this.boardController.attachTouchIntentHandler(() => {
      this.enableNativeInputMode({ preserveFocus: true });
    });
  }

  private normalizeError(error: Error | string | object | null | undefined): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    return new Error(String(error));
  }

  private init(): void {
    const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;
    const startGameButton = document.getElementById('startGame');
    const resetGameButton = document.getElementById('resetGame');
    const timerDisplay = document.getElementById('timerDisplay');

    if (!wordLengthInput || !startGameButton || !resetGameButton) {
      logger.error(new Error('Missing required game controls'), { source: 'GameController.init' });
      return;
    }

    this.timerController.bindDisplay(timerDisplay);
    wordLengthInput.value = '3';
    this.updateStartGameButtonState();

    wordLengthInput.addEventListener('input', () => {
      if (wordLengthInput.value.trim() !== '') {
        const value = Number.parseInt(wordLengthInput.value, 10);
        if (Number.isInteger(value) && value > 10) {
          wordLengthInput.value = '10';
        }
      }

      this.updateStartGameButtonState();
    });

    wordLengthInput.addEventListener('blur', () => {
      if (wordLengthInput.value.trim() === '') {
        this.updateStartGameButtonState();
        return;
      }

      const value = Number.parseInt(wordLengthInput.value, 10);

      if (Number.isNaN(value)) {
        wordLengthInput.value = '';
      } else if (value < 3) {
        wordLengthInput.value = '3';
      } else if (value > 10) {
        wordLengthInput.value = '10';
      }
      this.updateStartGameButtonState();
    });

    startGameButton.addEventListener('click', () => {
      void this.play();
    });

    resetGameButton.addEventListener('click', () => {
      this.resetGame();
    });

    const playAgainMainButton = document.getElementById('playAgainMain');
    if (playAgainMainButton) {
      playAgainMainButton.addEventListener('click', () => {
        this.playAgain();
      });
    }

    this.syncGameUiForState();
  }

  async play(): Promise<void> {
    this.transitionGameState(GAME_STATES.RUNNING);
    this.stopActiveTimer();
    this.hideMainPlayAgainButton();
    this.isVirtualInputMode = false;

    this.rowCount = 0;

    const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;
    const wordLengthValue = wordLengthInput?.value ?? '';
    this.wordLength = Number.parseInt(wordLengthValue, 10);

    if (Number.isNaN(this.wordLength) || this.wordLength < 3 || this.wordLength > 10) {
      showAlert(
        {
          variant: 'failure',
          icon: '⚠️',
          title: 'Invalid Input',
          paragraphs: [
            { text: 'Please enter a valid number between 3 and 10' }
          ]
        },
        null,
        () => {
          this.resetGame();
        },
        true
      );
      this.transitionGameState(GAME_STATES.IDLE);
      return;
    }

    updateDifficulty(this.wordLength);

    const pattern = '?'.repeat(this.wordLength);

    try {
      this.possibleWords = await fetchPossibleWords(pattern, this.wordLength);
      const sanitizedWords = this.possibleWords
        .map((word) => sanitizeWord(word, this.wordLength))
        .filter((word) => word.length === this.wordLength);
      this.possibleWords = [...new Set(sanitizedWords)];

      if (!this.possibleWords.length) {
        throw new Error(`No valid words available for length ${this.wordLength}`);
      }

      const targetWord = this.possibleWords[Math.floor(Math.random() * this.possibleWords.length)] ?? '';
      this.session.start({
        targetWord,
        wordLength: this.wordLength,
        startTime: new Date()
      });

      const startedAt = this.session.getStartTime();
      if (startedAt) {
        this.timerController.start(startedAt);
      }

      this.createAlphabetContainer();
      this.keyboardController.show();
      this.createRow();
    } catch (error) {
      logger.error(this.normalizeError(error as Error | string | object | null | undefined), { source: 'GameController.play' });
      this.stopActiveTimer();
      this.transitionGameState(GAME_STATES.IDLE);
      showAlert(
        {
          variant: 'failure',
          icon: '⚠️',
          title: 'Unable To Start Game',
          paragraphs: [
            { text: 'We could not load a valid word list. Please try again.' }
          ]
        },
        null,
        () => {
          this.resetGame();
        },
        true
      );
      return;
    }

    const gameHeader = document.getElementById('gameHeader');
    if (gameHeader) {
      gameHeader.textContent = `Find the ${this.wordLength} letter word ...`;
    }

    createHintButtonsContainer(
      this.wordLength,
      this.getLetterHint.bind(this),
      this.getPositionHint.bind(this),
      () => this.rowCount
    );
  }

  private createAlphabetContainer(): void {
    this.keyboardController.create(this.handleVirtualKeyInput.bind(this));
  }

  private updateAlphabetContainer(guessedLetter: string, letterClass: 'correct' | 'contains' | 'notContains'): void {
    this.keyboardController.updateLetterStatus(guessedLetter, letterClass);
  }

  private getCurrentRowInputs(): HTMLInputElement[] {
    return this.boardController.getCurrentRowInputs();
  }

  private getActiveCurrentRowInput(): HTMLInputElement | null {
    return this.boardController.getActiveCurrentRowInput();
  }

  private handleVirtualLetterInput(letter: string, inputs: HTMLInputElement[]): void {
    const sanitizedLetter = sanitizeSingleLetter(letter);
    if (!sanitizedLetter) {
      return;
    }

    const activeInput = this.getActiveCurrentRowInput();
    let targetInput = activeInput || inputs.find((input) => !input.disabled && input.value === '');

    if (!targetInput) {
      targetInput = inputs.find((input) => !input.disabled);
    }

    if (!targetInput) {
      return;
    }

    targetInput.focus();
    targetInput.value = sanitizedLetter;
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private sanitizeRowInputValues(inputs: HTMLInputElement[]): string[] {
    return this.boardController.sanitizeRowInputValues(inputs);
  }

  private handleVirtualDelete(inputs: HTMLInputElement[]): void {
    const activeInput = this.getActiveCurrentRowInput();

    if (activeInput) {
      if (activeInput.value) {
        activeInput.value = '';
        return;
      }

      const activeIndex = inputs.indexOf(activeInput);
      if (activeIndex > 0) {
        inputs[activeIndex - 1].value = '';
        inputs[activeIndex - 1].focus();
      }
      return;
    }

    const firstEmptyIndex = inputs.findIndex((input) => !input.disabled && input.value === '');
    if (firstEmptyIndex > 0) {
      inputs[firstEmptyIndex - 1].value = '';
      inputs[firstEmptyIndex - 1].focus();
      return;
    }

    const reversed = [...inputs].reverse();
    const lastFilled = reversed.find((input) => !input.disabled && input.value);
    if (lastFilled) {
      lastFilled.value = '';
      lastFilled.focus();
    }
  }

  private handleVirtualArrow(direction: 'arrowleft' | 'arrowright', inputs: HTMLInputElement[]): void {
    const move = direction === 'arrowleft' ? -1 : 1;
    const activeInput = this.getActiveCurrentRowInput();

    if (!activeInput) {
      const fallback = direction === 'arrowleft'
        ? [...inputs].reverse().find((input) => !input.disabled)
        : inputs.find((input) => !input.disabled && input.value === '') || inputs.find((input) => !input.disabled);
      if (fallback) {
        fallback.focus();
      }
      return;
    }

    const activeIndex = inputs.indexOf(activeInput);
    const targetIndex = Math.max(0, Math.min(inputs.length - 1, activeIndex + move));
    const targetInput = inputs[targetIndex];
    if (targetInput) {
      targetInput.focus();
    }
  }

  private async animateCurrentRowSomersault(inputs: HTMLInputElement[]): Promise<void> {
    await this.boardController.animateCurrentRowSomersault(inputs);
  }

  private handleVirtualKeyInput(key: string): void {
    if (!this.boardController.getCurrentRow() || !key || this.gameState !== GAME_STATES.RUNNING) {
      return;
    }

    const inputs = this.getCurrentRowInputs();
    if (inputs.length === 0 || inputs.every((input) => input.disabled)) {
      return;
    }

    const normalizedKey = key.toLowerCase();
    this.enableVirtualInputMode();

    if (/^[a-z]$/.test(normalizedKey)) {
      this.handleVirtualLetterInput(normalizedKey, inputs);
      return;
    }

    if (normalizedKey === 'delete') {
      this.handleVirtualDelete(inputs);
      return;
    }

    if (normalizedKey === 'arrowleft' || normalizedKey === 'arrowright') {
      this.handleVirtualArrow(normalizedKey, inputs);
      return;
    }

    if (normalizedKey === 'enter') {
      void this.checkRowLetters();
    }
  }

  private createRow(): void {
    try {
      this.boardController.createRow(this.wordLength, this.checkRowLetters.bind(this));
    } catch (error) {
      logger.error(this.normalizeError(error as Error | string | object | null | undefined), { source: 'GameController.createRow' });
      return;
    }

    this.rowCount += 1;
    this.enableNativeInputMode();
    this.setupCurrentRowInputMode();

    resetHintButtonStates();
    updateCurrentRow(this.rowCount);
  }

  private async checkRowLetters(): Promise<void> {
    if (!this.boardController.getCurrentRow() || this.gameState !== GAME_STATES.RUNNING) {
      return;
    }

    if (this.isCheckingRow || !this.testIsRowComplete()) {
      return;
    }

    this.isCheckingRow = true;

    try {
      const inputs = this.getCurrentRowInputs();
      const sanitizedLetters = this.sanitizeRowInputValues(inputs);

      await this.animateCurrentRowSomersault(inputs);

      if (sanitizedLetters.some((letter) => !letter)) {
        return;
      }

      const enteredWord = sanitizedLetters.join('');

      const isValidWord = await validateWord(enteredWord);

      if (!isValidWord) {
        const tryAgainCallback = (): void => {
          inputs.forEach((input) => {
            input.value = '';
            input.classList.remove('correct', 'contains', 'notContains', 'row-complete-spin');
          });
          const firstInput = inputs[0];
          if (firstInput) {
            firstInput.focus();
          }
        };

        const resetGameCallback = (): void => {
          this.resetGame();
        };

        showAlert(
          {
            variant: 'invalid',
            icon: '⚠️',
            title: 'Invalid Word',
            paragraphs: [
              { text: `"${enteredWord}" is not a valid English word.` },
              { text: 'Please try again with a valid word.' }
            ]
          },
          tryAgainCallback,
          resetGameCallback
        );
        return;
      }

      const guessResult = this.session.submitGuess(enteredWord);
      const { evaluation } = guessResult;

      this.boardController.applyLetterStates(inputs, evaluation.letterStates);

      for (const [letter, state] of Object.entries(evaluation.keyboardStates)) {
        this.updateAlphabetContainer(letter, state);
      }

      this.boardController.disableInputs(inputs);

      window.setTimeout(() => {
        if (evaluation.isWin) {
          this.gameWon();
        } else if (!guessResult.hasAttemptsRemaining) {
          this.gameLost();
        } else {
          resetHintButtonStates();
          this.createRow();
        }
      }, 100);
    } catch (error) {
      logger.error(this.normalizeError(error as Error | string | object | null | undefined), { source: 'GameController.checkRowLetters' });
      showAlert(
        {
          variant: 'failure',
          icon: '⚠️',
          title: 'Something went wrong',
          paragraphs: [
            { text: 'We could not process this guess. Please try again.' }
          ]
        },
        () => {
          this.playAgain();
        },
        () => {
          this.resetGame();
        }
      );
    } finally {
      this.isCheckingRow = false;
    }
  }

  private testIsRowComplete(): boolean {
    return this.boardController.isCurrentRowComplete();
  }

  private gameWon(): void {
    this.stopActiveTimer();
    this.transitionGameState(GAME_STATES.WON);

    const timeTaken = this.session.getElapsedSeconds();
    const attemptsUsed = this.session.getAttemptsUsed();
    const solvedWord = this.session.getTargetWord();

    this.stats = addStat(this.stats, {
      time: timeTaken,
      word: solvedWord,
      wordLength: this.wordLength,
      attempts: attemptsUsed,
      date: new Date().toISOString()
    });

    this.displayStats();

    showAlert(
      {
        variant: 'success',
        icon: '🎉',
        title: 'Congratulations!',
        paragraphs: [
          { text: `Well done! You solved it in ${timeTaken} seconds with ${attemptsUsed} attempts.` },
          { text: 'The word was: ', emphasis: solvedWord }
        ]
      },
      () => {
        this.playAgain();
      },
      () => {
        this.resetGame();
      },
      false,
      'Play Again',
      'New Game',
      {
        isGameResult: true,
        onClose: () => this.handleGameResultModalClose()
      }
    );
  }

  private gameLost(): void {
    this.stopActiveTimer();
    this.transitionGameState(GAME_STATES.LOST);

    const solvedWord = this.session.getTargetWord();

    showAlert(
      {
        variant: 'failure',
        icon: '😕',
        title: 'Game Over',
        paragraphs: [
          { text: 'Sorry, you\'ve reached the maximum number of attempts.' },
          { text: 'The word was: ', emphasis: solvedWord }
        ]
      },
      () => {
        this.playAgain();
      },
      () => {
        this.resetGame();
      },
      false,
      'Play Again',
      'New Game',
      {
        isGameResult: true,
        onClose: () => this.handleGameResultModalClose()
      }
    );
  }

  displayStats(): void {
    const statsContainer = document.getElementById('statsList');

    if (!statsContainer) {
      logger.error(new Error('Stats container not found'), { source: 'GameController.displayStats' });
      return;
    }

    this.destroyStatsManager();
    statsContainer.innerHTML = '';

    if (!this.stats.length) {
      statsContainer.innerHTML = '<p class="no-stats">No stats yet. Complete a game to see your stats here!</p>';
      return;
    }

    const indexedStats = this.stats.map((stat, index) => ({
      ...stat,
      __originalIndex: index
    }));

    this.statsManager = new StatsManager(statsContainer, indexedStats);
  }

  playAgain(): void {
    this.stopActiveTimer();
    this.hideMainPlayAgainButton();
    this.isVirtualInputMode = false;

    this.boardController.clear();
    resetHintButtons();
    this.keyboardController.clear();
    this.destroyStatsManager();

    this.rowCount = 0;
    this.possibleWords = [];

    this.timerController.hide();

    const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;
    if (wordLengthInput) {
      wordLengthInput.value = String(this.wordLength);
    }

    this.session.clear();
    void this.play();
  }

  resetGame(): void {
    this.stopActiveTimer();
    this.hideMainPlayAgainButton();
    this.isVirtualInputMode = false;

    resetGameUI();
    resetHintButtons();

    this.boardController.clear();
    this.keyboardController.clear();
    this.destroyStatsManager();

    this.rowCount = 0;
    this.wordLength = 0;
    this.possibleWords = [];

    this.session.clear();
    this.timerController.hide();

    this.transitionGameState(GAME_STATES.IDLE);
  }

  destroy(): void {
    this.stopActiveTimer();
    resetHintButtons();
    this.destroyStatsManager();
    this.boardController.clear();
    this.keyboardController.clear();
    this.isVirtualInputMode = false;
  }

  private destroyStatsManager(): void {
    if (!this.statsManager) {
      return;
    }

    this.statsManager.destroy();
    this.statsManager = null;
  }
}

export default GameController;

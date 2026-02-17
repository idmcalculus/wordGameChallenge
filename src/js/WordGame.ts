import { showAlert } from './modals';
import { startTimer, stopTimer } from './utils/timerUtils';
import {
  createAlphabetContainer as renderAlphabetContainer,
  createRow as buildRow,
  resetGameUI,
  updateAlphabetContainer as renderAlphabetStatus,
  updateDifficulty
} from './uiHandler';
import { fetchPossibleWords, validateWord } from './apiHandler';
import {
  createHintButtonsContainer,
  resetHintButtons,
  resetHintButtonStates,
  updateCurrentRow
} from './hintHandler';
import { StatsManager } from './components/StatsManager';
import { logger } from './utils/logger';
import { evaluateGuess } from './core/gameEngine';
import { addStat, loadStats } from './repositories/statsRepository';
import { getAvailableLetterHints, getAvailablePositionHints, pickRandom } from './core/hintEngine';
import { createGameStateMachine, GAME_STATES } from './core/gameStateMachine';
import type { GameState, LetterState } from './types/types';
import type { GameStateMachine, StatEntry } from './types/interface';

interface PreviousRowsLetterInfo {
  correctPositions: Record<number, string>;
  usedLetters: Set<string>;
  incorrectPositions: Set<string>;
  revealedLetters: string[];
}

class WordGame {
  private possibleWords: string[];
  private readonly alphabet: string[];
  private currentWord: string;
  private currentRow: HTMLDivElement | null;
  private attempts: number;
  private rowCount: number;
  private readonly maximumAttempts: number;
  private wordLength: number;
  private startTime: Date | null;
  private timerDisplay: HTMLElement | null;
  private timerId: number | null;
  private isCheckingRow: boolean;
  private readonly isTouchDevice: boolean;
  private isVirtualInputMode: boolean;
  private readonly gameStateMachine: GameStateMachine;
  private gameState: GameState;
  private stats: StatEntry[];

  constructor() {
    this.possibleWords = [];
    this.alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    this.currentWord = '';
    this.currentRow = null;
    this.attempts = 0;
    this.rowCount = 0;
    this.maximumAttempts = 5;
    this.wordLength = 0;
    this.startTime = null;
    this.timerDisplay = null;
    this.timerId = null;
    this.isCheckingRow = false;
    this.isTouchDevice = this.detectTouchDevice();
    this.isVirtualInputMode = false;
    this.gameStateMachine = createGameStateMachine(GAME_STATES.IDLE);
    this.gameState = this.gameStateMachine.getState();
    this.stats = loadStats();

    this.init();
  }

  /**
   * Provides a hint for a letter that exists in the word (may not be in correct position)
   */
  getLetterHint(): void {
    if (!this.currentWord || !this.currentRow || this.gameState !== GAME_STATES.RUNNING) {
      return;
    }

    const previousRowsInfo = this.getPreviousRowsLetterInfo();
    const hintLetter = pickRandom(getAvailableLetterHints(this.currentWord, previousRowsInfo));
    if (!hintLetter) {
      return;
    }

    const container = document.getElementById('alphabetContainer');
    if (container && !container.classList.contains('visible')) {
      container.classList.add('visible');
    }

    this.updateAlphabetContainer(hintLetter, 'contains');
  }

  /**
   * Provides a hint for a letter in its correct position.
   */
  getPositionHint(): void {
    if (!this.currentWord || !this.currentRow || this.gameState !== GAME_STATES.RUNNING) {
      return;
    }

    const inputs = this.getCurrentRowInputs();
    const previousRowsInfo = this.getPreviousRowsLetterInfo();
    const currentRowLetters = inputs.map((input) => input.value.toLowerCase());
    const targetPosition = pickRandom(getAvailablePositionHints({
      targetWord: this.currentWord,
      currentRowLetters,
      correctPositions: previousRowsInfo.correctPositions
    }));

    if (targetPosition === null) {
      return;
    }

    const targetInput = inputs[targetPosition];
    if (!targetInput) {
      return;
    }

    targetInput.value = this.currentWord[targetPosition];
    targetInput.classList.add('hint-provided');
    window.setTimeout(() => targetInput.classList.remove('hint-provided'), 2000);
  }

  /**
   * Gets information about letters used in previous rows.
   */
  getPreviousRowsLetterInfo(): PreviousRowsLetterInfo {
    const letterInfo: PreviousRowsLetterInfo = {
      correctPositions: {},
      usedLetters: new Set<string>(),
      incorrectPositions: new Set<string>(),
      revealedLetters: []
    };

    const alphabetContainer = document.getElementById('alphabetContainer');
    if (alphabetContainer) {
      const alphabetLetters = alphabetContainer.querySelectorAll<HTMLElement>('.alphabet-grid .keyboard-key[data-letter]');
      alphabetLetters.forEach((letterKey) => {
        const letter = letterKey.dataset.letter;
        if (!letter) {
          return;
        }

        if (letterKey.classList.contains('contains')) {
          letterInfo.incorrectPositions.add(letter);
          letterInfo.usedLetters.add(letter);
          letterInfo.revealedLetters.push(letter);
        } else if (letterKey.classList.contains('correct')) {
          letterInfo.usedLetters.add(letter);
          letterInfo.revealedLetters.push(letter);
        } else if (letterKey.classList.contains('notContains')) {
          letterInfo.usedLetters.add(letter);
        }
      });
    }

    const rows = document.querySelectorAll<HTMLDivElement>('.wrapper .wordRow');
    const currentRowIndex = this.currentRow ? Array.from(rows).indexOf(this.currentRow) : -1;

    for (let rowIndex = 0; rowIndex < currentRowIndex; rowIndex++) {
      const row = rows[rowIndex];
      const inputs = Array.from(row.getElementsByTagName('input')) as HTMLInputElement[];

      inputs.forEach((input, position) => {
        if (!input.value) {
          return;
        }

        const letter = input.value.toLowerCase();
        letterInfo.usedLetters.add(letter);
        letterInfo.revealedLetters.push(letter);

        if (letter === this.currentWord[position]?.toLowerCase()) {
          letterInfo.correctPositions[position] = letter;
        } else if (this.currentWord.toLowerCase().includes(letter)) {
          letterInfo.incorrectPositions.add(letter);
        }
      });
    }

    return letterInfo;
  }

  /**
   * Gets letters used in the current row.
   */
  getCurrentRowLetters(): string[] {
    if (!this.currentRow) {
      return [];
    }

    const rowLetters: string[] = [];
    const inputs = this.getCurrentRowInputs();

    inputs.forEach((input) => {
      if (input.value && input.value.trim() !== '') {
        rowLetters.push(input.value.toLowerCase());
      }
    });

    return rowLetters;
  }

  /**
   * Logs the current state of the game for debugging.
   */
  logGameState(): void {
    logger.debug('Current word:', this.currentWord);
    logger.debug('Current row count:', this.rowCount);

    const rows = document.querySelectorAll<HTMLDivElement>('.wrapper .wordRow');
    rows.forEach((row, index) => {
      const inputs = Array.from(row.getElementsByTagName('input')) as HTMLInputElement[];
      const values = inputs.map((input) => input.value || '_').join('');
      logger.debug(`Row ${index + 1}: ${values}`);
    });
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
    if (this.timerId !== null) {
      stopTimer(this.timerId);
      this.timerId = null;
    }
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
        source: 'WordGame.transitionGameState',
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
    if (!this.isTouchDevice || !this.currentRow) {
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
    if (!this.currentRow) {
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
      this.focusFirstInputOfCurrentRow();
    }
  }

  private focusFirstInputOfCurrentRow(): void {
    if (!this.currentRow) {
      return;
    }

    const inputs = this.getCurrentRowInputs().filter((input) => !input.disabled);
    if (inputs.length === 0) {
      return;
    }

    const firstInput = inputs[0];
    window.setTimeout(() => {
      if (!this.currentRow || !this.currentRow.contains(firstInput) || firstInput.disabled) {
        return;
      }

      firstInput.focus();
      if (typeof firstInput.setSelectionRange === 'function') {
        firstInput.setSelectionRange(firstInput.value.length, firstInput.value.length);
      }
    }, 0);
  }

  private setupCurrentRowInputMode(): void {
    if (!this.currentRow || !this.isTouchDevice) {
      return;
    }

    this.getCurrentRowInputs().forEach((input) => {
      const handleTouchInputIntent = (): void => {
        if (!this.currentRow || !this.currentRow.contains(input)) {
          return;
        }

        this.enableNativeInputMode({ preserveFocus: true });
      };

      input.addEventListener('pointerdown', handleTouchInputIntent);
      input.addEventListener('touchstart', handleTouchInputIntent, { passive: true });
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

    if (!wordLengthInput || !startGameButton || !resetGameButton) {
      logger.error(new Error('Missing required game controls'), { source: 'WordGame.init' });
      return;
    }

    wordLengthInput.value = '3';

    wordLengthInput.addEventListener('blur', () => {
      const value = Number.parseInt(wordLengthInput.value, 10);

      if (Number.isNaN(value)) {
        wordLengthInput.value = '3';
      } else if (value < 3) {
        wordLengthInput.value = '3';
      } else if (value > 10) {
        wordLengthInput.value = '10';
      }
    });

    wordLengthInput.addEventListener('keyup', (event: KeyboardEvent) => {
      if (wordLengthInput.value === '') {
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        return;
      }

      const value = Number.parseInt(wordLengthInput.value, 10);
      if (value > 10) {
        wordLengthInput.value = '10';
      }
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
    this.attempts = 0;

    const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;
    const wordLengthValue = wordLengthInput?.value ?? '';
    this.wordLength = Number.parseInt(wordLengthValue, 10);

    if (Number.isNaN(this.wordLength) || this.wordLength < 3 || this.wordLength > 10) {
      showAlert(
        `<div class="failure-alert">
        <span class="alert-icon">⚠️</span>
        <h3>Invalid Input</h3>
        <p>Please enter a valid number between 3 and 10</p>
      </div>`,
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
      if (!this.possibleWords.length) {
        throw new Error(`No valid words available for length ${this.wordLength}`);
      }

      this.currentWord = this.possibleWords[Math.floor(Math.random() * this.possibleWords.length)];

      this.startTime = new Date();
      this.timerDisplay = document.getElementById('timerDisplay');
      if (this.timerDisplay) {
        this.timerId = startTimer(this.startTime, this.timerDisplay);
      }

      this.createAlphabetContainer();

      const container = document.getElementById('alphabetContainer');
      if (container) {
        container.style.display = '';
        container.classList.add('visible');
      }

      this.createRow();
    } catch (error) {
      logger.error(this.normalizeError(error as Error | string | object | null | undefined), { source: 'WordGame.play' });
      this.stopActiveTimer();
      this.transitionGameState(GAME_STATES.IDLE);
      showAlert(
        `<div class="failure-alert">
        <span class="alert-icon">⚠️</span>
        <h3>Unable To Start Game</h3>
        <p>We could not load a valid word list. Please try again.</p>
      </div>`,
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
      gameHeader.innerHTML = `Find the ${this.wordLength} letter word ...`;
    }

    createHintButtonsContainer(
      this.wordLength,
      this.getLetterHint.bind(this),
      this.getPositionHint.bind(this),
      () => this.rowCount
    );
  }

  private createAlphabetContainer(): void {
    renderAlphabetContainer(this.alphabet, this.handleVirtualKeyInput.bind(this));
  }

  private updateAlphabetContainer(guessedLetter: string, letterClass: LetterState): void {
    const container = document.getElementById('alphabetContainer');
    if (container && !container.classList.contains('visible')) {
      container.classList.add('visible');
    }

    renderAlphabetStatus(guessedLetter, letterClass);
  }

  private getCurrentRowInputs(): HTMLInputElement[] {
    if (!this.currentRow) {
      return [];
    }

    return Array.from(this.currentRow.querySelectorAll<HTMLInputElement>('input.wordLetterBox'));
  }

  private getActiveCurrentRowInput(): HTMLInputElement | null {
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLInputElement &&
      activeElement.classList.contains('wordLetterBox') &&
      activeElement.closest('.wordRow') === this.currentRow &&
      !activeElement.disabled
    ) {
      return activeElement;
    }

    return null;
  }

  private handleVirtualLetterInput(letter: string, inputs: HTMLInputElement[]): void {
    const activeInput = this.getActiveCurrentRowInput();
    let targetInput = activeInput || inputs.find((input) => !input.disabled && input.value === '');

    if (!targetInput) {
      targetInput = inputs.find((input) => !input.disabled);
    }

    if (!targetInput) {
      return;
    }

    targetInput.focus();
    targetInput.value = letter;
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
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
    if (!this.currentRow || inputs.length === 0) {
      return;
    }

    this.currentRow.classList.remove('row-somersaulting');

    inputs.forEach((input) => {
      input.classList.remove('row-complete-spin');
    });

    void inputs[0].offsetWidth;
    this.currentRow.classList.add('row-somersaulting');
    inputs.forEach((input) => input.classList.add('row-complete-spin'));

    const spinDuration = 720;
    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), spinDuration);
    });

    this.currentRow.classList.remove('row-somersaulting');
    inputs.forEach((input) => {
      input.classList.remove('row-complete-spin');
    });
  }

  private handleVirtualKeyInput(key: string): void {
    if (!this.currentRow || !key || this.gameState !== GAME_STATES.RUNNING) {
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
    this.currentRow = buildRow(this.wordLength, this.checkRowLetters.bind(this));
    const wrapper = document.querySelector<HTMLElement>('.wrapper');
    if (!wrapper) {
      logger.error(new Error('Game wrapper not found'), { source: 'WordGame.createRow' });
      return;
    }

    wrapper.appendChild(this.currentRow);
    this.rowCount += 1;
    this.enableNativeInputMode();
    this.setupCurrentRowInputMode();

    resetHintButtonStates();
    updateCurrentRow(this.rowCount);
  }

  private async checkRowLetters(): Promise<void> {
    if (!this.currentRow || this.gameState !== GAME_STATES.RUNNING) {
      return;
    }

    if (this.isCheckingRow || !this.testIsRowComplete()) {
      return;
    }

    this.isCheckingRow = true;

    try {
      const inputs = this.getCurrentRowInputs();

      await this.animateCurrentRowSomersault(inputs);

      const enteredWord = inputs.map((input) => input.value).join('');

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
          `<div class="invalid-word-alert">
        <span class="alert-icon">⚠️</span>
        <h3>Invalid Word</h3>
        <p>"${enteredWord}" is not a valid English word.</p>
        <p>Please try again with a valid word.</p>
      </div>`,
          tryAgainCallback,
          resetGameCallback
        );
        return;
      }

      const { letterStates, keyboardStates, totalCorrect } = evaluateGuess(this.currentWord, enteredWord);

      for (let index = 0; index < this.wordLength; index++) {
        const inputBox = inputs[index];
        const nextState = letterStates[index];
        if (!inputBox || !nextState) {
          continue;
        }

        inputBox.classList.remove('correct', 'contains', 'notContains', 'hint-provided');
        inputBox.classList.add(nextState);
      }

      for (const [letter, state] of Object.entries(keyboardStates)) {
        this.updateAlphabetContainer(letter, state);
      }

      inputs.forEach((input) => {
        input.disabled = true;
      });

      window.setTimeout(() => {
        if (totalCorrect === this.wordLength) {
          this.gameWon();
        } else if (this.rowCount >= this.maximumAttempts) {
          this.gameLost();
        } else {
          resetHintButtonStates();
          this.createRow();
        }
      }, 100);
    } finally {
      this.isCheckingRow = false;
    }
  }

  private testIsRowComplete(): boolean {
    if (!this.currentRow) {
      return false;
    }

    return this.getCurrentRowInputs().every((input) => input.value !== '');
  }

  private gameWon(): void {
    this.stopActiveTimer();
    this.transitionGameState(GAME_STATES.WON);

    const startedAt = this.startTime?.getTime() ?? Date.now();
    const timeTaken = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));

    this.stats = addStat(this.stats, {
      time: timeTaken,
      word: this.currentWord,
      wordLength: this.wordLength,
      attempts: this.rowCount,
      date: new Date().toISOString()
    });

    this.displayStats();

    showAlert(
      `<div class="success-alert">
      <span class="alert-icon">🎉</span>
      <h3>Congratulations!</h3>
      <p>Well done! You solved it in ${timeTaken} seconds with ${this.rowCount} attempts.</p>
      <p>The word was: <strong>${this.currentWord}</strong></p>
    </div>`,
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

    showAlert(
      `<div class="failure-alert">
      <span class="alert-icon">😕</span>
      <h3>Game Over</h3>
      <p>Sorry, you've reached the maximum number of attempts.</p>
      <p>The word was: <strong>${this.currentWord}</strong></p>
    </div>`,
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
      logger.error(new Error('Stats container not found'), { source: 'WordGame.displayStats' });
      return;
    }

    statsContainer.innerHTML = '';

    if (!this.stats.length) {
      statsContainer.innerHTML = '<p class="no-stats">No stats yet. Complete a game to see your stats here!</p>';
      return;
    }

    const indexedStats = this.stats.map((stat, index) => ({
      ...stat,
      __originalIndex: index
    }));

    new StatsManager(statsContainer, indexedStats);
  }

  playAgain(): void {
    this.stopActiveTimer();
    this.hideMainPlayAgainButton();
    this.isVirtualInputMode = false;

    const wrapper = document.getElementById('wrapper');
    if (wrapper) {
      wrapper.innerHTML = '';
    }

    resetHintButtons();

    const alphabetContainer = document.getElementById('alphabetContainer');
    if (alphabetContainer) {
      alphabetContainer.innerHTML = '';
      alphabetContainer.classList.remove('visible');
      alphabetContainer.style.display = 'none';
    }

    this.rowCount = 0;
    this.currentWord = '';
    this.possibleWords = [];

    if (this.timerDisplay) {
      this.timerDisplay.style.display = 'none';
    }

    const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;
    if (wordLengthInput) {
      wordLengthInput.value = String(this.wordLength);
    }

    void this.play();
  }

  resetGame(): void {
    this.stopActiveTimer();
    this.hideMainPlayAgainButton();
    this.isVirtualInputMode = false;

    resetGameUI();
    resetHintButtons();
    this.rowCount = 0;
    this.currentWord = '';
    this.wordLength = 0;
    this.possibleWords = [];

    if (this.timerDisplay) {
      this.timerDisplay.style.display = 'none';
    }

    this.transitionGameState(GAME_STATES.IDLE);
  }
}

export default WordGame;

// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    showAlert: vi.fn(),
    resetGameUI: vi.fn(),
    updateDifficulty: vi.fn(),
    fetchPossibleWords: vi.fn<(...args: unknown[]) => Promise<string[]>>(),
    validateWord: vi.fn<(...args: unknown[]) => Promise<boolean>>(),
    createHintButtonsContainer: vi.fn(),
    resetHintButtons: vi.fn(),
    resetHintButtonStates: vi.fn(),
    updateCurrentRow: vi.fn(),
    loggerError: vi.fn(),
    loggerWarn: vi.fn(),
    addStat: vi.fn(),
    loadStats: vi.fn<() => Array<{ word: string; time: number; attempts: number; wordLength: number; date: string }>>(),
    pickRandom: vi.fn(),
    sanitizeSingleLetter: vi.fn<(value: string) => string>(),
    sanitizeWord: vi.fn<(value: string, wordLength: number) => string>(),
    statsManagerDestroy: vi.fn(),
    boardThrowOnCreate: false,
    boardCurrentRow: null as HTMLDivElement | null,
    boardInputs: [] as HTMLInputElement[],
    boardActiveInput: null as HTMLInputElement | null,
    boardRowComplete: true,
    boardCreateRow: vi.fn(),
    boardAttachTouchIntentHandler: vi.fn(),
    boardApplyLetterStates: vi.fn(),
    boardDisableInputs: vi.fn(),
    boardAnimateCurrentRowSomersault: vi.fn(),
    boardClear: vi.fn(),
    keyboardCreate: vi.fn(),
    keyboardShow: vi.fn(),
    keyboardClear: vi.fn(),
    keyboardUpdate: vi.fn(),
    timerBindDisplay: vi.fn(),
    timerStart: vi.fn(),
    timerStop: vi.fn(),
    timerHide: vi.fn(),
    sessionActive: true,
    sessionTargetWord: 'apex',
    sessionStartTime: new Date('2026-01-01T00:00:00.000Z') as Date | null,
    sessionElapsedSeconds: 22,
    sessionAttemptsUsed: 3,
    sessionAvailableLetterHints: ['a', 'p'],
    sessionAvailablePositionHints: [1],
    sessionSubmitGuess: vi.fn(),
    sessionRegisterLetterHint: vi.fn(),
    sessionClear: vi.fn()
  };
});

vi.mock('../../modals', () => ({
  showAlert: (...args: unknown[]): void => {
    mocks.showAlert(...args);
  }
}));

vi.mock('../../uiHandler', () => ({
  resetGameUI: (): void => {
    mocks.resetGameUI();
  },
  updateDifficulty: (wordLength: number): void => {
    mocks.updateDifficulty(wordLength);
  }
}));

vi.mock('../../apiHandler', () => ({
  fetchPossibleWords: (...args: unknown[]): Promise<string[]> => mocks.fetchPossibleWords(...args),
  validateWord: (...args: unknown[]): Promise<boolean> => mocks.validateWord(...args)
}));

vi.mock('../../hintHandler', () => ({
  createHintButtonsContainer: (...args: unknown[]): void => {
    mocks.createHintButtonsContainer(...args);
  },
  resetHintButtons: (): void => {
    mocks.resetHintButtons();
  },
  resetHintButtonStates: (): void => {
    mocks.resetHintButtonStates();
  },
  updateCurrentRow: (row: number): void => {
    mocks.updateCurrentRow(row);
  }
}));

vi.mock('../../components/StatsManager', () => ({
  StatsManager: class MockStatsManager {
    destroy(): void {
      mocks.statsManagerDestroy();
    }
  }
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    error: (...args: unknown[]): void => {
      mocks.loggerError(...args);
    },
    warn: (...args: unknown[]): void => {
      mocks.loggerWarn(...args);
    }
  }
}));

vi.mock('../../repositories/statsRepository', () => ({
  addStat: (...args: unknown[]): Array<{ word: string; time: number; attempts: number; wordLength: number; date: string }> => {
    return mocks.addStat(...args);
  },
  loadStats: (): Array<{ word: string; time: number; attempts: number; wordLength: number; date: string }> => {
    return mocks.loadStats();
  }
}));

vi.mock('../../core/hintEngine', () => ({
  pickRandom: (...args: unknown[]): unknown => mocks.pickRandom(...args)
}));

vi.mock('../../utils/inputSanitizer', () => ({
  sanitizeSingleLetter: (value: string): string => mocks.sanitizeSingleLetter(value),
  sanitizeWord: (value: string, wordLength: number): string => mocks.sanitizeWord(value, wordLength)
}));

vi.mock('../BoardController', () => ({
  BoardController: class MockBoardController {
    createRow(wordLength: number, onRowInput: () => void): HTMLDivElement {
      mocks.boardCreateRow(wordLength, onRowInput);
      if (mocks.boardThrowOnCreate) {
        throw new Error('create row fail');
      }

      const row = document.createElement('div');
      row.className = 'wordRow';
      const inputs: HTMLInputElement[] = [];
      for (let index = 0; index < wordLength; index++) {
        const input = document.createElement('input');
        input.className = 'wordLetterBox';
        inputs.push(input);
        row.appendChild(input);
      }
      const wrapper = document.querySelector('.wrapper');
      wrapper?.appendChild(row);
      mocks.boardCurrentRow = row;
      mocks.boardInputs = inputs;
      mocks.boardActiveInput = inputs[0] ?? null;
      return row;
    }

    getCurrentRow(): HTMLDivElement | null {
      return mocks.boardCurrentRow;
    }

    getCurrentRowInputs(): HTMLInputElement[] {
      return mocks.boardInputs;
    }

    getActiveCurrentRowInput(): HTMLInputElement | null {
      return mocks.boardActiveInput;
    }

    focusFirstInput(): void {
      const firstInput = mocks.boardInputs[0];
      firstInput?.focus();
    }

    attachTouchIntentHandler(onTouchIntent: () => void): void {
      mocks.boardAttachTouchIntentHandler(onTouchIntent);
    }

    sanitizeRowInputValues(inputs: HTMLInputElement[]): string[] {
      return inputs.map((input) => mocks.sanitizeSingleLetter(input.value));
    }

    isCurrentRowComplete(): boolean {
      return mocks.boardRowComplete;
    }

    applyLetterStates(inputs: HTMLInputElement[], letterStates: string[]): void {
      mocks.boardApplyLetterStates(inputs, letterStates);
    }

    disableInputs(inputs: HTMLInputElement[]): void {
      mocks.boardDisableInputs(inputs);
      inputs.forEach((input) => {
        input.disabled = true;
      });
    }

    async animateCurrentRowSomersault(inputs: HTMLInputElement[]): Promise<void> {
      mocks.boardAnimateCurrentRowSomersault(inputs);
    }

    clear(): void {
      mocks.boardClear();
      const wrapper = document.querySelector('.wrapper');
      if (wrapper) {
        wrapper.innerHTML = '';
      }
      mocks.boardCurrentRow = null;
      mocks.boardInputs = [];
      mocks.boardActiveInput = null;
    }
  }
}));

vi.mock('../KeyboardController', () => ({
  KeyboardController: class MockKeyboardController {
    create(onInput: (key: string) => void): void {
      mocks.keyboardCreate(onInput);
    }

    show(): void {
      mocks.keyboardShow();
    }

    clear(): void {
      mocks.keyboardClear();
    }

    updateLetterStatus(letter: string, letterClass: string): void {
      mocks.keyboardUpdate(letter, letterClass);
    }
  }
}));

vi.mock('../TimerController', () => ({
  TimerController: class MockTimerController {
    bindDisplay(display: Element | null): void {
      mocks.timerBindDisplay(display);
    }

    start(startTime: Date): void {
      mocks.timerStart(startTime);
    }

    stop(): void {
      mocks.timerStop();
    }

    hide(): void {
      mocks.timerHide();
    }
  }
}));

vi.mock('../../core/gameSession', () => ({
  GameSession: class MockGameSession {
    constructor(_maxAttempts: number) {}

    isActive(): boolean {
      return mocks.sessionActive;
    }

    getAvailableLetterHints(): string[] {
      return mocks.sessionAvailableLetterHints;
    }

    registerLetterHint(letter: string, state: 'contains'): void {
      mocks.sessionRegisterLetterHint(letter, state);
    }

    getAvailablePositionHints(_letters: string[]): number[] {
      return mocks.sessionAvailablePositionHints;
    }

    getTargetWord(): string {
      return mocks.sessionTargetWord;
    }

    start(config: { targetWord: string; wordLength: number; startTime?: Date }): void {
      mocks.sessionTargetWord = config.targetWord;
      mocks.sessionStartTime = config.startTime ?? null;
    }

    getStartTime(): Date | null {
      return mocks.sessionStartTime;
    }

    submitGuess(enteredWord: string): {
      evaluation: {
        letterStates: Array<'correct' | 'contains' | 'notContains'>;
        keyboardStates: Record<string, 'correct' | 'contains' | 'notContains'>;
        isWin: boolean;
      };
      hasAttemptsRemaining: boolean;
    } {
      return mocks.sessionSubmitGuess(enteredWord);
    }

    getElapsedSeconds(): number {
      return mocks.sessionElapsedSeconds;
    }

    getAttemptsUsed(): number {
      return mocks.sessionAttemptsUsed;
    }

    clear(): void {
      mocks.sessionClear();
    }
  }
}));

import GameController from '../GameController';

function setupDom(): void {
  document.body.innerHTML = `
    <h1 id="gameHeader">Find the word ...</h1>
    <div class="wordLengthInputContainer"><input id="wordLengthInput" /></div>
    <button id="startGame" type="button"></button>
    <button id="resetGame" type="button"></button>
    <button id="playAgainMain" type="button"></button>
    <div id="timerDisplay"></div>
    <div id="difficulty"></div>
    <div id="statsList"></div>
    <div class="wrapper"></div>
  `;
}

function resetMockState(): void {
  mocks.showAlert.mockReset();
  mocks.resetGameUI.mockReset();
  mocks.updateDifficulty.mockReset();
  mocks.fetchPossibleWords.mockReset();
  mocks.validateWord.mockReset();
  mocks.createHintButtonsContainer.mockReset();
  mocks.resetHintButtons.mockReset();
  mocks.resetHintButtonStates.mockReset();
  mocks.updateCurrentRow.mockReset();
  mocks.loggerError.mockReset();
  mocks.loggerWarn.mockReset();
  mocks.addStat.mockReset();
  mocks.loadStats.mockReset();
  mocks.pickRandom.mockReset();
  mocks.sanitizeSingleLetter.mockReset();
  mocks.sanitizeWord.mockReset();
  mocks.statsManagerDestroy.mockReset();
  mocks.boardCreateRow.mockReset();
  mocks.boardAttachTouchIntentHandler.mockReset();
  mocks.boardApplyLetterStates.mockReset();
  mocks.boardDisableInputs.mockReset();
  mocks.boardAnimateCurrentRowSomersault.mockReset();
  mocks.boardClear.mockReset();
  mocks.keyboardCreate.mockReset();
  mocks.keyboardShow.mockReset();
  mocks.keyboardClear.mockReset();
  mocks.keyboardUpdate.mockReset();
  mocks.timerBindDisplay.mockReset();
  mocks.timerStart.mockReset();
  mocks.timerStop.mockReset();
  mocks.timerHide.mockReset();
  mocks.sessionSubmitGuess.mockReset();
  mocks.sessionRegisterLetterHint.mockReset();
  mocks.sessionClear.mockReset();

  mocks.boardThrowOnCreate = false;
  mocks.boardCurrentRow = null;
  mocks.boardInputs = [];
  mocks.boardActiveInput = null;
  mocks.boardRowComplete = true;
  mocks.sessionActive = true;
  mocks.sessionTargetWord = 'apex';
  mocks.sessionStartTime = new Date('2026-01-01T00:00:00.000Z');
  mocks.sessionElapsedSeconds = 22;
  mocks.sessionAttemptsUsed = 3;
  mocks.sessionAvailableLetterHints = ['a', 'p'];
  mocks.sessionAvailablePositionHints = [1];
  mocks.loadStats.mockReturnValue([]);
  mocks.addStat.mockImplementation((stats: unknown[], stat: unknown) => [...stats, stat] as Array<{
    word: string; time: number; attempts: number; wordLength: number; date: string;
  }>);
  mocks.pickRandom.mockImplementation((values: unknown[]) => values[0] ?? null);
  mocks.sanitizeSingleLetter.mockImplementation((value: string) => {
    const normalized = value.trim().toLowerCase();
    return /^[a-z]$/.test(normalized) ? normalized : '';
  });
  mocks.sanitizeWord.mockImplementation((value: string, wordLength: number) =>
    value.toLowerCase().replace(/[^a-z]/g, '').slice(0, wordLength)
  );
  mocks.fetchPossibleWords.mockResolvedValue(['apex', 'ally']);
  mocks.validateWord.mockResolvedValue(true);
  mocks.sessionSubmitGuess.mockReturnValue({
    evaluation: {
      letterStates: ['correct', 'correct', 'correct', 'correct'],
      keyboardStates: { a: 'correct', p: 'correct', e: 'correct', x: 'correct' },
      isWin: true
    },
    hasAttemptsRemaining: true
  });
}

describe('GameController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupDom();
    resetMockState();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  });

  it('initializes controls and starts a game successfully', async () => {
    const controller = new GameController();
    const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;
    expect(wordLengthInput?.value).toBe('3');
    expect((document.getElementById('startGame') as HTMLButtonElement | null)?.disabled).toBe(false);

    await controller.play();

    expect(mocks.updateDifficulty).toHaveBeenCalledWith(3);
    expect(mocks.fetchPossibleWords).toHaveBeenCalledWith('???', 3);
    expect(mocks.keyboardCreate).toHaveBeenCalledTimes(1);
    expect(mocks.keyboardShow).toHaveBeenCalledTimes(1);
    expect(mocks.boardCreateRow).toHaveBeenCalledTimes(1);
    expect(mocks.timerStart).toHaveBeenCalledTimes(1);
    expect(mocks.createHintButtonsContainer).toHaveBeenCalledTimes(1);
    expect(document.getElementById('gameHeader')?.textContent).toContain('3 letter word');
  });

  it('shows invalid input alert when word length is not set', async () => {
    const controller = new GameController();
    const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;
    if (wordLengthInput) {
      wordLengthInput.value = '';
    }

    await controller.play();

    expect(mocks.showAlert).toHaveBeenCalled();
    const firstAlert = mocks.showAlert.mock.calls[0];
    expect(firstAlert?.[0]).toMatchObject({ title: 'Invalid Input' });
  });

  it('handles play failure when no words are returned', async () => {
    const controller = new GameController();
    mocks.fetchPossibleWords.mockResolvedValue([]);

    await controller.play();

    expect(mocks.loggerError).toHaveBeenCalled();
    const firstAlert = mocks.showAlert.mock.calls[0];
    expect(firstAlert?.[0]).toMatchObject({ title: 'Unable To Start Game' });
  });

  it('supports virtual key input paths for letter, delete, arrows and enter', async () => {
    const controller = new GameController();
    await controller.play();

    const instance = controller as unknown as {
      handleVirtualKeyInput: (key: string) => void;
      checkRowLetters: () => Promise<void>;
      gameState: string;
    };
    instance.gameState = 'running';

    const inputs = mocks.boardInputs;
    const first = inputs[0];
    const second = inputs[1];
    if (!first || !second) {
      return;
    }

    mocks.boardActiveInput = first;
    instance.handleVirtualKeyInput('a');
    expect(first.value).toBe('a');

    mocks.boardActiveInput = second;
    second.value = 'b';
    instance.handleVirtualKeyInput('delete');
    expect(second.value).toBe('');

    mocks.boardActiveInput = second;
    instance.handleVirtualKeyInput('arrowleft');
    expect(document.activeElement).toBe(first);

    const checkSpy = vi.spyOn(instance, 'checkRowLetters');
    instance.handleVirtualKeyInput('enter');
    expect(checkSpy).toHaveBeenCalled();
  });

  it('shows invalid-word alert path from row checking and executes callbacks', async () => {
    const controller = new GameController();
    await controller.play();

    mocks.validateWord.mockResolvedValue(false);
    mocks.boardInputs.forEach((input, index) => {
      input.value = ['a', 'p', 'e'][index] ?? 'x';
    });

    const instance = controller as unknown as {
      gameState: string;
      checkRowLetters: () => Promise<void>;
    };
    instance.gameState = 'running';

    await instance.checkRowLetters();
    expect(mocks.showAlert).toHaveBeenCalled();
    const [, tryAgainCallback, resetCallback] = mocks.showAlert.mock.calls.at(-1) ?? [];
    expect(typeof tryAgainCallback).toBe('function');
    expect(typeof resetCallback).toBe('function');
    (tryAgainCallback as (() => void))();
    expect(mocks.boardInputs.every((input) => input.value === '')).toBe(true);
  });

  it('handles winning outcome and updates stats flow', async () => {
    const controller = new GameController();
    await controller.play();

    const instance = controller as unknown as {
      gameState: string;
      checkRowLetters: () => Promise<void>;
    };
    instance.gameState = 'running';
    mocks.boardInputs.forEach((input) => {
      input.value = 'a';
    });

    mocks.sessionSubmitGuess.mockReturnValue({
      evaluation: {
        letterStates: ['correct', 'correct', 'correct'],
        keyboardStates: { a: 'correct' },
        isWin: true
      },
      hasAttemptsRemaining: true
    });

    await instance.checkRowLetters();
    vi.advanceTimersByTime(120);
    expect(mocks.addStat).toHaveBeenCalled();
    expect(mocks.showAlert.mock.calls.some((call) => call[0]?.title === 'Congratulations!')).toBe(true);
  });

  it('handles losing outcome and shows game over alert', async () => {
    const controller = new GameController();
    await controller.play();

    const instance = controller as unknown as {
      gameState: string;
      checkRowLetters: () => Promise<void>;
    };
    instance.gameState = 'running';
    mocks.boardInputs.forEach((input) => {
      input.value = 'z';
    });

    mocks.sessionSubmitGuess.mockReturnValue({
      evaluation: {
        letterStates: ['notContains', 'notContains', 'notContains'],
        keyboardStates: { z: 'notContains' },
        isWin: false
      },
      hasAttemptsRemaining: false
    });
    await instance.checkRowLetters();
    vi.advanceTimersByTime(120);
    expect(mocks.showAlert.mock.calls.some((call) => call[0]?.title === 'Game Over')).toBe(true);
  });

  it('covers hint generation branches for letter and position hints', async () => {
    const controller = new GameController();
    const instance = controller as unknown as {
      gameState: string;
      getLetterHint: () => void;
      getPositionHint: () => void;
    };

    // Inactive session or missing row should no-op.
    mocks.sessionActive = false;
    instance.gameState = 'running';
    instance.getLetterHint();
    expect(mocks.sessionRegisterLetterHint).not.toHaveBeenCalled();

    mocks.sessionActive = true;
    mocks.boardCurrentRow = null;
    instance.getPositionHint();
    expect(mocks.pickRandom).not.toHaveBeenCalled();

    await controller.play();
    instance.gameState = 'running';

    // No hint available.
    mocks.pickRandom.mockReturnValueOnce(null);
    instance.getLetterHint();
    expect(mocks.sessionRegisterLetterHint).not.toHaveBeenCalled();

    // Letter hint available.
    mocks.pickRandom.mockReturnValueOnce('p');
    instance.getLetterHint();
    expect(mocks.sessionRegisterLetterHint).toHaveBeenCalledWith('p', 'contains');
    expect(mocks.keyboardUpdate).toHaveBeenCalledWith('p', 'contains');

    // Position hint unavailable.
    mocks.pickRandom.mockReturnValueOnce(null);
    instance.getPositionHint();

    // Position hint points to missing input.
    mocks.pickRandom.mockReturnValueOnce(99);
    instance.getPositionHint();

    // Position hint applies successfully and clears temporary class.
    mocks.sessionTargetWord = 'ape';
    mocks.pickRandom.mockReturnValueOnce(1);
    instance.getPositionHint();
    expect(mocks.boardInputs[1]?.value).toBe('p');
    expect(mocks.boardInputs[1]?.classList.contains('hint-provided')).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(mocks.boardInputs[1]?.classList.contains('hint-provided')).toBe(false);
  });

  it('updates start button state with input and blur validation rules', () => {
    new GameController();
    const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;
    const startButton = document.getElementById('startGame') as HTMLButtonElement | null;
    expect(wordLengthInput && startButton).toBeTruthy();
    if (!wordLengthInput || !startButton) {
      return;
    }

    wordLengthInput.value = '';
    wordLengthInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(startButton.disabled).toBe(true);

    wordLengthInput.value = '11';
    wordLengthInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(wordLengthInput.value).toBe('10');
    expect(startButton.disabled).toBe(false);

    wordLengthInput.value = '2';
    wordLengthInput.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(wordLengthInput.value).toBe('3');
    expect(startButton.disabled).toBe(false);

    wordLengthInput.value = 'abc';
    wordLengthInput.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(wordLengthInput.value).toBe('');
    expect(startButton.disabled).toBe(true);
  });

  it('handles virtual input guard and fallback branches', async () => {
    const controller = new GameController();
    await controller.play();

    const instance = controller as unknown as {
      gameState: string;
      handleVirtualKeyInput: (key: string) => void;
    };
    instance.gameState = 'running';

    // Guard: no current row
    mocks.boardCurrentRow = null;
    instance.handleVirtualKeyInput('a');
    expect(mocks.boardInputs[0]?.value).not.toBe('a');

    // Guard: all inputs disabled
    mocks.boardCurrentRow = document.createElement('div');
    mocks.boardInputs.forEach((input) => {
      input.disabled = true;
    });
    instance.handleVirtualKeyInput('a');

    mocks.boardInputs.forEach((input) => {
      input.disabled = false;
      input.value = '';
    });

    // Delete fallback: clear previous of first empty slot.
    mocks.boardActiveInput = null;
    if (mocks.boardInputs[0]) {
      mocks.boardInputs[0].value = 'x';
    }
    instance.handleVirtualKeyInput('delete');
    expect(mocks.boardInputs[0]?.value).toBe('');

    // Delete fallback: clear last filled.
    if (mocks.boardInputs[0] && mocks.boardInputs[1]) {
      mocks.boardInputs[0].value = 'x';
      mocks.boardInputs[1].value = 'y';
      if (mocks.boardInputs[2]) {
        mocks.boardInputs[2].value = 'z';
      }
    }
    instance.handleVirtualKeyInput('delete');
    expect(mocks.boardInputs.at(-1)?.value).toBe('');

    // Arrow fallback without active input.
    mocks.boardActiveInput = null;
    instance.handleVirtualKeyInput('arrowleft');
    instance.handleVirtualKeyInput('arrowright');

    // Unknown key should no-op.
    const beforeCalls = mocks.boardAnimateCurrentRowSomersault.mock.calls.length;
    instance.handleVirtualKeyInput('tab');
    expect(mocks.boardAnimateCurrentRowSomersault.mock.calls.length).toBe(beforeCalls);
  });

  it('creates a new row after a valid non-winning guess with attempts remaining', async () => {
    const controller = new GameController();
    await controller.play();

    const instance = controller as unknown as {
      gameState: string;
      checkRowLetters: () => Promise<void>;
    };
    instance.gameState = 'running';
    mocks.boardInputs.forEach((input) => {
      input.value = 'a';
    });
    mocks.validateWord.mockResolvedValue(true);
    mocks.sessionSubmitGuess.mockReturnValue({
      evaluation: {
        letterStates: ['contains', 'contains', 'contains'],
        keyboardStates: { a: 'contains' },
        isWin: false
      },
      hasAttemptsRemaining: true
    });

    await instance.checkRowLetters();
    vi.advanceTimersByTime(120);

    expect(mocks.resetHintButtonStates).toHaveBeenCalled();
    expect(mocks.boardCreateRow.mock.calls.length).toBeGreaterThan(1);
  });

  it('handles row-check early exits and processing errors', async () => {
    const controller = new GameController();
    await controller.play();

    const instance = controller as unknown as {
      gameState: string;
      checkRowLetters: () => Promise<void>;
      isCheckingRow: boolean;
    };
    instance.gameState = 'running';

    // Early exit: row incomplete.
    mocks.boardRowComplete = false;
    await instance.checkRowLetters();
    expect(mocks.validateWord).not.toHaveBeenCalled();

    // Early exit: already checking.
    mocks.boardRowComplete = true;
    instance.isCheckingRow = true;
    await instance.checkRowLetters();
    instance.isCheckingRow = false;

    // Early exit after sanitize when any letter is empty.
    if (mocks.boardInputs[0]) {
      mocks.boardInputs[0].value = '*';
    }
    await instance.checkRowLetters();
    expect(mocks.validateWord).not.toHaveBeenCalled();

    // Error path: submitGuess throws.
    mocks.boardInputs.forEach((input) => {
      input.value = 'a';
    });
    mocks.validateWord.mockResolvedValue(true);
    mocks.sessionSubmitGuess.mockImplementation(() => {
      throw new Error('submit failed');
    });

    await instance.checkRowLetters();

    expect(mocks.loggerError).toHaveBeenCalled();
    expect(mocks.showAlert.mock.calls.some((call) => call[0]?.title === 'Something went wrong')).toBe(true);

    const lastAlert = mocks.showAlert.mock.calls.at(-1) ?? [];
    const retryCb = lastAlert[1] as (() => void) | undefined;
    const resetCb = lastAlert[2] as (() => void) | undefined;
    retryCb?.();
    resetCb?.();
    expect(mocks.timerStop).toHaveBeenCalled();
  });

  it('handles modal-close callback and transition warning branch', async () => {
    const controller = new GameController();
    await controller.play();

    const instance = controller as unknown as {
      gameState: string;
      checkRowLetters: () => Promise<void>;
      transitionGameState: (nextState: string) => boolean;
      gameStateMachine: { transition: (nextState: string) => void };
    };
    instance.gameState = 'running';
    mocks.boardInputs.forEach((input) => {
      input.value = 'a';
    });

    await instance.checkRowLetters();
    vi.advanceTimersByTime(120);
    const successAlert = mocks.showAlert.mock.calls.find((call) => call[0]?.title === 'Congratulations!');
    expect(successAlert).toBeTruthy();
    const options = successAlert?.[6] as { onClose?: () => void } | undefined;
    options?.onClose?.();
    expect(mocks.timerStop).toHaveBeenCalled();
    expect((document.getElementById('playAgainMain') as HTMLButtonElement | null)?.style.display).toBe('inline-flex');

    instance.gameStateMachine.transition = (): never => {
      throw 'transition failed';
    };

    const transitioned = instance.transitionGameState('idle');
    expect(transitioned).toBe(false);
    expect(mocks.loggerWarn).toHaveBeenCalled();
  });

  it('covers createRow failure and missing stats container logging paths', async () => {
    const controller = new GameController();
    const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;
    if (wordLengthInput) {
      wordLengthInput.value = '4';
    }

    mocks.boardThrowOnCreate = true;
    await controller.play();
    expect(mocks.loggerError).toHaveBeenCalled();

    document.getElementById('statsList')?.remove();
    controller.displayStats();
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it('logs init error when required controls are missing', () => {
    document.body.innerHTML = `
      <div class="wrapper"></div>
      <div id="timerDisplay"></div>
    `;

    new GameController();
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it('covers private helper guards and normalization branches', () => {
    const controller = new GameController();
    const instance = controller as unknown as {
      updateStartGameButtonState: () => void;
      syncGameUiForState: () => void;
      normalizeError: (value: Error | string | object | null | undefined) => Error;
      showMainPlayAgainButton: () => void;
      hideMainPlayAgainButton: () => void;
      destroyStatsManager: () => void;
    };

    document.getElementById('startGame')?.remove();
    expect(() => instance.updateStartGameButtonState()).not.toThrow();

    document.querySelector('.wordLengthInputContainer')?.remove();
    expect(() => instance.syncGameUiForState()).not.toThrow();

    const fromObject = instance.normalizeError({ reason: 'oops' });
    const fromString = instance.normalizeError('broken');
    const fromError = instance.normalizeError(new Error('boom'));
    expect(fromObject).toBeInstanceOf(Error);
    expect(fromString.message).toBe('broken');
    expect(fromError.message).toBe('boom');

    document.getElementById('playAgainMain')?.remove();
    expect(() => instance.showMainPlayAgainButton()).not.toThrow();
    expect(() => instance.hideMainPlayAgainButton()).not.toThrow();

    expect(() => instance.destroyStatsManager()).not.toThrow();
  });

  it('handles input blur and click-driven event handlers end-to-end', async () => {
    const controller = new GameController();
    const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;
    const startButton = document.getElementById('startGame') as HTMLButtonElement | null;
    const resetButton = document.getElementById('resetGame') as HTMLButtonElement | null;
    const playAgainMain = document.getElementById('playAgainMain') as HTMLButtonElement | null;
    expect(wordLengthInput && startButton && resetButton && playAgainMain).toBeTruthy();
    if (!wordLengthInput || !startButton || !resetButton || !playAgainMain) {
      return;
    }

    wordLengthInput.value = '';
    wordLengthInput.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(startButton.disabled).toBe(true);

    wordLengthInput.value = '99';
    wordLengthInput.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(wordLengthInput.value).toBe('10');

    wordLengthInput.value = '4';
    startButton.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mocks.boardCreateRow).toHaveBeenCalled();

    resetButton.click();
    expect(mocks.resetGameUI).toHaveBeenCalled();

    playAgainMain.style.display = 'inline-flex';
    playAgainMain.click();
    expect(mocks.timerStop).toHaveBeenCalled();
  });

  it('invokes alert callbacks for invalid/start failures and game result modals', async () => {
    const controller = new GameController();

    // Invalid start path callback.
    const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;
    if (wordLengthInput) {
      wordLengthInput.value = '';
    }
    await controller.play();
    const invalidAlert = mocks.showAlert.mock.calls.at(-1) ?? [];
    const invalidReset = invalidAlert[2] as (() => void) | undefined;
    invalidReset?.();
    expect(mocks.resetGameUI).toHaveBeenCalled();

    // Fetch failure path callback.
    if (wordLengthInput) {
      wordLengthInput.value = '4';
    }
    mocks.fetchPossibleWords.mockRejectedValueOnce(new Error('network fail'));
    await controller.play();
    const startFailAlert = mocks.showAlert.mock.calls.at(-1) ?? [];
    const failReset = startFailAlert[2] as (() => void) | undefined;
    failReset?.();
    expect(mocks.resetHintButtons).toHaveBeenCalled();

    // Win callbacks.
    await controller.play();
    const instance = controller as unknown as {
      gameState: string;
      checkRowLetters: () => Promise<void>;
    };
    instance.gameState = 'running';
    mocks.boardInputs.forEach((input) => {
      input.value = 'a';
    });
    mocks.sessionSubmitGuess.mockReturnValue({
      evaluation: {
        letterStates: ['correct', 'correct', 'correct'],
        keyboardStates: { a: 'correct' },
        isWin: true
      },
      hasAttemptsRemaining: true
    });
    await instance.checkRowLetters();
    vi.advanceTimersByTime(120);
    const winCall = mocks.showAlert.mock.calls.find((call) => call[0]?.title === 'Congratulations!');
    const winPlayAgain = winCall?.[1] as (() => void) | undefined;
    const winReset = winCall?.[2] as (() => void) | undefined;
    const winOptions = winCall?.[6] as { onClose?: () => void } | undefined;
    winPlayAgain?.();
    winReset?.();
    winOptions?.onClose?.();

    // Loss callbacks.
    await controller.play();
    instance.gameState = 'running';
    mocks.boardInputs.forEach((input) => {
      input.value = 'z';
    });
    mocks.sessionSubmitGuess.mockReturnValue({
      evaluation: {
        letterStates: ['notContains', 'notContains', 'notContains'],
        keyboardStates: { z: 'notContains' },
        isWin: false
      },
      hasAttemptsRemaining: false
    });
    await instance.checkRowLetters();
    vi.advanceTimersByTime(120);
    const lossCall = mocks.showAlert.mock.calls.find((call) => call[0]?.title === 'Game Over');
    const lossPlayAgain = lossCall?.[1] as (() => void) | undefined;
    const lossReset = lossCall?.[2] as (() => void) | undefined;
    const lossOptions = lossCall?.[6] as { onClose?: () => void } | undefined;
    lossPlayAgain?.();
    lossReset?.();
    lossOptions?.onClose?.();

    expect(mocks.timerStop).toHaveBeenCalled();
  });

  it('covers touch-input mode setup and virtual letter helper edge branches', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const controller = new GameController();
    await controller.play();

    const instance = controller as unknown as {
      gameState: string;
      setupCurrentRowInputMode: () => void;
      enableNativeInputMode: (opts?: { preserveFocus?: boolean }) => void;
      handleVirtualLetterInput: (letter: string, inputs: HTMLInputElement[]) => void;
      handleVirtualDelete: (inputs: HTMLInputElement[]) => void;
      checkRowLetters: () => Promise<void>;
    };
    instance.gameState = 'running';

    instance.setupCurrentRowInputMode();
    expect(mocks.boardAttachTouchIntentHandler).toHaveBeenCalled();
    const touchIntent = mocks.boardAttachTouchIntentHandler.mock.calls.at(-1)?.[0] as (() => void) | undefined;
    touchIntent?.();
    expect(document.activeElement).toBe(mocks.boardInputs[0] ?? null);

    instance.enableNativeInputMode({ preserveFocus: true });

    // Invalid letter sanitization branch.
    instance.handleVirtualLetterInput('1', mocks.boardInputs);

    // Fallback to first non-disabled when no active/empty target.
    mocks.boardActiveInput = null;
    mocks.boardInputs.forEach((input) => {
      input.value = 'x';
      input.disabled = false;
    });
    instance.handleVirtualLetterInput('a', mocks.boardInputs);
    expect(mocks.boardInputs[0]?.value).toBe('a');

    // No target input branch.
    const disabledInputs = mocks.boardInputs.map((input) => {
      input.disabled = true;
      return input;
    });
    instance.handleVirtualLetterInput('b', disabledInputs);

    // Active delete branch with previous focus.
    mocks.boardInputs.forEach((input) => {
      input.disabled = false;
      input.value = '';
    });
    if (mocks.boardInputs[1]) {
      mocks.boardActiveInput = mocks.boardInputs[1];
      instance.handleVirtualDelete(mocks.boardInputs);
      expect(document.activeElement).toBe(mocks.boardInputs[0]);
    }

    // checkRow guard when not running.
    instance.gameState = 'idle';
    await instance.checkRowLetters();
  });

  it('covers misc branches for missing callback rows and absent word-length input on playAgain', async () => {
    const controller = new GameController();
    await controller.play();

    // Exercise row-count callback passed into hint buttons.
    const rowGetter = mocks.createHintButtonsContainer.mock.calls.at(-1)?.[3] as (() => number) | undefined;
    expect(typeof rowGetter).toBe('function');
    expect(rowGetter?.()).toBeGreaterThan(0);

    // Invalid-word reset callback path.
    const instance = controller as unknown as { gameState: string; checkRowLetters: () => Promise<void> };
    instance.gameState = 'running';
    mocks.validateWord.mockResolvedValue(false);
    mocks.boardInputs.forEach((input, index) => {
      input.value = ['a', 'p', 'e'][index] ?? 'x';
    });
    await instance.checkRowLetters();
    const invalidWordCall = mocks.showAlert.mock.calls.find((call) => call[0]?.title === 'Invalid Word');
    const resetCb = invalidWordCall?.[2] as (() => void) | undefined;
    resetCb?.();

    // playAgain branch when word length input is absent.
    document.getElementById('wordLengthInput')?.remove();
    (controller as unknown as { playAgain: () => void }).playAgain();
    expect(mocks.timerHide).toHaveBeenCalled();
  });

  it('supports playAgain, resetGame, displayStats and destroy flows', async () => {
    const controller = new GameController();
    await controller.play();

    const instance = controller as unknown as {
      displayStats: () => void;
      playAgain: () => void;
      resetGame: () => void;
      destroy: () => void;
    };

    instance.displayStats();
    expect(document.getElementById('statsList')?.textContent).toContain('No stats yet');

    instance.playAgain();
    expect(mocks.timerStop).toHaveBeenCalled();
    expect(mocks.keyboardClear).toHaveBeenCalled();

    instance.resetGame();
    expect(mocks.resetGameUI).toHaveBeenCalled();
    expect(mocks.resetHintButtons).toHaveBeenCalled();

    instance.destroy();
    expect(mocks.boardClear).toHaveBeenCalled();
    expect(mocks.keyboardClear).toHaveBeenCalled();
  });

  it('covers additional touch/input/init branches and non-touch detection fallback', async () => {
    const originalMatchMedia = window.matchMedia;
    Reflect.deleteProperty(window as unknown as Record<string, unknown>, 'matchMedia');
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 0
    });
    const nonTouchController = new GameController();
    const nonTouch = nonTouchController as unknown as { isTouchDevice: boolean };
    expect(typeof nonTouch.isTouchDevice).toBe('boolean');

    if (typeof originalMatchMedia === 'function') {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia
      });
    }

    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    document.body.innerHTML = `
      <div class="wordLengthInputContainer"><input id="wordLengthInput" value="4" /></div>
      <button id="startGame" type="button"></button>
      <button id="resetGame" type="button"></button>
      <div id="timerDisplay"></div>
      <div id="difficulty"></div>
      <div id="statsList"></div>
      <div class="wrapper"></div>
    `;
    resetMockState();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1);
    mocks.fetchPossibleWords.mockResolvedValueOnce(['ally']);
    const controller = new GameController();
    await controller.play();

    expect(mocks.sessionTargetWord).toBe('');

    const instance = controller as unknown as {
      gameState: string;
      enableVirtualInputMode: () => void;
      enableNativeInputMode: (opts?: { preserveFocus?: boolean }) => void;
      setupCurrentRowInputMode: () => void;
      handleVirtualDelete: (inputs: HTMLInputElement[]) => void;
      handleVirtualArrow: (direction: 'arrowleft' | 'arrowright', inputs: HTMLInputElement[]) => void;
    };
    instance.gameState = 'running';

    const first = mocks.boardInputs[0];
    const second = mocks.boardInputs[1];
    if (!first || !second) {
      randomSpy.mockRestore();
      return;
    }

    first.disabled = false;
    second.disabled = true;
    first.focus();
    instance.enableVirtualInputMode();
    expect(first.readOnly).toBe(true);
    expect(second.readOnly).toBe(false);

    instance.enableNativeInputMode({ preserveFocus: true });
    expect(first.readOnly).toBe(false);
    expect(second.readOnly).toBe(false);

    mocks.boardCurrentRow = null;
    instance.enableNativeInputMode();
    const attachCallsBefore = mocks.boardAttachTouchIntentHandler.mock.calls.length;
    instance.setupCurrentRowInputMode();
    expect(mocks.boardAttachTouchIntentHandler.mock.calls.length).toBe(attachCallsBefore);

    // Delete path where active index is zero.
    mocks.boardCurrentRow = document.createElement('div');
    mocks.boardActiveInput = first;
    first.value = '';
    instance.handleVirtualDelete(mocks.boardInputs);
    expect(first.value).toBe('');

    // Delete path with no active input and no filled inputs.
    mocks.boardActiveInput = null;
    first.disabled = false;
    second.disabled = false;
    first.value = '';
    second.value = '';
    instance.handleVirtualDelete(mocks.boardInputs);

    // Arrow fallback with no eligible target.
    first.disabled = true;
    second.disabled = true;
    instance.handleVirtualArrow('arrowright', mocks.boardInputs);

    // Arrow path with active input not present in provided collection.
    mocks.boardActiveInput = document.createElement('input');
    instance.handleVirtualArrow('arrowleft', []);

    randomSpy.mockRestore();
  });

  it('covers invalid-word callback path when row inputs array becomes empty', async () => {
    const controller = new GameController();
    await controller.play();

    const instance = controller as unknown as {
      gameState: string;
      checkRowLetters: () => Promise<void>;
    };
    instance.gameState = 'running';
    mocks.validateWord.mockResolvedValue(false);
    mocks.boardInputs.forEach((input) => {
      input.value = 'a';
    });

    await instance.checkRowLetters();
    const invalidAlert = mocks.showAlert.mock.calls.find((call) => call[0]?.title === 'Invalid Word');
    const tryAgain = invalidAlert?.[1] as (() => void) | undefined;

    mocks.boardInputs.length = 0;
    expect(() => tryAgain?.()).not.toThrow();
  });
});

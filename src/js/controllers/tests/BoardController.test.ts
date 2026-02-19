// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardController } from '../BoardController';

const { createRowMock } = vi.hoisted(() => ({
  createRowMock: vi.fn()
}));

vi.mock('../../uiHandler', () => ({
  createRow: createRowMock
}));

describe('BoardController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createRowMock.mockClear();
    createRowMock.mockImplementation((wordLength: number, onRowInput: () => void): HTMLDivElement => {
      const row = document.createElement('div');
      row.className = 'wordRow';

      for (let index = 0; index < wordLength; index++) {
        const input = document.createElement('input');
        input.className = 'wordLetterBox';
        input.type = 'text';
        input.addEventListener('input', onRowInput);
        row.appendChild(input);
      }

      return row;
    });
    document.body.innerHTML = '<div class="wrapper"></div>';
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('creates and tracks the current row', () => {
    const onInput = vi.fn();
    const controller = new BoardController();

    const row = controller.createRow(3, onInput);

    expect(createRowMock).toHaveBeenCalledWith(3, onInput);
    expect(controller.getCurrentRow()).toBe(row);
    expect(controller.getCurrentRowInputs()).toHaveLength(3);
    expect(document.querySelector('.wrapper')?.contains(row)).toBe(true);
  });

  it('throws when wrapper is missing', () => {
    document.body.innerHTML = '';
    const controller = new BoardController();
    expect(() => controller.createRow(3, () => {})).toThrow('Game wrapper not found');
  });

  it('sanitizes row values, checks completion, and applies letter states', () => {
    const controller = new BoardController();
    controller.createRow(3, () => {});
    const inputs = controller.getCurrentRowInputs();

    if (!inputs[0] || !inputs[1] || !inputs[2]) {
      throw new Error('Expected three inputs');
    }

    inputs[0].value = 'A';
    inputs[1].value = '2b';
    inputs[2].value = '***';
    const sanitized = controller.sanitizeRowInputValues(inputs);

    expect(sanitized).toEqual(['a', 'b', '']);
    expect(controller.isCurrentRowComplete()).toBe(false);

    inputs[2].value = 'c';
    expect(controller.isCurrentRowComplete()).toBe(true);

    controller.applyLetterStates(inputs, ['correct', 'contains', 'notContains']);
    expect(inputs[0].classList.contains('correct')).toBe(true);
    expect(inputs[1].classList.contains('contains')).toBe(true);
    expect(inputs[2].classList.contains('notContains')).toBe(true);

    controller.disableInputs(inputs);
    expect(inputs.every((input) => input.disabled)).toBe(true);
  });

  it('returns null for active input when not focused/current/eligible', () => {
    const controller = new BoardController();
    expect(controller.getCurrentRowInputs()).toEqual([]);
    expect(controller.getActiveCurrentRowInput()).toBeNull();

    controller.createRow(2, () => {});
    const inputs = controller.getCurrentRowInputs();
    const [first, second] = inputs;
    if (!first || !second) {
      throw new Error('Expected row inputs');
    }

    first.focus();
    expect(controller.getActiveCurrentRowInput()).toBe(first);

    first.disabled = true;
    expect(controller.getActiveCurrentRowInput()).toBeNull();

    const external = document.createElement('input');
    external.className = 'wordLetterBox';
    document.body.appendChild(external);
    external.focus();
    expect(controller.getActiveCurrentRowInput()).toBeNull();
  });

  it('focuses first input and supports current-row spin animation', async () => {
    const controller = new BoardController();
    const row = controller.createRow(3, () => {});
    const inputs = controller.getCurrentRowInputs();

    controller.focusFirstInput();
    vi.runAllTimers();

    expect(document.activeElement).toBe(inputs[0] ?? null);

    const spinPromise = controller.animateCurrentRowSomersault(inputs, 500);
    expect(row.classList.contains('row-somersaulting')).toBe(true);
    expect(inputs.every((input) => input.classList.contains('row-complete-spin'))).toBe(true);

    vi.advanceTimersByTime(500);
    await spinPromise;

    expect(row.classList.contains('row-somersaulting')).toBe(false);
    expect(inputs.every((input) => !input.classList.contains('row-complete-spin'))).toBe(true);
  });

  it('handles focus and animation no-op branches safely', async () => {
    const controller = new BoardController();
    controller.focusFirstInput();

    await expect(controller.animateCurrentRowSomersault([], 10)).resolves.toBeUndefined();

    controller.createRow(1, () => {});
    const [input] = controller.getCurrentRowInputs();
    if (!input) {
      throw new Error('Expected single input');
    }

    input.disabled = true;
    controller.focusFirstInput();
    vi.runAllTimers();
    expect(document.activeElement).not.toBe(input);
  });

  it('attaches touch intent handlers to current row inputs only', () => {
    const controller = new BoardController();
    const onTouchIntent = vi.fn();

    controller.attachTouchIntentHandler(onTouchIntent);
    expect(onTouchIntent).not.toHaveBeenCalled();

    const row = controller.createRow(2, () => {});
    const inputs = controller.getCurrentRowInputs();
    const [first] = inputs;
    if (!first) {
      throw new Error('Expected first input');
    }

    controller.attachTouchIntentHandler(onTouchIntent);
    first.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    first.dispatchEvent(new Event('touchstart', { bubbles: true }));
    expect(onTouchIntent).toHaveBeenCalledTimes(2);

    controller.clear();
    row.remove();
    first.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(onTouchIntent).toHaveBeenCalledTimes(2);
  });

  it('ignores missing letter-state mappings and handles clear without wrapper', () => {
    const controller = new BoardController();
    controller.createRow(2, () => {});
    const inputs = controller.getCurrentRowInputs();
    if (inputs.length !== 2) {
      throw new Error('Expected two inputs');
    }

    controller.applyLetterStates(inputs, ['correct']);
    expect(inputs[0].classList.contains('correct')).toBe(true);
    expect(inputs[1].classList.contains('correct')).toBe(false);

    const withoutWrapper = new BoardController('.missing-wrapper');
    expect(() => withoutWrapper.clear()).not.toThrow();
  });

  it('clears wrapper rows and current-row reference', () => {
    const controller = new BoardController();
    controller.createRow(2, () => {});
    expect(controller.getCurrentRow()).not.toBeNull();

    controller.clear();

    expect(controller.getCurrentRow()).toBeNull();
    expect(document.querySelector('.wrapper')?.innerHTML).toBe('');
  });
});

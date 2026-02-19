// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHintButtonsContainer,
  resetHintButtonStates,
  resetHintButtons,
  updateCurrentRow
} from '../hintHandler';

describe('hintHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div class="actionButtons includesHintButtons"></div>';
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    resetHintButtons();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates hint buttons and triggers letter hint with cooldown', () => {
    const getLetterHint = vi.fn();
    const getPositionHint = vi.fn();
    let rowNumber = 1;

    createHintButtonsContainer(4, getLetterHint, getPositionHint, () => rowNumber);

    const letterButton = document.getElementById('letterHintButton') as HTMLButtonElement | null;
    const positionButton = document.getElementById('positionHintButton') as HTMLButtonElement | null;
    expect(letterButton).toBeTruthy();
    expect(positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.click();
    expect(getLetterHint).toHaveBeenCalledTimes(1);
    expect(letterButton.classList.contains('cooldown')).toBe(true);
    expect(positionButton.classList.contains('inactive-hint')).toBe(true);

    vi.advanceTimersByTime(5000);
    expect(letterButton.disabled).toBe(false);
    expect(letterButton.classList.contains('cooldown')).toBe(false);
  });

  it('throws when hint button container is missing', () => {
    document.body.innerHTML = '';
    expect(() => createHintButtonsContainer(4, vi.fn(), vi.fn(), () => 1)).toThrow('Hint buttons container not found');
  });

  it('blocks mixed hint types in the same row and alerts user', () => {
    const getLetterHint = vi.fn();
    const getPositionHint = vi.fn();

    createHintButtonsContainer(4, getLetterHint, getPositionHint, () => 1);

    const letterButton = document.getElementById('letterHintButton') as HTMLButtonElement | null;
    const positionButton = document.getElementById('positionHintButton') as HTMLButtonElement | null;
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    positionButton.click();
    letterButton.click();

    expect(getPositionHint).toHaveBeenCalledTimes(1);
    expect(getLetterHint).toHaveBeenCalledTimes(0);
    expect(window.alert).toHaveBeenCalledTimes(1);
  });

  it('blocks mixed hint types in reverse order and uses numeric row input mode', () => {
    const getLetterHint = vi.fn();
    const getPositionHint = vi.fn();

    createHintButtonsContainer(4, getLetterHint, getPositionHint, 1);

    const letterButton = document.getElementById('letterHintButton') as HTMLButtonElement | null;
    const positionButton = document.getElementById('positionHintButton') as HTMLButtonElement | null;
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.click();
    positionButton.click();

    expect(getLetterHint).toHaveBeenCalledTimes(1);
    expect(getPositionHint).toHaveBeenCalledTimes(0);
    expect(window.alert).toHaveBeenCalledTimes(1);
  });

  it('applies position-hint cooldown and updates cooldown progress', () => {
    const getLetterHint = vi.fn();
    const getPositionHint = vi.fn();

    createHintButtonsContainer(4, getLetterHint, getPositionHint, () => 1);

    const positionButton = document.getElementById('positionHintButton') as HTMLButtonElement | null;
    expect(positionButton).toBeTruthy();
    if (!positionButton) {
      return;
    }

    positionButton.click();
    expect(getPositionHint).toHaveBeenCalledTimes(1);
    expect(positionButton.disabled).toBe(true);
    expect(positionButton.classList.contains('cooldown')).toBe(true);

    vi.advanceTimersByTime(1000);
    const progress = positionButton.querySelector<HTMLElement>('.cooldown-progress');
    expect(progress).toBeTruthy();
    expect(progress?.style.width).not.toBe('');

    vi.advanceTimersByTime(60000);
    expect(positionButton.disabled).toBe(false);
  });

  it('returns early when hint buttons are already disabled before click', () => {
    const getLetterHint = vi.fn();
    const getPositionHint = vi.fn();

    createHintButtonsContainer(3, getLetterHint, getPositionHint, () => 1);

    const letterButton = document.getElementById('letterHintButton') as HTMLButtonElement | null;
    const positionButton = document.getElementById('positionHintButton') as HTMLButtonElement | null;
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.disabled = true;
    positionButton.disabled = true;
    letterButton.click();
    positionButton.click();

    expect(getLetterHint).not.toHaveBeenCalled();
    expect(getPositionHint).not.toHaveBeenCalled();
  });

  it('disables both buttons when max hints are reached', () => {
    const getLetterHint = vi.fn();
    const getPositionHint = vi.fn();

    createHintButtonsContainer(1, getLetterHint, getPositionHint, () => 1);

    const letterButton = document.getElementById('letterHintButton') as HTMLButtonElement | null;
    const positionButton = document.getElementById('positionHintButton') as HTMLButtonElement | null;
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.click();

    expect(letterButton.disabled).toBe(true);
    expect(positionButton.disabled).toBe(true);
    expect(letterButton.classList.contains('inactive-hint')).toBe(true);
    expect(positionButton.classList.contains('inactive-hint')).toBe(true);
  });

  it('resets visual inactive state on row change and explicit reset', () => {
    const getLetterHint = vi.fn();
    const getPositionHint = vi.fn();
    let row = 1;

    createHintButtonsContainer(4, getLetterHint, getPositionHint, () => row);
    const letterButton = document.getElementById('letterHintButton') as HTMLButtonElement | null;
    const positionButton = document.getElementById('positionHintButton') as HTMLButtonElement | null;
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.click();
    expect(positionButton.classList.contains('inactive-hint')).toBe(true);

    row = 2;
    updateCurrentRow(2);
    // The used button remains disabled during cooldown, while the other one is re-enabled.
    expect(letterButton.disabled).toBe(true);
    expect(positionButton.disabled).toBe(false);

    vi.advanceTimersByTime(5000);
    expect(letterButton.disabled).toBe(false);

    letterButton.classList.add('inactive-hint');
    positionButton.classList.add('inactive-hint');
    resetHintButtonStates();
    expect(letterButton.classList.contains('inactive-hint')).toBe(false);
    expect(positionButton.classList.contains('inactive-hint')).toBe(false);
  });

  it('retains disabled state when hints are exhausted and ignores same-row updates', () => {
    const getLetterHint = vi.fn();
    const getPositionHint = vi.fn();
    let row = 1;

    createHintButtonsContainer(1, getLetterHint, getPositionHint, () => row);
    const letterButton = document.getElementById('letterHintButton') as HTMLButtonElement | null;
    const positionButton = document.getElementById('positionHintButton') as HTMLButtonElement | null;
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.click();
    expect(letterButton.disabled).toBe(true);
    expect(positionButton.disabled).toBe(true);

    // No-op update for same row should preserve disabled state.
    updateCurrentRow(1);
    expect(letterButton.disabled).toBe(true);
    expect(positionButton.disabled).toBe(true);

    // Different row still remains disabled because all hints are used.
    row = 2;
    updateCurrentRow(2);
    expect(letterButton.disabled).toBe(true);
    expect(positionButton.disabled).toBe(true);
  });

  it('handles zero word-length hints by disabling buttons immediately', () => {
    const getLetterHint = vi.fn();
    const getPositionHint = vi.fn();

    createHintButtonsContainer(0, getLetterHint, getPositionHint, () => 1);
    const letterButton = document.getElementById('letterHintButton') as HTMLButtonElement | null;
    const positionButton = document.getElementById('positionHintButton') as HTMLButtonElement | null;
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.click();
    expect(letterButton.disabled).toBe(true);
    expect(positionButton.disabled).toBe(true);

    resetHintButtons();
    expect(() => updateCurrentRow(3)).not.toThrow();
  });

  it('re-enables non-cooldown buttons when row changes', () => {
    const getLetterHint = vi.fn();
    const getPositionHint = vi.fn();
    let row = 1;

    createHintButtonsContainer(5, getLetterHint, getPositionHint, () => row);
    const letterButton = document.getElementById('letterHintButton') as HTMLButtonElement | null;
    const positionButton = document.getElementById('positionHintButton') as HTMLButtonElement | null;
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.classList.add('inactive-hint');
    positionButton.classList.add('inactive-hint');
    letterButton.disabled = true;
    positionButton.disabled = true;

    row = 2;
    updateCurrentRow(2);

    expect(letterButton.disabled).toBe(false);
    expect(positionButton.disabled).toBe(false);
    expect(letterButton.classList.contains('inactive-hint')).toBe(false);
    expect(positionButton.classList.contains('inactive-hint')).toBe(false);
  });

  it('covers disabled-click guards, row-change sync, and cooldown cleanup branches', () => {
    const getLetterHint = vi.fn();
    const getPositionHint = vi.fn();
    let row = 1;

    createHintButtonsContainer(3, getLetterHint, getPositionHint, () => row);
    const letterButton = document.getElementById('letterHintButton') as HTMLButtonElement | null;
    const positionButton = document.getElementById('positionHintButton') as HTMLButtonElement | null;
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    // Force execution into "disabled" guards via dispatched click events.
    letterButton.disabled = true;
    positionButton.disabled = true;
    letterButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    positionButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(getLetterHint).not.toHaveBeenCalled();
    expect(getPositionHint).not.toHaveBeenCalled();

    // Row change branches for both buttons.
    letterButton.disabled = false;
    positionButton.disabled = false;
    row = 2;
    letterButton.click();
    expect(getLetterHint).toHaveBeenCalledTimes(1);

    // Remove progress node before cooldown completes to cover safe-remove branch.
    const progress = letterButton.querySelector<HTMLElement>('.cooldown-progress');
    progress?.remove();
    vi.advanceTimersByTime(5000);

    resetHintButtonStates();
  });

  it('covers position max-hint return paths and metadata fallback parsing', () => {
    const getLetterHint = vi.fn();
    const getPositionHint = vi.fn();
    let row = 1;

    createHintButtonsContainer(1, getLetterHint, getPositionHint, () => row);
    const letterButton = document.getElementById('letterHintButton') as HTMLButtonElement | null;
    const positionButton = document.getElementById('positionHintButton') as HTMLButtonElement | null;
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    positionButton.click();
    expect(getPositionHint).toHaveBeenCalledTimes(1);

    // Re-enable manually to pass disabled guard and hit max-hint guard.
    positionButton.disabled = false;
    positionButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Force non-finite usesLeft parsing branch.
    letterButton.dataset.usesLeft = 'NaN';
    positionButton.classList.add('cooldown');
    positionButton.disabled = true;
    row = 2;
    updateCurrentRow(2);
    expect(positionButton.disabled).toBe(true);

    resetHintButtons();
    expect(() => resetHintButtonStates()).not.toThrow();
  });
});

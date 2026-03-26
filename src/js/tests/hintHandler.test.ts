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
  });

  afterEach(() => {
    resetHintButtons();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function getButtons() {
    return {
      letterButton: document.getElementById('letterHintButton') as HTMLButtonElement | null,
      positionButton: document.getElementById('positionHintButton') as HTMLButtonElement | null
    };
  }

  it('creates direct reveal buttons with remaining-use metadata', () => {
    createHintButtonsContainer(4, vi.fn(() => true), vi.fn(() => true), () => 1);

    const { letterButton, positionButton } = getButtons();
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    expect(letterButton.textContent).toContain('Letter Reveal');
    expect(positionButton.textContent).toContain('Position Reveal');
    expect(document.getElementById('letterHintMeta')?.textContent).toContain('4 reveals left');
    expect(document.getElementById('positionHintMeta')?.textContent).toContain('1 position left');
  });

  it('throws when hint button container is missing', () => {
    document.body.innerHTML = '';
    expect(() => createHintButtonsContainer(4, vi.fn(() => true), vi.fn(() => true), () => 1))
      .toThrow('Hint buttons container not found');
  });

  it('uses letter reveal directly and applies row lock plus cooldown', () => {
    const getLetterHint = vi.fn(() => true);
    let rowNumber = 1;

    createHintButtonsContainer(4, getLetterHint, vi.fn(() => true), () => rowNumber);

    const { letterButton, positionButton } = getButtons();
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.click();

    expect(getLetterHint).toHaveBeenCalledTimes(1);
    expect(letterButton.classList.contains('cooldown')).toBe(true);
    expect(positionButton.disabled).toBe(true);
    expect(document.getElementById('positionHintMeta')?.textContent).toContain('One reveal per row');

    rowNumber = 2;
    updateCurrentRow(2);
    expect(positionButton.disabled).toBe(false);
    expect(letterButton.disabled).toBe(true);
    expect(document.getElementById('letterHintMeta')?.textContent).toContain('Cooldown');

    vi.advanceTimersByTime(5000);
    expect(letterButton.disabled).toBe(false);
    expect(letterButton.classList.contains('cooldown')).toBe(false);
  });

  it('uses position reveal directly and applies the longer cooldown', () => {
    const getPositionHint = vi.fn(() => true);
    let rowNumber = 1;

    createHintButtonsContainer(8, vi.fn(() => true), getPositionHint, () => rowNumber, 'Easy');

    const { positionButton } = getButtons();
    expect(positionButton).toBeTruthy();
    if (!positionButton) {
      return;
    }

    positionButton.click();

    expect(getPositionHint).toHaveBeenCalledTimes(1);
    expect(positionButton.disabled).toBe(true);
    expect(positionButton.classList.contains('cooldown')).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(document.getElementById('positionHintMeta')?.textContent).toContain('Cooldown 44s');

    rowNumber = 2;
    updateCurrentRow(2);
    vi.advanceTimersByTime(45000);
    expect(positionButton.disabled).toBe(false);
    expect(positionButton.classList.contains('cooldown')).toBe(false);
  });

  it('locks position reveal until the configured row on harder puzzles', () => {
    let rowNumber = 1;
    const getPositionHint = vi.fn(() => true);

    createHintButtonsContainer(8, vi.fn(() => true), getPositionHint, () => rowNumber, 'Very Hard');

    const { positionButton } = getButtons();
    expect(positionButton).toBeTruthy();
    if (!positionButton) {
      return;
    }

    expect(positionButton.disabled).toBe(true);
    expect(document.getElementById('positionHintMeta')?.textContent).toContain('Unlocks row 3');

    rowNumber = 2;
    updateCurrentRow(2);
    expect(positionButton.disabled).toBe(true);

    rowNumber = 3;
    updateCurrentRow(3);
    expect(positionButton.disabled).toBe(false);

    positionButton.click();
    expect(getPositionHint).toHaveBeenCalledTimes(1);
    expect(document.getElementById('positionHintMeta')?.textContent).toContain('Used on this row');

    rowNumber = 4;
    updateCurrentRow(4);
    expect(document.getElementById('positionHintMeta')?.textContent).toContain('Position limit reached');
  });

  it('uses minute-based cooldown labels for very hard position reveals', () => {
    let rowNumber = 3;

    createHintButtonsContainer(8, vi.fn(() => true), vi.fn(() => true), () => rowNumber, 'Very Hard');

    const { positionButton } = getButtons();
    expect(positionButton).toBeTruthy();
    if (!positionButton) {
      return;
    }

    positionButton.click();
    vi.advanceTimersByTime(1000);
    expect(document.getElementById('positionHintMeta')?.textContent).toContain('Cooldown 2m');
  });

  it('ignores stale reveal clicks after the hint policy has been reset', () => {
    const getLetterHint = vi.fn(() => true);

    createHintButtonsContainer(4, getLetterHint, vi.fn(() => true), () => 1);

    const { letterButton } = getButtons();
    expect(letterButton).toBeTruthy();
    if (!letterButton) {
      return;
    }

    resetHintButtons();
    expect(() => letterButton.click()).not.toThrow();
    expect(getLetterHint).not.toHaveBeenCalled();
  });

  it('caps position reveals by difficulty even when total reveals remain', () => {
    let rowNumber = 1;

    createHintButtonsContainer(8, vi.fn(() => true), vi.fn(() => true), () => rowNumber, 'Easy');

    const { positionButton } = getButtons();
    expect(positionButton).toBeTruthy();
    if (!positionButton) {
      return;
    }

    positionButton.click();
    vi.advanceTimersByTime(45000);
    rowNumber = 2;
    updateCurrentRow(2);
    expect(positionButton.disabled).toBe(false);
    expect(document.getElementById('positionHintMeta')?.textContent).toContain('1 position left');

    positionButton.click();
    vi.advanceTimersByTime(45000);
    rowNumber = 3;
    updateCurrentRow(3);
    expect(positionButton.disabled).toBe(true);
    expect(document.getElementById('positionHintMeta')?.textContent).toContain('Position limit reached');
  });

  it('does not spend a reveal when the provider cannot produce one', () => {
    const getLetterHint = vi.fn(() => false);

    createHintButtonsContainer(3, getLetterHint, vi.fn(() => true), () => 1);

    const { letterButton, positionButton } = getButtons();
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.click();

    expect(getLetterHint).toHaveBeenCalledTimes(1);
    expect(letterButton.disabled).toBe(false);
    expect(letterButton.classList.contains('cooldown')).toBe(false);
    expect(positionButton.disabled).toBe(false);
    expect(document.getElementById('letterHintMeta')?.textContent).toContain('3 reveals left');
  });

  it('uses the latest row number from the getter before applying a reveal', () => {
    const getLetterHint = vi.fn(() => true);
    let rowNumber = 1;

    createHintButtonsContainer(4, getLetterHint, vi.fn(() => true), () => rowNumber);

    const { letterButton } = getButtons();
    expect(letterButton).toBeTruthy();
    if (!letterButton) {
      return;
    }

    rowNumber = 2;
    letterButton.click();

    expect(getLetterHint).toHaveBeenCalledTimes(1);
    expect(document.getElementById('letterHintMeta')?.textContent).toContain('Used on this row');
  });

  it('defends against stale disabled state and same-row updates', () => {
    const getLetterHint = vi.fn(() => true);
    const getPositionHint = vi.fn(() => true);

    createHintButtonsContainer(2, getLetterHint, getPositionHint, () => 1);

    const { letterButton, positionButton } = getButtons();
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.disabled = true;
    letterButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(getLetterHint).not.toHaveBeenCalled();

    letterButton.disabled = false;
    letterButton.click();
    expect(getLetterHint).toHaveBeenCalledTimes(1);

    updateCurrentRow(1);
    expect(positionButton.disabled).toBe(true);

    positionButton.disabled = false;
    positionButton.classList.remove('inactive-hint');
    positionButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(getPositionHint).not.toHaveBeenCalled();
  });

  it('disables both buttons permanently once all reveals are spent', () => {
    let rowNumber = 1;

    createHintButtonsContainer(1, vi.fn(() => true), vi.fn(() => true), () => rowNumber);

    const { letterButton, positionButton } = getButtons();
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.click();
    expect(letterButton.disabled).toBe(true);
    expect(positionButton.disabled).toBe(true);
    expect(document.getElementById('letterHintMeta')?.textContent).toContain('No reveals left');

    rowNumber = 2;
    updateCurrentRow(2);
    expect(letterButton.disabled).toBe(true);
    expect(positionButton.disabled).toBe(true);
  });

  it('handles zero word length and invalid cooldown metadata safely', () => {
    createHintButtonsContainer(0, vi.fn(() => true), vi.fn(() => true), () => 1);

    const { letterButton, positionButton } = getButtons();
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    expect(letterButton.disabled).toBe(true);
    expect(positionButton.disabled).toBe(true);

    letterButton.classList.add('cooldown');
    letterButton.dataset.cooldownStartTime = 'invalid';
    letterButton.dataset.cooldownTime = 'invalid';
    resetHintButtonStates();

    expect(letterButton.disabled).toBe(true);
  });

  it('clears row-specific visual state and survives missing nodes', () => {
    createHintButtonsContainer(4, vi.fn(() => true), vi.fn(() => true), () => 1);

    const { letterButton } = getButtons();
    expect(letterButton).toBeTruthy();
    if (!letterButton) {
      return;
    }

    letterButton.click();
    document.getElementById('letterHintMeta')?.remove();
    resetHintButtonStates();
    expect(() => updateCurrentRow(2)).not.toThrow();

    resetHintButtons();
    expect(() => resetHintButtonStates()).not.toThrow();
    expect(() => updateCurrentRow(3)).not.toThrow();
  });

  it('supports numeric row input mode and replaces stale cooldown progress safely', () => {
    createHintButtonsContainer(4, vi.fn(() => true), vi.fn(() => true), 1);

    const { letterButton, positionButton } = getButtons();
    expect(letterButton && positionButton).toBeTruthy();
    if (!letterButton || !positionButton) {
      return;
    }

    letterButton.click();
    vi.advanceTimersByTime(5000);
    updateCurrentRow(2);

    const staleProgress = document.createElement('div');
    staleProgress.className = 'cooldown-progress';
    letterButton.appendChild(staleProgress);
    letterButton.click();

    expect(letterButton.querySelectorAll('.cooldown-progress')).toHaveLength(1);

    positionButton.remove();
    expect(() => resetHintButtonStates()).not.toThrow();
  });
});

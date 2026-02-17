/**
 * Handles hint functionality for the Word Game
 */

import type { GetRowNumber, HintProvider } from './types/interface';
import type { HintType } from './types/types';

let currentRowHintType: HintType | null = null;
let currentRowNumber = 0;
let activeCooldownIntervals: number[] = [];
let totalHintsUsed = 0;

function getHintButtons(): {
  letterButton: HTMLButtonElement | null;
  positionButton: HTMLButtonElement | null;
  } {
  return {
    letterButton: document.getElementById('letterHintButton') as HTMLButtonElement | null,
    positionButton: document.getElementById('positionHintButton') as HTMLButtonElement | null
  };
}

function disableBothButtons(letterButton: HTMLButtonElement, positionButton: HTMLButtonElement): void {
  letterButton.disabled = true;
  positionButton.disabled = true;
  letterButton.classList.add('inactive-hint');
  positionButton.classList.add('inactive-hint');
  letterButton.title = 'No more hints available';
  positionButton.title = 'No more hints available';
}

function refreshHintMetadata(
  wordLength: number,
  letterButton: HTMLButtonElement,
  positionButton: HTMLButtonElement
): void {
  const remainingUses = Math.max(0, wordLength - totalHintsUsed);

  letterButton.dataset.usesLeft = String(remainingUses);
  positionButton.dataset.usesLeft = String(remainingUses);
  letterButton.title = `Reveals a correct letter (${remainingUses} hints remaining)`;
  positionButton.title = `Reveals a letter in its correct position (${remainingUses} hints remaining)`;

  if (totalHintsUsed >= wordLength) {
    disableBothButtons(letterButton, positionButton);
  }
}

function handleHintSelectionConflict(expectedType: HintType): boolean {
  if (!currentRowHintType || currentRowHintType === expectedType) {
    return false;
  }

  if (expectedType === 'letter') {
    alert('Only one type of hint can be used per row. You already used Position Reveal on this row.');
  } else {
    alert('Only one type of hint can be used per row. You already used Letter Reveal on this row.');
  }

  return true;
}

function setupHintButtonBase(button: HTMLButtonElement, hintType: HintType, usesLeft: number): void {
  button.dataset.usesLeft = String(usesLeft);
  button.dataset.cooldownTime = '0';
  button.dataset.hintType = hintType;
}

/**
 * Creates a container for hint buttons.
 */
export function createHintButtonsContainer(
  wordLength: number,
  getLetterHint: HintProvider,
  getPositionHint: HintProvider,
  rowCountOrGetter: number | GetRowNumber
): HTMLElement {
  const container = document.querySelector<HTMLElement>('.actionButtons.includesHintButtons');
  if (!container) {
    throw new Error('Hint buttons container not found');
  }

  const getCurrentRowNumber: GetRowNumber = typeof rowCountOrGetter === 'function'
    ? rowCountOrGetter
    : () => rowCountOrGetter;

  const letterHintButton = document.createElement('button');
  letterHintButton.id = 'letterHintButton';
  letterHintButton.classList.add('hint-button', 'letter-hint');
  letterHintButton.type = 'button';
  letterHintButton.textContent = 'Letter Reveal';
  setupHintButtonBase(letterHintButton, 'letter', wordLength);
  letterHintButton.title = `Reveals a correct letter (${wordLength - totalHintsUsed} hints remaining)`;

  const positionHintButton = document.createElement('button');
  positionHintButton.id = 'positionHintButton';
  positionHintButton.classList.add('hint-button', 'position-hint');
  positionHintButton.type = 'button';
  positionHintButton.textContent = 'Position Reveal';
  setupHintButtonBase(positionHintButton, 'position', wordLength);
  positionHintButton.title = `Reveals a letter in its correct position (${wordLength - totalHintsUsed} hints remaining)`;

  currentRowNumber = getCurrentRowNumber();
  currentRowHintType = null;

  letterHintButton.addEventListener('click', () => {
    if (letterHintButton.disabled) {
      return;
    }

    if (totalHintsUsed >= wordLength) {
      disableBothButtons(letterHintButton, positionHintButton);
      return;
    }

    const latestRowNumber = getCurrentRowNumber();
    if (latestRowNumber !== currentRowNumber) {
      updateCurrentRow(latestRowNumber);
    }

    if (handleHintSelectionConflict('letter')) {
      return;
    }

    currentRowHintType = 'letter';
    positionHintButton.classList.add('inactive-hint');

    getLetterHint();

    totalHintsUsed += 1;
    refreshHintMetadata(wordLength, letterHintButton, positionHintButton);

    if (totalHintsUsed >= wordLength) {
      return;
    }

    const cooldownTime = totalHintsUsed * 5000;
    startButtonCooldown(letterHintButton, cooldownTime);
  });

  positionHintButton.addEventListener('click', () => {
    if (positionHintButton.disabled) {
      return;
    }

    if (totalHintsUsed >= wordLength) {
      disableBothButtons(letterHintButton, positionHintButton);
      return;
    }

    const latestRowNumber = getCurrentRowNumber();
    if (latestRowNumber !== currentRowNumber) {
      updateCurrentRow(latestRowNumber);
    }

    if (handleHintSelectionConflict('position')) {
      return;
    }

    currentRowHintType = 'position';
    letterHintButton.classList.add('inactive-hint');

    getPositionHint();

    totalHintsUsed += 1;
    refreshHintMetadata(wordLength, letterHintButton, positionHintButton);

    if (totalHintsUsed >= wordLength) {
      return;
    }

    startButtonCooldown(positionHintButton, 60000);
  });

  container.prepend(positionHintButton);
  container.prepend(letterHintButton);

  return container;
}

/**
 * Starts a cooldown timer for a hint button.
 */
function startButtonCooldown(button: HTMLButtonElement, cooldownTime: number): void {
  button.disabled = true;
  button.classList.add('cooldown');

  const startTime = Date.now();
  button.dataset.cooldownStartTime = String(startTime);
  button.dataset.cooldownTime = String(cooldownTime);

  const progressIndicator = document.createElement('div');
  progressIndicator.classList.add('cooldown-progress');
  button.appendChild(progressIndicator);

  const updateInterval = window.setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = cooldownTime - elapsed;

    if (remaining <= 0) {
      clearInterval(updateInterval);
      activeCooldownIntervals = activeCooldownIntervals.filter((id) => id !== updateInterval);
      button.disabled = false;
      button.classList.remove('cooldown');
      if (progressIndicator.parentNode === button) {
        button.removeChild(progressIndicator);
      }
      return;
    }

    const progress = (elapsed / cooldownTime) * 100;
    progressIndicator.style.width = `${progress}%`;
  }, 50);

  activeCooldownIntervals.push(updateInterval);
}

/**
 * Resets the hint buttons.
 */
export function resetHintButtons(): void {
  const { letterButton, positionButton } = getHintButtons();

  if (letterButton) {
    letterButton.remove();
  }

  if (positionButton) {
    positionButton.remove();
  }

  currentRowHintType = null;
  currentRowNumber = 0;
  totalHintsUsed = 0;
  activeCooldownIntervals.forEach((intervalId) => clearInterval(intervalId));
  activeCooldownIntervals = [];
}

/**
 * Explicitly resets the visual state of hint buttons.
 */
export function resetHintButtonStates(): void {
  currentRowHintType = null;

  const { letterButton, positionButton } = getHintButtons();

  if (letterButton) {
    letterButton.classList.remove('inactive-hint');
  }

  if (positionButton) {
    positionButton.classList.remove('inactive-hint');
  }
}

/**
 * Updates the current row number for hint tracking.
 */
export function updateCurrentRow(rowNumber: number): void {
  if (rowNumber === currentRowNumber) {
    return;
  }

  currentRowNumber = rowNumber;
  currentRowHintType = null;

  const { letterButton, positionButton } = getHintButtons();
  if (!letterButton || !positionButton) {
    return;
  }

  const usesLeft = Number.parseInt(letterButton.dataset.usesLeft ?? '0', 10);
  const wordLength = Number.isFinite(usesLeft) ? usesLeft + totalHintsUsed : totalHintsUsed;
  const remainingHints = Math.max(0, wordLength - totalHintsUsed);

  letterButton.dataset.usesLeft = String(remainingHints);
  positionButton.dataset.usesLeft = String(remainingHints);

  letterButton.title = `Reveals a correct letter (${remainingHints} hints remaining)`;
  positionButton.title = `Reveals a letter in its correct position (${remainingHints} hints remaining)`;

  if (totalHintsUsed >= wordLength) {
    disableBothButtons(letterButton, positionButton);
    return;
  }

  if (!letterButton.classList.contains('cooldown')) {
    letterButton.disabled = false;
    letterButton.classList.remove('inactive-hint');
  }

  if (!positionButton.classList.contains('cooldown')) {
    positionButton.disabled = false;
    positionButton.classList.remove('inactive-hint');
  }
}

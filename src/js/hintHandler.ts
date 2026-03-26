/**
 * Handles direct hint button interactions for the Word Game.
 */

import { getHintPolicy } from './core/hintPolicy';
import type { DifficultyLabel, HintType } from './types/types';
import type { GetRowNumber, HintPolicy, HintProvider } from './types/interface';

const LETTER_HINT_BUTTON_ID = 'letterHintButton';
const LETTER_HINT_META_ID = 'letterHintMeta';
const POSITION_HINT_BUTTON_ID = 'positionHintButton';
const POSITION_HINT_META_ID = 'positionHintMeta';

let currentRowHintType: HintType | null = null;
let currentRowNumber = 0;
let activeCooldownIntervals: number[] = [];
let totalHintsUsed = 0;
let positionHintsUsed = 0;
let currentHintPolicy: HintPolicy | null = null;

interface HintElements {
  letterButton: HTMLButtonElement | null;
  letterMeta: HTMLElement | null;
  positionButton: HTMLButtonElement | null;
  positionMeta: HTMLElement | null;
}

function getHintElements(): HintElements {
  return {
    letterButton: document.getElementById(LETTER_HINT_BUTTON_ID) as HTMLButtonElement | null,
    letterMeta: document.getElementById(LETTER_HINT_META_ID),
    positionButton: document.getElementById(POSITION_HINT_BUTTON_ID) as HTMLButtonElement | null,
    positionMeta: document.getElementById(POSITION_HINT_META_ID)
  };
}

function getConfiguredWordLength(): number | null {
  if (!currentHintPolicy) {
    return null;
  }

  return currentHintPolicy.totalRevealLimit;
}

function getRemainingHints(): number {
  return Math.max(0, (currentHintPolicy?.totalRevealLimit ?? 0) - totalHintsUsed);
}

function getRemainingPositionReveals(): number {
  const maxPositionReveals = currentHintPolicy?.maxPositionReveals ?? 0;
  return Math.max(
    0,
    Math.min(
      maxPositionReveals - positionHintsUsed,
      getRemainingHints()
    )
  );
}

function setActionMeta(metaElement: HTMLElement | null, value: string): void {
  if (metaElement) {
    metaElement.textContent = value;
  }
}

function getActionLabel(hintType: HintType): string {
  return hintType === 'letter' ? 'Letter Reveal' : 'Position Reveal';
}

function getActionDescription(hintType: HintType): string {
  return hintType === 'letter'
    ? 'Reveal a target letter without placing it on the board.'
    : 'Fill one correct letter directly into the current row.';
}

function getCooldownRemaining(button: HTMLButtonElement): number {
  if (!button.classList.contains('cooldown')) {
    return 0;
  }

  const cooldownTime = Number.parseInt(button.dataset.cooldownTime ?? '0', 10);
  const cooldownStartTime = Number.parseInt(button.dataset.cooldownStartTime ?? '0', 10);

  if (!Number.isFinite(cooldownTime) || !Number.isFinite(cooldownStartTime) || cooldownTime <= 0 || cooldownStartTime <= 0) {
    return 0;
  }

  return Math.max(0, cooldownTime - (Date.now() - cooldownStartTime));
}

function formatCooldown(remainingMs: number): string {
  const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  if (totalSeconds >= 60) {
    return `${Math.ceil(totalSeconds / 60)}m`;
  }

  return `${totalSeconds}s`;
}

function refreshActionButton(
  button: HTMLButtonElement | null,
  metaElement: HTMLElement | null,
  hintType: HintType
): void {
  if (!button || !currentHintPolicy) {
    return;
  }

  const remainingHints = getRemainingHints();
  const remainingPositionReveals = getRemainingPositionReveals();
  const cooldownRemaining = getCooldownRemaining(button);
  const rowLocked = currentRowHintType !== null;
  const isExhausted = remainingHints <= 0;
  const isPositionLockedByDifficulty = hintType === 'position' && currentRowNumber < currentHintPolicy.minRowForPositionReveal;
  const isPositionCapReached = hintType === 'position' && remainingPositionReveals <= 0;
  const isCoolingDown = cooldownRemaining > 0;

  button.classList.toggle(
    'inactive-hint',
    rowLocked || isExhausted || isPositionLockedByDifficulty || isPositionCapReached
  );

  if (isExhausted) {
    button.disabled = true;
    button.title = `${getActionLabel(hintType)} unavailable. No reveals left for this puzzle.`;
    setActionMeta(metaElement, 'No reveals left');
    return;
  }

  if (rowLocked) {
    button.disabled = true;
    if (currentRowHintType === hintType) {
      button.title = `${getActionLabel(hintType)} already used on this row.`;
      setActionMeta(metaElement, 'Used on this row');
    } else {
      button.title = 'Only one reveal hint can be used per row.';
      setActionMeta(metaElement, 'One reveal per row');
    }
    return;
  }

  if (isPositionLockedByDifficulty) {
    button.disabled = true;
    button.title = `${getActionLabel(hintType)} unlocks on row ${currentHintPolicy.minRowForPositionReveal}.`;
    setActionMeta(metaElement, `Unlocks row ${currentHintPolicy.minRowForPositionReveal}`);
    return;
  }

  if (isPositionCapReached) {
    button.disabled = true;
    button.title = `${getActionLabel(hintType)} limit reached for this puzzle.`;
    setActionMeta(metaElement, 'Position limit reached');
    return;
  }

  if (isCoolingDown) {
    button.disabled = true;
    button.title = `${getActionLabel(hintType)} recharges in ${formatCooldown(cooldownRemaining)}.`;
    setActionMeta(metaElement, `Cooldown ${formatCooldown(cooldownRemaining)}`);
    return;
  }

  button.disabled = false;
  if (hintType === 'position') {
    button.title = `${getActionDescription(hintType)} (${remainingPositionReveals} position reveal${remainingPositionReveals === 1 ? '' : 's'} left)`;
    setActionMeta(
      metaElement,
      remainingPositionReveals === 1 ? '1 position left' : `${remainingPositionReveals} positions left`
    );
    return;
  }

  button.title = `${getActionDescription(hintType)} (${remainingHints} reveal${remainingHints === 1 ? '' : 's'} left)`;
  setActionMeta(metaElement, remainingHints === 1 ? '1 reveal left' : `${remainingHints} reveals left`);
}

function syncHintUi(): void {
  const { letterButton, letterMeta, positionButton, positionMeta } = getHintElements();
  refreshActionButton(letterButton, letterMeta, 'letter');
  refreshActionButton(positionButton, positionMeta, 'position');
}

function createHintButton(id: string, label: string, metaId: string, modifierClass: string, wordLength: number): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = id;
  button.type = 'button';
  button.className = `hint-button ${modifierClass}`;
  button.dataset.wordLength = String(Math.max(0, wordLength));
  button.dataset.cooldownStartTime = '0';
  button.dataset.cooldownTime = '0';

  const labelElement = document.createElement('span');
  labelElement.className = 'hint-button__label';
  labelElement.textContent = label;
  button.appendChild(labelElement);

  const meta = document.createElement('span');
  meta.id = metaId;
  meta.className = 'hint-button__meta';
  button.appendChild(meta);

  return button;
}

function startButtonCooldown(button: HTMLButtonElement, cooldownTime: number): void {
  button.disabled = true;
  button.classList.add('cooldown');

  const existingProgress = button.querySelector<HTMLElement>('.cooldown-progress');
  if (existingProgress) {
    existingProgress.remove();
  }

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
      activeCooldownIntervals = activeCooldownIntervals.filter((intervalId) => intervalId !== updateInterval);
      button.classList.remove('cooldown');
      button.dataset.cooldownStartTime = '0';
      button.dataset.cooldownTime = '0';
      progressIndicator.remove();
      syncHintUi();
      return;
    }

    progressIndicator.style.width = `${(elapsed / cooldownTime) * 100}%`;
    const metaElement = document.getElementById(
      button.id === LETTER_HINT_BUTTON_ID ? LETTER_HINT_META_ID : POSITION_HINT_META_ID
    );
    setActionMeta(metaElement, `Cooldown ${formatCooldown(remaining)}`);
  }, 50);

  activeCooldownIntervals.push(updateInterval);
}

function handleRevealAction(
  hintType: HintType,
  provider: HintProvider,
  getCurrentRowNumber: GetRowNumber
): void {
  if (!currentHintPolicy) {
    return;
  }

  const { letterButton, positionButton } = getHintElements();
  const actionButton = hintType === 'letter' ? letterButton : positionButton;
  if (!actionButton || actionButton.disabled) {
    return;
  }

  const latestRowNumber = getCurrentRowNumber();
  if (latestRowNumber !== currentRowNumber) {
    updateCurrentRow(latestRowNumber);
  }

  if (
    getRemainingHints() <= 0 ||
    currentRowHintType !== null ||
    (hintType === 'position' && (
      latestRowNumber < currentHintPolicy.minRowForPositionReveal ||
      getRemainingPositionReveals() <= 0
    ))
  ) {
    syncHintUi();
    return;
  }

  const didReveal = provider();
  if (!didReveal) {
    syncHintUi();
    return;
  }

  currentRowHintType = hintType;
  totalHintsUsed += 1;
  if (hintType === 'position') {
    positionHintsUsed += 1;
  }

  const cooldownTime = hintType === 'letter'
    ? currentHintPolicy.letterCooldownMs
    : currentHintPolicy.positionCooldownMs;
  startButtonCooldown(actionButton, cooldownTime);
  syncHintUi();
}

/**
 * Creates direct hint buttons inside the shared action-button row.
 */
export function createHintButtonsContainer(
  wordLength: number,
  getLetterHint: HintProvider,
  getPositionHint: HintProvider,
  rowCountOrGetter: number | GetRowNumber,
  difficultyLabel: DifficultyLabel = 'Easy'
): HTMLElement {
  resetHintButtons();

  const container = document.querySelector<HTMLElement>('.actionButtons.includesHintButtons');
  if (!container) {
    throw new Error('Hint buttons container not found');
  }

  const getCurrentRowNumber: GetRowNumber = typeof rowCountOrGetter === 'function'
    ? rowCountOrGetter
    : () => rowCountOrGetter;

  currentRowNumber = getCurrentRowNumber();
  currentRowHintType = null;
  positionHintsUsed = 0;
  currentHintPolicy = getHintPolicy(wordLength, difficultyLabel);

  const letterButton = createHintButton(
    LETTER_HINT_BUTTON_ID,
    'Letter Reveal',
    LETTER_HINT_META_ID,
    'hint-button--letter',
    wordLength
  );
  const positionButton = createHintButton(
    POSITION_HINT_BUTTON_ID,
    'Position Reveal',
    POSITION_HINT_META_ID,
    'hint-button--position',
    wordLength
  );

  letterButton.addEventListener('click', () => {
    handleRevealAction('letter', getLetterHint, getCurrentRowNumber);
  });

  positionButton.addEventListener('click', () => {
    handleRevealAction('position', getPositionHint, getCurrentRowNumber);
  });

  container.prepend(positionButton);
  container.prepend(letterButton);

  syncHintUi();

  return container;
}

/**
 * Removes hint buttons and clears internal state.
 */
export function resetHintButtons(): void {
  const { letterButton, positionButton } = getHintElements();
  letterButton?.remove();
  positionButton?.remove();

  currentRowHintType = null;
  currentRowNumber = 0;
  totalHintsUsed = 0;
  positionHintsUsed = 0;
  currentHintPolicy = null;
  activeCooldownIntervals.forEach((intervalId) => clearInterval(intervalId));
  activeCooldownIntervals = [];
}

/**
 * Clears row-specific reveal locks without resetting total usage.
 */
export function resetHintButtonStates(): void {
  currentRowHintType = null;

  if (getConfiguredWordLength() === null) {
    return;
  }

  syncHintUi();
}

/**
 * Updates the active row for per-row reveal limits.
 */
export function updateCurrentRow(rowNumber: number): void {
  if (rowNumber === currentRowNumber) {
    return;
  }

  currentRowNumber = rowNumber;
  currentRowHintType = null;

  if (getConfiguredWordLength() === null) {
    return;
  }

  syncHintUi();
}

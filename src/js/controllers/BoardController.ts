import { createRow as buildRow } from '../uiHandler';
import type { LetterState } from '../types/types';
import { sanitizeSingleLetter } from '../utils/inputSanitizer';

export class BoardController {
  private currentRow: HTMLDivElement | null;
  private readonly wrapperSelector: string;

  constructor(wrapperSelector = '.wrapper') {
    this.currentRow = null;
    this.wrapperSelector = wrapperSelector;
  }

  createRow(wordLength: number, onRowInput: () => void): HTMLDivElement {
    const wrapper = this.getWrapper();
    if (!wrapper) {
      throw new Error('Game wrapper not found');
    }

    const row = buildRow(wordLength, onRowInput);
    wrapper.appendChild(row);
    this.currentRow = row;

    return row;
  }

  getCurrentRow(): HTMLDivElement | null {
    return this.currentRow;
  }

  getCurrentRowInputs(): HTMLInputElement[] {
    if (!this.currentRow) {
      return [];
    }

    return Array.from(this.currentRow.querySelectorAll<HTMLInputElement>('input.wordLetterBox'));
  }

  getActiveCurrentRowInput(): HTMLInputElement | null {
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

  focusFirstInput(): void {
    const inputs = this.getCurrentRowInputs().filter((input) => !input.disabled);
    const firstInput = inputs[0];
    if (!firstInput) {
      return;
    }

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

  attachTouchIntentHandler(onTouchIntent: () => void): void {
    if (!this.currentRow) {
      return;
    }

    this.getCurrentRowInputs().forEach((input) => {
      const handleTouchInputIntent = (): void => {
        if (!this.currentRow || !this.currentRow.contains(input)) {
          return;
        }

        onTouchIntent();
      };

      input.addEventListener('pointerdown', handleTouchInputIntent);
      input.addEventListener('touchstart', handleTouchInputIntent, { passive: true });
    });
  }

  sanitizeRowInputValues(inputs: HTMLInputElement[]): string[] {
    return inputs.map((input) => {
      const sanitized = sanitizeSingleLetter(input.value);
      if (input.value !== sanitized) {
        input.value = sanitized;
      }

      return sanitized;
    });
  }

  isCurrentRowComplete(): boolean {
    return this.getCurrentRowInputs().every((input) => sanitizeSingleLetter(input.value) !== '');
  }

  applyLetterStates(inputs: HTMLInputElement[], letterStates: LetterState[]): void {
    for (let index = 0; index < inputs.length; index++) {
      const inputBox = inputs[index];
      const nextState = letterStates[index];
      if (!inputBox || !nextState) {
        continue;
      }

      inputBox.classList.remove('correct', 'contains', 'notContains', 'hint-provided');
      inputBox.classList.add(nextState);
    }
  }

  disableInputs(inputs: HTMLInputElement[]): void {
    inputs.forEach((input) => {
      input.disabled = true;
    });
  }

  async animateCurrentRowSomersault(inputs: HTMLInputElement[], spinDuration = 720): Promise<void> {
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

    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), spinDuration);
    });

    this.currentRow.classList.remove('row-somersaulting');
    inputs.forEach((input) => {
      input.classList.remove('row-complete-spin');
    });
  }

  clear(): void {
    const wrapper = this.getWrapper();
    if (wrapper) {
      wrapper.innerHTML = '';
    }

    this.currentRow = null;
  }

  private getWrapper(): HTMLElement | null {
    return document.querySelector<HTMLElement>(this.wrapperSelector);
  }
}

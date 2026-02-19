import {
  createAlphabetContainer as renderAlphabetContainer,
  updateAlphabetContainer as renderAlphabetStatus
} from '../uiHandler';
import type { OnKeyboardInput } from '../types/interface';
import type { LetterState } from '../types/types';

export class KeyboardController {
  private readonly alphabet: string[];

  constructor(alphabet: string[]) {
    this.alphabet = alphabet;
  }

  create(onKeyInput: OnKeyboardInput): void {
    renderAlphabetContainer(this.alphabet, onKeyInput);
    this.hide();
  }

  updateLetterStatus(letter: string, state: LetterState): void {
    this.show();
    renderAlphabetStatus(letter, state);
  }

  show(): void {
    const container = this.getContainer();
    if (!container) {
      return;
    }

    container.style.display = '';
    container.classList.add('visible');
  }

  hide(): void {
    const container = this.getContainer();
    if (!container) {
      return;
    }

    container.classList.remove('visible');
    container.style.display = 'none';
  }

  clear(): void {
    const container = this.getContainer();
    if (!container) {
      return;
    }

    container.innerHTML = '';
    this.hide();
  }

  private getContainer(): HTMLElement | null {
    return document.getElementById('alphabetContainer');
  }
}

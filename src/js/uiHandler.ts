import { resetHintButtons } from './hintHandler';
import type { KeyboardKey, LetterState } from './types/types';
import type { OnKeyboardInput } from './types/interface';

const KEYBOARD_LAYOUT: KeyboardKey[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'delete'],
  ['arrowleft', 'arrowright']
];

function getKeyLabel(key: KeyboardKey): string {
  if (key === 'enter') return 'Enter';
  if (key === 'delete') return 'Delete';
  if (key === 'arrowleft') return '←';
  if (key === 'arrowright') return '→';
  return key.toUpperCase();
}

function getKeyAriaLabel(key: KeyboardKey): string {
  if (key === 'enter') return 'Enter key';
  if (key === 'delete') return 'Delete key';
  if (key === 'arrowleft') return 'Move cursor left';
  if (key === 'arrowright') return 'Move cursor right';
  return `Letter ${key.toUpperCase()}, tap to input`;
}

/**
 * Creates the alphabet container and populates it with letters.
 */
export function createAlphabetContainer(
  alphabet: string[],
  onKeyInput: OnKeyboardInput | null = null
): void {
  const container = document.getElementById('alphabetContainer');
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const letterSet = new Set(alphabet.map((letter) => letter.toLowerCase()));

  const label = document.createElement('div');
  label.classList.add('alphabet-label');
  label.textContent = 'Keyboard & Letter Status';
  container.appendChild(label);

  const gridContainer = document.createElement('div');
  gridContainer.classList.add('alphabet-grid');

  const createKeyTile = (key: KeyboardKey): HTMLButtonElement => {
    const keyButton = document.createElement('button');
    keyButton.type = 'button';
    keyButton.classList.add('keyboard-key');
    keyButton.dataset.key = key;
    keyButton.textContent = getKeyLabel(key);
    keyButton.setAttribute('aria-label', getKeyAriaLabel(key));

    const isLetterKey = key.length === 1 && letterSet.has(key);
    if (isLetterKey) {
      keyButton.classList.add('keyboard-key--letter', 'notGuessed');
      keyButton.dataset.letter = key;
    } else {
      keyButton.classList.add('keyboard-key--control');
      if (key === 'enter' || key === 'delete') {
        keyButton.classList.add('keyboard-key--wide');
      }
      if (key === 'arrowleft' || key === 'arrowright') {
        keyButton.classList.add('keyboard-key--arrow');
      }
    }

    if (typeof onKeyInput === 'function') {
      const emitKey = (): void => onKeyInput(key);
      keyButton.addEventListener('pointerdown', (event) => {
        event.preventDefault();
      });
      keyButton.addEventListener('click', emitKey);
      keyButton.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          emitKey();
        }
      });
    }

    return keyButton;
  };

  KEYBOARD_LAYOUT.forEach((rowKeys, rowIndex) => {
    const row = document.createElement('div');
    row.classList.add('keyboard-row', `keyboard-row-${rowIndex + 1}`);
    rowKeys.forEach((key) => {
      row.appendChild(createKeyTile(key));
    });
    gridContainer.appendChild(row);
  });

  container.appendChild(gridContainer);
  container.classList.remove('visible');
}

/**
 * Updates the alphabet container to reflect the status of a guessed letter.
 */
export function updateAlphabetContainer(guessedLetter: string, letterClass: LetterState): void {
  const container = document.getElementById('alphabetContainer');
  if (!container) {
    return;
  }

  if (!container.classList.contains('visible')) {
    container.classList.add('visible');
  }

  const normalizedLetter = guessedLetter.toLowerCase();
  const letterElement = container.querySelector<HTMLElement>(`.keyboard-key[data-letter="${normalizedLetter}"]`);
  if (!letterElement) {
    return;
  }

  letterElement.classList.remove('notGuessed', 'correct', 'contains', 'notContains');
  letterElement.classList.add(letterClass);

  let statusDescription: string;
  if (letterClass === 'correct') {
    statusDescription = 'correct, in the right position';
  } else if (letterClass === 'contains') {
    statusDescription = 'in the word but wrong position';
  } else {
    statusDescription = 'not in the word';
  }

  letterElement.setAttribute('aria-label', `Letter ${guessedLetter.toUpperCase()}, ${statusDescription}`);
}

/**
 * Creates a new row of input boxes for letter entry.
 */
export function createRow(wordLength: number, checkRowLetters: () => void): HTMLDivElement {
  const newRow = document.createElement('div');
  newRow.classList.add('wordRow');
  newRow.id = `row_${Math.random().toString(36).substring(2, 11)}`;

  const getInputs = (): HTMLInputElement[] =>
    Array.from(newRow.querySelectorAll<HTMLInputElement>('input.wordLetterBox'));

  for (let index = 0; index < wordLength; index++) {
    const newInputBox = document.createElement('input');
    newInputBox.type = 'text';
    newInputBox.classList.add('wordLetterBox');
    newInputBox.maxLength = 1;
    newInputBox.autocomplete = 'off';
    newInputBox.setAttribute('autocorrect', 'off');
    newInputBox.setAttribute('autocapitalize', 'off');
    newInputBox.spellcheck = false;

    newInputBox.addEventListener('input', () => {
      if (newInputBox.value) {
        newInputBox.value = newInputBox.value.toLowerCase();
      }

      if (!/^[a-z]$/i.test(newInputBox.value)) {
        newInputBox.value = '';
        return;
      }

      if (newInputBox.value && index < wordLength - 1) {
        window.setTimeout(() => {
          const inputs = getInputs();
          const nextInput = inputs[index + 1];
          if (nextInput) {
            nextInput.focus();
          }
        }, 10);
      }

      checkRowLetters();
    });

    newInputBox.addEventListener('keydown', (event) => {
      const inputs = getInputs();

      if (event.key === 'Backspace' && index > 0 && newInputBox.value === '') {
        const previousInput = inputs[index - 1];
        if (previousInput) {
          previousInput.value = '';
          previousInput.focus();
        }
        event.preventDefault();
      }

      if (event.key === 'ArrowLeft' && index > 0) {
        const previousInput = inputs[index - 1];
        if (previousInput) {
          previousInput.focus();
        }
        event.preventDefault();
      }

      if (event.key === 'ArrowRight' && index < wordLength - 1) {
        const nextInput = inputs[index + 1];
        if (nextInput) {
          nextInput.focus();
        }
        event.preventDefault();
      }
    });

    newInputBox.addEventListener('touchend', (event) => {
      event.preventDefault();
      newInputBox.focus();
    });

    newRow.appendChild(newInputBox);
  }

  return newRow;
}

/**
 * Resets the game UI to its initial state.
 */
export function resetGameUI(): void {
  const wrapper = document.getElementById('wrapper');
  const startGameButton = document.getElementById('startGame');
  const wordLengthInputContainer = document.querySelector<HTMLElement>('.wordLengthInputContainer');
  const wordLengthInput = document.getElementById('wordLengthInput') as HTMLInputElement | null;
  const alphabetContainer = document.getElementById('alphabetContainer');
  const difficulty = document.getElementById('difficulty');
  const resetGameButton = document.getElementById('resetGame');
  const playAgainMainButton = document.getElementById('playAgainMain');

  if (wrapper) {
    wrapper.innerHTML = '';
  }
  if (startGameButton) {
    startGameButton.style.display = 'block';
  }
  if (wordLengthInputContainer) {
    wordLengthInputContainer.style.display = 'block';
  }
  if (wordLengthInput) {
    wordLengthInput.value = '';
  }
  if (alphabetContainer) {
    alphabetContainer.innerHTML = '';
    alphabetContainer.style.display = 'none';
  }
  if (difficulty) {
    difficulty.style.display = 'none';
  }
  if (resetGameButton) {
    resetGameButton.style.display = 'none';
  }
  if (playAgainMainButton) {
    playAgainMainButton.style.display = 'none';
  }

  resetHintButtons();
}

/**
 * Updates the displayed difficulty level based on the word length.
 */
export function updateDifficulty(wordLength: number): void {
  const difficulty = document.getElementById('difficulty');
  if (!difficulty) {
    return;
  }

  if (wordLength <= 4) {
    difficulty.innerHTML = 'Difficulty: Easy';
  } else if (wordLength <= 6) {
    difficulty.innerHTML = 'Difficulty: Medium';
  } else if (wordLength <= 8) {
    difficulty.innerHTML = 'Difficulty: Hard';
  } else {
    difficulty.innerHTML = 'Difficulty: Very Hard';
  }
  difficulty.style.display = 'inline-flex';
}

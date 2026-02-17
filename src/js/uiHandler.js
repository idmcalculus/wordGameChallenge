import { resetHintButtons } from './hintHandler.js';

const KEYBOARD_LAYOUT = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'delete'],
  ['arrowleft', 'arrowright']
];

function getKeyLabel(key) {
  if (key === 'enter') return 'Enter';
  if (key === 'delete') return 'Delete';
  if (key === 'arrowleft') return '←';
  if (key === 'arrowright') return '→';
  return key.toUpperCase();
}

function getKeyAriaLabel(key) {
  if (key === 'enter') return 'Enter key';
  if (key === 'delete') return 'Delete key';
  if (key === 'arrowleft') return 'Move cursor left';
  if (key === 'arrowright') return 'Move cursor right';
  return `Letter ${key.toUpperCase()}, tap to input`;
}

/**
 * Creates the alphabet container and populates it with letters.
 * @param {Array<string>} alphabet - An array of letters to display in the container.
 * @param {function} onKeyInput - Callback invoked when an on-screen key is clicked.
 */
export function createAlphabetContainer(alphabet, onKeyInput = null) {
  const container = document.getElementById('alphabetContainer');
  container.innerHTML = '';  // Clear container
  
  const letterSet = new Set(alphabet.map((letter) => letter.toLowerCase()));

  // Add a title/label above the keyboard to clarify its purpose
  const label = document.createElement('div');
  label.classList.add('alphabet-label');
  label.textContent = 'Keyboard & Letter Status';
  container.appendChild(label);
  
  // Create keyboard layout container
  const gridContainer = document.createElement('div');
  gridContainer.classList.add('alphabet-grid');

  const createKeyTile = (key) => {
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
      const emitKey = () => onKeyInput(key);
      // Keep focus on the active input so virtual arrows/delete operate on the row cursor.
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
  // Visibility is controlled by the game flow.
  container.classList.remove('visible');
}

/**
 * Updates the alphabet container to reflect the status of a guessed letter.
 * @param {string} guessedLetter - The letter that was guessed.
 * @param {string} letterClass - The class to apply to the letter (e.g., 'correct', 'contains', 'notContains').
 */
export function updateAlphabetContainer(guessedLetter, letterClass) {
  const container = document.getElementById('alphabetContainer');
  
  // Show the container if it's not already visible
  if (!container.classList.contains('visible')) {
    container.classList.add('visible');
  }
  
  const normalizedLetter = guessedLetter.toLowerCase();
  const letterElement = container.querySelector(`.keyboard-key[data-letter="${normalizedLetter}"]`);
  if (!letterElement) return; // Safety check
  
  letterElement.classList.remove('notGuessed', 'correct', 'contains', 'notContains');
  letterElement.classList.add(letterClass);
  
  // Update the aria-label for accessibility
  let status = 'unknown';
  if (letterClass === 'correct') {
    status = 'correct, in the right position';
  } else if (letterClass === 'contains') {
    status = 'in the word but wrong position';
  } else if (letterClass === 'notContains') {
    status = 'not in the word';
  }
  
  letterElement.setAttribute('aria-label', `Letter ${guessedLetter.toUpperCase()}, ${status}`);
}

/**
 * Creates a new row of input boxes for letter entry.
 * @param {number} wordLength - The length of the word to be guessed.
 * @param {function} checkRowLetters - A callback function to check the letters in the row.
 * @returns {HTMLElement} The newly created row element.
 */
export function createRow(wordLength, checkRowLetters) {
  const newRow = document.createElement('div');
  newRow.classList.add('wordRow');
  newRow.id = 'row_' + Math.random().toString(36).substr(2, 9);

  for (let i = 0; i < wordLength; i++) {
    let newInputBox = document.createElement('input');
    newInputBox.type = 'text';
    newInputBox.classList.add('wordLetterBox');
    newInputBox.maxLength = 1;
    newInputBox.autocomplete = 'off';
    newInputBox.autocorrect = 'off';
    newInputBox.autocapitalize = 'off';
    newInputBox.spellcheck = false;

    // Handle input events for letter entry
    newInputBox.addEventListener('input', () => {
      // Normalize the input to lowercase
      if (newInputBox.value) {
        newInputBox.value = newInputBox.value.toLowerCase();
      }
            
      // Validate the input is a letter
      if (!newInputBox.value.match(/^[a-z]$/i)) {
        newInputBox.value = ''; // clear the box if not a letter
        return;
      }

      // Move focus to next input after valid entry
      if (newInputBox.value && i < wordLength - 1) {
        // Small timeout to ensure the focus change works on mobile
        setTimeout(() => {
          newRow.children[i + 1].focus();
        }, 10);
      }
            
      // Check if the row is complete
      checkRowLetters();
    });

    // Handle keyboard navigation
    newInputBox.addEventListener('keydown', (event) => {
      // Backspace to previous input
      if (event.key === 'Backspace' && i > 0 && newInputBox.value === '') {
        newRow.children[i - 1].value = '';
        newRow.children[i - 1].focus();
        event.preventDefault();
      }
            
      // Arrow key navigation
      if (event.key === 'ArrowLeft' && i > 0) {
        newRow.children[i - 1].focus();
        event.preventDefault();
      }
      if (event.key === 'ArrowRight' && i < wordLength - 1) {
        newRow.children[i + 1].focus();
        event.preventDefault();
      }
    });
        
    // Touch-specific handling for mobile
    newInputBox.addEventListener('touchend', (e) => {
      // Prevent zoom on double-tap
      e.preventDefault();
      newInputBox.focus();
    });

    newRow.appendChild(newInputBox);
  }

  return newRow;
}

/**
 * Resets the game UI to its initial state.
 */
export function resetGameUI() {
  document.getElementById('wrapper').innerHTML = '';
  document.getElementById('startGame').style.display = 'block';
  document.querySelector('.wordLengthInputContainer').style.display = 'block';
  document.getElementById('wordLengthInput').value = '';
  document.getElementById('alphabetContainer').innerHTML = '';
  document.getElementById('alphabetContainer').style.display = 'none';
  document.getElementById('difficulty').style.display = 'none';
  document.getElementById('resetGame').style.display = 'none';
  const playAgainMainButton = document.getElementById('playAgainMain');
  if (playAgainMainButton) {
    playAgainMainButton.style.display = 'none';
  }
  
  // Reset hint system
  resetHintButtons();
}

/**
 * Updates the displayed difficulty level based on the word length.
 * @param {number} wordLength - The length of the word to determine the difficulty.
 */
export function updateDifficulty(wordLength) {
  const difficulty = document.getElementById('difficulty');
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

import { resetHintButtons } from './hintHandler.js';

/**
 * Creates the alphabet container and populates it with letters.
 * @param {Array<string>} alphabet - An array of letters to display in the container.
 */
export function createAlphabetContainer(alphabet) {
  const container = document.getElementById('alphabetContainer');
  container.innerHTML = '';  // Clear container
  
  // Add a title/label above the grid to clarify its purpose
  const label = document.createElement('div');
  label.classList.add('alphabet-label');
  label.textContent = 'Letter Status';
  container.appendChild(label);
  
  // Create a grid container for the letters
  const gridContainer = document.createElement('div');
  gridContainer.classList.add('alphabet-grid');
  
  // Create a more balanced layout
  // First 3 rows with 7 letters each (21 letters)
  const firstThreeRows = alphabet.slice(0, 21);
  // Last row with 5 letters, centered
  const lastRow = alphabet.slice(21);
  
  // Add first three rows (7 letters each)
  firstThreeRows.forEach(letter => {
    const span = document.createElement('span');
    span.textContent = letter;
    span.classList.add('notGuessed');
    span.setAttribute('aria-label', `Letter ${letter}, not yet guessed`);
    gridContainer.appendChild(span);
  });
  
  // Add spacer for centering last row if needed
  if (lastRow.length < 7) {
    const spacersNeeded = Math.floor((7 - lastRow.length) / 2);
    
    // Add left spacers
    for (let i = 0; i < spacersNeeded; i++) {
      const spacer = document.createElement('div');
      spacer.classList.add('letter-spacer');
      gridContainer.appendChild(spacer);
    }
    
    // Add the remaining letters
    lastRow.forEach(letter => {
      const span = document.createElement('span');
      span.textContent = letter;
      span.classList.add('notGuessed');
      span.setAttribute('aria-label', `Letter ${letter}, not yet guessed`);
      gridContainer.appendChild(span);
    });
    
    // Add right spacers
    for (let i = 0; i < spacersNeeded; i++) {
      const spacer = document.createElement('div');
      spacer.classList.add('letter-spacer');
      gridContainer.appendChild(spacer);
    }
  }
  
  container.appendChild(gridContainer);
  // Don't display the container yet - it will be shown after the first guess
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
  
  // Find the letter in the grid container by text content instead of position
  const letterElements = document.querySelectorAll('#alphabetContainer .alphabet-grid span');
  let letterElement = null;
  
  // Find the element with matching text content
  for (const element of letterElements) {
    if (element.textContent.toUpperCase() === guessedLetter.toUpperCase()) {
      letterElement = element;
      break;
    }
  }
  
  if (!letterElement) return; // Safety check
  
  letterElement.className = ''; // Remove all classes
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
  
  letterElement.setAttribute('aria-label', `Letter ${guessedLetter}, ${status}`);
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
  difficulty.style.display = 'block';
}
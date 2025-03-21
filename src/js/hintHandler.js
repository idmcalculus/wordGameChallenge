/**
 * Handles hint functionality for the Word Game
 */

// Track which hint type was used on the current row
let currentRowHintType = null;
let currentRowNumber = 0;

/**
 * Creates a container for hint buttons
 * @param {number} wordLength - Length of the current word
 * @param {function} getLetterHint - Function to get a letter hint
 * @param {function} getPositionHint - Function to get a position hint
 * @param {number} rowCount - Current row count
 * @returns {HTMLElement} - The hint buttons container
 */
export function createHintButtonsContainer(wordLength, getLetterHint, getPositionHint, rowCount) {
  const container = document.createElement('div');
  container.classList.add('hint-buttons-container');
  
  // Letter Hint Button (Soft Hint)
  const letterHintButton = document.createElement('button');
  letterHintButton.id = 'letterHintButton';
  letterHintButton.classList.add('hint-button', 'letter-hint');
  letterHintButton.textContent = 'Letter Reveal';
  letterHintButton.dataset.usesLeft = wordLength;
  letterHintButton.dataset.cooldownTime = 0;
  letterHintButton.dataset.hintType = 'letter';
  letterHintButton.title = `Reveals a correct letter (${wordLength} uses available)`;
  
  // Position Hint Button (Hard Hint)
  const positionHintButton = document.createElement('button');
  positionHintButton.id = 'positionHintButton';
  positionHintButton.classList.add('hint-button', 'position-hint');
  positionHintButton.textContent = 'Position Reveal';
  positionHintButton.dataset.usesLeft = 3;
  positionHintButton.dataset.cooldownTime = 0;
  positionHintButton.dataset.hintType = 'position';
  positionHintButton.title = 'Reveals a correct letter in the correct position (3 uses available)';
  
  // Initialize current row tracking
  currentRowNumber = rowCount;
  currentRowHintType = null;
  
  // Add event listeners
  letterHintButton.addEventListener('click', () => {
    if (letterHintButton.disabled) return;
    
    const usesLeft = parseInt(letterHintButton.dataset.usesLeft);
    if (usesLeft <= 0) return;
    
    // Check if we're on a new row
    if (rowCount !== currentRowNumber) {
      // Use the updateCurrentRow function to handle row changes
      updateCurrentRow(rowCount);
    }
    
    // Check if a different hint type was already used on this row
    if (currentRowHintType && currentRowHintType !== 'letter') {
      console.log('Cannot use Letter Reveal - Position Reveal already used on this row');
      alert('Only one type of hint can be used per row. You already used Position Reveal on this row.');
      return;
    }
    
    // Set the current hint type for this row
    currentRowHintType = 'letter';
    
    // Visually disable the other hint button
    const positionButton = document.getElementById('positionHintButton');
    if (positionButton) {
      positionButton.classList.add('inactive-hint');
    }
    
    // Provide the hint
    getLetterHint();
    
    // Update uses left
    const remainingUses = usesLeft - 1;
    letterHintButton.dataset.usesLeft = remainingUses;
    letterHintButton.title = `Reveals a correct letter (${remainingUses} uses left)`;

    // If no uses left, permanently disable the button
    if (remainingUses <= 0) {
      letterHintButton.disabled = true;
      letterHintButton.classList.add('inactive-hint');
      letterHintButton.title = 'No more Letter Reveals available';
      return;
    }
    
    // Calculate cooldown time (5s, 10s, 15s, etc.)
    const useCount = wordLength - usesLeft + 1;
    const cooldownTime = useCount * 5000; // 5 seconds * use count
    
    // Disable button and start cooldown
    startButtonCooldown(letterHintButton, cooldownTime);
  });
  
  positionHintButton.addEventListener('click', () => {
    if (positionHintButton.disabled) return;
    
    const usesLeft = parseInt(positionHintButton.dataset.usesLeft);
    if (usesLeft <= 0) return;
    
    // Check if we're on a new row
    if (rowCount !== currentRowNumber) {
      // Use the updateCurrentRow function to handle row changes
      updateCurrentRow(rowCount);
    }
    
    // Check if a different hint type was already used on this row
    if (currentRowHintType && currentRowHintType !== 'position') {
      console.log('Cannot use Position Reveal - Letter Reveal already used on this row');
      alert('Only one type of hint can be used per row. You already used Letter Reveal on this row.');
      return;
    }
    
    // Set the current hint type for this row
    currentRowHintType = 'position';
    
    // Visually disable the other hint button
    const letterButton = document.getElementById('letterHintButton');
    if (letterButton) {
      letterButton.classList.add('inactive-hint');
    }
    
    // Provide the hint
    getPositionHint();
    
    // Update uses left
    const remainingUses = usesLeft - 1;
    positionHintButton.dataset.usesLeft = remainingUses;
    positionHintButton.title = `Reveals a correct letter in the correct position (${remainingUses} uses left)`;

    // If no uses left, permanently disable the button
    if (remainingUses <= 0) {
      positionHintButton.disabled = true;
      positionHintButton.classList.add('inactive-hint');
      positionHintButton.title = 'No more Position Reveals available';
      return;
    }
    
    // Disable button and start cooldown (60 seconds)
    startButtonCooldown(positionHintButton, 60000);
  });
  
  container.appendChild(letterHintButton);
  container.appendChild(positionHintButton);
  
  return container;
}

/**
 * Starts a cooldown timer for a hint button
 * @param {HTMLButtonElement} button - The button to apply cooldown to
 * @param {number} cooldownTime - Cooldown time in milliseconds
 */
function startButtonCooldown(button, cooldownTime) {
  // Disable the button
  button.disabled = true;
  button.classList.add('cooldown');
  
  // Store the cooldown start time and duration
  const startTime = Date.now();
  button.dataset.cooldownStartTime = startTime;
  button.dataset.cooldownTime = cooldownTime;
  
  // Create progress indicator
  const progressIndicator = document.createElement('div');
  progressIndicator.classList.add('cooldown-progress');
  button.appendChild(progressIndicator);
  
  // Update the progress bar every 50ms
  const updateInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = cooldownTime - elapsed;
    
    if (remaining <= 0) {
      // Cooldown complete
      clearInterval(updateInterval);
      button.disabled = false;
      button.classList.remove('cooldown');
      if (progressIndicator.parentNode === button) {
        button.removeChild(progressIndicator);
      }
      return;
    }
    
    // Update progress bar width
    const progress = (elapsed / cooldownTime) * 100;
    progressIndicator.style.width = `${progress}%`;
  }, 50);
}

/**
 * Resets the hint buttons
 */
export function resetHintButtons() {
  const container = document.querySelector('.hint-buttons-container');
  if (container) {
    container.remove();
  }
  // Reset the row tracking
  currentRowHintType = null;
  currentRowNumber = 0;
}

/**
 * Explicitly resets the visual state of hint buttons
 */
export function resetHintButtonStates() {
  // Reset the current row hint type
  currentRowHintType = null;
  
  // Reset visual state of both buttons
  const letterButton = document.getElementById('letterHintButton');
  const positionButton = document.getElementById('positionHintButton');
  
  if (letterButton) {
    letterButton.classList.remove('inactive-hint');
  }
  
  if (positionButton) {
    positionButton.classList.remove('inactive-hint');
  }
  
  console.log('Hint button states have been reset');
}

/**
 * Updates the current row number for hint tracking
 * @param {number} rowNumber - The new row number
 */
export function updateCurrentRow(rowNumber) {
  // If the row number has changed, reset the hint type
  if (rowNumber !== currentRowNumber) {
    currentRowNumber = rowNumber;
    currentRowHintType = null;
    console.log(`Row changed to ${rowNumber}, hint type reset`);
    
    // Reset visual state of both buttons when moving to a new row
    resetHintButtonStates();
  }
}

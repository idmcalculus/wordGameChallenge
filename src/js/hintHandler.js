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
// Track total hints used across both buttons
let totalHintsUsed = 0;

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
  letterHintButton.title = `Reveals a correct letter (${wordLength - totalHintsUsed} hints remaining)`;
  
  // Position Hint Button (Hard Hint)
  const positionHintButton = document.createElement('button');
  positionHintButton.id = 'positionHintButton';
  positionHintButton.classList.add('hint-button', 'position-hint');
  positionHintButton.textContent = 'Position Reveal';
  positionHintButton.dataset.usesLeft = wordLength;
  positionHintButton.dataset.cooldownTime = 0;
  positionHintButton.dataset.hintType = 'position';
  positionHintButton.title = `Reveals a letter in its correct position (${wordLength - totalHintsUsed} hints remaining)`;
  
  // Initialize current row tracking
  currentRowNumber = rowCount;
  currentRowHintType = null;
  
  // Add event listeners
  letterHintButton.addEventListener('click', () => {
    if (letterHintButton.disabled) return;
    
    // Check total hints used against word length
    if (totalHintsUsed >= wordLength) {
      letterHintButton.disabled = true;
      positionHintButton.disabled = true;
      letterHintButton.classList.add('inactive-hint');
      positionHintButton.classList.add('inactive-hint');
      letterHintButton.title = 'No more hints available';
      positionHintButton.title = 'No more hints available';
      return;
    }
    
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
    
    // Update total hints used and remaining uses
    totalHintsUsed++;
    console.log(`Total hints used: ${totalHintsUsed} of ${wordLength}`);
    
    // Calculate remaining uses
    const remainingUses = wordLength - totalHintsUsed;
    
    // Update both buttons
    letterHintButton.dataset.usesLeft = remainingUses;
    positionHintButton.dataset.usesLeft = remainingUses;
    letterHintButton.title = `Reveals a correct letter (${remainingUses} hints remaining)`;
    positionHintButton.title = `Reveals a letter in its correct position (${remainingUses} hints remaining)`;
    
    // If we've used all hints, disable both buttons
    if (totalHintsUsed >= wordLength) {
      letterHintButton.disabled = true;
      positionHintButton.disabled = true;
      letterHintButton.classList.add('inactive-hint');
      positionHintButton.classList.add('inactive-hint');
      letterHintButton.title = 'No more hints available';
      positionHintButton.title = 'No more hints available';
      console.log('All hints used - buttons disabled');
      return;
    }
    
    // Only start cooldown if we haven't used all hints
    if (totalHintsUsed < wordLength) {
      // Calculate cooldown time (5s, 10s, 15s, etc.)
      const useCount = totalHintsUsed;
      const cooldownTime = useCount * 5000; // 5 seconds * use count
      
      // Disable button and start cooldown
      startButtonCooldown(letterHintButton, cooldownTime);
    }
  });
  
  positionHintButton.addEventListener('click', () => {
    if (positionHintButton.disabled) return;
    
    // Check total hints used against word length
    if (totalHintsUsed >= wordLength) {
      letterHintButton.disabled = true;
      positionHintButton.disabled = true;
      letterHintButton.classList.add('inactive-hint');
      positionHintButton.classList.add('inactive-hint');
      letterHintButton.title = 'No more hints available';
      positionHintButton.title = 'No more hints available';
      return;
    }
    
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
    
    // Update total hints used and remaining uses
    totalHintsUsed++;
    console.log(`Total hints used: ${totalHintsUsed} of ${wordLength}`);
    
    // Calculate remaining uses
    const remainingUses = wordLength - totalHintsUsed;
    
    // Update both buttons
    letterHintButton.dataset.usesLeft = remainingUses;
    positionHintButton.dataset.usesLeft = remainingUses;
    letterHintButton.title = `Reveals a correct letter (${remainingUses} hints remaining)`;
    positionHintButton.title = `Reveals a letter in its correct position (${remainingUses} hints remaining)`;
    
    // If we've used all hints, disable both buttons
    if (totalHintsUsed >= wordLength) {
      letterHintButton.disabled = true;
      positionHintButton.disabled = true;
      letterHintButton.classList.add('inactive-hint');
      positionHintButton.classList.add('inactive-hint');
      letterHintButton.title = 'No more hints available';
      positionHintButton.title = 'No more hints available';
      console.log('All hints used - buttons disabled');
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
  // Reset all hint tracking
  currentRowHintType = null;
  currentRowNumber = 0;
  totalHintsUsed = 0;
  console.log('All hint tracking reset');
}

/**
 * Explicitly resets the visual state of hint buttons
 */
export function resetHintButtonStates() {
  // Only reset row-specific tracking
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
  // If the row number has changed, update row-specific state
  if (rowNumber !== currentRowNumber) {
    currentRowNumber = rowNumber;
    currentRowHintType = null;
    console.log(`Row changed to ${rowNumber}, hint type reset. Total hints used: ${totalHintsUsed}`);
    
    // Get the buttons and update their states based on total hints used
    const letterButton = document.getElementById('letterHintButton');
    const positionButton = document.getElementById('positionHintButton');
    
    if (letterButton && positionButton) {
      // Get the word length from the original data
      const wordLength = parseInt(letterButton.dataset.usesLeft) + totalHintsUsed;
      const remainingHints = wordLength - totalHintsUsed;
      
      console.log(`Word length: ${wordLength}, Remaining hints: ${remainingHints}`);
      
      // Update button states
      letterButton.dataset.usesLeft = remainingHints;
      positionButton.dataset.usesLeft = remainingHints;
      
      // Update tooltips
      letterButton.title = `Reveals a correct letter (${remainingHints} hints remaining)`;
      positionButton.title = `Reveals a letter in its correct position (${remainingHints} hints remaining)`;
      
      // If all hints are used, keep buttons disabled
      if (totalHintsUsed >= wordLength) {
        letterButton.disabled = true;
        positionButton.disabled = true;
        letterButton.classList.add('inactive-hint');
        positionButton.classList.add('inactive-hint');
        letterButton.title = 'No more hints available';
        positionButton.title = 'No more hints available';
        console.log('All hints used - buttons remain disabled');
      } else {
        // Otherwise, ensure they're enabled (unless in cooldown)
        if (!letterButton.classList.contains('cooldown')) {
          letterButton.disabled = false;
          letterButton.classList.remove('inactive-hint');
        }
        if (!positionButton.classList.contains('cooldown')) {
          positionButton.disabled = false;
          positionButton.classList.remove('inactive-hint');
        }
      }
    }
  }
}

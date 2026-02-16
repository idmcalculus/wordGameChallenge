import { showAlert } from './modals.js';
import { startTimer, stopTimer } from './utils/timerUtils.js';
import { createAlphabetContainer, updateAlphabetContainer, createRow, resetGameUI, updateDifficulty } from './uiHandler.js';
import { validateWord, fetchPossibleWords } from './apiHandler.js';
import { createHintButtonsContainer, resetHintButtons, updateCurrentRow, resetHintButtonStates } from './hintHandler.js';
import { StatsManager } from './components/StatsManager.js';
import { logger } from './utils/logger.js';

class WordGame {
  /**
   * Provides a hint for a letter that exists in the word (may not be in correct position)
   */
  getLetterHint() {
    if (!this.currentWord || !this.currentRow) return;
    
    // Get letter info from previous rows and current row
    const previousRowsInfo = this.getPreviousRowsLetterInfo();
    
    // Get all letter occurrences in the word with their positions
    const letterOccurrences = {};
    const letterCounts = {};
    
    // Count total occurrences of each letter in the word
    this.currentWord.split('').forEach((letter, index) => {
      const lowerLetter = letter.toLowerCase();
      letterCounts[lowerLetter] = (letterCounts[lowerLetter] || 0) + 1;
      
      if (!letterOccurrences[lowerLetter]) {
        letterOccurrences[lowerLetter] = [];
      }
      letterOccurrences[lowerLetter].push(index);
    });

    // Count how many times each letter has been revealed
    const revealedCounts = {};
    previousRowsInfo.usedLetters.forEach(letter => {
      revealedCounts[letter] = (revealedCounts[letter] || 0) + 1;
    });

    // Find available letters that:
    // 1. Haven't been revealed in the alphabet display
    // 2. Haven't been used in previous rows
    // 3. Have multiple occurrences and we haven't found them all
    const availableLetters = Object.entries(letterOccurrences)
      .filter(([letter]) => {
        // If the letter hasn't been revealed at all, it's available
        if (!previousRowsInfo.usedLetters.has(letter)) {
          return true;
        }

        // If we've revealed this letter before, check if we've revealed all occurrences
        const totalOccurrences = letterCounts[letter];
        const revealedOccurrences = revealedCounts[letter] || 0;
        
        // Only available if we haven't revealed all occurrences
        return revealedOccurrences < totalOccurrences;
      })
      .map(([letter]) => letter);

    if (availableLetters.length === 0) return; // No available letters to hint

    // Choose a random letter to reveal
    const hintLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
    
    // Make sure the alphabet container is visible
    const container = document.getElementById('alphabetContainer');
    if (!container.classList.contains('visible')) {
      container.classList.add('visible');
    }

    // Update the alphabet display to show this letter as "present but wrong position"
    this.updateAlphabetContainer(hintLetter, 'contains');

    // Update our tracking of used letters immediately
    previousRowsInfo.usedLetters.add(hintLetter);
    previousRowsInfo.incorrectPositions.add(hintLetter);

  }
  /**
   * Provides a hint for a letter in its correct position
   */
  getPositionHint() {
    if (!this.currentWord || !this.currentRow) return;
    
    // Get all input boxes in the current row
    const inputs = Array.from(this.currentRow.getElementsByTagName('input'));
    
    // Get letter info from previous rows
    const previousRowsInfo = this.getPreviousRowsLetterInfo();
    
    // Find positions where:
    // 1. Position doesn't have a correct letter from previous rows
    // 2. Position is empty or has wrong letter
    // 3. The letter at that position hasn't been found yet
    const availablePositions = [];
    
    for (let i = 0; i < this.wordLength; i++) {
      // Skip positions that already have correct letters
      if (previousRowsInfo.correctPositions[i]) continue;
      
      // Check if position needs a hint
      if (!inputs[i].value || inputs[i].value !== this.currentWord[i]) {
        const letter = this.currentWord[i];
        const lowerLetter = letter.toLowerCase();
        
        // Skip if we've already found this letter
        if (previousRowsInfo.usedLetters.has(lowerLetter)) {
          // Unless it occurs multiple times and we haven't found them all
          const totalOccurrences = this.getLetterCounts(this.currentWord)[lowerLetter];
          const foundOccurrences = Array.from(previousRowsInfo.usedLetters)
            .filter(l => l === lowerLetter).length;
          if (foundOccurrences >= totalOccurrences) continue;
        }
        
        availablePositions.push(i);
      }
    }
    
    if (availablePositions.length === 0) return; // No available positions
    
    // Choose random position and reveal
    const targetPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    inputs[targetPosition].value = this.currentWord[targetPosition];
    
    // Highlight the hint
    inputs[targetPosition].classList.add('hint-provided');
    setTimeout(() => inputs[targetPosition].classList.remove('hint-provided'), 2000);
  }
  /**
   * Gets information about letters used in previous rows
   * @returns {Object} Information about letter usage in previous rows
   */
  getPreviousRowsLetterInfo() {
    const letterInfo = {
      correctPositions: {}, // Map of position -> letter for correct positions
      usedLetters: new Set(), // All letters used in previous rows
      incorrectPositions: new Set() // Letters found but in wrong positions
    };
    
    // Check alphabet display for already revealed letters
    const alphabetContainer = document.getElementById('alphabetContainer');
    if (alphabetContainer) {
      const alphabetLetters = alphabetContainer.querySelectorAll('.alphabet-grid .keyboard-key[data-letter]');
      alphabetLetters.forEach(letterKey => {
        const letter = letterKey.dataset.letter;
        if (letterKey.classList.contains('correct')) {
          // Find the position of this correct letter in the word
          const position = this.currentWord.toLowerCase().indexOf(letter);
          if (position !== -1) {
            letterInfo.correctPositions[position] = letter;
            letterInfo.usedLetters.add(letter);
          }
        } else if (letterKey.classList.contains('contains')) {
          letterInfo.incorrectPositions.add(letter);
          letterInfo.usedLetters.add(letter);
        } else if (letterKey.classList.contains('notContains')) {
          letterInfo.usedLetters.add(letter);
        }
      });
    }
    
    // Look at all rows before the current one
    const rows = document.querySelectorAll('.wrapper .wordRow');
    const currentRowIndex = Array.from(rows).indexOf(this.currentRow);

    for (let i = 0; i < currentRowIndex; i++) {
      const inputs = Array.from(rows[i].getElementsByTagName('input'));
      inputs.forEach((input, position) => {
        if (!input.value) return;
        
        const letter = input.value.toLowerCase();
        letterInfo.usedLetters.add(letter);
        
        if (letter === this.currentWord[position].toLowerCase()) {
          letterInfo.correctPositions[position] = letter;
        } else if (this.currentWord.toLowerCase().includes(letter)) {
          letterInfo.incorrectPositions.add(letter);
        }
      });
    }

    return letterInfo;
  }

  /**
   * Gets letters used in the current row
   * @returns {Array} Array of letters in current row
   */
  getCurrentRowLetters() {
    if (!this.currentRow) return [];
    
    const rowLetters = [];
    const inputs = Array.from(this.currentRow.getElementsByTagName('input'));
    
    inputs.forEach(input => {
      if (input.value && input.value.trim() !== '') {
        rowLetters.push(input.value.toLowerCase());
      }
    });
    
    return rowLetters;
  }

  /**
   * Counts occurrences of each letter in a word or array of letters
   * @param {string|Array} letters - Word or array of letters to count
   * @returns {Object} Map of letter counts
   */
  getLetterCounts(letters) {
    const counts = {};
    const letterArray = typeof letters === 'string' ? letters.split('') : letters;
    
    for (const letter of letterArray) {
      const lowerLetter = letter.toLowerCase();
      counts[lowerLetter] = (counts[lowerLetter] || 0) + 1;
    }
    
    return counts;
  }
  
  /**
   * Logs the current state of the game for debugging
   */
  logGameState() {
    logger.debug('Current word:', this.currentWord);
    logger.debug('Current row count:', this.rowCount);
    
    // Log all rows and their inputs
    const rows = document.querySelectorAll('.wrapper .wordRow');
    rows.forEach((row, index) => {
      const inputs = Array.from(row.getElementsByTagName('input'));
      const values = inputs.map(input => input.value || '_').join('');
      logger.debug(`Row ${index + 1}: ${values}`);
    });
  }
  
  constructor() {
    this.possibleWords = [];
    this.alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    this.currentWord = '';
    this.currentRow = null;
    this.attempts = 0;
    this.rowCount = 0;
    this.maximumAttempts = 5;
    this.wordLength = '';
    this.startTime = null;
    this.timerDisplay = null;
    this.timerId = null;
    this.isCheckingRow = false;

    // Initialize stats from localStorage
    const oldStats = localStorage.getItem('highScores');
    const savedStats = localStorage.getItem('stats');
    
    // Transform old stats to new format
    const transformedOldStats = oldStats ? JSON.parse(oldStats).map(stat => ({
      time: stat.score, // Use score as time
      word: stat.word,
      wordLength: stat.wordLength,
      attempts: stat.attempts,
      date: stat.date
    })) : [];

    // Merge old stats with new stats
    this.stats = savedStats ? JSON.parse(savedStats) : [];
    this.stats = [...transformedOldStats, ...this.stats]; // Combine old and new stats

    this.init();
  }

  init() {
    // Add input validation for the word length input
    const wordLengthInput = document.getElementById('wordLengthInput');
    
    // Set a default value
    wordLengthInput.value = 3;
    
    // Add event listener to validate input on blur (when focus leaves the input)
    // This allows users to delete and type freely while editing
    wordLengthInput.addEventListener('blur', function() {
      // Only validate when the input loses focus
      let value = parseInt(this.value);
      
      if (isNaN(value)) {
        // If not a number, reset to default
        this.value = 3;
      } else if (value < 3) {
        // If less than minimum, set to minimum
        this.value = 3;
      } else if (value > 10) {
        // If greater than maximum, set to maximum
        this.value = 10;
      }
    });
    
    // Also validate on keyup for better UX
    wordLengthInput.addEventListener('keyup', function(e) {
      // Allow empty field during editing
      if (this.value === '') return;
      
      // Allow backspace and delete keys without immediate validation
      if (e.key === 'Backspace' || e.key === 'Delete') return;
      
      const value = parseInt(this.value);
      
      // Only enforce max limit during typing
      if (value > 10) {
        this.value = 10;
      }
    });
    
    document.getElementById('startGame').addEventListener('click', () => {
      this.play();
    });

    document.getElementById('resetGame').addEventListener('click', () => {
      this.resetGame();
    });
  }

  async play() {
    // Reset round tracking before creating the first row.
    this.rowCount = 0;
    this.attempts = 0;

    // Start the timer
    this.startTime = new Date();
    this.timerDisplay = document.getElementById('timerDisplay');
    this.timerId = startTimer(this.startTime, this.timerDisplay);

    // Hide the start game button and word length input
    document.getElementById('startGame').style.display = 'none';
    document.querySelector('.wordLengthInputContainer').style.display = 'none';
    document.getElementById('resetGame').style.display = 'block';

    // Get and validate word length
    const wordLengthInput = document.getElementById('wordLengthInput').value;
    this.wordLength = parseInt(wordLengthInput);
        
    if (isNaN(this.wordLength) || this.wordLength < 3 || this.wordLength > 10) {
      // For game start page, show only the Reset Game button with styled alert
      // Pass true as the fourth parameter to indicate this is a game start alert
      showAlert(`<div class="failure-alert">
        <span class="alert-icon">⚠️</span>
        <h3>Invalid Input</h3>
        <p>Please enter a valid number between 3 and 10</p>
      </div>`, null, () => {
        this.resetGame();
      }, true);
      return;
    }

    updateDifficulty(this.wordLength);

    // Generate a pattern for words with at most wordLength letters
    const pattern = '?'.repeat(this.wordLength);

    // Fetch possible words and initialize the game
    try {
      this.possibleWords = await fetchPossibleWords(pattern, this.wordLength);
      this.currentWord = this.possibleWords[Math.floor(Math.random() * this.possibleWords.length)];
      
      // Initialize the alphabet container after we have a word
      this.createAlphabetContainer();
      
      // Show the keyboard container for tile input.
      const container = document.getElementById('alphabetContainer');
      container.style.display = '';
      container.classList.add('visible');
      
      this.createRow();
    } catch (error) {
      logger.error(error, { source: 'WordGame.play' });
      document.getElementById('startGame').disabled = false;
      document.getElementById('wordLengthInput').disabled = false;
    }

    // Update game header
    document.getElementById('gameHeader').innerHTML = `Find the ${this.wordLength} letter word ...`;
    
    // Create and mount hint buttons in the dedicated includesHintButtons container.
    createHintButtonsContainer(
      this.wordLength, 
      this.getLetterHint.bind(this), 
      this.getPositionHint.bind(this),
      this.rowCount
    );

  }

  createAlphabetContainer() {
    createAlphabetContainer(this.alphabet, this.handleVirtualKeyInput.bind(this));
  }

  updateAlphabetContainer(guessedLetter, letterClass) {
    // Show the alphabet container when the first guess is made
    const container = document.getElementById('alphabetContainer');
    if (!container.classList.contains('visible')) {
      container.classList.add('visible');
    }
    
    updateAlphabetContainer(guessedLetter, letterClass);
  }

  getCurrentRowInputs() {
    if (!this.currentRow) {
      return [];
    }

    return Array.from(this.currentRow.querySelectorAll('input.wordLetterBox'));
  }

  getActiveCurrentRowInput() {
    const activeElement = document.activeElement;
    if (
      activeElement &&
      activeElement.tagName === 'INPUT' &&
      activeElement.classList.contains('wordLetterBox') &&
      activeElement.closest('.wordRow') === this.currentRow &&
      !activeElement.disabled
    ) {
      return activeElement;
    }

    return null;
  }

  handleVirtualLetterInput(letter, inputs) {
    const activeInput = this.getActiveCurrentRowInput();
    let targetInput = activeInput || inputs.find((input) => !input.disabled && input.value === '');

    if (!targetInput) {
      targetInput = inputs.find((input) => !input.disabled);
    }

    if (!targetInput) {
      return;
    }

    targetInput.focus();
    targetInput.value = letter;
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  handleVirtualDelete(inputs) {
    const activeInput = this.getActiveCurrentRowInput();

    if (activeInput) {
      if (activeInput.value) {
        activeInput.value = '';
        return;
      }

      const activeIndex = inputs.indexOf(activeInput);
      if (activeIndex > 0) {
        inputs[activeIndex - 1].value = '';
        inputs[activeIndex - 1].focus();
      }
      return;
    }

    const firstEmptyIndex = inputs.findIndex((input) => !input.disabled && input.value === '');
    if (firstEmptyIndex > 0) {
      inputs[firstEmptyIndex - 1].value = '';
      inputs[firstEmptyIndex - 1].focus();
      return;
    }

    const reversed = [...inputs].reverse();
    const lastFilled = reversed.find((input) => !input.disabled && input.value);
    if (lastFilled) {
      lastFilled.value = '';
      lastFilled.focus();
    }
  }

  handleVirtualArrow(direction, inputs) {
    const move = direction === 'arrowleft' ? -1 : 1;
    const activeInput = this.getActiveCurrentRowInput();

    if (!activeInput) {
      const fallback = direction === 'arrowleft'
        ? [...inputs].reverse().find((input) => !input.disabled)
        : inputs.find((input) => !input.disabled && input.value === '') || inputs.find((input) => !input.disabled);
      if (fallback) {
        fallback.focus();
      }
      return;
    }

    const activeIndex = inputs.indexOf(activeInput);
    const targetIndex = Math.max(0, Math.min(inputs.length - 1, activeIndex + move));
    inputs[targetIndex].focus();
  }

  async animateCurrentRowSomersault(inputs) {
    if (!inputs || inputs.length === 0) {
      return;
    }

    this.currentRow.classList.remove('row-somersaulting');

    inputs.forEach((input) => {
      input.classList.remove('row-complete-spin');
    });

    void inputs[0].offsetWidth; // Reflow to reliably restart animation
    this.currentRow.classList.add('row-somersaulting');
    inputs.forEach((input) => input.classList.add('row-complete-spin'));

    const spinDuration = 720;
    await new Promise((resolve) => setTimeout(resolve, spinDuration));

    this.currentRow.classList.remove('row-somersaulting');
    inputs.forEach((input) => {
      input.classList.remove('row-complete-spin');
    });
  }

  handleVirtualKeyInput(key) {
    if (!this.currentRow || !key) {
      return;
    }

    const inputs = this.getCurrentRowInputs();
    if (inputs.length === 0 || inputs.every((input) => input.disabled)) {
      return;
    }

    const normalizedKey = key.toLowerCase();
    if (/^[a-z]$/.test(normalizedKey)) {
      this.handleVirtualLetterInput(normalizedKey, inputs);
      return;
    }

    if (normalizedKey === 'delete') {
      this.handleVirtualDelete(inputs);
      return;
    }

    if (normalizedKey === 'arrowleft' || normalizedKey === 'arrowright') {
      this.handleVirtualArrow(normalizedKey, inputs);
      return;
    }

    if (normalizedKey === 'enter') {
      this.checkRowLetters();
    }
  }

  createRow() {
    this.currentRow = createRow(this.wordLength, this.checkRowLetters.bind(this));
    document.querySelector('.wrapper').appendChild(this.currentRow);
    this.rowCount++;
    this.currentRow.firstChild.focus();
    
    // Explicitly reset the hint button states for the new row
    resetHintButtonStates();
    
    // Update the current row in the hint handler to track which hint type was used
    updateCurrentRow(this.rowCount);
        
    // Hint buttons are now added once below the wrapper in the play method
  }

  async checkRowLetters() {
    if (!this.currentRow) {
      return;
    }
    if (this.isCheckingRow || !this.testIsRowComplete()) {
      return;
    }

    this.isCheckingRow = true;

    try {
      // Get the entered word from the current row
      const inputs = Array.from(this.currentRow.getElementsByTagName('input'));

      // Row-complete somersault before checking colors
      await this.animateCurrentRowSomersault(inputs);

      const enteredWord = inputs.map((input) => input.value).join('');

      // Check if the entered word is a valid English word
      const isValidWord = await validateWord(enteredWord);

      if (!isValidWord) {
        // Create try again callback - clears only the current row
        const tryAgainCallback = () => {
          // Clear the inputs in the current row
          inputs.forEach((input) => {
            input.value = '';
            input.classList.remove('correct', 'contains', 'notContains', 'row-complete-spin');
          });
          // Focus on the first input
          inputs[0].focus();
        };

        // Reset game callback - resets the entire game
        const resetGameCallback = () => {
          this.resetGame();
        };

        // Show an alert with both Try Again and Reset Game buttons
        showAlert(`<div class="invalid-word-alert">
        <span class="alert-icon">⚠️</span>
        <h3>Invalid Word</h3>
        <p>"${enteredWord}" is not a valid English word.</p>
        <p>Please try again with a valid word.</p>
      </div>`, tryAgainCallback, resetGameCallback);
        return;
      }

      const letterStates = {};         // Track the state of each letter in each position (correct, contains, notContains)
      const wordLetterCounts = {};    // Track remaining occurrences of each letter in the target word
      const alphabetLetterStates = {}; // Track the best state for each letter in the alphabet

      // Initialize wordLetterCounts with the frequency of each letter in the current word
      for (const letter of this.currentWord) {
        wordLetterCounts[letter] = (wordLetterCounts[letter] || 0) + 1;
      }

      let totalCorrect = 0; // Counter for correctly guessed letters

      // First Pass: Mark correct letters and track remaining occurrences
      for (let i = 0; i < this.wordLength; i++) {
        let inputBox = this.currentRow.children[i];
        let enteredLetter = inputBox.value;
        let correctLetter = this.currentWord[i];

        if (enteredLetter === correctLetter) {
          inputBox.classList.add('correct'); // Visually mark as correct
          letterStates[i] = 'correct'; // Track this position as correct
          // Track this as the best state for this letter in the alphabet
          alphabetLetterStates[enteredLetter] = 'correct';
          totalCorrect++; // Increment total correct count
          wordLetterCounts[enteredLetter]--; // Decrement remaining count in the word
        }
      }

      // Second Pass: Handle misplaced and not contained letters
      for (let i = 0; i < this.wordLength; i++) {
        let inputBox = this.currentRow.children[i];
        let enteredLetter = inputBox.value;

        // Skip positions already marked as correct
        if (letterStates[i] === 'correct') {
          continue;
        }

        // Check if the letter exists in the word and we haven't used all occurrences yet
        if (this.currentWord.includes(enteredLetter) && wordLetterCounts[enteredLetter] > 0) {
          inputBox.classList.add('contains');
          letterStates[i] = 'contains';
          // Only update alphabet state if we don't already have a better state (correct)
          if (!alphabetLetterStates[enteredLetter] || alphabetLetterStates[enteredLetter] !== 'correct') {
            alphabetLetterStates[enteredLetter] = 'contains';
          }
          wordLetterCounts[enteredLetter]--; // Decrement remaining count in the word
        } else {
          // Either the letter is not in the word at all, or all occurrences have been accounted for
          inputBox.classList.add('notContains');
          letterStates[i] = 'notContains';
          // Only update alphabet state if we don't already have a better state (correct or contains)
          if (!alphabetLetterStates[enteredLetter] &&
              (!this.currentWord.includes(enteredLetter) ||
              alphabetLetterStates[enteredLetter] !== 'contains')) {
            alphabetLetterStates[enteredLetter] = 'notContains';
          }
        }
      }

      // Update the alphabet container with the best state for each letter
      for (const [letter, state] of Object.entries(alphabetLetterStates)) {
        this.updateAlphabetContainer(letter, state);
      }

      Array.from(this.currentRow.children).forEach((input) => {
        input.disabled = true;
      }); // Disable inputs after checking

      // Game logic:
      setTimeout(() => {
        if (totalCorrect === this.wordLength) {
          this.gameWon(); // Player guessed the word correctly
        } else if (this.rowCount >= this.maximumAttempts) {
          this.gameLost(); // Player ran out of attempts
        } else {
          // Reset hint button states before creating a new row
          resetHintButtonStates();
          this.createRow(); // Create a new row for the next guess
        }
      }, 100); // Add a slight delay for visual feedback
    } finally {
      this.isCheckingRow = false;
    }
  }

  testIsRowComplete() {
    if (!this.currentRow) {
      return false;
    }

    // Check if all inputs have values
    return Array.from(this.currentRow.getElementsByTagName('input')).every(input => input.value);
  }

  gameWon() {
    stopTimer(this.timerId);

    const timeTaken = Math.floor((new Date() - this.startTime) / 1000);
        
    // Add stat with timestamp and word info
    this.stats.push({
      time: timeTaken,
      word: this.currentWord,
      wordLength: this.wordLength,
      attempts: this.rowCount,
      date: new Date().toISOString()
    });
        
    // Sort all times by time, then attempts, then date (most recent first)
    this.stats.sort((a, b) => {
      // Handle both new format (object) and old format (number)
      const statA = typeof a === 'object' ? a.time : a;
      const statB = typeof b === 'object' ? b.time : b;
      
      // First sort by time (ascending)
      if (statA !== statB) {
        return statA - statB;
      }
      
      // If times are equal and both are objects with attempts, sort by attempts (ascending)
      if (typeof a === 'object' && typeof b === 'object' && 'attempts' in a && 'attempts' in b) {
        if (a.attempts !== b.attempts) {
          return a.attempts - b.attempts;
        }
        
        // If attempts are also equal, sort by date (most recent first)
        if ('date' in a && 'date' in b) {
          return new Date(b.date) - new Date(a.date);
        }
      }
      
      return 0; // Equal ranking if we can't determine further ordering
    });

    localStorage.setItem('stats', JSON.stringify(this.stats));

    this.displayStats();

    // For game won, show Play Again and New Game options
    showAlert(`<div class="success-alert">
      <span class="alert-icon">🎉</span>
      <h3>Congratulations!</h3>
      <p>Well done! You solved it in ${timeTaken} seconds with ${this.rowCount} attempts.</p>
      <p>The word was: <strong>${this.currentWord}</strong></p>
    </div>`, 
    () => { this.playAgain(); }, 
    () => { this.resetGame(); }, 
    false, 
    'Play Again', 
    'New Game');
  }

  gameLost() {
    stopTimer(this.timerId);

    // For game lost, show Play Again and New Game options
    showAlert(`<div class="failure-alert">
      <span class="alert-icon">😕</span>
      <h3>Game Over</h3>
      <p>Sorry, you've reached the maximum number of attempts.</p>
      <p>The word was: <strong>${this.currentWord}</strong></p>
    </div>`, 
    () => { this.playAgain(); }, 
    () => { this.resetGame(); }, 
    false, 
    'Play Again', 
    'New Game');
  }

  displayStats() {
    const statsContainer = document.getElementById('statsList');
    
    if (!statsContainer) {
      logger.error(new Error('Stats container not found'), { source: 'WordGame.displayStats' });
      return;
    }

    // Clear existing content
    statsContainer.innerHTML = '';

    // Check if there are any stats
    if (!this.stats || this.stats.length === 0) {
      statsContainer.innerHTML = '<p class="no-stats">No stats yet. Complete a game to see your stats here!</p>';
      return;
    }

    // Initialize StatsManager with the container and stats
    new StatsManager(statsContainer, this.stats);
  }

  playAgain() {
    // Clear the board
    document.getElementById('wrapper').innerHTML = '';
    
    // Reset hints
    resetHintButtons();
    
    // Reset alphabet
    const alphabetContainer = document.getElementById('alphabetContainer');
    alphabetContainer.innerHTML = '';
    alphabetContainer.classList.remove('visible');
    alphabetContainer.style.display = 'none';
    
    // Reset state
    this.rowCount = 0;
    this.currentWord = '';
    this.possibleWords = [];
    if (this.timerDisplay) {
      this.timerDisplay.style.display = 'none';
    }
    
    // Ensure the input has the correct value
    const wordLengthInput = document.getElementById('wordLengthInput');
    if (wordLengthInput) {
      wordLengthInput.value = this.wordLength;
    }

    // Call play to start a new game
    this.play();
  }

  resetGame() {
    resetGameUI();
    resetHintButtons();
    this.rowCount = 0;
    this.currentWord = '';
    this.wordLength = '';
    this.possibleWords = [];
    this.timerDisplay.style.display = 'none';
  }
}

export default WordGame;

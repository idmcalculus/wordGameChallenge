import { showAlert } from './modals.js';
import { startTimer, stopTimer } from './gameUtils.js';
import { createAlphabetContainer, updateAlphabetContainer, createRow, resetGameUI, updateDifficulty } from './uiHandler.js';
import { fetchPossibleWords } from './apiHandler.js';
import { createHintButtonsContainer, resetHintButtons, updateCurrentRow, resetHintButtonStates } from './hintHandler.js';

class WordGame {
  /**
   * Provides a hint for a letter that exists in the word (may not be in correct position)
   */
  getLetterHint() {
    if (!this.currentWord || !this.currentRow) return;
    
    // Get all input boxes in the current row
    const inputs = Array.from(this.currentRow.getElementsByTagName('input'));
    
    // Find empty inputs or inputs with incorrect letters
    const availableInputs = inputs.filter((input) => {
      // If input is empty, it's available
      if (!input.value) return true;
      
      // If input has a letter that's not in the word, it's available
      return !this.currentWord.includes(input.value);
    });
    
    if (availableInputs.length === 0) return; // No available inputs
    
    // Choose a random input from available inputs
    const targetInput = availableInputs[Math.floor(Math.random() * availableInputs.length)];
    
    // Get all letters that have been used in any row so far
    const usedLetters = this.getUsedLetters();
    
    // Count occurrences of each letter in the word (case insensitive)
    const letterCounts = {};
    for (const letter of this.currentWord) {
      const lowerLetter = letter.toLowerCase();
      letterCounts[lowerLetter] = (letterCounts[lowerLetter] || 0) + 1;
    }
    
    // Count how many of each letter have already been used
    const usedLetterCounts = {};
    for (const letter of usedLetters) {
      usedLetterCounts[letter] = (usedLetterCounts[letter] || 0) + 1;
    }
    
    console.log('Word letter counts:', letterCounts);
    console.log('Used letter counts:', usedLetterCounts);
    
    // Find available letters that haven't been used yet or have multiple occurrences
    const availableLetters = this.currentWord.split('').filter(letter => {
      const lowerLetter = letter.toLowerCase();
      // If the letter hasn't been used at all, it's available
      if (!usedLetters.includes(lowerLetter)) return true;
      
      // If the letter occurs multiple times in the word and we haven't used all occurrences yet
      const letterCount = letterCounts[lowerLetter] || 0;
      const usedCount = usedLetterCounts[lowerLetter] || 0;
      if (letterCount > usedCount) return true;
      
      // Otherwise, the letter has been fully used
      return false;
    });
    
    console.log('Available letters for hint:', availableLetters);
    
    if (availableLetters.length === 0) return; // No available letters to hint
    
    // Choose a random letter from available letters
    const hintLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
    
    // Set the letter in the input
    targetInput.value = hintLetter;
    
    // Highlight the input to indicate it was a hint
    targetInput.classList.add('hint-provided');
    setTimeout(() => {
      targetInput.classList.remove('hint-provided');
    }, 2000);
  }
  
  /**
   * Provides a hint for a letter in its correct position
   */
  getPositionHint() {
    if (!this.currentWord || !this.currentRow) return;
    
    // Get all input boxes in the current row
    const inputs = Array.from(this.currentRow.getElementsByTagName('input'));
    
    // Get all letters that have been used in any row so far
    const usedLetters = this.getUsedLetters();
    
    // Count occurrences of each letter in the word (case insensitive)
    const letterCounts = {};
    for (const letter of this.currentWord) {
      const lowerLetter = letter.toLowerCase();
      letterCounts[lowerLetter] = (letterCounts[lowerLetter] || 0) + 1;
    }
    
    // Count how many of each letter have already been used
    const usedLetterCounts = {};
    for (const letter of usedLetters) {
      usedLetterCounts[letter] = (usedLetterCounts[letter] || 0) + 1;
    }
    
    console.log('Word letter counts:', letterCounts);
    console.log('Used letter counts:', usedLetterCounts);
    
    // Find positions where the letter is not correctly guessed yet
    // AND the letter hasn't been fully used (unless it occurs multiple times)
    const availablePositions = [];
    
    for (let i = 0; i < this.wordLength; i++) {
      // If position is empty or has wrong letter, it's available
      if (!inputs[i].value || inputs[i].value !== this.currentWord[i]) {
        const letter = this.currentWord[i];
        const lowerLetter = letter.toLowerCase();
        
        // Check if this letter is available to be hinted
        const letterCount = letterCounts[lowerLetter] || 0;
        const usedCount = usedLetterCounts[lowerLetter] || 0;
        
        const letterIsAvailable = 
          !usedLetters.includes(lowerLetter) || // Letter hasn't been used at all
          letterCount > usedCount; // Letter occurs multiple times
        
        if (letterIsAvailable) {
          availablePositions.push(i);
        }
      }
    }
    
    if (availablePositions.length === 0) return; // No available positions
    
    // Choose a random position from available positions
    const targetPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    
    // Set the correct letter in that position
    inputs[targetPosition].value = this.currentWord[targetPosition];
    
    // Highlight the input to indicate it was a hint
    inputs[targetPosition].classList.add('hint-provided');
    setTimeout(() => {
      inputs[targetPosition].classList.remove('hint-provided');
    }, 2000);
  }
  /**
   * Gets all letters that have been used in any row so far
   * @returns {Array} Array of used letters
   */
  getUsedLetters() {
    const usedLetters = [];
    
    // Get all inputs in the wrapper (all rows)
    const allInputs = document.querySelectorAll('.wrapper input');
    
    // Check each input's value
    allInputs.forEach(input => {
      if (input.value && input.value.trim() !== '') {
        usedLetters.push(input.value.toLowerCase());
      }
    });
    
    // Add debug logging to see what letters are being tracked
    console.log('Used letters:', usedLetters);
    
    // Log the current state of the game for debugging
    this.logGameState();
    
    return usedLetters;
  }
  
  /**
   * Logs the current state of the game for debugging
   */
  logGameState() {
    console.log('Current word:', this.currentWord);
    console.log('Current row count:', this.rowCount);
    
    // Log all rows and their inputs
    const rows = document.querySelectorAll('.wrapper .row');
    rows.forEach((row, index) => {
      const inputs = Array.from(row.getElementsByTagName('input'));
      const values = inputs.map(input => input.value || '_').join('');
      console.log(`Row ${index + 1}: ${values}`);
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
    this.highScores = JSON.parse(localStorage.getItem('highScores')) || [];
    this.currentScorePage = 0;
    this.scoresPerPage = 5;

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
      this.displayHighScores();
      this.play();
    });

    document.getElementById('resetGame').addEventListener('click', () => {
      this.resetGame();
    });
  }

  async play() {
    console.log('play game has been called');

    // Start the timer
    this.startTime = new Date();
    this.timerDisplay = document.getElementById('timerDisplay');
    this.timerId = startTimer(this.startTime, this.timerDisplay);

    // Disable the start game button and word length input
    document.getElementById('startGame').disabled = true;
    document.getElementById('wordLengthInput').disabled = true;
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
      // console.log(this.currentWord);
      
      // Initialize the alphabet container after we have a word
      this.createAlphabetContainer();
      
      // Show the alphabet container with !important override
      const container = document.getElementById('alphabetContainer');
      container.setAttribute('style', 'display: grid !important');
      
      this.createRow();
    } catch (error) {
      console.error('Error:', error);
      document.getElementById('startGame').disabled = false;
      document.getElementById('wordLengthInput').disabled = false;
    }

    // Update game header
    document.getElementById('gameHeader').innerHTML = `Find the ${this.wordLength} letter word ...`;
    
    // Add hint buttons above the Reset Game button
    const hintContainer = createHintButtonsContainer(
      this.wordLength, 
      this.getLetterHint.bind(this), 
      this.getPositionHint.bind(this),
      this.rowCount
    );
    
    // Insert before the Reset Game button
    const resetButton = document.getElementById('resetGame');
    resetButton.parentNode.insertBefore(hintContainer, resetButton);

    this.rowCount = 0;
  }

  createAlphabetContainer() {
    createAlphabetContainer(this.alphabet);
  }

  updateAlphabetContainer(guessedLetter, letterClass) {
    // Show the alphabet container when the first guess is made
    const container = document.getElementById('alphabetContainer');
    if (container.style.display === 'none' || container.style.display === '') {
      container.style.display = 'grid';
    }
    
    updateAlphabetContainer(guessedLetter, letterClass, this.alphabet);
  }

  createRow() {
    this.currentRow = createRow(this.wordLength, this.checkRowLetters.bind(this));
    document.querySelector('.wrapper').appendChild(this.currentRow);
    this.rowCount++;
    this.currentRow.firstChild.focus();

    console.log('Row created:', this.rowCount);
    
    // Explicitly reset the hint button states for the new row
    resetHintButtonStates();
    
    // Update the current row in the hint handler to track which hint type was used
    updateCurrentRow(this.rowCount);
        
    // Hint buttons are now added once below the wrapper in the play method
  }

  async checkRowLetters() {
    console.log('Check row letters called on row ' + this.currentRow.id);
    if (!this.testIsRowComplete()) {
      return;
    }
    
    // Get the entered word from the current row
    const inputs = Array.from(this.currentRow.getElementsByTagName('input'));
    const enteredWord = inputs.map(input => input.value).join('');
    
    // Import validateWord function
    const { validateWord } = await import('./apiHandler.js');
    
    // Check if the entered word is a valid English word
    const isValidWord = await validateWord(enteredWord);
    
    if (!isValidWord) {
      // Create try again callback - clears only the current row
      const tryAgainCallback = () => {
        // Clear the inputs in the current row
        inputs.forEach(input => {
          input.value = '';
          input.classList.remove('correct', 'contains', 'notContains');
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
    
    Array.from(this.currentRow.children).forEach(input => input.disabled = true); // Disable inputs after checking
    
    // Game logic:
    setTimeout(() => {
      if (totalCorrect === this.wordLength) {
        this.gameWon(); // Player guessed the word correctly
      } else if ((this.rowCount + 1) >= this.maximumAttempts) {
        this.gameLost(); // Player ran out of attempts
      } else {
        // Reset hint button states before creating a new row
        resetHintButtonStates();
        this.createRow(); // Create a new row for the next guess
      }
    }, 100); // Add a slight delay for visual feedback
  }

  testIsRowComplete() {
    console.log('Test row complete called on row ' + this.currentRow.id);
    if (!this.currentRow) {
      return false;
    }

    // Check if all inputs have values
    return Array.from(this.currentRow.getElementsByTagName('input')).every(input => input.value);
  }

  gameWon() {
    console.log(`Game won! player found the word (which was ${this.currentWord})`);

    stopTimer(this.timerId);

    const timeTaken = Math.floor((new Date() - this.startTime) / 1000);
        
    // Add score with timestamp and word info
    this.highScores.push({
      score: timeTaken,
      word: this.currentWord,
      wordLength: this.wordLength,
      attempts: this.rowCount + 1,
      date: new Date().toISOString()
    });
        
    // Sort all scores by time, then attempts, then date (most recent first)
    this.highScores.sort((a, b) => {
      // Handle both new format (object) and old format (number)
      const scoreA = typeof a === 'object' ? a.score : a;
      const scoreB = typeof b === 'object' ? b.score : b;
      
      // First sort by time (ascending)
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
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

    localStorage.setItem('highScores', JSON.stringify(this.highScores));

    // Reset to first page when adding a new score
    this.currentScorePage = 0;
    this.displayHighScores();

    // For game won, only show the Reset Game button (null for tryAgainCallback)
    showAlert(`<div class="success-alert">
      <span class="alert-icon">🎉</span>
      <h3>Congratulations!</h3>
      <p>Well done! You solved it in ${timeTaken} seconds with ${this.rowCount + 1} attempts.</p>
      <p>The word was: <strong>${this.currentWord}</strong></p>
    </div>`, null, () => {
      this.resetGame();
    });
  }

  gameLost() {
    console.log(`Game Lost! Maximum attempts reached for guessing the word: ${this.currentWord}`);

    stopTimer(this.timerId);

    // For game lost, show both Try Again and Reset Game buttons
    showAlert(`<div class="failure-alert">
      <span class="alert-icon">😕</span>
      <h3>Game Over</h3>
      <p>Sorry, you've reached the maximum number of attempts.</p>
      <p>The word was: <strong>${this.currentWord}</strong></p>
    </div>`, null, () => {
      this.resetGame();
    });
  }

  displayHighScores() {
    const highScoresList = document.getElementById('highScoresList');
    highScoresList.innerHTML = '<h3 class="highScoresHeader"> High Scores </h3>';

    // Display all scores in the scrollable container
    const totalScores = this.highScores.length;
    
    // Display all scores
    for (let i = 0; i < totalScores; i++) {
      const scoreData = this.highScores[i];
      let listItem = document.createElement('li');
            
      // Handle both new format (object) and old format (number)
      if (typeof scoreData === 'object') {
        // Show both time and attempts
        listItem.innerHTML = `<span class="score-rank">#${i + 1}:</span> <span class="score-time">${scoreData.score} seconds</span> <span class="score-attempts">(${scoreData.attempts} attempts)</span>`;
        
        // Add tooltip with additional info
        listItem.title = `Word: ${scoreData.word}, Length: ${scoreData.wordLength}`;
      } else {
        // Legacy format - just show time
        listItem.textContent = `#${i + 1}: ${scoreData} seconds`;
      }
            
      highScoresList.appendChild(listItem);
    }

    highScoresList.style.display = 'block';
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
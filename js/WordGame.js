import { showAlert } from './modals.js';
import { startTimer, stopTimer } from './gameUtils.js';
import { createAlphabetContainer, updateAlphabetContainer, createRow, resetGameUI, updateDifficulty } from './uiHandler.js';
import { fetchPossibleWords } from './apiHandler.js';

class WordGame {
    constructor() {
        this.possibleWords = [];
        this.alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
        this.currentWord = "";
        this.currentRow = null;
        this.attempts = 0;
        this.rowCount = 0;
        this.maximumAttempts = 5;
        this.wordLength = "";
        this.startTime = null;
        this.timerDisplay = null;
        this.timerId = null;
        this.highScores = JSON.parse(localStorage.getItem("highScores")) || [];
        this.currentScorePage = 0;
        this.scoresPerPage = 5;

        this.init();
    }

    init() {
        document.getElementById("startGame").addEventListener("click", () => {
            this.displayHighScores();
            this.play();
        });

        document.getElementById("resetGame").addEventListener("click", () => {
            this.resetGame();
        });
    }

    async play() {
        console.log("play game has been called");

        // Start the timer
        this.startTime = new Date();
        this.timerDisplay = document.getElementById("timerDisplay");
        this.timerId = startTimer(this.startTime, this.timerDisplay);
        this.createAlphabetContainer();

        // Disable the start game button and word length input
        document.getElementById("startGame").disabled = true;
        document.getElementById("wordLengthInput").disabled = true;
        document.getElementById("resetGame").style.display = "block";

        // Get and validate word length
        const wordLengthInput = document.getElementById('wordLengthInput').value;
        this.wordLength = parseInt(wordLengthInput);
        
        if (isNaN(this.wordLength) || this.wordLength < 3 || this.wordLength > 10) {
            showAlert("Please enter a valid number between 3 and 10", () => {
                this.resetGame();
            });
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
            this.createRow();
        } catch (error) {
            console.error("Error:", error);
            document.getElementById("startGame").disabled = false;
            document.getElementById("wordLengthInput").disabled = false;
        }

        // Update game header
        document.getElementById("gameHeader").innerHTML = `Find the ${this.wordLength} letter word ...`;

        this.rowCount = 0;
    }

    createAlphabetContainer() {
        createAlphabetContainer(this.alphabet);
    }

    updateAlphabetContainer(guessedLetter, letterClass) {
        updateAlphabetContainer(guessedLetter, letterClass, this.alphabet);
    }

    createRow() {
        this.currentRow = createRow(this.wordLength, this.checkRowLetters.bind(this));
        document.querySelector(".wrapper").appendChild(this.currentRow);
        this.rowCount++;
        this.currentRow.firstChild.focus();
    }

    checkRowLetters() {
        console.log("Check row letters called on row " + this.currentRow.id);
        if (!this.testIsRowComplete()) {
            return;
        }
    
        const letterStates = {};         // Track the state of each letter (correct, contains, notContains)
        const wordLetterCounts = {};    // Track remaining occurrences of each letter in the target word
    
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
                inputBox.classList.add("correct"); // Visually mark as correct
                this.updateAlphabetContainer(enteredLetter, "correct"); // Update letter keyboard
                letterStates[enteredLetter] = "correct"; 
                totalCorrect++; // Increment total correct count
                wordLetterCounts[enteredLetter]--; // Decrement remaining count in the word
            } else {
                letterStates[enteredLetter] = (letterStates[enteredLetter] || 0) + 1; // Increment count for misplaced letter
            }
        }
    
        // Second Pass: Handle misplaced and not contained letters
        for (let i = 0; i < this.wordLength; i++) {
            let inputBox = this.currentRow.children[i];
            let enteredLetter = inputBox.value;
    
            if (letterStates[enteredLetter] === "correct") {
                continue; // Letter is already marked as correct, so skip it
            } else if (this.currentWord.includes(enteredLetter) && wordLetterCounts[enteredLetter] > 0) {
                inputBox.classList.add("contains");
                this.updateAlphabetContainer(enteredLetter, "contains");
                wordLetterCounts[enteredLetter]--; // Decrement remaining count in the word
            } else {
                inputBox.classList.add("notContains");
                this.updateAlphabetContainer(enteredLetter, "notContains");
            }
        }
    
        Array.from(this.currentRow.children).forEach(input => input.disabled = true); // Disable inputs after checking
    
        // Game logic:
        setTimeout(() => {
            if (totalCorrect === this.wordLength) {
                this.gameWon(); // Player guessed the word correctly
            } else if ((this.rowCount + 1) >= this.maximumAttempts) {
                this.gameLost(); // Player ran out of attempts
            } else {
                this.createRow(); // Create a new row for the next guess
            }
        }, 100); // Add a slight delay for visual feedback
    }

    testIsRowComplete() {
        console.log("Test row complete called on row " + this.currentRow.id);
        if (!this.currentRow) {
            return false;
        }

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
        
        // Sort all scores by time (ascending)
        this.highScores.sort((a, b) => {
            // Handle both new format (object) and old format (number)
            const scoreA = typeof a === 'object' ? a.score : a;
            const scoreB = typeof b === 'object' ? b.score : b;
            return scoreA - scoreB;
        });

        localStorage.setItem('highScores', JSON.stringify(this.highScores));

        // Reset to first page when adding a new score
        this.currentScorePage = 0;
        this.displayHighScores();

        showAlert(`Well done! You solved it in ${this.rowCount + 1} attempts. The word was ${this.currentWord}`, () => {
            this.resetGame();
        });
    }

    gameLost() {
        console.log(`Game Lost! Maximum attempts reached for guessing the word: ${this.currentWord}`);

        stopTimer(this.timerId);

        showAlert(`Sorry, you've reached the maximum number of attempts. The word was: ${this.currentWord}`, () => {
            this.resetGame();
        });
    }

    displayHighScores() {
        const highScoresList = document.getElementById('highScoresList');
        highScoresList.innerHTML = `<h3 class="highScoresHeader"> High Scores </h3>`;

        // Calculate total pages
        const totalScores = this.highScores.length;
        const totalPages = Math.ceil(totalScores / this.scoresPerPage);
        
        // Ensure current page is valid
        if (this.currentScorePage >= totalPages) {
            this.currentScorePage = Math.max(0, totalPages - 1);
        }
        
        // Calculate start and end indices for current page
        const startIdx = this.currentScorePage * this.scoresPerPage;
        const endIdx = Math.min(startIdx + this.scoresPerPage, totalScores);
        
        // Display scores for current page
        for (let i = startIdx; i < endIdx; i++) {
            const scoreData = this.highScores[i];
            let listItem = document.createElement("li");
            
            // Handle both new format (object) and old format (number)
            if (typeof scoreData === 'object') {
                listItem.textContent = `#${i + 1}: ${scoreData.score} seconds`;
                // Add tooltip with additional info
                listItem.title = `Word: ${scoreData.word}, Length: ${scoreData.wordLength}, Attempts: ${scoreData.attempts}`;
            } else {
                listItem.textContent = `#${i + 1}: ${scoreData} seconds`;
            }
            
            highScoresList.appendChild(listItem);
        }
        
        // Add navigation controls if there are multiple pages
        if (totalPages > 1) {
            const navContainer = document.createElement("div");
            navContainer.className = "scores-nav";
            
            // Previous button
            const prevBtn = document.createElement("button");
            prevBtn.textContent = "← Prev";
            prevBtn.disabled = this.currentScorePage === 0;
            prevBtn.addEventListener("click", () => {
                if (this.currentScorePage > 0) {
                    this.currentScorePage--;
                    this.displayHighScores();
                }
            });
            
            // Page indicator
            const pageIndicator = document.createElement("span");
            pageIndicator.textContent = `Page ${this.currentScorePage + 1} of ${totalPages}`;
            pageIndicator.className = "page-indicator";
            
            // Next button
            const nextBtn = document.createElement("button");
            nextBtn.textContent = "Next →";
            nextBtn.disabled = this.currentScorePage >= totalPages - 1;
            nextBtn.addEventListener("click", () => {
                if (this.currentScorePage < totalPages - 1) {
                    this.currentScorePage++;
                    this.displayHighScores();
                }
            });
            
            navContainer.appendChild(prevBtn);
            navContainer.appendChild(pageIndicator);
            navContainer.appendChild(nextBtn);
            highScoresList.appendChild(navContainer);
        }

        highScoresList.style.display = "block";
    }

    resetGame() {
        resetGameUI();
        this.rowCount = 0;
        this.currentWord = "";
        this.wordLength = "";
        this.possibleWords = [];
        this.timerDisplay.style.display = "none";
    }
}

export default WordGame;
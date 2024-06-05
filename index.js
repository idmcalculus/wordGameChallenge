window.addEventListener("DOMContentLoaded", (event) => {
	console.log("DOM fully loaded and parsed");
	console.log("start a new word game!");
	
	// start the game when the button is clicked
	document.getElementById("startGame").addEventListener("click", function () {
		wordGame.displayHighScores();
		wordGame.play();
	});
});

const wordGame = {
	// possibleWords :["hello","world","close","codes","clear","house", "mouse","learn","error","basic","exist","exits"],
	possibleWords: [],
	alphabet: "abcdefghijklmnopqrstuvwxyz".split(""),
	currentWord : "",
	currentRow: null,
	attempts: 0,
	rowCount : 0,
	maximumAttempts: 5,
	wordLength: "",
	startTime: null,
	timerDisplay: null,
	timerId: null,
	highScores: JSON.parse(localStorage.getItem("highScores")) || [],
	play : function (){
		console.log( "play game has been called");
		
		// Start the timer
		this.startTime = new Date();
		this.timerDisplay = document.getElementById("timerDisplay");
		this.timerId = setInterval(() => {
			const now = new Date();
			const seconds = Math.floor((now - this.startTime) / 1000);
			this.timerDisplay.textContent = `Time elapsed: ${seconds} seconds`;
		}, 1000);
		this.timerDisplay.style.display = "block";
		this.createAlphabetContainer();
		
		// Disable the start game button and word length input
		document.getElementById("startGame").disabled = true;
		document.getElementById("wordLengthInput").disabled = true;
		
		// before starting the game, get the word length from the user input
		const wordLengthInput = document.getElementById('wordLengthInput').value;
		
		// validate the word length: it should be a number between 3 and 10
		const wordLength = parseInt(wordLengthInput);
		
		if (isNaN(wordLength) || wordLength < 3 || wordLength > 10) {
			alert("Please enter a valid number between 3 and 10");
			this.resetGame();
			return;
		}
		
		// update the difficulty scale based on the word length
		const difficulty = document.getElementById("difficulty");
		if (wordLength <= 4) {
			difficulty.innerHTML = "Difficulty: Easy";
		} else if (wordLength <= 6) {
			difficulty.innerHTML = "Difficulty: Medium";
		} else if (wordLength <= 8) {
			difficulty.innerHTML = "Difficulty: Hard";
		} else {
			difficulty.innerHTML = "Difficulty: Very Hard";
		}
		
		difficulty.style.display = "block";
		
		// assign the validated word length to the wordGame object
		this.wordLength = wordLength;
		
		// Generate a pattern for words with at most wordLength letters
		// the Datamuse API will return wordlengths based on number of question marks
		// i.e for 5 letter words, you'll pass ????? as API query
		let pattern = '?'.repeat(wordLength);
		
		// Call the Datamuse API and filter the words based on the length chosen by the user
		fetch(`https://api.datamuse.com/words?sp=${pattern}`)
			.then(response => response.json())
			.then(data => {
				// Save the words of the exact chosen length to this.possibleWords
				this.possibleWords = data.map(wordObj => wordObj.word).filter(word => word.length === wordLength);
		
				// Check if we have any words of the chosen length
				if (this.possibleWords.length === 0) {
					throw new Error(`No words of length ${wordLength} found.`);
				}
		
				//first job is to select a random word and set it to the wordGame.currentWord variable...
				const numberOfPossibleWords = this.possibleWords.length
				
				console.log({numberOfPossibleWords})
				
				const getRandomNumber = n => Math.floor(Math.random() * n);
				
				let randomWordIndex = getRandomNumber(numberOfPossibleWords);
				this.currentWord = this.possibleWords[randomWordIndex];
				
				console.log(this.currentWord);
		
				// then create a new row for our first guesses..
				this.createRow();
			})
			.catch(error => {
				console.error("Error:", error);
				// Re-enable the start game button and word length input in case of an error
				document.getElementById("startGame").disabled = false;
				document.getElementById("wordLengthInput").disabled = false;
			});
		
		// Let's update the h1 text to reflect the chosen word length
		const gameHeader = document.getElementById("gameHeader");
		gameHeader.innerHTML = `Find the ${this.wordLength} letter word ...`;

		// then we can create a new row for our first guesses..
		this.rowCount = 0;
	},
	
	createAlphabetContainer: function() {
		const container = document.getElementById("alphabetContainer");
		container.innerHTML = "";  // Clear container
	
		this.alphabet.forEach(letter => {
			const span = document.createElement("span");
			span.textContent = letter;
			span.classList.add("notGuessed");  // Initial state: not guessed
			container.appendChild(span);
		});
		container.style.display = "block";
	},
	
	updateAlphabetContainer: function(guessedLetter, letterClass) {
		const letterElement = document.querySelector(`#alphabetContainer span:nth-child(${this.alphabet.indexOf(guessedLetter) + 1})`);
	
		// Remove all possible classes
		letterElement.classList.remove("notGuessed", "contains", "notContains", "correct");
		
		// Add the class passed in as parameter
		letterElement.classList.add(letterClass);
	},

	createRow : function (){
		/* this function should creeate a new row and keep count of how many we have created
		Each row should be a div with a class of  wordRow 
		and should have 5 input elements as children , these are where a guess can be entered
		
		Tip : you might want to use an naming convention to keep the IDs of you input boxes unique and help you find them later
		(maybe id="inputbox_row_1_box_3" )

		Bonus:
		make the input box max-length  1
		make the check happen every time the user changes a value - but only check the full row if all five letters are added
		Make the focus move to the next box as the user types each character 
	   

		*/
		console.log("Create a row called");
		if (this.currentRow) {
			// Make current row to read-only
			Array.from(this.currentRow.children).forEach(input => {
				input.setAttribute('readonly', true);
			});
		}
		
		let newRow = document.createElement('div');
		newRow.classList.add('wordRow');
		newRow.id = 'row_' + this.rowCount;
		
		for (let i = 0; i < this.wordLength; i++) {
			let newInputBox = document.createElement('input');
			newInputBox.type = "text";
			newInputBox.id = `inputbox_row_${this.rowCount}_box_${i+1}`;
			newInputBox.classList.add('wordLetterBox');
			newInputBox.maxLength = 1;
			
			newInputBox.addEventListener('input', (e) => {
				// Check if the input is a letter
				if (!newInputBox.value.match(/^[a-z]$/i)) {
					newInputBox.value = ''; // clear the box if not a letter
					return;
				}
				
				// Move focus to the next input box on input
				if (newInputBox.value) {
					if (i < this.wordLength - 1) {
						newRow.children[i+1].focus();
					}
					this.checkRowLetters(newRow);
				}
			});
			
			// Handle backspace press
			newInputBox.addEventListener('keydown', (event) => {
				if (event.key === "Backspace" && i > 0) {
				   if (newInputBox.value === "" && i > 0) {
					   // If the current box is empty, delete the character in the previous box and move the focus
					   newRow.children[i-1].value = "";
					   newRow.children[i-1].focus();
				   }
				   else {
					   // If the current box is not empty, prevent the default behavior (delete the character)
					   event.preventDefault();
				   }
				}
			});
		
			newRow.appendChild(newInputBox);
		}
		
		document.querySelector(".wrapper").appendChild(newRow);
		this.rowCount++;
		this.currentRow = newRow;
		newRow.firstChild.focus();  // Set focus on the first input box of new row
	},

	testIsRowComplete : function(){
		/* 
		this function should look at the current active row and test to see if each box in that row has a non-empty value
		if all the boxes have been filled in by the user we can assess the rows correctness otherwise we need to keep waiting for more character values...
		*/
		
		console.log("Test row complete called on row " + this.currentRow.id);
		if (!this.currentRow) {
			return false; // No active row
		}
		
		let inputs = this.currentRow.getElementsByTagName('input');
		for (let i = 0; i < inputs.length; i++) {
			if (!inputs[i].value) {
				return false;
			}
		}
		return true;
	},

	checkRowLetters : function (){
	   /*
	   This function should check each of the characters entered in the current active row against our wordGame.currentWord
	   If it finds the letter in the correct place it should be coloured green
	   if it finds the letter but in the wrong place it should be coloured orange
	   if it does not find the letter it should be coloured GREY.
	   Once checked, if the word has been found (every box is green) then we can call the game won function, otherwise we need to add a new row for our next guess.. 
	   
	   Bonus
	   Make the previous row lock (all the boxes are disabled) when I'm ready to add a new row
	   */
	   
	   console.log("Check row letters called on row " + this.currentRow.id);
	   if (!this.testIsRowComplete()) {
		   return;
	   }
	   
	   // Check each letter in the word
	   let correctCount = 0;
	   for (let i = 0; i < this.wordLength; i++) {
		   let inputBox = this.currentRow.children[i];
		   let enteredLetter = inputBox.value;
		   let correctLetter = this.currentWord.charAt(i);
	   
		   // Get the number of times the entered letter appears in the entered word and the correct word
		   let enteredLetterCount = Array.from(this.currentRow.children).filter(input => input.value === enteredLetter).length;
		   let correctLetterCount = this.currentWord.split(enteredLetter).length - 1;
	   
		   // Check if the entered letter is correct
		   if (enteredLetter === correctLetter) {
			   inputBox.classList.add("correct");
			   this.updateAlphabetContainer(enteredLetter, "correct");
			   correctCount++;
		   } else if (this.currentWord.includes(enteredLetter) && enteredLetterCount <= correctLetterCount) {
			   inputBox.classList.add("contains");
			   this.updateAlphabetContainer(enteredLetter, "contains");
		   } else {
			   inputBox.classList.add("notContains");
			   this.updateAlphabetContainer(enteredLetter, "notContains");
		   }
	   }
	   
	   // Get the entered word
		let enteredWord = Array.from(this.currentRow.children).map(input => input.value).join("");
	   
	   // I had to disable this check because I discovered the api was only returning 100 words per each call
	   // which means we have a limited word pool to check against, for now!
		  // // Check if it's a valid word using this.possibleWords
		  // if (!this.possibleWords.includes(enteredWord)) {
		  //     alert('The entered word is not a valid word.');
		  //     return;
		  // }

		// Disable all input boxes in the current row
		Array.from(this.currentRow.children).forEach(input => input.disabled = true);
		
		// Use setTimeout to ensure all changes have been made to the DOM before we alert gameWon
		setTimeout(() => {
			if (correctCount === this.wordLength) {
				this.gameWon();
			} else if (this.rowCount >= this.maximumAttempts) {
				this.gameLost()
			} else {
				this.createRow();
			}
		}, 100);
	},

	gameWon: function(){

		/* a really simple game won routine is (partly) provided, this just tells the user they won and asks if they want to play again..
		if they do want to play again it should reset the game (what's the quickest and most reliable way to do that?)
		if they don't then it does nothing..
		*/
		console.log(`Game won! player found the word (which was ${wordGame.currentWord})`);
		
		// Stop the timer
		clearInterval(this.timerId);
		
		// Calculate time taken and add to high scores
		const endTime = new Date();
		const timeTaken = Math.floor((endTime - this.startTime) / 1000);
		this.highScores.push(timeTaken);
		
		// Sort high scores in ascending order and keep only the top 5
		this.highScores.sort((a, b) => a - b);
		if (this.highScores.length > 5) {
			this.highScores.length = 5;  // Truncate array to length 5
		}
		
		// Save high scores to local storage
		localStorage.setItem('highScores', JSON.stringify(this.highScores));
		
		// Display the high scores
		this.displayHighScores();
		
		alert(`Well done! You solved it in ${this.rowCount} attempts. The word was ${this.currentWord}`);
		
		if (confirm("Play again?")) {
			// Reset the game
			this.resetGame();
		}
	},
	
	gameLost: function() {
		console.log(`Game Lost! Maximum attempts reached for guessing the word: ${this.currentWord}`);
		
		// Stop the timer
		clearInterval(this.timerId);
		
		alert(`Sorry, you've reached the maximum number of attempts. The word was: ${this.currentWord}\nLet's try again.`);
	
		// Reset the game
		this.resetGame();
	},
	
	displayHighScores: function() {
		const highScoresList = document.getElementById('highScoresList');
		highScoresList.innerHTML = `<h3 class="highScoresHeader"> High Scores </h3>`;
		
		this.highScores.sort((a, b) => a - b);
	
		this.highScores.forEach((score, i) => {
			let listItem = document.createElement("li");
			listItem.textContent = `#${i+1}: ${score} seconds`;
			highScoresList.appendChild(listItem);
		});
		
		highScoresList.style.display = "block";
	},
	
	resetGame: function() {
		// Clear the rows
		document.getElementById('wrapper').innerHTML = "";
		
		// Enable the start game button and word length input
		document.getElementById('startGame').disabled = false;
		document.getElementById('wordLengthInput').disabled = false;
		
		// Reset the variables
		this.rowCount = 0;
		this.currentWord = "";
		this.wordLength = "";
		this.possibleWords = [];
		this.timerDisplay.style.display = "none";
	
		// Reset the word length input
		document.getElementById('wordLengthInput').value = "";
		document.getElementById('alphabetContainer').innerHTML = "";
		document.getElementById('alphabetContainer').style.display = "none";
		document.getElementById("difficulty").style.display = "none";
	}

	

	/*/
	Bonus Challenges

	This has a short word list -- how might we get a longer one?

	Game Lost state : You don't get an infinite amount of attempts - pick a number that seems reasonable and display the Game lost state when that number of tries is reached.

	This would allow you to add in a number or punctuation instead of a character - how could we prevent that?

	This allows you to enter any 5 characters, for example it would allow 'eeeee'    
	How might we add an extra game rule so that the 5 characters had to form a valid 5 letter word?
	Can we use datamuse to check if the word is valid?

	Could we store the top 5 fastest runs for a player and display them in a high score table? 

	Could we store the fastest times for ALL players via an API - which APIs might work for that?


	/*/
}
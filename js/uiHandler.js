export function createAlphabetContainer(alphabet) {
    const container = document.getElementById("alphabetContainer");
    container.innerHTML = "";  // Clear container

    alphabet.forEach(letter => {
        const span = document.createElement("span");
        span.textContent = letter;
        span.classList.add("notGuessed");  // Initial state: not guessed
        container.appendChild(span);
    });
    container.style.display = "block";
}

export function updateAlphabetContainer(guessedLetter, letterClass, alphabet) {
    const letterElement = document.querySelector(`#alphabetContainer span:nth-child(${alphabet.indexOf(guessedLetter) + 1})`);

    letterElement.className = ''; // Remove all classes
    letterElement.classList.add(letterClass);
}

export function createRow(wordLength, checkRowLetters) {
    const newRow = document.createElement('div');
    newRow.classList.add('wordRow');
    newRow.id = 'row_' + Math.random().toString(36).substr(2, 9);

    for (let i = 0; i < wordLength; i++) {
        let newInputBox = document.createElement('input');
        newInputBox.type = "text";
        newInputBox.classList.add('wordLetterBox');
        newInputBox.maxLength = 1;
        newInputBox.autocomplete = "off";
        newInputBox.autocorrect = "off";
        newInputBox.autocapitalize = "off";
        newInputBox.spellcheck = false;

        // Handle input events for letter entry
        newInputBox.addEventListener('input', (event) => {
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
            if (event.key === "Backspace" && i > 0 && newInputBox.value === "") {
                newRow.children[i - 1].value = "";
                newRow.children[i - 1].focus();
                event.preventDefault();
            }
            
            // Arrow key navigation
            if (event.key === "ArrowLeft" && i > 0) {
                newRow.children[i - 1].focus();
                event.preventDefault();
            }
            if (event.key === "ArrowRight" && i < wordLength - 1) {
                newRow.children[i + 1].focus();
                event.preventDefault();
            }
        });
        
        // Touch-specific handling for mobile
        newInputBox.addEventListener('touchend', (event) => {
            // Prevent zoom on double-tap
            event.preventDefault();
            newInputBox.focus();
        });

        newRow.appendChild(newInputBox);
    }

    return newRow;
}

export function resetGameUI() {
    document.getElementById('wrapper').innerHTML = "";
    document.getElementById('startGame').disabled = false;
    document.getElementById('wordLengthInput').disabled = false;
    document.getElementById('wordLengthInput').value = "";
    document.getElementById('alphabetContainer').innerHTML = "";
    document.getElementById('alphabetContainer').style.display = "none";
    document.getElementById("difficulty").style.display = "none";
    document.getElementById("resetGame").style.display = "none";
}

export function updateDifficulty(wordLength) {
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
}
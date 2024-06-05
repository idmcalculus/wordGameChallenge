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

        newInputBox.addEventListener('input', () => {
            if (!newInputBox.value.match(/^[a-z]$/i)) {
                newInputBox.value = ''; // clear the box if not a letter
                return;
            }

            if (newInputBox.value && i < wordLength - 1) {
                newRow.children[i + 1].focus();
            }
            checkRowLetters();
        });

        newInputBox.addEventListener('keydown', (event) => {
            if (event.key === "Backspace" && i > 0 && newInputBox.value === "") {
                newRow.children[i - 1].value = "";
                newRow.children[i - 1].focus();
                event.preventDefault();
            }
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
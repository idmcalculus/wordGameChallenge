export async function fetchPossibleWords(pattern, wordLength) {
    const response = await fetch(`https://api.datamuse.com/words?sp=${pattern}`);
	const data = await response.json();
	const words = data.map(wordObj => wordObj.word).filter(word => word.length === wordLength);
	if (words.length === 0) {
		throw new Error(`No words of length ${wordLength} found.`);
	}
	return words;
}

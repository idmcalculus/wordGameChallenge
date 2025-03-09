export async function fetchPossibleWords(pattern, wordLength) {
    try {
        // Fetch words that match our pattern and are common enough
        const response = await fetch(`https://api.datamuse.com/words?sp=${pattern}&md=f&max=100`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        
        // Filter words: must be exact length and have frequency score > 0.5
        const words = data
            .filter(wordObj => {
                const freq = parseFloat(wordObj.tags?.[0]?.slice(2)) || 0; // freq tags look like 'f:1.23'
                return wordObj.word.length === wordLength && freq > 0.5;
            })
            .map(wordObj => wordObj.word.toLowerCase());

        if (words.length === 0) {
            throw new Error(`No common words of length ${wordLength} found.`);
        }

        return words;
    } catch (error) {
        console.error('Error fetching words:', error);
        throw new Error(`Failed to fetch words: ${error.message}`);
    }
}

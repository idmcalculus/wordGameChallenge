// API configuration from environment variables
const API_URL = process.env.API_URL || 'https://api.datamuse.com';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '5000');

/**
 * Fetches possible words matching the given pattern and length
 * @param {string} pattern - The pattern to match (e.g., '?????' for a 5-letter word)
 * @param {number} wordLength - The length of words to return
 * @returns {Promise<string[]>} - Array of matching words
 */
export async function fetchPossibleWords(pattern, wordLength) {
  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    // Fetch words that match our pattern and are common enough
    const response = await fetch(`${API_URL}/words?sp=${pattern}&md=f&max=100`, {
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Network response error: ${response.status}`);
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

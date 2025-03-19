// API configuration from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'https://api.datamuse.com';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '5000');

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

/**
 * Validates if a word is a valid English word using Datamuse API
 * @param {string} word - The word to validate
 * @returns {Promise<boolean>} - True if the word is valid, false otherwise
 */
export async function validateWord(word) {
  if (!word || word.trim() === '') {
    return false;
  }
  
  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    // First try Datamuse API with exact spelling
    const response = await fetch(`${API_URL}/words?sp=${word.toLowerCase()}&md=f&max=1`, {
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Network response error: ${response.status}`);
    }

    const data = await response.json();
    
    // If we found an exact match with the same spelling, it's a valid word
    if (data.length > 0 && data[0].word.toLowerCase() === word.toLowerCase()) {
      return true;
    }
    
    // If no exact match found with Datamuse, try backup validation with Free Dictionary API
    return await validateWordWithFreeDictionary(word);
    
  } catch (error) {
    console.error('Error validating word with Datamuse:', error);
    // Fallback to Free Dictionary API if Datamuse fails
    return await validateWordWithFreeDictionary(word);
  }
}

/**
 * Backup validation using Free Dictionary API
 * @param {string} word - The word to validate
 * @returns {Promise<boolean>} - True if the word is valid, false otherwise
 */
async function validateWordWithFreeDictionary(word) {
  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    // Free Dictionary API returns 404 for non-existent words
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`, {
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // If response is OK, the word exists
    return response.ok;
    
  } catch (error) {
    console.error('Error validating word with Free Dictionary API:', error);
    // If both APIs fail, we'll assume the word is valid to avoid blocking gameplay
    return true;
  }
}

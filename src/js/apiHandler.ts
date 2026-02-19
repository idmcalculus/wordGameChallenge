// API configuration from environment variables
import { logger } from './utils/logger';
import type { JsonValue } from './types/types';
import { sanitizeWord } from './utils/inputSanitizer';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.datamuse.com';
const API_TIMEOUT = Number.parseInt(import.meta.env.VITE_API_TIMEOUT || '5000', 10);

interface DatamuseWord {
  word: string;
  tags?: string[];
}

function toError(reason: Error | string | object | null | undefined): Error {
  if (reason instanceof Error) {
    return reason;
  }

  if (typeof reason === 'string') {
    return new Error(reason);
  }

  return new Error(String(reason));
}

function toDatamuseWord(value: JsonValue): DatamuseWord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, JsonValue>;
  const tags = record.tags;
  if (typeof record.word !== 'string') {
    return null;
  }

  if (tags !== undefined && (!Array.isArray(tags) || !tags.every((item) => typeof item === 'string'))) {
    return null;
  }

  return {
    word: record.word,
    tags: tags as string[] | undefined
  };
}

function normalizeDatamuseWords(payload: JsonValue): DatamuseWord[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.reduce<DatamuseWord[]>((accumulator, item) => {
    const normalized = toDatamuseWord(item);
    if (normalized) {
      accumulator.push(normalized);
    }
    return accumulator;
  }, []);
}

/**
 * Fetches possible words matching the given pattern and length
 * @param {string} pattern - The pattern to match (e.g., '?????' for a 5-letter word)
 * @param {number} wordLength - The length of words to return
 * @returns {Promise<string[]>} - Array of matching words
 */
export async function fetchPossibleWords(pattern: string, wordLength: number): Promise<string[]> {
  if (!/^\?+$/.test(pattern)) {
    throw new Error('Invalid pattern supplied for word lookup');
  }

  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    // Fetch words that match our pattern and are common enough
    const response = await fetch(`${API_URL}/words?sp=${encodeURIComponent(pattern)}&md=f&max=1000`, {
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Network response error: ${response.status}`);
    }

    const data = normalizeDatamuseWords(await response.json() as JsonValue);
    
    // Filter words: must be exact length and have frequency score > 0.5
    const words = data
      .filter((wordObj) => {
        const freqTag = wordObj.tags?.[0] ?? '';
        const freq = parseFloat(freqTag.slice(2)) || 0; // freq tags look like 'f:1.23'
        const sanitized = sanitizeWord(wordObj.word, wordLength);
        return sanitized.length === wordLength && freq > 0.5;
      })
      .map((wordObj) => sanitizeWord(wordObj.word, wordLength))
      .filter((word) => word.length === wordLength);

    if (words.length === 0) {
      throw new Error(`No common words of length ${wordLength} found.`);
    }

    return words;
  } catch (error) {
    const normalizedError = toError(error as Error | string | object | null | undefined);
    logger.error(normalizedError, { source: 'fetchPossibleWords', pattern, wordLength });
    throw new Error(`Failed to fetch words: ${normalizedError.message}`, {
      cause: error
    });
  }
}

/**
 * Validates if a word is a valid English word using Datamuse API
 * @param {string} word - The word to validate
 * @returns {Promise<boolean>} - True if the word is valid, false otherwise
 */
export async function validateWord(word: string): Promise<boolean> {
  const normalizedWord = sanitizeWord(word);
  if (!normalizedWord) {
    return false;
  }
  
  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    // First try Datamuse API with exact spelling
    const response = await fetch(`${API_URL}/words?sp=${encodeURIComponent(normalizedWord)}&md=f&max=1`, {
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Network response error: ${response.status}`);
    }

    const data = normalizeDatamuseWords(await response.json() as JsonValue);
    
    // If we found an exact match with the same spelling, it's a valid word
    if (data.length > 0 && sanitizeWord(data[0].word) === normalizedWord) {
      return true;
    }
    
    // If no exact match found with Datamuse, try backup validation with Free Dictionary API
    return await validateWordWithFreeDictionary(normalizedWord);
    
  } catch (error) {
    logger.error(toError(error as Error | string | object | null | undefined), { source: 'validateWord.datamuse', word: normalizedWord });
    // Fallback to Free Dictionary API if Datamuse fails
    return await validateWordWithFreeDictionary(normalizedWord);
  }
}

/**
 * Backup validation using Free Dictionary API
 * @param {string} word - The word to validate
 * @returns {Promise<boolean>} - True if the word is valid, false otherwise
 */
async function validateWordWithFreeDictionary(word: string): Promise<boolean> {
  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    // Free Dictionary API returns 404 for non-existent words
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // If response is OK, the word exists
    return response.ok;
    
  } catch (error) {
    logger.error(toError(error as Error | string | object | null | undefined), { source: 'validateWord.freeDictionary', word });
    // If both APIs fail, we'll assume the word is valid to avoid blocking gameplay
    return true;
  }
}

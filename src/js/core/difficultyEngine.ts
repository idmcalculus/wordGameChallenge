import { sanitizeWord } from '../utils/inputSanitizer';
import type { WordDifficultyAnalysis } from '../types/interface';
import type { DifficultyLabel, WordFamiliarity } from '../types/types';

const RARE_LETTERS = new Set(['j', 'k', 'q', 'v', 'w', 'x', 'y', 'z']);

interface DifficultyAssessmentContext {
  ambiguityFamilySize?: number;
}

function countRareLetters(word: string): number {
  return Array.from(word).reduce((total, letter) => {
    return total + (RARE_LETTERS.has(letter) ? 1 : 0);
  }, 0);
}

function getFamiliarityPenalty(familiarity: WordFamiliarity): number {
  if (familiarity === 'common') {
    return 0;
  }

  if (familiarity === 'standard') {
    return 1;
  }

  return 3;
}

function getLengthPenalty(wordLength: number): number {
  if (wordLength >= 9) {
    return 3;
  }

  if (wordLength >= 7) {
    return 2;
  }

  if (wordLength >= 5) {
    return 1;
  }

  return 0;
}

function normalizeAmbiguityFamilySize(ambiguityFamilySize: number | undefined): number {
  if (Number.isInteger(ambiguityFamilySize) && (ambiguityFamilySize as number) > 0) {
    return ambiguityFamilySize as number;
  }

  return 1;
}

function getAmbiguityPenalty(ambiguityFamilySize: number): number {
  if (ambiguityFamilySize >= 7) {
    return 3;
  }

  if (ambiguityFamilySize >= 5) {
    return 2;
  }

  if (ambiguityFamilySize >= 3) {
    return 1;
  }

  return 0;
}

function getDifficultyLabel(score: number): DifficultyLabel {
  if (score <= 1) {
    return 'Easy';
  }

  if (score <= 4) {
    return 'Medium';
  }

  if (score <= 6) {
    return 'Hard';
  }

  return 'Very Hard';
}

function buildSummary(
  hasDuplicateLetters: boolean,
  rareLetterCount: number,
  familiarity: WordFamiliarity,
  ambiguityFamilySize: number
): string {
  const summaryParts: string[] = [];

  summaryParts.push(hasDuplicateLetters ? 'repeat letters possible' : 'all letters are unique');

  if (ambiguityFamilySize >= 7) {
    summaryParts.push('large answer family');
  } else if (ambiguityFamilySize >= 4) {
    summaryParts.push('several close neighbors');
  } else if (rareLetterCount >= 2) {
    summaryParts.push('multiple less-common letters');
  } else if (rareLetterCount === 1) {
    summaryParts.push('one less-common letter');
  } else if (familiarity === 'common') {
    summaryParts.push('common vocabulary');
  } else if (familiarity === 'standard') {
    summaryParts.push('standard vocabulary');
  } else {
    summaryParts.push('less familiar vocabulary');
  }

  return summaryParts.join(' • ');
}

function buildGuidance(
  hasDuplicateLetters: boolean,
  rareLetterCount: number,
  familiarity: WordFamiliarity,
  ambiguityFamilySize: number
): string {
  if (ambiguityFamilySize >= 5) {
    return 'Confirm the changing slot before locking into one word family.';
  }

  if (hasDuplicateLetters) {
    return 'Do not assume every clue maps to a new letter.';
  }

  if (rareLetterCount > 0) {
    return 'Probe the common vowels first, then branch into sharper consonants.';
  }

  if (familiarity === 'stretch') {
    return 'Use broad coverage early before locking into a pattern.';
  }

  return 'Use early guesses to cover as many fresh letters as possible.';
}

export function assessPuzzleDifficulty(
  word: string,
  familiarity: WordFamiliarity,
  context: DifficultyAssessmentContext = {}
): WordDifficultyAnalysis {
  const normalizedWord = sanitizeWord(word);
  if (!normalizedWord) {
    throw new Error('Puzzle difficulty requires a valid word');
  }

  const uniqueLetterCount = new Set(normalizedWord).size;
  const hasDuplicateLetters = uniqueLetterCount !== normalizedWord.length;
  const rareLetterCount = countRareLetters(normalizedWord);
  const ambiguityFamilySize = normalizeAmbiguityFamilySize(context.ambiguityFamilySize);

  const score = getFamiliarityPenalty(familiarity) +
    getLengthPenalty(normalizedWord.length) +
    (hasDuplicateLetters ? 2 : 0) +
    Math.min(2, rareLetterCount) +
    getAmbiguityPenalty(ambiguityFamilySize);

  return {
    label: getDifficultyLabel(score),
    score,
    summary: buildSummary(hasDuplicateLetters, rareLetterCount, familiarity, ambiguityFamilySize),
    guidance: buildGuidance(hasDuplicateLetters, rareLetterCount, familiarity, ambiguityFamilySize),
    hasDuplicateLetters,
    rareLetterCount,
    uniqueLetterCount,
    ambiguityFamilySize
  };
}

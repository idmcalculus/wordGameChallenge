import { SORT_DIRECTIONS, SORT_FIELDS } from '../constants/scoreConstants.js';

/**
 * Cycles through sort directions: default -> ascending -> descending -> default
 */
export const getNextSortDirection = (currentDirection) => {
  switch (currentDirection) {
  case SORT_DIRECTIONS.DEFAULT:
    return SORT_DIRECTIONS.ASC;
  case SORT_DIRECTIONS.ASC:
    return SORT_DIRECTIONS.DESC;
  case SORT_DIRECTIONS.DESC:
  default:
    return SORT_DIRECTIONS.DEFAULT;
  }
};

/**
 * Compares two values based on sort direction
 */
export const compareValues = (a, b, direction) => {
  if (direction === SORT_DIRECTIONS.DEFAULT) return 0;
  
  const multiplier = direction === SORT_DIRECTIONS.ASC ? 1 : -1;
  
  if (a < b) return -1 * multiplier;
  if (a > b) return 1 * multiplier;
  return 0;
};

/**
 * Sorts scores based on field and direction
 */
export const sortScores = (scores, field, direction) => {
  if (direction === SORT_DIRECTIONS.DEFAULT) return scores;

  return [...scores].sort((a, b) => {
    switch (field) {
    case SORT_FIELDS.SERIAL:
      return compareValues(a.index, b.index, direction);
    case SORT_FIELDS.WORD:
      return compareValues(a.word.toLowerCase(), b.word.toLowerCase(), direction);
    case SORT_FIELDS.TIME:
      return compareValues(a.score, b.score, direction);
    case SORT_FIELDS.ATTEMPTS:
      return compareValues(a.attempts, b.attempts, direction);
    case SORT_FIELDS.WORD_LENGTH:
      return compareValues(a.word.length, b.word.length, direction);
    default:
      return 0;
    }
  });
};

/**
 * Gets the appropriate sort indicator icon class based on direction
 */
export const getSortIndicatorClass = (direction) => {
  switch (direction) {
  case SORT_DIRECTIONS.ASC:
    return 'sort-indicator--asc';
  case SORT_DIRECTIONS.DESC:
    return 'sort-indicator--desc';
  default:
    return 'sort-indicator--default';
  }
}; 
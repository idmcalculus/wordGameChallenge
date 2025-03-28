import { SORT_DIRECTIONS, SORT_FIELDS } from '../constants/statConstants.js';

/**
 * Cycles through sort directions: default -> ascending -> descending -> default
 * @param {string} currentDirection - The current sort direction
 * @returns {string} - The next sort direction
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
 * @param {any} a - The first value
 * @param {any} b - The second value
 * @param {string} direction - The sort direction
 * @returns {number} - Comparison result
 */
export const compareValues = (a, b, direction) => {
  if (direction === SORT_DIRECTIONS.DEFAULT) return 0;
  
  const multiplier = direction === SORT_DIRECTIONS.ASC ? 1 : -1;
  
  if (a < b) return -1 * multiplier;
  if (a > b) return 1 * multiplier;
  return 0;
};

/**
 * Sorts stats based on field and direction
 * @param {Array<Object>} stats - The stats to sort
 * @param {string} field - The field to sort by
 * @param {string} direction - The sort direction
 * @returns {Array<Object>} - The sorted stats
 */
export const sortStats = (stats, field, direction) => {
  if (direction === SORT_DIRECTIONS.DEFAULT) return stats;

  return [...stats].sort((a, b) => {
    switch (field) {
    case SORT_FIELDS.SERIAL:
      return compareValues(a.index, b.index, direction);
    case SORT_FIELDS.WORD:
      return compareValues(a.word.toLowerCase(), b.word.toLowerCase(), direction);
    case SORT_FIELDS.TIME:
      return compareValues(a.time, b.time, direction);
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
 * @param {string} direction - The sort direction
 * @returns {string} - The class name for the sort indicator
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
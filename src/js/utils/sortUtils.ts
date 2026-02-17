import { SORT_DIRECTIONS, SORT_FIELDS } from '../constants/statConstants';
import type { IndexedStatEntry } from '../types/interface';
import type { SortDirection, SortField } from '../types/types';

/**
 * Cycles through sort directions: default -> ascending -> descending -> default
 * @param {string} currentDirection - The current sort direction
 * @returns {string} - The next sort direction
 */
export const getNextSortDirection = (currentDirection: SortDirection): SortDirection => {
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
 * @param {number|string} a - The first value
 * @param {number|string} b - The second value
 * @param {string} direction - The sort direction
 * @returns {number} - Comparison result
 */
export const compareValues = (
  a: number | string,
  b: number | string,
  direction: SortDirection
): number => {
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
export const sortStats = (
  stats: IndexedStatEntry[],
  field: SortField,
  direction: SortDirection
): IndexedStatEntry[] => {
  if (direction === SORT_DIRECTIONS.DEFAULT) return stats;

  return [...stats].sort((a, b) => {
    const dateA = Number.isNaN(Date.parse(a.date)) ? 0 : Date.parse(a.date);
    const dateB = Number.isNaN(Date.parse(b.date)) ? 0 : Date.parse(b.date);

    switch (field) {
    case SORT_FIELDS.SERIAL:
      return compareValues(a.__originalIndex ?? 0, b.__originalIndex ?? 0, direction);
    case SORT_FIELDS.WORD:
      return compareValues(a.word.toLowerCase(), b.word.toLowerCase(), direction);
    case SORT_FIELDS.TIME:
      return compareValues(a.time, b.time, direction);
    case SORT_FIELDS.ATTEMPTS:
      return compareValues(a.attempts, b.attempts, direction);
    case SORT_FIELDS.DATE:
      return compareValues(dateA, dateB, direction);
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
export const getSortIndicatorClass = (direction: SortDirection): string => {
  switch (direction) {
  case SORT_DIRECTIONS.ASC:
    return 'sort-indicator--asc';
  case SORT_DIRECTIONS.DESC:
    return 'sort-indicator--desc';
  default:
    return 'sort-indicator--default';
  }
}; 

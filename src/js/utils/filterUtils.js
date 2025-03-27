import { FILTER_TYPES, FILTER_RANGES } from '../constants/statConstants.js';

/**
 * Checks if a value falls within a range
 */
const isInRange = (value, range) => {
  return value >= range.min && value <= range.max;
};

/**
 * Applies filters to stats
 */
export const applyFilters = (stats, activeFilters) => {
  if (!activeFilters || Object.keys(activeFilters).length === 0) {
    return stats;
  }

  return stats.filter(stat => {
    // Check each filter type
    return Object.entries(activeFilters).every(([filterType, selectedRanges]) => {
      // If no ranges selected for this filter type, consider it passed
      if (!selectedRanges || selectedRanges.length === 0) return true;

      // Get the value to check based on filter type
      let valueToCheck;
      switch (filterType) {
      case FILTER_TYPES.WORD_LENGTH:
        valueToCheck = stat.word.length;
        break;
      case FILTER_TYPES.TIME:
        valueToCheck = stat.time; // time represents time in seconds
        break;
      case FILTER_TYPES.ATTEMPTS:
        valueToCheck = stat.attempts;
        break;
      default:
        return true;
      }

      // Check if value falls within any of the selected ranges
      return selectedRanges.some(rangeIndex => {
        const range = FILTER_RANGES[filterType][rangeIndex];
        return isInRange(valueToCheck, range);
      });
    });
  });
};

/**
 * Gets available filter options based on current stats
 */
export const getAvailableFilters = (stats) => {
  const available = {
    [FILTER_TYPES.WORD_LENGTH]: new Set(),
    [FILTER_TYPES.TIME]: new Set(),
    [FILTER_TYPES.ATTEMPTS]: new Set()
  };

  stats.forEach(stat => {
    // Word Length
    FILTER_RANGES.WORD_LENGTH.forEach((range, index) => {
      if (isInRange(stat.word.length, range)) {
        available[FILTER_TYPES.WORD_LENGTH].add(index);
      }
    });

    // Time
    FILTER_RANGES.TIME.forEach((range, index) => {
      if (isInRange(stat.time, range)) {
        available[FILTER_TYPES.TIME].add(index);
      }
    });

    // Attempts
    FILTER_RANGES.ATTEMPTS.forEach((range, index) => {
      if (isInRange(stat.attempts, range)) {
        available[FILTER_TYPES.ATTEMPTS].add(index);
      }
    });
  });

  return available;
};

/**
 * Saves filter preferences to localStorage
 */
export const saveFilterPreferences = (filters) => {
  localStorage.setItem('statFilters', JSON.stringify(filters));
};

/**
 * Loads filter preferences from localStorage
 */
export const loadFilterPreferences = () => {
  const saved = localStorage.getItem('statFilters');
  return saved ? JSON.parse(saved) : {};
}; 
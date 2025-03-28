import { FILTER_TYPES, FILTER_RANGES } from '../constants/statConstants.js';

/**
 * Checks if a value falls within a range
 * @param {number} value - The value to check
 * @param {Object} range - The range object with min and max properties
 * @returns {boolean} - True if the value is within the range, false otherwise
 */
const isInRange = (value, range) => {
  return value >= range.min && value <= range.max;
};

/**
 * Applies filters to stats
 * @param {Array<Object>} stats - The stats to filter
 * @param {Object} activeFilters - The active filters to apply
 * @returns {Array<Object>} - The filtered stats
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
 * @param {Array<Object>} stats - The stats to analyze for available filters
 * @returns {Object} - An object containing available filters
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
 * @param {Object} filters - The filters to save
 */
export const saveFilterPreferences = (filters) => {
  localStorage.setItem('statFilters', JSON.stringify(filters));
};

/**
 * Loads filter preferences from localStorage
 * @returns {Object} - The loaded filters
 */
export const loadFilterPreferences = () => {
  const saved = localStorage.getItem('statFilters');
  return saved ? JSON.parse(saved) : {};
}; 
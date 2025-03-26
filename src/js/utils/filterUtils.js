import { FILTER_TYPES, FILTER_RANGES } from '../constants/scoreConstants.js';

/**
 * Checks if a value falls within a range
 */
const isInRange = (value, range) => {
  return value >= range.min && value <= range.max;
};

/**
 * Applies filters to scores
 */
export const applyFilters = (scores, activeFilters) => {
  if (!activeFilters || Object.keys(activeFilters).length === 0) {
    return scores;
  }

  return scores.filter(score => {
    // Check each filter type
    return Object.entries(activeFilters).every(([filterType, selectedRanges]) => {
      // If no ranges selected for this filter type, consider it passed
      if (!selectedRanges || selectedRanges.length === 0) return true;

      // Get the value to check based on filter type
      let valueToCheck;
      switch (filterType) {
      case FILTER_TYPES.WORD_LENGTH:
        valueToCheck = score.word.length;
        break;
      case FILTER_TYPES.TIME:
        valueToCheck = score.score; // score represents time in seconds
        break;
      case FILTER_TYPES.ATTEMPTS:
        valueToCheck = score.attempts;
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
 * Gets available filter options based on current scores
 */
export const getAvailableFilters = (scores) => {
  const available = {
    [FILTER_TYPES.WORD_LENGTH]: new Set(),
    [FILTER_TYPES.TIME]: new Set(),
    [FILTER_TYPES.ATTEMPTS]: new Set()
  };

  scores.forEach(score => {
    // Word Length
    FILTER_RANGES.WORD_LENGTH.forEach((range, index) => {
      if (isInRange(score.word.length, range)) {
        available[FILTER_TYPES.WORD_LENGTH].add(index);
      }
    });

    // Time
    FILTER_RANGES.TIME.forEach((range, index) => {
      if (isInRange(score.score, range)) {
        available[FILTER_TYPES.TIME].add(index);
      }
    });

    // Attempts
    FILTER_RANGES.ATTEMPTS.forEach((range, index) => {
      if (isInRange(score.attempts, range)) {
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
  localStorage.setItem('scoreFilters', JSON.stringify(filters));
};

/**
 * Loads filter preferences from localStorage
 */
export const loadFilterPreferences = () => {
  const saved = localStorage.getItem('scoreFilters');
  return saved ? JSON.parse(saved) : {};
}; 
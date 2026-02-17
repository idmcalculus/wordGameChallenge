import { FILTER_TYPES, FILTER_RANGES } from '../constants/statConstants';
import type { ActiveFilters, IndexedStatEntry, RangeDefinition } from '../types/interface';
import type { FilterType, JsonObject, JsonValue } from '../types/types';

/**
 * Checks if a value falls within a range
 * @param {number} value - The value to check
 * @param {Object} range - The range object with min and max properties
 * @returns {boolean} - True if the value is within the range, false otherwise
 */
const isInRange = (value: number, range: RangeDefinition): boolean => {
  return value >= range.min && value <= range.max;
};

const FILTER_TYPE_VALUES = Object.values(FILTER_TYPES) as FilterType[];

function isFilterType(value: string): value is FilterType {
  return FILTER_TYPE_VALUES.includes(value as FilterType);
}

function getFilterEntries(activeFilters: ActiveFilters): Array<[FilterType, number[]]> {
  return Object.entries(activeFilters).reduce<Array<[FilterType, number[]]>>((accumulator, [type, indices]) => {
    if (isFilterType(type) && Array.isArray(indices)) {
      accumulator.push([type, indices]);
    }
    return accumulator;
  }, []);
}

/**
 * Applies filters to stats
 * @param {Array<Object>} stats - The stats to filter
 * @param {Object} activeFilters - The active filters to apply
 * @returns {Array<Object>} - The filtered stats
 */
export const applyFilters = <T extends IndexedStatEntry>(stats: T[], activeFilters: ActiveFilters): T[] => {
  if (Object.keys(activeFilters).length === 0) {
    return stats;
  }

  const activeEntries = getFilterEntries(activeFilters);

  return stats.filter((stat) => {
    // Check each filter type
    return activeEntries.every(([filterType, selectedRanges]) => {
      // If no ranges selected for this filter type, consider it passed
      if (selectedRanges.length === 0) {
        return true;
      }

      const valueByType: Record<FilterType, number> = {
        [FILTER_TYPES.WORD_LENGTH]: stat.word.length,
        [FILTER_TYPES.TIME]: stat.time,
        [FILTER_TYPES.ATTEMPTS]: stat.attempts
      };
      const valueToCheck = valueByType[filterType];

      // Check if value falls within one of the selected ranges.
      return selectedRanges.some((rangeIndex) => {
        const range = FILTER_RANGES[filterType][rangeIndex];
        if (!range) {
          return false;
        }
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
export const getAvailableFilters = (stats: IndexedStatEntry[]): Record<FilterType, Set<number>> => {
  const available = {
    [FILTER_TYPES.WORD_LENGTH]: new Set<number>(),
    [FILTER_TYPES.TIME]: new Set<number>(),
    [FILTER_TYPES.ATTEMPTS]: new Set<number>()
  };

  stats.forEach((stat) => {
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
export const saveFilterPreferences = (filters: ActiveFilters): void => {
  localStorage.setItem('statFilters', JSON.stringify(filters));
};

/**
 * Loads filter preferences from localStorage
 * @returns {Object} - The loaded filters
 */
export const loadFilterPreferences = (): ActiveFilters => {
  const saved = localStorage.getItem('statFilters');
  if (!saved) {
    return {};
  }

  try {
    const parsed = JSON.parse(saved) as JsonValue;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const sanitized: ActiveFilters = {};
    Object.entries(parsed as JsonObject).forEach(([filterType, indices]) => {
      if (!isFilterType(filterType)) {
        return;
      }

      const ranges = FILTER_RANGES[filterType];
      if (!ranges || !Array.isArray(indices)) {
        return;
      }

      const validIndices = indices.filter((index): index is number =>
        typeof index === 'number' &&
        Number.isInteger(index) &&
        index >= 0 &&
        index < ranges.length
      );

      if (validIndices.length > 0) {
        sanitized[filterType] = validIndices;
      }
    });

    return sanitized;
  } catch {
    return {};
  }
}; 

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

const DATE_FILTER_INDEX = {
  THIS_WEEK: 0,
  LAST_WEEK: 1,
  LAST_MONTH: 2,
  LAST_3_MONTHS: 3,
  LAST_6_MONTHS: 4,
  ALL_TIME: 5
} as const;

interface NumericBounds {
  min: number;
  max: number;
}

const WORD_LENGTH_BOUNDS: NumericBounds = { min: 3, max: 10 };
const ATTEMPTS_BOUNDS: NumericBounds = { min: 1, max: 5 };

function startOfDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function endOfDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(23, 59, 59, 999);
  return day;
}

function startOfWeek(date: Date): Date {
  const weekStart = startOfDay(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isDateFilterMatch(statDateValue: string, rangeIndex: number, referenceDate = new Date()): boolean {
  const statDate = new Date(statDateValue);
  if (Number.isNaN(statDate.getTime())) {
    return false;
  }

  const now = endOfDay(referenceDate);
  const currentWeekStart = startOfWeek(referenceDate);
  const currentMonthStart = startOfMonth(referenceDate);

  switch (rangeIndex) {
  case DATE_FILTER_INDEX.THIS_WEEK:
    return statDate >= currentWeekStart && statDate <= now;
  case DATE_FILTER_INDEX.LAST_WEEK: {
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(currentWeekStart.getTime() - 1);
    return statDate >= lastWeekStart && statDate <= lastWeekEnd;
  }
  case DATE_FILTER_INDEX.LAST_MONTH: {
    const lastMonthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - 1, 1);
    const lastMonthEnd = new Date(currentMonthStart.getTime() - 1);
    return statDate >= lastMonthStart && statDate <= lastMonthEnd;
  }
  case DATE_FILTER_INDEX.LAST_3_MONTHS: {
    const lastThreeMonthsStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - 3, 1);
    const lastThreeMonthsEnd = new Date(currentMonthStart.getTime() - 1);
    return statDate >= lastThreeMonthsStart && statDate <= lastThreeMonthsEnd;
  }
  case DATE_FILTER_INDEX.LAST_6_MONTHS: {
    const lastSixMonthsStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - 6, 1);
    const lastSixMonthsEnd = new Date(currentMonthStart.getTime() - 1);
    return statDate >= lastSixMonthsStart && statDate <= lastSixMonthsEnd;
  }
  case DATE_FILTER_INDEX.ALL_TIME:
    return statDate <= now;
  default:
    return false;
  }
}

function clampToBounds(value: number, bounds: NumericBounds): number {
  return Math.max(bounds.min, Math.min(bounds.max, Math.floor(value)));
}

function normalizeNumericRange(minValue: number, maxValue: number, bounds: NumericBounds): [number, number] {
  const normalizedMin = clampToBounds(minValue, bounds);
  const normalizedMax = clampToBounds(maxValue, bounds);
  return normalizedMin <= normalizedMax
    ? [normalizedMin, normalizedMax]
    : [normalizedMax, normalizedMin];
}

function isNumericRangeSelection(selection: number[], bounds: NumericBounds): boolean {
  return selection.length === 2 &&
    selection.every((value) => Number.isInteger(value) && value >= bounds.min && value <= bounds.max);
}

function isValidRangeIndex(value: number, ranges: readonly RangeDefinition[]): boolean {
  return Number.isInteger(value) && value >= 0 && value < ranges.length;
}

function getValidRangeIndices(values: number[], ranges: readonly RangeDefinition[]): number[] {
  return values.filter((value) => isValidRangeIndex(value, ranges));
}

function matchByRangeIndex(value: number, rangeIndices: number[], ranges: readonly RangeDefinition[]): boolean {
  return rangeIndices.some((rangeIndex) => {
    const range = ranges[rangeIndex];
    return isInRange(value, range);
  });
}

function matchesNumericFilterValue(
  value: number,
  selectedValues: number[],
  ranges: readonly RangeDefinition[],
  bounds: NumericBounds
): boolean {
  if (isNumericRangeSelection(selectedValues, bounds)) {
    const [minValue, maxValue] = normalizeNumericRange(selectedValues[0], selectedValues[1], bounds);
    return value >= minValue && value <= maxValue;
  }

  const validRangeIndices = getValidRangeIndices(selectedValues, ranges);
  if (validRangeIndices.length === 0) {
    return false;
  }

  return matchByRangeIndex(value, validRangeIndices, ranges);
}

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
export const applyFilters = <T extends IndexedStatEntry>(
  stats: T[],
  activeFilters: ActiveFilters,
  referenceDate = new Date()
): T[] => {
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

      if (filterType === FILTER_TYPES.DATE) {
        return selectedRanges.some((rangeIndex) => isDateFilterMatch(stat.date, rangeIndex, referenceDate));
      }

      if (filterType === FILTER_TYPES.WORD_LENGTH) {
        return matchesNumericFilterValue(stat.word.length, selectedRanges, FILTER_RANGES.WORD_LENGTH, WORD_LENGTH_BOUNDS);
      }

      if (filterType === FILTER_TYPES.ATTEMPTS) {
        return matchesNumericFilterValue(stat.attempts, selectedRanges, FILTER_RANGES.ATTEMPTS, ATTEMPTS_BOUNDS);
      }

      const valueByType: Record<FilterType, number> = {
        [FILTER_TYPES.WORD_LENGTH]: 0,
        [FILTER_TYPES.TIME]: stat.time,
        [FILTER_TYPES.ATTEMPTS]: 0,
        [FILTER_TYPES.DATE]: 0
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
export const getAvailableFilters = (
  stats: IndexedStatEntry[],
  referenceDate = new Date()
): Record<FilterType, Set<number>> => {
  const available = {
    [FILTER_TYPES.WORD_LENGTH]: new Set<number>(),
    [FILTER_TYPES.TIME]: new Set<number>(),
    [FILTER_TYPES.ATTEMPTS]: new Set<number>(),
    [FILTER_TYPES.DATE]: new Set<number>()
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

    FILTER_RANGES.DATE.forEach((_: RangeDefinition, index) => {
      if (isDateFilterMatch(stat.date, index, referenceDate)) {
        available[FILTER_TYPES.DATE].add(index);
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

      const numericValues = indices.filter((index): index is number =>
        typeof index === 'number' && Number.isFinite(index)
      );

      if (filterType === FILTER_TYPES.DATE) {
        const validDateIndices = getValidRangeIndices(numericValues, ranges);
        if (validDateIndices.length > 0) {
          sanitized[filterType] = [validDateIndices[0]];
        }
        return;
      }

      if (filterType === FILTER_TYPES.TIME) {
        const validTimeIndices = getValidRangeIndices(numericValues, ranges);
        if (validTimeIndices.length > 0) {
          sanitized[filterType] = Array.from(new Set(validTimeIndices));
        }
        return;
      }

      const bounds = filterType === FILTER_TYPES.WORD_LENGTH ? WORD_LENGTH_BOUNDS : ATTEMPTS_BOUNDS;
      if (isNumericRangeSelection(numericValues, bounds)) {
        const [minValue, maxValue] = normalizeNumericRange(numericValues[0], numericValues[1], bounds);
        if (!(minValue === bounds.min && maxValue === bounds.max)) {
          sanitized[filterType] = [minValue, maxValue];
        }
        return;
      }

      const legacyIndices = getValidRangeIndices(numericValues, ranges);
      if (legacyIndices.length > 0) {
        let minValue = bounds.max;
        let maxValue = bounds.min;

        legacyIndices.forEach((rangeIndex) => {
          const range = ranges[rangeIndex];

          minValue = Math.min(minValue, range.min);
          const boundedMax = range.max === Infinity ? bounds.max : range.max;
          maxValue = Math.max(maxValue, boundedMax);
        });

        const [normalizedMin, normalizedMax] = normalizeNumericRange(minValue, maxValue, bounds);
        if (!(normalizedMin === bounds.min && normalizedMax === bounds.max)) {
          sanitized[filterType] = [normalizedMin, normalizedMax];
        }
      }
    });

    return sanitized;
  } catch {
    return {};
  }
}; 

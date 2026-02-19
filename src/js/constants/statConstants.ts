import type { RangeDefinition, SortState } from '../types/interface';

export const SORT_DIRECTIONS = {
  DEFAULT: 'default',
  ASC: 'ascending',
  DESC: 'descending'
} as const;

export const SORT_FIELDS = {
  SERIAL: 'serial',
  WORD: 'word',
  TIME: 'time',
  ATTEMPTS: 'attempts',
  DATE: 'date',
  WORD_LENGTH: 'wordLength'
} as const;

export const FILTER_TYPES = {
  WORD_LENGTH: 'WORD_LENGTH',
  TIME: 'TIME',
  ATTEMPTS: 'ATTEMPTS',
  DATE: 'DATE'
} as const;

export const FILTER_RANGES = {
  WORD_LENGTH: [
    { label: '3-5 letters', min: 3, max: 5 },
    { label: '6-8 letters', min: 6, max: 8 },
    { label: '9-10 letters', min: 9, max: 10 }
  ],
  TIME: [
    { label: 'Under 30s', min: 0, max: 30 },
    { label: '30s - 60s', min: 30, max: 60 },
    { label: '1 min - 2 mins', min: 60, max: 120 },
    { label: '2 mins - 3 mins', min: 120, max: 180 },
    { label: '3 mins - 4 mins', min: 180, max: 240 },
    { label: '4 mins - 5 mins', min: 240, max: 300 },
    { label: 'Over 5 mins', min: 300, max: Infinity }
  ],
  ATTEMPTS: [
    { label: '1-2 attempts', min: 1, max: 2 },
    { label: '3-4 attempts', min: 3, max: 4 },
    { label: '5 attempts', min: 5, max: 5 }
  ],
  DATE: [
    { label: 'This week', min: 0, max: 0 },
    { label: 'Last week', min: 0, max: 0 },
    { label: 'Last month', min: 0, max: 0 },
    { label: 'Last 3 months', min: 0, max: 0 },
    { label: 'Last 6 months', min: 0, max: 0 },
    { label: 'All Time', min: 0, max: 0 }
  ]
} as const satisfies Record<(typeof FILTER_TYPES)[keyof typeof FILTER_TYPES], readonly RangeDefinition[]>;

export const DEFAULT_SORT = {
  field: SORT_FIELDS.TIME,
  direction: SORT_DIRECTIONS.ASC
} as const satisfies SortState;

export const ANIMATION_DURATION = 300; // milliseconds 

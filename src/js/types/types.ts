export type LetterState = 'correct' | 'contains' | 'notContains';

export type GameState = 'idle' | 'running' | 'won' | 'lost';

export type DifficultyLabel = 'Easy' | 'Medium' | 'Hard' | 'Very Hard';

export type StatDifficultyLabel = DifficultyLabel | 'Unknown';

export type WordFamiliarity = 'common' | 'standard' | 'stretch';

export type ThemePreference = 'system' | 'light' | 'dark';

export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export type SortDirection = 'default' | 'ascending' | 'descending';

export type SortField = 'serial' | 'word' | 'time' | 'attempts' | 'date' | 'wordLength';

export type FilterType = 'WORD_LENGTH' | 'TIME' | 'ATTEMPTS' | 'DATE';

export type HintType = 'letter' | 'position';

export type KeyboardControlKey = 'enter' | 'delete' | 'arrowleft' | 'arrowright';

export type KeyboardKey = KeyboardControlKey | string;

export type JsonPrimitive = string | number | boolean | null;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

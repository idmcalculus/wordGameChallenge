import type { StatEntry } from '../types/interface';
import type { JsonObject, JsonValue } from '../types/types';

const STATS_STORAGE_KEY = 'stats';
const LEGACY_STATS_KEY = 'highScores';
type StatEntryInput = StatEntry | JsonObject;

function safeParseArray(storageValue: string | null): JsonValue[] {
  if (!storageValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(storageValue) as JsonValue;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toNumber(value: JsonValue | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDate(value: JsonValue | undefined): string {
  const parsed = new Date(String(value ?? ''));
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeWord(value: JsonValue | undefined): string {
  return (typeof value === 'string' ? value : '').toLowerCase();
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStat(statLike: JsonValue): StatEntry | null {
  if (!isJsonObject(statLike)) {
    return null;
  }

  const word = normalizeWord(statLike.word);
  if (!word) {
    return null;
  }

  const time = toNumber(statLike.time ?? statLike.score, 0);
  const attempts = toNumber(statLike.attempts, 0);
  const wordLength = toNumber(statLike.wordLength ?? word.length, word.length);

  return {
    word,
    time,
    attempts,
    wordLength,
    date: normalizeDate(statLike.date)
  };
}

function dedupeAndNormalizeStats(stats: JsonValue[]): StatEntry[] {
  const seen = new Set<string>();
  const normalized: StatEntry[] = [];

  stats.forEach((stat) => {
    const next = normalizeStat(stat);
    if (!next) {
      return;
    }

    const key = `${next.word}|${next.time}|${next.attempts}|${next.date}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push(next);
  });

  return normalized;
}

function compareStats(a: StatEntry, b: StatEntry): number {
  if (a.time !== b.time) {
    return a.time - b.time;
  }

  if (a.attempts !== b.attempts) {
    return a.attempts - b.attempts;
  }

  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

export function loadStats(): StatEntry[] {
  const legacy = safeParseArray(localStorage.getItem(LEGACY_STATS_KEY));
  const current = safeParseArray(localStorage.getItem(STATS_STORAGE_KEY));

  const merged = dedupeAndNormalizeStats([...legacy, ...current]);
  merged.sort(compareStats);

  if (legacy.length > 0) {
    localStorage.removeItem(LEGACY_STATS_KEY);
  }

  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export function saveStats(stats: StatEntryInput[]): StatEntry[] {
  const normalized = dedupeAndNormalizeStats(stats as JsonValue[]);
  normalized.sort(compareStats);
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function addStat(stats: StatEntryInput[], statEntry: StatEntry): StatEntry[] {
  return saveStats([...stats, statEntry]);
}

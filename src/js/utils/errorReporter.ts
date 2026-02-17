import { appConfig } from '../config/appConfig';
import type { CapturedErrorEntry } from '../types/interface';
import type { JsonObject, JsonValue } from '../types/types';

const isBrowser = typeof window !== 'undefined';
let handlersInstalled = false;

type ErrorLike = Error | string | JsonObject | null | undefined;

function normalizeReason(reason: ErrorLike): Error {
  if (reason instanceof Error) {
    return reason;
  }

  if (typeof reason === 'string') {
    return new Error(reason);
  }

  try {
    return new Error(JSON.stringify(reason));
  } catch {
    return new Error(String(reason));
  }
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeDetails(details: JsonObject): JsonObject {
  try {
    const serialized = JSON.stringify(details, (_: string, value: JsonValue | Error | (() => void)) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack ?? ''
        } satisfies JsonObject;
      }

      if (typeof value === 'function') {
        return '[function]';
      }

      return value;
    });
    const parsed = JSON.parse(serialized) as JsonValue;
    return isJsonObject(parsed) ? parsed : { value: String(parsed) };
  } catch {
    return { value: String(details) };
  }
}

function parseStoredErrors(serialized: string | null): CapturedErrorEntry[] {
  if (!serialized) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized) as JsonValue;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const entries: CapturedErrorEntry[] = [];

    parsed.forEach((entry) => {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        return;
      }

      const candidate = entry as Record<string, JsonValue>;
      const details = (candidate.details ?? {}) as JsonValue;
      if (
        typeof candidate.timestamp !== 'string' ||
        typeof candidate.name !== 'string' ||
        typeof candidate.message !== 'string' ||
        typeof candidate.stack !== 'string' ||
        typeof candidate.url !== 'string' ||
        typeof candidate.userAgent !== 'string' ||
        !isJsonObject(details)
      ) {
        return;
      }

      entries.push({
        timestamp: candidate.timestamp,
        name: candidate.name,
        message: candidate.message,
        stack: candidate.stack,
        details,
        url: candidate.url,
        userAgent: candidate.userAgent
      });
    });

    return entries;
  } catch {
    return [];
  }
}

function persistError(errorEntry: CapturedErrorEntry): void {
  if (!isBrowser) {
    return;
  }

  try {
    const existing = parseStoredErrors(localStorage.getItem(appConfig.errorReporting.storageKey));
    const updated = [...existing];
    updated.push(errorEntry);

    const maxErrors = appConfig.errorReporting.maxStoredErrors;
    if (updated.length > maxErrors) {
      updated.splice(0, updated.length - maxErrors);
    }

    localStorage.setItem(appConfig.errorReporting.storageKey, JSON.stringify(updated));
  } catch {
    // Intentionally silent to avoid recursive logging failures.
  }
}

function sendErrorToEndpoint(errorEntry: CapturedErrorEntry): void {
  const endpoint = appConfig.errorReporting.endpoint;
  if (!endpoint || !isBrowser) {
    return;
  }

  const payload = JSON.stringify(errorEntry);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
      return;
    }
  } catch {
    // Fall back to fetch below.
  }

  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: payload,
    keepalive: true
  }).catch(() => {
    // Intentionally silent in production.
  });
}

export function captureError(errorLike: ErrorLike, details: JsonObject = {}): void {
  const error = normalizeReason(errorLike);
  const entry: CapturedErrorEntry = {
    timestamp: new Date().toISOString(),
    name: error.name || 'Error',
    message: error.message || 'Unknown error',
    stack: error.stack || '',
    details: sanitizeDetails(details),
    url: isBrowser ? window.location.href : '',
    userAgent: isBrowser ? navigator.userAgent : ''
  };

  persistError(entry);
  sendErrorToEndpoint(entry);
}

export function installGlobalErrorHandlers(): void {
  if (!isBrowser || handlersInstalled) {
    return;
  }

  handlersInstalled = true;

  window.addEventListener('error', (event) => {
    captureError(event.error || event.message, {
      source: 'window.error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, {
      source: 'window.unhandledrejection'
    });
  });
}

export function getCapturedErrors(): CapturedErrorEntry[] {
  if (!isBrowser) {
    return [];
  }

  return parseStoredErrors(localStorage.getItem(appConfig.errorReporting.storageKey));
}

export function clearCapturedErrors(): void {
  if (!isBrowser) {
    return;
  }

  try {
    localStorage.removeItem(appConfig.errorReporting.storageKey);
  } catch {
    // Intentionally silent.
  }
}

import { appConfig } from '../config/appConfig.js';

const isBrowser = typeof window !== 'undefined';
let handlersInstalled = false;

function normalizeUnknownReason(reason) {
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

function sanitizeDetails(details) {
  try {
    return JSON.parse(JSON.stringify(details, (_, value) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }

      if (typeof value === 'function') {
        return '[function]';
      }

      return value;
    }));
  } catch {
    return { value: String(details) };
  }
}

function persistError(errorEntry) {
  if (!isBrowser) {
    return;
  }

  try {
    const existing = JSON.parse(localStorage.getItem(appConfig.errorReporting.storageKey) || '[]');
    const updated = Array.isArray(existing) ? existing : [];
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

function sendErrorToEndpoint(errorEntry) {
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

export function captureError(errorLike, details = {}) {
  const error = normalizeUnknownReason(errorLike);
  const entry = {
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

export function installGlobalErrorHandlers() {
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

export function getCapturedErrors() {
  if (!isBrowser) {
    return [];
  }

  try {
    const stored = JSON.parse(localStorage.getItem(appConfig.errorReporting.storageKey) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function clearCapturedErrors() {
  if (!isBrowser) {
    return;
  }

  try {
    localStorage.removeItem(appConfig.errorReporting.storageKey);
  } catch {
    // Intentionally silent.
  }
}


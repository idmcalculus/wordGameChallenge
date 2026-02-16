const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const appConfig = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  logging: {
    // Verbose browser logging is dev-only by default.
    enabled: import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true'
  },
  errorReporting: {
    endpoint: (import.meta.env.VITE_CLIENT_ERROR_ENDPOINT || '').trim(),
    storageKey: import.meta.env.VITE_CLIENT_ERROR_STORAGE_KEY || 'word_game_client_errors',
    maxStoredErrors: parsePositiveInt(import.meta.env.VITE_MAX_STORED_CLIENT_ERRORS, 50)
  }
};


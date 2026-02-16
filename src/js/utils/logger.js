import { appConfig } from '../config/appConfig.js';
import { captureError } from './errorReporter.js';

function logToConsole(method, args) {
  if (!appConfig.logging.enabled) {
    return;
  }

  // eslint-disable-next-line no-console
  console[method](...args);
}

export const logger = {
  debug: (...args) => {
    logToConsole('debug', args);
  },
  info: (...args) => {
    logToConsole('info', args);
  },
  warn: (...args) => {
    logToConsole('warn', args);
  },
  error: (errorLike, details = {}) => {
    captureError(errorLike, details);
    if (appConfig.logging.enabled) {
      // eslint-disable-next-line no-console
      console.error(errorLike, details);
    }
  }
};


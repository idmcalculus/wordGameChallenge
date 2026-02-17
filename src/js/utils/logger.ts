import { appConfig } from '../config/appConfig';
import { captureError } from './errorReporter';
import type { JsonObject, JsonValue } from '../types/types';

type ConsoleMethod = 'debug' | 'info' | 'warn' | 'error';
type LogPayload = JsonValue | Error | object | undefined;

function logToConsole(method: ConsoleMethod, args: LogPayload[]): void {
  if (!appConfig.logging.enabled) {
    return;
  }

  const fn = console[method];
  fn.apply(console, args);
}

export const logger = {
  debug: (...args: LogPayload[]): void => {
    logToConsole('debug', args);
  },
  info: (...args: LogPayload[]): void => {
    logToConsole('info', args);
  },
  warn: (...args: LogPayload[]): void => {
    logToConsole('warn', args);
  },
  error: (errorLike: Error | string | JsonObject | null | undefined, details: JsonObject = {}): void => {
    captureError(errorLike, details);
    if (appConfig.logging.enabled) {
      console.error(errorLike, details);
    }
  }
};

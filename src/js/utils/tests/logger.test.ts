import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captureErrorMock = vi.fn();

vi.mock('../errorReporter', () => ({
  captureError: (errorLike: Error | string | Record<string, unknown> | null | undefined, details = {}): void => {
    captureErrorMock(errorLike, details);
  }
}));

async function loadLoggerWithLogging(enabled: boolean): Promise<typeof import('../logger').logger> {
  vi.resetModules();
  vi.doMock('../../config/appConfig', () => ({
    appConfig: {
      logging: {
        enabled
      },
      errorReporting: {
        endpoint: '',
        storageKey: 'word-game-errors',
        maxStoredErrors: 50
      }
    }
  }));

  const module = await import('../logger');
  return module.logger;
}

describe('logger', () => {
  let debugSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    captureErrorMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs debug/info/warn calls when logging is enabled', async () => {
    const logger = await loadLoggerWithLogging(true);

    logger.debug('d1', { a: 1 });
    logger.info('i1');
    logger.warn('w1');

    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('captures errors through the error reporter and writes console error in enabled mode', async () => {
    const logger = await loadLoggerWithLogging(true);

    logger.error(new Error('boom'), { source: 'test.logger' });

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('suppresses console output when logging is disabled but still captures errors', async () => {
    const logger = await loadLoggerWithLogging(false);

    logger.debug('d1');
    logger.info('i1');
    logger.warn('w1');
    logger.error('boom', { source: 'disabled-mode' });

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
  });
});

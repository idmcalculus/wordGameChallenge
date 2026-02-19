// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JsonObject } from '../../types/types';

type ErrorReporterModule = typeof import('../errorReporter');

async function loadErrorReporterModule(options: { endpoint?: string; maxStoredErrors?: number } = {}): Promise<ErrorReporterModule> {
  vi.resetModules();
  const endpoint = options.endpoint ?? '';
  const maxStoredErrors = options.maxStoredErrors ?? 3;

  vi.doMock('../../config/appConfig', () => ({
    appConfig: {
      logging: { enabled: false },
      errorReporting: {
        endpoint,
        storageKey: 'word-game-errors',
        maxStoredErrors
      }
    }
  }));

  return import('../errorReporter');
}

describe('errorReporter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('captures and stores sanitized error entries', async () => {
    const module = await loadErrorReporterModule();
    const { captureError, getCapturedErrors } = module;

    captureError('bad thing', {
      source: 'unit-test',
      nested: { ok: true }
    });

    const entries = getCapturedErrors();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.message).toBe('bad thing');
    expect(entries[0]?.details).toMatchObject({
      source: 'unit-test',
      nested: { ok: true }
    });
  });

  it('trims stored errors to configured max', async () => {
    const module = await loadErrorReporterModule({ maxStoredErrors: 2 });
    const { captureError, getCapturedErrors } = module;

    captureError('e1');
    captureError('e2');
    captureError('e3');

    const entries = getCapturedErrors();
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.message)).toEqual(['e2', 'e3']);
  });

  it('sends errors to endpoint via sendBeacon when available', async () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon
    });

    const module = await loadErrorReporterModule({ endpoint: '/errors' });
    const { captureError } = module;

    captureError(new Error('send beacon'));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon).toHaveBeenCalledWith('/errors', expect.any(Blob));
  });

  it('falls back to fetch when sendBeacon fails', async () => {
    const sendBeacon = vi.fn().mockImplementation(() => {
      throw new Error('beacon failed');
    });
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon
    });

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const module = await loadErrorReporterModule({ endpoint: '/errors' });
    const { captureError } = module;

    captureError('fallback fetch');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/errors', expect.objectContaining({
      method: 'POST',
      keepalive: true
    }));
  });

  it('installs global handlers once and captures window error + unhandled rejection', async () => {
    const module = await loadErrorReporterModule();
    const { installGlobalErrorHandlers, getCapturedErrors } = module;

    installGlobalErrorHandlers();
    installGlobalErrorHandlers();

    window.dispatchEvent(new ErrorEvent('error', {
      message: 'window crash',
      error: new Error('window crash'),
      filename: 'x.ts',
      lineno: 9,
      colno: 2
    }));

    const rejectionEvent = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(rejectionEvent, 'reason', {
      configurable: true,
      value: new Error('promise crash')
    });
    window.dispatchEvent(rejectionEvent);

    const entries = getCapturedErrors();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.details.source).toBe('window.error');
    expect(entries[1]?.details.source).toBe('window.unhandledrejection');
  });

  it('clears stored errors', async () => {
    const module = await loadErrorReporterModule();
    const { captureError, clearCapturedErrors, getCapturedErrors } = module;

    captureError('to clear');
    expect(getCapturedErrors()).toHaveLength(1);
    clearCapturedErrors();
    expect(getCapturedErrors()).toEqual([]);
  });

  it('returns an empty list for malformed stored payloads', async () => {
    const module = await loadErrorReporterModule();
    const { getCapturedErrors } = module;

    localStorage.setItem('word-game-errors', '{bad json');
    expect(getCapturedErrors()).toEqual([]);

    localStorage.setItem('word-game-errors', JSON.stringify({ value: 1 }));
    expect(getCapturedErrors()).toEqual([]);
  });

  it('filters invalid stored entries and keeps valid ones only', async () => {
    const module = await loadErrorReporterModule();
    const { getCapturedErrors } = module;

    localStorage.setItem('word-game-errors', JSON.stringify([
      'bad-entry',
      { timestamp: 1 },
      {
        timestamp: '2026-02-17T00:00:00.000Z',
        name: 'Error',
        message: 'valid',
        stack: '',
        details: { source: 'test' },
        url: 'https://example.com',
        userAgent: 'agent'
      }
    ]));

    const entries = getCapturedErrors();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.message).toBe('valid');
  });

  it('does not fall back to fetch when sendBeacon returns false', async () => {
    const sendBeacon = vi.fn().mockReturnValue(false);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const module = await loadErrorReporterModule({ endpoint: '/errors' });
    const { captureError } = module;

    captureError('beacon false');

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not send network requests when endpoint is disabled', async () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const module = await loadErrorReporterModule({ endpoint: '' });
    const { captureError } = module;

    captureError('local only');

    expect(sendBeacon).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes non-error values and sanitizes detail objects with Error/functions', async () => {
    const module = await loadErrorReporterModule();
    const { captureError, getCapturedErrors } = module;

    const detailError = new Error('detail boom');
    delete detailError.stack;

    const detailPayload = {
      source: 'normalize-test',
      nestedError: detailError,
      callback: (): string => 'x'
    } as unknown as JsonObject;

    captureError({ reason: 'plain-object' } as Record<string, string>, detailPayload);

    const entries = getCapturedErrors();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.message).toContain('plain-object');
    expect(entries[0]?.details).toMatchObject({
      source: 'normalize-test',
      callback: '[function]'
    });
  });

  it('applies fallback defaults for empty error fields and supports message-only window errors', async () => {
    const module = await loadErrorReporterModule();
    const { captureError, installGlobalErrorHandlers, getCapturedErrors } = module;

    const blankError = new Error('');
    blankError.name = '';
    blankError.message = '';
    blankError.stack = '';
    captureError(blankError);

    installGlobalErrorHandlers();
    window.dispatchEvent(new ErrorEvent('error', {
      message: 'message-only-crash'
    }));

    const entries = getCapturedErrors();
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries[0]?.name).toBe('Error');
    expect(entries[0]?.message).toBe('Unknown error');
    expect(entries.some((entry) => entry.message === 'message-only-crash')).toBe(true);
  });

  it('uses fetch when sendBeacon API is unavailable', async () => {
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: undefined
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const module = await loadErrorReporterModule({ endpoint: '/errors' });
    const { captureError } = module;

    captureError('fetch-only path');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

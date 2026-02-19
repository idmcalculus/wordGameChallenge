// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../serviceWorkerRegistration';

const loggerDebugMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock('../utils/logger', () => ({
  logger: {
    debug: (...args: unknown[]): void => {
      loggerDebugMock(...args);
    },
    error: (...args: unknown[]): void => {
      loggerErrorMock(...args);
    }
  }
}));

describe('serviceWorkerRegistration', () => {
  const originalServiceWorker = navigator.serviceWorker;

  beforeEach(() => {
    vi.restoreAllMocks();
    loggerDebugMock.mockReset();
    loggerErrorMock.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: originalServiceWorker
    });
  });

  it('does nothing when service workers are unavailable', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: undefined
    });

    const addEventSpy = vi.spyOn(window, 'addEventListener');
    registerServiceWorker(true);
    expect(addEventSpy).not.toHaveBeenCalled();
  });

  it('registers /sw.js on load in production mode', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register }
    });

    let onLoad: EventListener | null = null;
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler: EventListenerOrEventListenerObject) => {
      if (event === 'load' && typeof handler === 'function') {
        onLoad = handler;
      }
    });

    registerServiceWorker(true);
    expect(onLoad).toBeTypeOf('function');
    onLoad!(new Event('load'));

    await Promise.resolve();
    expect(register).toHaveBeenCalledWith('/sw.js');
    expect(loggerDebugMock).toHaveBeenCalled();
  });

  it('skips registration in non-production mode', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register }
    });

    let onLoad: EventListener | null = null;
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler: EventListenerOrEventListenerObject) => {
      if (event === 'load' && typeof handler === 'function') {
        onLoad = handler;
      }
    });

    registerServiceWorker(false);
    expect(onLoad).toBeTypeOf('function');
    onLoad!(new Event('load'));

    await Promise.resolve();
    expect(register).not.toHaveBeenCalled();
  });

  it('logs registration failure when service-worker registration rejects', async () => {
    const register = vi.fn().mockRejectedValue(new Error('registration failed'));
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register }
    });

    let onLoad: EventListener | null = null;
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler: EventListenerOrEventListenerObject) => {
      if (event === 'load' && typeof handler === 'function') {
        onLoad = handler;
      }
    });

    registerServiceWorker(true);
    onLoad!(new Event('load'));

    await Promise.resolve();
    await Promise.resolve();
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});

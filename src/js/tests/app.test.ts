// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('app bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
  });

  it('registers global handlers, bootstraps on DOMContentLoaded, and cleans up on beforeunload', async () => {
    const displayStatsMock = vi.fn();
    const destroyMock = vi.fn();
    const setupModalsMock = vi.fn();
    const teardownModalsMock = vi.fn();
    const registerServiceWorkerMock = vi.fn();
    const initializeThemeManagerMock = vi.fn();
    const installGlobalErrorHandlersMock = vi.fn();
    const getCapturedErrorsMock = vi.fn().mockReturnValue([]);
    const clearCapturedErrorsMock = vi.fn();

    let modalOptions: { onOpenStats?: () => void } = {};

    vi.doMock('../controllers/GameController', () => ({
      default: class MockGameController {
        displayStats = displayStatsMock;
        destroy = destroyMock;
      }
    }));

    vi.doMock('../modals', () => ({
      setupModals: (options: { onOpenStats?: () => void } = {}): (() => void) => {
        setupModalsMock(options);
        modalOptions = options;
        return teardownModalsMock;
      }
    }));

    vi.doMock('../serviceWorkerRegistration', () => ({
      registerServiceWorker: (): void => {
        registerServiceWorkerMock();
      }
    }));

    vi.doMock('../themeManager', () => ({
      initializeThemeManager: (): void => {
        initializeThemeManagerMock();
      }
    }));

    vi.doMock('../utils/errorReporter', () => ({
      installGlobalErrorHandlers: (): void => {
        installGlobalErrorHandlersMock();
      },
      getCapturedErrors: (): unknown[] => getCapturedErrorsMock(),
      clearCapturedErrors: (): void => {
        clearCapturedErrorsMock();
      }
    }));

    await import('../app');

    expect(installGlobalErrorHandlersMock).toHaveBeenCalledTimes(1);
    expect(registerServiceWorkerMock).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(initializeThemeManagerMock).toHaveBeenCalledTimes(1);
    expect(setupModalsMock).toHaveBeenCalledTimes(1);
    expect(typeof window.getWordGameClientErrors).toBe('function');
    expect(typeof window.clearWordGameClientErrors).toBe('function');

    modalOptions.onOpenStats?.();
    expect(displayStatsMock).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('beforeunload'));
    window.dispatchEvent(new Event('beforeunload'));

    expect(teardownModalsMock).toHaveBeenCalledTimes(1);
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });
});

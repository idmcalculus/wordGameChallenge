// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

type ChangeListener = (event: MediaQueryListEvent) => void;
type LegacyChangeListener = ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null;

interface MockMediaQueryList extends MediaQueryList {
  emitChange(nextMatches: boolean): void;
}

function createMockMediaQueryList(initialMatches: boolean): MockMediaQueryList {
  let matches = initialMatches;
  const listeners = new Set<ChangeListener>();

  const mediaQueryList = {
    media: '(prefers-color-scheme: dark)',
    get matches(): boolean {
      return matches;
    },
    onchange: null,
    addEventListener: (_: string, listener: EventListenerOrEventListenerObject | null): void => {
      if (typeof listener === 'function') {
        listeners.add(listener as ChangeListener);
      }
    },
    removeEventListener: (_: string, listener: EventListenerOrEventListenerObject | null): void => {
      if (typeof listener === 'function') {
        listeners.delete(listener as ChangeListener);
      }
    },
    addListener: (listener: LegacyChangeListener): void => {
      if (typeof listener === 'function') {
        listeners.add(listener as ChangeListener);
      }
    },
    removeListener: (listener: LegacyChangeListener): void => {
      if (typeof listener === 'function') {
        listeners.delete(listener as ChangeListener);
      }
    },
    dispatchEvent: () => true,
    emitChange: (nextMatches: boolean): void => {
      matches = nextMatches;
      const event = { matches } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    }
  } as MockMediaQueryList;

  return mediaQueryList;
}

async function setupThemeTest(options: {
  storedTheme?: string;
  systemDark?: boolean;
  withIcon?: boolean;
  withMeta?: boolean;
  withToggle?: boolean;
  legacyListener?: boolean;
} = {}): Promise<{
  mql: MockMediaQueryList;
  initializeThemeManager: () => void;
}> {
  vi.resetModules();
  document.head.innerHTML = options.withMeta === false ? '' : '<meta name="theme-color" content="#3b63a4">';
  document.body.innerHTML = options.withToggle === false
    ? ''
    : `
      <button id="themeToggle" type="button">
        ${options.withIcon === false ? '' : '<span class="theme-toggle__icon"></span>'}
      </button>
    `;
  localStorage.clear();

  if (typeof options.storedTheme === 'string') {
    localStorage.setItem('word-game-theme-preference', options.storedTheme);
  }

  const mql = createMockMediaQueryList(options.systemDark ?? false);
  if (options.legacyListener) {
    // Simulate older media query API where addEventListener is unavailable.
    Object.defineProperty(mql, 'addEventListener', {
      configurable: true,
      value: undefined
    });
  }
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));

  const module = await import('../themeManager');
  return {
    mql,
    initializeThemeManager: module.initializeThemeManager
  };
}

describe('themeManager', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preference');
  });

  it('initializes to light theme by default', async () => {
    const { initializeThemeManager } = await setupThemeTest({ systemDark: false });
    initializeThemeManager();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme-preference')).toBe('system');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#3b63a4');
    expect(document.querySelector('#themeToggle .theme-toggle__icon')?.textContent).toBe('🌙');
  });

  it('initializes to stored dark preference', async () => {
    const { initializeThemeManager } = await setupThemeTest({ storedTheme: 'dark', systemDark: false });
    initializeThemeManager();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme-preference')).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0f1f33');
    expect(document.querySelector('#themeToggle .theme-toggle__icon')?.textContent).toBe('☀️');
  });

  it('toggles theme on button click and stores preference', async () => {
    const { initializeThemeManager } = await setupThemeTest({ storedTheme: 'light' });
    initializeThemeManager();

    const button = document.getElementById('themeToggle') as HTMLButtonElement | null;
    expect(button).toBeTruthy();
    button?.click();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('word-game-theme-preference')).toBe('dark');
  });

  it('reacts to system theme changes when preference is system', async () => {
    const { initializeThemeManager, mql } = await setupThemeTest({ storedTheme: 'system', systemDark: false });
    initializeThemeManager();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    mql.emitChange(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    mql.emitChange(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('falls back to system preference when stored theme is invalid', async () => {
    const { initializeThemeManager } = await setupThemeTest({ storedTheme: 'neon', systemDark: true });
    initializeThemeManager();

    expect(document.documentElement.getAttribute('data-theme-preference')).toBe('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('updates toggle button text when icon element is missing', async () => {
    const { initializeThemeManager } = await setupThemeTest({ withIcon: false, storedTheme: 'light' });
    initializeThemeManager();

    const button = document.getElementById('themeToggle');
    expect(button?.textContent).toBe('🌙');
  });

  it('initializes safely without theme meta or toggle button', async () => {
    const { initializeThemeManager } = await setupThemeTest({ withMeta: false, withToggle: false });
    expect(() => initializeThemeManager()).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('supports legacy media-query listener registration', async () => {
    const addListenerSpy = vi.fn();
    const { initializeThemeManager, mql } = await setupThemeTest({
      legacyListener: true,
      storedTheme: 'system'
    });
    mql.addListener = ((listener: LegacyChangeListener): void => {
      addListenerSpy(listener);
    }) as MediaQueryList['addListener'];

    initializeThemeManager();
    expect(addListenerSpy).toHaveBeenCalledTimes(1);
  });

  it('toggles from dark to light and ignores system changes for explicit preference', async () => {
    const { initializeThemeManager, mql } = await setupThemeTest({ storedTheme: 'dark', systemDark: true });
    initializeThemeManager();

    const button = document.getElementById('themeToggle') as HTMLButtonElement | null;
    expect(button).toBeTruthy();
    button?.click();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('word-game-theme-preference')).toBe('light');

    // With explicit light preference, system changes should be ignored.
    mql.emitChange(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('skips listener registration when both media-query listener APIs are unavailable', async () => {
    const { initializeThemeManager, mql } = await setupThemeTest({ storedTheme: 'system' });
    Object.defineProperty(mql, 'addEventListener', {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(mql, 'addListener', {
      configurable: true,
      value: undefined
    });

    expect(() => initializeThemeManager()).not.toThrow();
  });
});

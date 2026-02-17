import type { ResolvedTheme, ThemePreference } from './types/types';

const THEME_STORAGE_KEY = 'word-game-theme-preference';
const DEFAULT_THEME: ThemePreference = 'system';
const SUPPORTED_THEMES = new Set<ThemePreference>(['system', 'light', 'dark']);
const THEME_META_COLORS: Record<ResolvedTheme, string> = {
  light: '#3b63a4',
  dark: '#0f1f33'
};

let systemThemeMediaQuery: MediaQueryList | null = null;
let themeToggleButton: HTMLButtonElement | null = null;

function isThemePreference(value: string | null): value is ThemePreference {
  return value !== null && SUPPORTED_THEMES.has(value as ThemePreference);
}

function getStoredThemePreference(): ThemePreference {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemePreference(storedTheme)) {
    return storedTheme;
  }

  return DEFAULT_THEME;
}

function resolveTheme(themePreference: ThemePreference): ResolvedTheme {
  if (themePreference === 'system') {
    return systemThemeMediaQuery?.matches ? 'dark' : 'light';
  }

  return themePreference;
}

function updateThemeColorMeta(resolvedTheme: ResolvedTheme): void {
  const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeColorMeta) {
    return;
  }

  themeColorMeta.setAttribute('content', THEME_META_COLORS[resolvedTheme]);
}

function updateThemeToggleButton(resolvedTheme: ResolvedTheme): void {
  if (!themeToggleButton) {
    return;
  }

  const nextTheme: ResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
  const icon = resolvedTheme === 'dark' ? '☀️' : '🌙';
  const iconElement = themeToggleButton.querySelector<HTMLElement>('.theme-toggle__icon');

  themeToggleButton.dataset.nextTheme = nextTheme;
  themeToggleButton.title = `Switch to ${nextTheme} theme`;
  themeToggleButton.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
  themeToggleButton.classList.toggle('is-dark', resolvedTheme === 'dark');

  if (iconElement) {
    iconElement.textContent = icon;
  } else {
    themeToggleButton.textContent = icon;
  }
}

function applyTheme(themePreference: ThemePreference): void {
  const resolvedTheme = resolveTheme(themePreference);

  document.documentElement.setAttribute('data-theme', resolvedTheme);
  document.documentElement.setAttribute('data-theme-preference', themePreference);
  updateThemeColorMeta(resolvedTheme);
  updateThemeToggleButton(resolvedTheme);
}

function handleThemeToggle(): void {
  const currentTheme: ResolvedTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const nextTheme: ResolvedTheme = currentTheme === 'dark' ? 'light' : 'dark';

  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
}

function handleSystemThemeChange(): void {
  const currentPreference = getStoredThemePreference();
  if (currentPreference !== 'system') {
    return;
  }

  applyTheme('system');
}

export function initializeThemeManager(): void {
  themeToggleButton = document.getElementById('themeToggle') as HTMLButtonElement | null;

  systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const themePreference = getStoredThemePreference();
  applyTheme(themePreference);

  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', handleThemeToggle);
  }

  if (typeof systemThemeMediaQuery.addEventListener === 'function') {
    systemThemeMediaQuery.addEventListener('change', handleSystemThemeChange);
  } else if (typeof systemThemeMediaQuery.addListener === 'function') {
    systemThemeMediaQuery.addListener(handleSystemThemeChange);
  }
}

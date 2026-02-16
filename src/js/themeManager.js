const THEME_STORAGE_KEY = 'word-game-theme-preference';
const DEFAULT_THEME = 'system';
const SUPPORTED_THEMES = new Set(['system', 'light', 'dark']);
const THEME_META_COLORS = {
  light: '#3b63a4',
  dark: '#0f1f33'
};

let systemThemeMediaQuery = null;
let themeToggleButton = null;

function getStoredThemePreference() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (SUPPORTED_THEMES.has(storedTheme)) {
    return storedTheme;
  }

  return DEFAULT_THEME;
}

function resolveTheme(themePreference) {
  if (themePreference === 'system') {
    return systemThemeMediaQuery?.matches ? 'dark' : 'light';
  }

  return themePreference;
}

function updateThemeColorMeta(resolvedTheme) {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    return;
  }

  themeColorMeta.setAttribute('content', THEME_META_COLORS[resolvedTheme]);
}

function updateThemeToggleButton(resolvedTheme) {
  if (!themeToggleButton) {
    return;
  }

  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
  const icon = resolvedTheme === 'dark' ? '☀️' : '🌙';
  const iconElement = themeToggleButton.querySelector('.theme-toggle__icon');

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

function applyTheme(themePreference) {
  const resolvedTheme = resolveTheme(themePreference);

  document.documentElement.setAttribute('data-theme', resolvedTheme);
  document.documentElement.setAttribute('data-theme-preference', themePreference);
  updateThemeColorMeta(resolvedTheme);
  updateThemeToggleButton(resolvedTheme);
}

function handleThemeToggle() {
  const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
}

function handleSystemThemeChange() {
  const currentPreference = getStoredThemePreference();
  if (currentPreference !== 'system') {
    return;
  }

  applyTheme('system');
}

export function initializeThemeManager() {
  themeToggleButton = document.getElementById('themeToggle');

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

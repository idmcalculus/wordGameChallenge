const THEME_STORAGE_KEY = 'word-game-theme-preference';
const DEFAULT_THEME = 'system';
const SUPPORTED_THEMES = new Set(['system', 'light', 'dark']);
const THEME_META_COLORS = {
  light: '#3b63a4',
  dark: '#0f1f33'
};

let systemThemeMediaQuery = null;
let themeSelect = null;

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

function applyTheme(themePreference) {
  const resolvedTheme = resolveTheme(themePreference);

  document.documentElement.setAttribute('data-theme', resolvedTheme);
  document.documentElement.setAttribute('data-theme-preference', themePreference);
  updateThemeColorMeta(resolvedTheme);
}

function handleThemePreferenceChange(event) {
  const selectedTheme = event.target.value;
  if (!SUPPORTED_THEMES.has(selectedTheme)) {
    return;
  }

  localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
  applyTheme(selectedTheme);
}

function handleSystemThemeChange() {
  if (!themeSelect || themeSelect.value !== 'system') {
    return;
  }

  applyTheme('system');
}

export function initializeThemeManager() {
  themeSelect = document.getElementById('themeSelect');
  if (!themeSelect) {
    return;
  }

  systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const themePreference = getStoredThemePreference();
  themeSelect.value = themePreference;
  applyTheme(themePreference);

  themeSelect.addEventListener('change', handleThemePreferenceChange);

  if (typeof systemThemeMediaQuery.addEventListener === 'function') {
    systemThemeMediaQuery.addEventListener('change', handleSystemThemeChange);
  } else if (typeof systemThemeMediaQuery.addListener === 'function') {
    systemThemeMediaQuery.addListener(handleSystemThemeChange);
  }
}

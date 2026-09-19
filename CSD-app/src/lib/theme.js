const THEME_KEY = 'chesslab-theme';

export const THEMES = ['light', 'dark'];

export function readTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (THEMES.includes(saved)) return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  return theme;
}

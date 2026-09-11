// Тема хранится атрибутом data-theme на <html> — CSS-переменные в index.css
// переключаются именно по нему. Ключ намеренно отличается от админского
// (chesslab-admin-theme): в деве оба приложения могут оказаться на одном
// origin и затирали бы выбор друг друга — та же причина, что у токенов в api.js.
const THEME_KEY = 'chesslab-theme';

export const THEMES = ['light', 'dark'];

/** Сохранённый выбор пользователя; при его отсутствии — системная тема. */
export function readTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (THEMES.includes(saved)) return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Текущая тема по состоянию документа (его выставляет скрипт в index.html). */
export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  return theme;
}

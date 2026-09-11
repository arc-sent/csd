// Тема хранится атрибутом data-theme на <html> — по нему переключаются
// переменные в index.css. Ключ отличается от сайтового (chesslab-theme) по той
// же причине, что и токены в api.js: в деве оба приложения могут оказаться на
// одном origin и затирали бы выбор друг друга.
const THEME_KEY = 'chesslab-admin-theme';

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  return theme;
}

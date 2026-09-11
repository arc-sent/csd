import { useState } from 'react';
import { applyTheme, currentTheme } from '../lib/theme.js';

// Состояние читается из DOM: атрибут уже выставлен инлайн-скриптом в
// index.html до первой отрисовки, и второй источник правды разошёлся бы с ним.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme);
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(applyTheme(dark ? 'light' : 'dark'))}
      aria-pressed={dark}
      aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
    >
      <span className="theme-sun" aria-hidden="true">☀</span>
      <span className="theme-moon" aria-hidden="true">☾</span>
    </button>
  );
}

import {useState} from 'react';
import {applyTheme, currentTheme} from '../lib/theme.js';

/**
 * Переключатель темы. Состояние читается из DOM, а не из своего источника:
 * атрибут уже выставлен инлайн-скриптом в index.html до первой отрисовки,
 * и второй источник правды разошёлся бы с ним при монтировании.
 */
export function ThemeToggle({className = ''}) {
  const [theme, setTheme] = useState(currentTheme);
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(applyTheme(dark ? 'light' : 'dark'))}
      aria-pressed={dark}
      aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      className={`relative grid place-items-center w-[38px] h-[38px] shrink-0 rounded-xl border border-line bg-fill text-ink overflow-hidden transition-[border-color,transform] duration-200 hover:border-ink active:scale-90 ${className}`}
    >
      {/* Иконки лежат друг на друге в одной ячейке грида и меняются
          перекрёстным затуханием — приём из референса. */}
      <span
        className={`[grid-area:1/1] text-[16px] leading-none transition duration-250 ${
          dark ? 'opacity-0 -translate-y-2 -rotate-[20deg]' : ''
        }`}
      >
        ☀
      </span>
      <span
        className={`[grid-area:1/1] text-[16px] leading-none transition duration-250 ${
          dark ? '' : 'opacity-0 translate-y-2 rotate-[20deg]'
        }`}
      >
        ☾
      </span>
    </button>
  );
}

// Единственный спиннер на весь сайт — везде, где кабинет ждёт ответ сервера
// (список заданий, задание, задача, проверка входа), используется он, а не
// текст «Загружаем…» сам по себе.
export function Spinner({className = 'w-5 h-5', label = 'Загрузка'}) {
  return (
    <svg
      className={`${className} animate-spin text-accent`}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label}
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Спиннер + подпись, для мест, где раньше висел одинокий
 * <p className="text-faint">Загружаем…</p> — тот же текст, но с индикатором,
 * а не только словами.
 */
export function LoadingState({text, className = 'py-10'}) {
  return (
    <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
      <Spinner className="w-6 h-6" />
      {text && <p className="text-[13px] text-faint">{text}</p>}
    </div>
  );
}

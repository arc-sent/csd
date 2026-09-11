import {useEffect, useRef, useState} from 'react';

/**
 * Кастомный выпадающий список вместо нативного <select>: браузер рисует
 * попап select() своим системным окном, которое нельзя оформить в стиле
 * сайта, поэтому список — обычный <ul role="listbox"> поверх страницы.
 * Этапов со временем станет больше (добавляются через админку), поэтому
 * переключатель принимает произвольный список, а не завязан на количество.
 */
export function StageSwitcher({stages, value, onChange}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const currentIndex = Math.max(0, stages.findIndex(stage => stage.id === value));
  const current = stages[currentIndex] ?? stages[0];

  useEffect(() => {
    if (!open) return;
    const handleClick = event => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const handleKey = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block mr-5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 rounded-full bg-accent-soft text-accent-strong text-[11px] font-extrabold uppercase tracking-[.06em] pl-[11px] pr-3 py-[7px] border border-transparent transition duration-200 hover:border-accent-strong/30"
      >
        <span className="w-[7px] h-[7px] rounded-full bg-accent" />
        <span>
          Этап {currentIndex + 1} · {current.name}
        </span>
        <span className={`text-[9px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Выбор этапа"
          className="absolute left-0 top-[calc(100%+8px)] z-20 m-0 min-w-[230px] list-none rounded-2xl border border-line bg-surface p-1.5 shadow-[0_18px_45px_rgba(18,19,17,.14)]"
        >
          {stages.map((stage, stageIndex) => (
            <li
              key={stage.id}
              role="option"
              aria-selected={stage.id === value}
              onClick={() => {
                onChange(stage.id);
                setOpen(false);
              }}
              className={`cursor-pointer rounded-[10px] px-3 py-2.5 text-[13px] font-semibold transition-colors duration-150 ${
                stage.id === value ? 'bg-accent-soft font-extrabold text-accent-strong' : 'text-ink hover:bg-accent-soft'
              }`}
            >
              Этап {stageIndex + 1} · {stage.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

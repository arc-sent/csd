import {useState} from 'react';
import {Button, container} from './ui.jsx';

const NAV = [
  ['#how', 'Как это работает'],
  ['#plans', 'Тарифы'],
  ['#reviews', 'Отзывы'],
  ['#faq', 'FAQ'],
  ['#contacts', 'Контакты']
];

export function Brand({className = ''}) {
  return (
    <a className={`inline-flex items-center gap-2.5 ${className}`} href="#top">
      <span className="grid place-items-center w-[34px] h-[34px] rounded-[11px] bg-ink text-white text-lg">
        ♞
      </span>
      <span className="font-display font-extrabold tracking-[-.03em]">
        Chess<span className="text-accent">Lab</span>
      </span>
    </a>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur border-b border-line" id="top">
      <div className={`${container} flex items-center justify-between h-[68px] sm:h-[84px]`}>
        <Brand />

        <nav className="hidden lg:flex gap-[26px] text-[13px] font-semibold text-[#55564f]" aria-label="Основная навигация">
          {NAV.map(([href, text]) => (
            <a key={href} className="hover:text-accent transition" href={href}>
              {text}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-[18px]">
          <Button variant="small" href="#plans" className="hidden sm:inline-flex">
            Купить доступ <span>→</span>
          </Button>

          {/* Бургер превращается в крестик — состояние берётся из aria-expanded */}
          <button
            type="button"
            className="lg:hidden flex flex-col items-center justify-center gap-1 w-[42px] h-[42px] border border-line rounded-xl"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            <span
              className={`block w-[17px] h-[1.5px] rounded bg-ink transition-transform duration-[250ms] ${
                open ? 'translate-y-[5.5px] rotate-45' : ''
              }`}
            />
            <span
              className={`block w-[17px] h-[1.5px] rounded bg-ink transition-all duration-200 ${
                open ? 'opacity-0 scale-x-[.3]' : ''
              }`}
            />
            <span
              className={`block w-[17px] h-[1.5px] rounded bg-ink transition-transform duration-[250ms] ${
                open ? '-translate-y-[5.5px] -rotate-45' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-line px-5 pt-3 pb-5">
          {NAV.map(([href, text]) => (
            <a
              key={href}
              className="block py-3 text-sm font-bold"
              href={href}
              onClick={() => setOpen(false)}
            >
              {text}
            </a>
          ))}
          <Button variant="dark" href="#plans" className="w-full mt-3" onClick={() => setOpen(false)}>
            Купить доступ
          </Button>
        </div>
      )}
    </header>
  );
}

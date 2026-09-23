import {useState} from 'react';
import {container} from './ui.jsx';
import {Avatar} from './Avatar.jsx';
import {ThemeToggle} from './ThemeToggle.jsx';
import {useAuthContext} from '../context/AuthContext.jsx';
import {buildHref} from '../lib/route.js';

const NAV = [
  ['#how', 'Как это работает'],
  ['/metodika/', 'Методика'],
  ['#plans', 'Тарифы'],
  ['#reviews', 'Отзывы'],
  ['#contacts', 'Контакты']
];

// Абсолютные пути (/metodika) — настоящая отдельная страница, не якорь
// текущей: префикс пути кабинета к ним не добавляем, в отличие от '#hash'.
// На /metodika (standalone) секций лендинга на странице нет, поэтому '#hash'
// ведёт обратно на главную, к этому же якорю, а не повисает бесполезной
// ссылкой без цели на текущей странице.
const navHref = (hash, isCabinet, standalone) => {
  if (hash.startsWith('/')) return hash;
  if (standalone) return `/${hash}`;
  return isCabinet ? `${window.location.pathname}${hash}` : hash;
};

const textButton =
  'text-[13px] font-semibold text-muted transition duration-200 hover:text-accent';

export function Brand({className = '', isCabinet = false, standalone = false}) {
  const href = isCabinet ? window.location.pathname : standalone ? '/' : '#top';
  return (
    <a
      className={`flex items-center gap-2.5 font-display font-extrabold tracking-[-.04em] ${className}`}
      href={href}
    >
      <span className="grid place-items-center w-[34px] h-[34px] rounded-[11px] bg-invert text-invert-fg text-xl -rotate-6">
        ♞
      </span>
      <span className="text-[17px] sm:text-xl">
        ChessSchool<span className="text-accent">Dinamik</span>
      </span>
    </a>
  );
}

// standalone — страница вне обычного лендинг/кабинет переключения (сейчас
// только /metodika, см. lib/pagePath.js): переход в кабинет и лого ведут на
// настоящий '/' обычной ссылкой, а не через buildHref/navigate из route.js,
// которые считают текущий pathname базой и на постороннем пути дали бы
// битый адрес вроде '/metodika?view=cabinet'.
export function Header({isCabinet = false, standalone = false, navigate, onOpenAuth}) {
  const [open, setOpen] = useState(false);
  const {status, user} = useAuthContext();
  const authenticated = status === 'authenticated' || status === 'unverified';

  const cabinetHref = standalone ? '/?view=cabinet' : buildHref({view: 'cabinet'});
  const openCabinet = event => {
    if (standalone) {
      setOpen(false);
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setOpen(false);
    navigate?.({view: 'cabinet'});
  };

  return (
    <header
      className="header-drop sticky top-0 z-50 bg-header-bg backdrop-blur-[14px] border-b border-header-line"
      id="top"
    >
      <div className={`${container} flex items-center justify-between gap-7 h-[68px] sm:h-[76px]`}>
        <Brand isCabinet={isCabinet} standalone={standalone} />

        <nav className="hidden lg:flex gap-[26px] text-[13px] font-semibold text-muted" aria-label="Основная навигация">
          {NAV.map(([href, text]) => (
            <a key={href} className="hover:text-accent" href={navHref(href, isCabinet, standalone)}>
              {text}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-[18px]">
          {authenticated ? (
            <a
              href={cabinetHref}
              onClick={openCabinet}
              aria-label="Личный кабинет"
              className="rounded-full transition duration-200 hover:-translate-y-0.5 hover:ring-2 hover:ring-line-strong"
            >
              <Avatar email={user?.email} size={34} />
            </a>
          ) : (
            <button type="button" className={`${textButton} max-sm:hidden`} onClick={onOpenAuth}>
              Войти
            </button>
          )}

          <ThemeToggle />

          <button
            type="button"
            className="lg:hidden flex flex-col items-center justify-center gap-1 w-[42px] h-[42px] border border-line bg-fill rounded-xl transition-[border-color,transform] duration-200 hover:border-ink active:scale-90"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            <span
              className={`block w-[17px] h-[1.5px] rounded bg-ink transition-transform duration-[380ms] [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] ${
                open ? 'translate-y-[5.5px] rotate-45' : ''
              }`}
            />
            <span
              className={`block w-[17px] h-[1.5px] rounded bg-ink transition-[transform,opacity] duration-200 ease-out ${
                open ? 'opacity-0 scale-x-0' : ''
              }`}
            />
            <span
              className={`block w-[17px] h-[1.5px] rounded bg-ink transition-transform duration-[380ms] [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] ${
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
              href={navHref(href, isCabinet, standalone)}
              onClick={() => setOpen(false)}
            >
              {text}
            </a>
          ))}
          {!authenticated && (
            <button
              type="button"
              className="block w-full py-3 mt-1 text-sm font-bold text-muted"
              onClick={() => {
                setOpen(false);
                onOpenAuth?.();
              }}
            >
              Войти
            </button>
          )}
        </div>
      )}
    </header>
  );
}

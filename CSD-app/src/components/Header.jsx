import {useState} from 'react';
import {container} from './ui.jsx';
import {Avatar} from './Avatar.jsx';
import {ThemeToggle} from './ThemeToggle.jsx';
import {useAuthContext} from '../context/AuthContext.jsx';
import {buildHref} from '../lib/route.js';

const NAV = [
  ['#how', 'Как это работает'],
  ['#plans', 'Тарифы'],
  ['#reviews', 'Отзывы'],
  ['#contacts', 'Контакты']
];

// В кабинете якоря лендинга ведут в пустоту — уводим на лендинг вместе с
// якорем.
const navHref = (hash, isCabinet) => (isCabinet ? `${window.location.pathname}${hash}` : hash);

const textButton =
  'text-[13px] font-semibold text-muted transition duration-200 hover:text-accent';

export function Brand({className = '', isCabinet = false}) {
  // На лендинге "#top" — обычный внутристраничный якорь (плавный скролл
  // наверх). В кабинете шапки лендинга нет вовсе, и этот же якорь вёл бы в
  // никуда — как и якоря NAV ниже, вместо него нужен обычный переход на
  // главную (полная перезагрузка, без preventDefault/navigate — тот же приём,
  // что и у navHref).
  const href = isCabinet ? window.location.pathname : '#top';
  return (
    <a
      className={`flex items-center gap-2.5 font-display font-extrabold tracking-[-.04em] ${className}`}
      href={href}
    >
      <span className="grid place-items-center w-[34px] h-[34px] rounded-[11px] bg-invert text-invert-fg text-xl -rotate-6">
        ♞
      </span>
      {/* На телефоне имя мельче: «ChessSchoolDinamik» вдвое длиннее прежнего
          названия и в полном размере выдавливало бургер за край экрана. */}
      <span className="text-[17px] sm:text-xl">
        ChessSchool<span className="text-accent">Dinamik</span>
      </span>
    </a>
  );
}

export function Header({isCabinet = false, navigate, onOpenAuth}) {
  const [open, setOpen] = useState(false);
  const {status, user} = useAuthContext();
  // 'unverified' — тоже залогинен (аккаунт есть, просто почта ещё не
  // подтверждена): шапка не должна откатываться к «Войти»/«Купить доступ»,
  // ссылка на кабинет просто приведёт на экран подтверждения (см. App.jsx).
  const authenticated = status === 'authenticated' || status === 'unverified';

  // href настоящий, чтобы работали средний клик и «открыть в новой вкладке»;
  // preventDefault только на обычном левом клике.
  const cabinetHref = buildHref({view: 'cabinet'});
  const openCabinet = event => {
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
        <Brand isCabinet={isCabinet} />

        <nav className="hidden lg:flex gap-[26px] text-[13px] font-semibold text-muted" aria-label="Основная навигация">
          {NAV.map(([href, text]) => (
            <a key={href} className="hover:text-accent" href={navHref(href, isCabinet)}>
              {text}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-[18px]">
          {authenticated ? (
            // Выйти — теперь только в самом кабинете (ProfileHeader), не в
            // шапке: она видна на каждой странице сайта, а не только вошедшему
            // в свой аккаунт, и дублировать там выход незачем.
            // max-sm:hidden, а не «hidden sm:inline-flex»: голый hidden спорит
            // с inline-flex из buttonBase за display на одном и том же уровне
            // каскада и проигрывает ему — кнопка была видна и на телефоне.
            // Видна и на телефоне (без max-sm:hidden) — теперь это
            // единственный вход в кабинет на мобильном: большую кнопку с
            // аватаром и почтой убрали из бургер-панели ниже.
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

          {/* Бургер превращается в крестик — состояние берётся из aria-expanded.
              Полоски идут с лёгким «пружинным» перелётом (cubic-bezier с
              overshoot) вместо плоского ease — так поворот читается живее.
              У самой кнопки добавлена реакция на hover/active, которой
              раньше не было вовсе — по нажатию она слегка проседает. */}
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
              href={navHref(href, isCabinet)}
              onClick={() => setOpen(false)}
            >
              {text}
            </a>
          ))}
          {/* Кнопка входа в кабинет (аватар+почта) убрана отсюда — в шапке
              уже есть компактная ссылка-аватар, видная и на мобильном. */}
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

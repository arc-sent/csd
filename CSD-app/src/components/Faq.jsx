import {Reveal} from './Reveal.jsx';
import {Button, container, sectionPad, label} from './ui.jsx';
import {Brand} from './Header.jsx';
import {TermsModal} from './TermsModal.jsx';
import {useState} from 'react';

export function FinalCta() {
  return (
    <section className={`bg-bg ${sectionPad}`} id="purchase">
      <Reveal className={`${container} relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-dark text-[#fff] text-center px-5 py-[52px] sm:px-10 sm:py-[86px]`}>
        <span className="hidden sm:block absolute w-[280px] h-[280px] rounded-full border border-[#363935] top-1/2 -translate-y-1/2 -left-[170px]" />
        <span className="hidden sm:block absolute w-[280px] h-[280px] rounded-full border border-[#363935] top-1/2 -translate-y-1/2 -right-[170px]" />
        <span
          className="absolute right-[-70px] bottom-[-70px] w-[220px] h-[220px] opacity-[.07] sm:right-[7%] sm:bottom-[-56px] sm:w-[300px] sm:h-[300px] sm:opacity-[.09] lg:right-[-30px] pointer-events-none bg-no-repeat bg-right-bottom bg-contain"
          style={{backgroundImage: `url(${import.meta.env.BASE_URL}pieces/wN.png)`}}
        />
        <span className={`${label} relative z-10 text-[#9ea097]`}>Начни сейчас</span>
        <h2 className="relative z-10 font-display text-[34px] sm:text-[clamp(42px,5.6vw,72px)] leading-[.95] tracking-[-.06em] mt-3 mb-3.5 sm:my-4">
          Следующий сильный ход
          <br className="hidden sm:inline" />
          <em className="not-italic text-accent"> может начаться сегодня.</em>
        </h2>
        <p className="relative z-10 max-w-[460px] mx-auto text-xs sm:text-[13px] leading-[1.65] text-[#a0a29a] mb-[26px] sm:mb-8">
          Выбери уровень, открой доску и преврати практику в понятную систему.
        </p>
        <Button href="#plans" className="relative z-10">
          Купить доступ <span>↗</span>
        </Button>
      </Reveal>
    </section>
  );
}

const FOOTER_COLUMNS = [
  ['Навигация', [['#how', 'Как это работает'], ['#plans', 'Тарифы'], ['#reviews', 'Отзывы']]],
  ['Документы', [['#terms', 'Пользовательское соглашение'], ['#', 'Политика обработки данных'], ['#', 'Реквизиты продавца']]],
  ['Контакты', [['mailto:chessdinamika@yandex.ru', 'chessdinamika@yandex.ru'], ['#', 'Telegram'], ['#', 'VK']]]
];

export function Footer({isCabinet = false}) {
  const [termsOpen, setTermsOpen] = useState(false);
  return (
    <footer className="bg-dark text-on-dark pt-14 pb-[25px]" id="contacts">
      <div
        className={`${container} grid grid-cols-2 gap-7 sm:grid-cols-[1.2fr_1fr_1fr] sm:gap-[50px] lg:grid-cols-[1.5fr_.75fr_1fr_.8fr] pb-[52px] [&>div:last-child]:sm:col-span-2 [&>div:last-child]:lg:col-span-1`}
      >
        <div className="col-span-2 sm:col-span-1">
          <Brand className="text-on-dark" isCabinet={isCabinet} />
          <p className="text-xs text-[#8f9189] max-w-[260px] mt-[18px] mb-3">
            Платформа для системной тренировки шахматной тактики.
          </p>
        </div>
        {FOOTER_COLUMNS.map(([title, links]) => (
          <div key={title} className="grid content-start gap-2.5">
            <span className="text-[9px] uppercase tracking-[.12em] text-[#73766e] mb-1">{title}</span>
            {links.map(([href, text]) => (
              <a
                key={text}
                className="text-[11px] text-on-dark/70 hover:text-on-dark"
                href={href}
                onClick={
                  href === '#terms'
                    ? event => {
                        event.preventDefault();
                        setTermsOpen(true);
                      }
                    : undefined
                }
              >
                {text}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div className={`${container} flex flex-col sm:flex-row justify-between gap-5 border-t border-on-dark/12 pt-[18px] text-[9px] text-[#666a62]`}>
        <span>© 2026 ChessSchoolDinamik. Все права защищены.</span>
        <span>Оплата через ЮKassa · 152-ФЗ</span>
      </div>
      {termsOpen && <TermsModal readOnly onClose={() => setTermsOpen(false)} />}
    </footer>
  );
}

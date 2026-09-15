import {useState} from 'react';
import {Reveal} from './Reveal.jsx';
import {Button, container, heading, label, sectionPad} from './ui.jsx';
import {Brand} from './Header.jsx';
import {jsonLd} from '../lib/seo.js';

export const QUESTIONS = [
  ['Как быстро приходит доступ после оплаты?', 'Сразу — доступ открывается автоматически, как только ЮKassa подтверждает оплату, без участия менеджера.'],
  ['Нужно ли устанавливать приложение?', 'Нет. Лендинг и тренировочный интерфейс рассчитаны на работу в браузере.'],
  ['Для какого уровня подготовки подходят шахматные задачи?', 'Сетка рассчитана на несколько уровней сложности, чтобы можно было начать с подходящей нагрузки и двигаться дальше.'],
  ['Можно ли вернуть деньги, если не подошло?', 'Да: если в течение 7 дней после покупки вы не решили ни одной задачи из задания, вернём деньги в полном объёме — напишите нам (см. раздел «Контакты»).'],
  ['Какими способами можно оплатить?', 'Банковской картой (Visa/Mastercard/Мир) или через ЮMoney — оплата проходит через ЮKassa.']
];

export function Faq() {
  // Оригинал — набор независимых <details>: открытие одного вопроса не
  // закрывает остальные. Первый вопрос открыт по умолчанию (как <details open>).
  const [openSet, setOpenSet] = useState(() => new Set([0]));
  const toggle = index =>
    setOpenSet(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });

  return (
    <section className={`bg-bg ${sectionPad}`} id="faq">
      {/* FAQPage для поисковиков — из того же QUESTIONS, что и на экране. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: QUESTIONS.map(([question, answer]) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: {'@type': 'Answer', text: answer}
          }))
        })}
      />
      <div className={`${container} grid gap-[50px] lg:grid-cols-[.7fr_1.3fr] lg:gap-[90px]`}>
        <Reveal>
          <span className={`${label} text-ink`}>FAQ</span>
          <h2 className={heading}>Вопросы о шахматном тренажёре.</h2>
          <p className="text-muted text-sm leading-[1.7] pt-[30px]">
            Ответы на самые частые вопросы про доступ, оплату и возврат — если чего-то не хватает,
            пишите в разделе «Контакты».
          </p>
        </Reveal>

        <Reveal delay>
          {QUESTIONS.map(([question, answer], index) => {
            const isOpen = openSet.has(index);
            return (
              <div
                key={question}
                className={`border-t border-line py-[21px] ${
                  index === QUESTIONS.length - 1 ? 'border-b' : ''
                }`}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-5 pr-[5px] text-left font-display text-[17px] font-bold tracking-[-.02em] cursor-pointer"
                  aria-expanded={isOpen}
                  onClick={() => toggle(index)}
                >
                  {question}
                  {/* Квадрат фиксированного размера: повёрнутый «плюс» не должен
                      выезжать за правый край */}
                  <span
                    className={`grid place-items-center flex-none w-[22px] h-[22px] text-[22px] leading-none transition duration-200 ${
                      isOpen ? 'rotate-45 text-accent' : 'text-faint'
                    }`}
                  >
                    +
                  </span>
                </button>
                {/* Плавное появление ответа: grid-template-rows 0fr→1fr —
                    анимация «до авто-высоты» без замера пикселей в JS.
                    Внутренний div с overflow-hidden обязателен, иначе
                    сжатие по grid-row не обрежет содержимое. */}
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr] mt-3.5' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p
                      className={`max-w-[700px] text-xs leading-[1.7] text-muted mr-10 transition-opacity duration-300 ${
                        isOpen ? 'opacity-100 delay-100' : 'opacity-0'
                      }`}
                    >
                      {answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className={`bg-paper ${sectionPad}`} id="purchase">
      <Reveal className={`${container} relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-dark text-[#fff] text-center px-5 py-[52px] sm:px-10 sm:py-[86px]`}>
        <span className="hidden sm:block absolute w-[280px] h-[280px] rounded-full border border-[#363935] top-1/2 -translate-y-1/2 -left-[170px]" />
        <span className="hidden sm:block absolute w-[280px] h-[280px] rounded-full border border-[#363935] top-1/2 -translate-y-1/2 -right-[170px]" />
        {/* Конь остаётся видимым на любой ширине — в оригинале скрываются
            только два кольца-бордюра (:before/:after), а фигура лишь меняет
            размер/прозрачность по брейкпоинтам. */}
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
  ['Навигация', [['#how', 'Как это работает'], ['#plans', 'Тарифы'], ['#reviews', 'Отзывы'], ['#faq', 'FAQ']]],
  ['Документы', [['#', 'Публичная оферта'], ['#', 'Политика обработки данных'], ['#', 'Реквизиты продавца']]],
  ['Контакты', [['mailto:hello@chessschooldinamik.example', 'hello@chessschooldinamik.example'], ['#', 'Telegram'], ['#', 'VK']]]
];

// Подвал рендерится и в кабинете (App.jsx держит его вне переключения
// лендинг/кабинет), поэтому лого здесь та же кабинет-осведомлённая ссылка,
// что и в шапке — иначе клик по нему в кабинете никуда не вёл бы.
export function Footer({isCabinet = false}) {
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
              <a key={text} className="text-[11px] text-on-dark/70 hover:text-on-dark" href={href}>
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
    </footer>
  );
}

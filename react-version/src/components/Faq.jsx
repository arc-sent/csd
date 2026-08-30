import {useState} from 'react';
import {Reveal} from './Reveal.jsx';
import {Button, container, heading, label, sectionPad} from './ui.jsx';
import {Brand} from './Header.jsx';

const QUESTIONS = [
  ['Как быстро приходит доступ после оплаты?', 'В макете предполагается автоматическая выдача доступа после подтверждения платежа. Точный сценарий зависит от финальной интеграции с личным кабинетом и ЮKassa.'],
  ['Нужно ли устанавливать приложение?', 'Нет. Лендинг и тренировочный интерфейс рассчитаны на работу в браузере.'],
  ['Для какого уровня подготовки подходят задачи?', 'Сетка рассчитана на несколько уровней сложности, чтобы можно было начать с подходящей нагрузки и двигаться дальше.'],
  ['Можно ли вернуть деньги, если не подошло?', 'Условия возврата нужно заполнить после согласования с заказчиком и размещения публичной оферты.'],
  ['Какими способами можно оплатить?', 'Финальная форма оплаты будет зависеть от настроек ЮKassa и выбранной модели монетизации.']
];

export function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section className={sectionPad} id="faq">
      <div className={`${container} grid gap-[50px] lg:grid-cols-2 lg:gap-[70px]`}>
        <Reveal>
          <span className={`${label} text-muted`}>FAQ</span>
          <h2 className={heading}>Ответы до покупки.</h2>
          <p className="text-muted text-sm leading-[1.7] pt-[30px]">
            Пока здесь — базовая версия вопросов из ТЗ. Финальные формулировки можно заменить после
            согласования условий доступа и возвратов.
          </p>
        </Reveal>

        <Reveal delay>
          {QUESTIONS.map(([question, answer], index) => {
            const isOpen = open === index;
            return (
              <div
                key={question}
                className={`border-t border-line py-[21px] pr-[5px] ${
                  index === QUESTIONS.length - 1 ? 'border-b' : ''
                }`}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-5 text-left font-display text-[17px] font-bold tracking-[-.02em] cursor-pointer"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : index)}
                >
                  {question}
                  {/* Квадрат фиксированного размера: повёрнутый «плюс» не должен
                      выезжать за правый край */}
                  <span
                    className={`grid place-items-center flex-none w-[22px] h-[22px] text-[22px] leading-none transition duration-200 ${
                      isOpen ? 'rotate-45 text-accent' : 'text-[#8d8e86]'
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <p className="max-w-[700px] text-xs leading-[1.7] text-muted mt-3.5 mr-10">{answer}</p>
                )}
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
      <Reveal className={`${container} relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-[#1a1b19] text-white text-center px-5 py-[52px] sm:px-10 sm:py-[86px]`}>
        <span className="hidden sm:block absolute w-[280px] h-[280px] rounded-full border border-[#363935] top-1/2 -translate-y-1/2 -left-[170px]" />
        <span className="hidden sm:block absolute w-[280px] h-[280px] rounded-full border border-[#363935] top-1/2 -translate-y-1/2 -right-[170px]" />
        <span
          className="hidden sm:block absolute -right-[30px] -bottom-14 w-[300px] h-[300px] opacity-[.09] pointer-events-none bg-no-repeat bg-right-bottom bg-contain"
          style={{backgroundImage: `url(${import.meta.env.BASE_URL}pieces/wN.png)`}}
        />
        <span className={`${label} relative z-10 text-[#9ea097]`}>Начни сейчас</span>
        <h2 className="relative z-10 font-display text-[34px] sm:text-[clamp(42px,5.6vw,72px)] leading-[.95] tracking-[-.06em] my-3.5 sm:my-4">
          Следующий сильный ход
          <br className="hidden sm:inline" />
          <em className="not-italic text-accent"> может начаться сегодня.</em>
        </h2>
        <p className="relative z-10 max-w-[460px] mx-auto text-xs sm:text-[13px] leading-[1.65] text-[#a0a29a] mb-7 sm:mb-8">
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
  ['Контакты', [['mailto:hello@chesslab.example', 'hello@chesslab.example'], ['#', 'Telegram'], ['#', 'VK']]]
];

export function Footer() {
  return (
    <footer className="bg-dark text-white pt-14 pb-6" id="contacts">
      <div className={`${container} grid gap-7 sm:gap-[50px] grid-cols-2 lg:grid-cols-[1.5fr_.75fr_1fr_.8fr] pb-[52px]`}>
        <div className="col-span-2 lg:col-span-1">
          <Brand className="text-white" />
          <p className="text-xs text-[#8f9189] max-w-[260px] mt-[18px]">
            Платформа для системной тренировки шахматной тактики.
          </p>
        </div>
        {FOOTER_COLUMNS.map(([title, links]) => (
          <div key={title} className="grid content-start gap-2.5">
            <span className="text-[9px] uppercase tracking-[.12em] text-[#73766e] mb-1">{title}</span>
            {links.map(([href, text]) => (
              <a key={text} className="text-[11px] text-[#b6b8b1] hover:text-white transition" href={href}>
                {text}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div className={`${container} flex flex-col sm:flex-row justify-between gap-5 border-t border-panel-line pt-[18px] text-[9px] text-[#666a62]`}>
        <span>© 2026 ChessLab. Все права защищены.</span>
        <span>Оплата через ЮKassa · 152-ФЗ</span>
      </div>
    </footer>
  );
}

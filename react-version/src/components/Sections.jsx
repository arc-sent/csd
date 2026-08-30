import {Reveal} from './Reveal.jsx';
import {Button, SectionIntro, container, heading, label, sectionPad} from './ui.jsx';

const AUDIENCE = [
  ['01', '♞', 'Для родителей', 'Понятный инструмент для регулярной практики без привязки к расписанию занятий.', '#plans', 'Выбрать доступ →', true],
  ['02', '♟', 'Для учеников', 'Отрабатывай тактику самостоятельно и получай понятную проверку каждого хода.', '#plans', 'Смотреть уровни →', false],
  ['03', '♜', 'Для любителей', 'Прокачивай расчёт, распознавание мотивов и привычку искать сильнейший ход.', '#plans', 'Начать практику →', false],
  ['04', '♝', 'Для тренеров', 'Используй уровни и подборки задач как дополнительный формат домашней работы.', '#contacts', 'Обсудить формат →', false]
];

export function Audience() {
  return (
    <section className={sectionPad} id="audience">
      <div className={container}>
        <Reveal>
          <SectionIntro label="Для кого" title="Тренируй именно тот навык, который нужен сейчас." />
        </Reveal>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCE.map(([index, icon, title, text, href, link, featured], i) => (
            <Reveal
              key={index}
              delay={i % 2 === 1}
              as="article"
              className={`relative flex flex-col rounded-[22px] border border-line p-6 sm:min-h-[310px] transition duration-200 ${
                featured ? 'bg-ink text-white border-ink' : 'hover:border-ink'
              }`}
            >
              <span className={`text-[10px] tracking-[.12em] ${featured ? 'text-[#9a9c94]' : 'text-[#989991]'}`}>
                {index}
              </span>
              <div className="text-[26px] my-4">{icon}</div>
              <h3 className="font-display text-xl tracking-[-.03em] mb-2">{title}</h3>
              <p className={`text-xs leading-[1.6] ${featured ? 'text-[#a3a59d]' : 'text-muted'}`}>{text}</p>
              <a className="mt-auto pt-5 text-[11px] font-extrabold text-accent" href={href}>
                {link}
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  ['01', 'Оплати доступ', 'Выбери пакет и оплати удобным способом через ЮKassa.'],
  ['02', 'Получи уровни', 'Уровни появляются в личном кабинете после подтверждения оплаты.'],
  ['03', 'Решай на доске', 'Делай ход, получай проверку и подсказку при ошибке.'],
  ['04', 'Двигайся дальше', 'Посмотри решение, завершай задачу и переходи к следующему уровню.']
];

function StepVisual({index}) {
  const box = 'h-[120px] my-6 rounded-[18px] border border-line bg-paper grid place-items-center content-center overflow-hidden';
  if (index === '01') {
    return (
      <div
        className={`${box} font-display text-[26px] font-semibold text-[#3e8e4c]`}
        style={{backgroundImage: 'radial-gradient(circle at 50% 50%, #e3efe4 0 30px, transparent 30px)'}}
      >
        ✓
      </div>
    );
  }
  if (index === '02') {
    return (
      <div className={`${box} flex items-end justify-center gap-2 py-[30px]`}>
        {[24, 36, 48, 60].map((h, i) => (
          <i
            key={h}
            className={`block w-[11px] rounded-t ${i === 3 ? 'bg-accent' : 'bg-ink'}`}
            style={{height: h}}
          />
        ))}
      </div>
    );
  }
  if (index === '03') {
    const cells = [
      ['wK', 'rounded-tl-md bg-[#eee7da]'],
      ['bN', 'rounded-tr-md bg-[#b98f6a]'],
      ['bP', 'rounded-bl-md bg-[#b98f6a]'],
      ['wP', 'rounded-br-md bg-[#eee7da]']
    ];
    return (
      <div className={`${box} grid-cols-[repeat(2,30px)] grid-rows-[repeat(2,30px)]`}>
        {cells.map(([piece, cls]) => (
          <span key={piece} className={`grid place-items-center w-[30px] h-[30px] ${cls}`}>
            <img
              className="block w-full h-full object-contain object-bottom"
              src={`${import.meta.env.BASE_URL}pieces/${piece}.png`}
              alt=""
              loading="lazy"
            />
          </span>
        ))}
      </div>
    );
  }
  return (
    <div
      className={`${box} font-display text-[26px] font-semibold text-accent`}
      style={{backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,131,82,.14) 0 30px, transparent 30px)'}}
    >
      →
    </div>
  );
}

export function HowItWorks() {
  return (
    <section className={`bg-bg ${sectionPad}`} id="how">
      <div className={container}>
        <Reveal>
          <SectionIntro
            split
            label="Как это работает"
            title="Четыре шага. Один понятный цикл тренировки."
            note="От оплаты до следующего уровня — всё происходит внутри одного сценария. Не нужно устанавливать отдельное приложение."
          />
        </Reveal>
        <div className="grid gap-px bg-line border border-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([index, title, text], i) => (
            <Reveal
              key={index}
              delay={i % 2 === 1}
              as="article"
              className="flex flex-col bg-bg px-6 pt-[26px] pb-[30px] sm:min-h-[330px]"
            >
              <div className="text-[10px] tracking-[.12em] text-[#989991]">{index}</div>
              <StepVisual index={index} />
              <h3 className="font-display text-xl tracking-[-.03em] mb-2">{title}</h3>
              <p className="text-xs text-muted leading-[1.6]">{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const BENEFITS = [
  ['01', '✓', 'Пошаговая проверка', 'Система реагирует на каждый ход, чтобы ошибка не терялась внутри финального результата.', true],
  ['02', '⌗', 'Понятные координаты', 'Работай с доской и координатами поля так, как привык в профессиональных шахматных приложениях.', false],
  ['03', '↶', 'Можно попробовать снова', 'Отменяй неверный ход, возвращайся к позиции и ищи другой вариант.', false],
  ['04', '↗', 'Разные уровни', 'Двигайся от понятной тактики к более сложным комбинациям в своём темпе.', false]
];

export function Benefits() {
  return (
    <section className={sectionPad}>
      <div className={container}>
        <Reveal className="mb-[55px]">
          <span className={`${label} text-muted`}>Почему ChessLab</span>
          <h2 className={heading}>
            Тренировка, которая показывает <em className="not-italic text-accent">процесс</em>, а не только
            ответ.
          </h2>
        </Reveal>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(([index, mark, title, text, dark], i) => (
            <Reveal
              key={index}
              delay={i % 2 === 1}
              as="article"
              className={`relative flex flex-col rounded-[22px] border p-6 sm:min-h-[284px] transition ${
                dark ? 'bg-ink text-white border-ink' : 'bg-white border-line hover:border-ink hover:-translate-y-1'
              }`}
            >
              <span className={`text-[10px] tracking-[.12em] ${dark ? 'text-[#9a9c94]' : 'text-[#989991]'}`}>
                {index}
              </span>
              <div className={`text-[26px] my-4 ${dark ? 'text-accent' : ''}`}>{mark}</div>
              <h3 className="font-display text-xl tracking-[-.03em] mb-2">{title}</h3>
              <p className={`text-xs leading-[1.6] ${dark ? 'text-[#a3a59d]' : 'text-muted'}`}>{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  ['Старт', 'Для знакомства', '490 ₽', '/ доступ', '1 уровень с задачами для самостоятельной практики.', ['30 задач', 'Пошаговая проверка', 'Решения и возврат хода'], 'Выбрать старт', false],
  ['Прогресс', 'Для регулярной практики', '1 290 ₽', '/ пакет', 'Пакет из 3 уровней для системной тренировки.', ['90 задач', '3 уровня сложности', 'Личная статистика'], 'Выбрать пакет', true],
  ['Фокус', 'Для постоянной практики', '1 990 ₽', '/ подписка', 'Новые подборки задач и доступ к уровням по мере роста.', ['Новые задачи', 'Весь каталог уровней', 'Прогресс и история'], 'Выбрать подписку', false]
];

export function Plans() {
  return (
    <section className={`bg-bg ${sectionPad}`} id="plans">
      <div className={container}>
        <Reveal>
          <SectionIntro
            split
            label="Тарифы"
            title="Выбери свой темп. Начни с комфортного уровня."
            note="Ниже — демонстрационная тарифная сетка. Количество уровней и цены заменяются на финальные данные после согласования модели монетизации."
          />
        </Reveal>
        <div className="grid gap-3.5 lg:grid-cols-3 lg:pt-4 items-stretch">
          {PLANS.map(([name, note, price, unit, text, features, cta, popular], i) => (
            <Reveal
              key={name}
              delay={i === 1}
              as="article"
              className={`relative flex flex-col rounded-3xl border p-[25px] sm:min-h-[470px] ${
                popular
                  ? 'bg-ink text-white border-ink lg:-translate-y-2.5 shadow-[0_18px_45px_rgba(18,19,17,.16)]'
                  : 'bg-paper border-line'
              }`}
            >
              {popular && (
                <div className="self-end mb-3 lg:mb-0 lg:absolute lg:right-5 lg:-top-3 bg-accent text-white text-[8px] font-black tracking-[.08em] px-2.5 py-[7px] rounded-full lg:shadow-[0_4px_12px_rgba(255,107,45,.3)]">
                  ПОПУЛЯРНЫЙ
                </div>
              )}
              <div className={`flex justify-between gap-5 text-[10px] uppercase tracking-[.1em] ${popular ? 'text-[#a5a69f]' : 'text-[#7d7e76]'}`}>
                <span>{name}</span>
                <span>{note}</span>
              </div>
              <div className="flex items-baseline gap-2 mt-[30px] mb-3">
                <b className="font-display text-5xl leading-none tracking-[-.06em]">{price}</b>
                <small className="text-[10px] text-[#8d8e86]">{unit}</small>
              </div>
              <p className={`text-[13px] leading-[1.6] sm:min-h-16 ${popular ? 'text-[#9c9e95]' : 'text-[#73746d]'}`}>
                {text}
              </p>
              <ul className="grid gap-3 my-5 mb-7 text-xs list-none p-0">
                {features.map(feature => (
                  <li key={feature}>
                    <span className="text-accent font-black mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={popular ? 'primary' : 'outline'}
                href="#purchase"
                className="mt-auto w-full"
              >
                {cta}
              </Button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const REVIEWS = [
  ['АК', 'Анна, мама ученика', 'уровень 05 · 9 лет', '«Нравится, что после ошибки можно вернуться и попробовать другой ход. Ребёнок не просто угадывает ответ — он начинает объяснять, почему ход работает.»'],
  ['МС', 'Михаил, любитель', 'тренируется 4 раза в неделю', '«Для домашней тренировки подходит идеально: открыл, решил несколько задач, посмотрел статистику и понял, где ошибся.»']
];

export function Reviews() {
  return (
    <section className={sectionPad} id="reviews">
      <div className={`${container} grid gap-[50px] lg:grid-cols-2 lg:gap-[70px]`}>
        <Reveal>
          <span className={`${label} text-muted`}>Отзывы</span>
          <h2 className={heading}>Когда тренировка становится привычкой.</h2>
          <p className="text-muted text-sm leading-[1.7] pt-[30px]">
            Демонстрационные отзывы — до появления реальных кейсов их можно заменить на блок «Об авторе
            методики».
          </p>
        </Reveal>
        <div className="grid gap-3.5">
          {REVIEWS.map(([initials, name, note, text], i) => (
            <Reveal
              key={initials}
              delay={i === 1}
              as="article"
              className="rounded-[22px] border border-line bg-white p-[25px]"
            >
              <div className="text-accent text-xs tracking-[.2em]">★★★★★</div>
              <blockquote className="font-display text-[19px] sm:text-[22px] leading-[1.35] tracking-[-.03em] my-4">
                {text}
              </blockquote>
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-10 h-10 rounded-full bg-bg text-[11px] font-extrabold">
                  {initials}
                </span>
                <div>
                  <strong className="block text-[13px]">{name}</strong>
                  <small className="block text-[11px] text-muted">{note}</small>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

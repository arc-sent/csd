import {useEffect, useState} from 'react';
import {Reveal} from './Reveal.jsx';
import {SectionIntro, container, heading, label, sectionPad} from './ui.jsx';
import {AssignmentCarousel} from './AssignmentCarousel.jsx';
import {StageSwitcher} from './StageSwitcher.jsx';
import {PaymentModal} from './PaymentModal.jsx';
import {AuthModal} from './AuthModal.jsx';
import {useAuthContext} from '../context/AuthContext.jsx';
import {fetchPublicStages} from '../lib/api.js';

const AUDIENCE = [
  ['01', '♞', 'Для родителей', 'Понятный инструмент для регулярной практики без привязки к расписанию занятий.', '#plans', 'Выбрать доступ →', true],
  ['02', '♟', 'Для учеников', 'Отрабатывай тактику самостоятельно и получай понятную проверку каждого хода.', '#plans', 'Смотреть уровни →', false],
  ['03', '♜', 'Для любителей', 'Прокачивай расчёт, распознавание мотивов и привычку искать сильнейший ход.', '#plans', 'Начать практику →', false],
  ['04', '♝', 'Для тренеров', 'Используй уровни и подборки задач как дополнительный формат домашней работы.', '#contacts', 'Обсудить формат →', false]
];

export function Audience() {
  return (
    <section className={`bg-paper ${sectionPad}`} id="audience">
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
              className={`relative flex flex-col rounded-[22px] border p-6 sm:min-h-[310px] transition duration-200 ${
                featured
                  ? 'bg-invert text-invert-fg border-ink'
                  : 'border-line bg-transparent hover:-translate-y-1 hover:bg-surface hover:shadow-lift'
              }`}
            >
              <span className="absolute right-5 top-5 text-[10px] text-subtle">{index}</span>
              <div className="text-[40px] leading-none mt-[34px] mb-[30px]">{icon}</div>
              <h3 className="font-display text-2xl tracking-[-.04em] mb-2.5">{title}</h3>
              <p className={`text-[13px] leading-[1.6] mb-[22px] ${featured ? 'text-invert-muted' : 'text-muted'}`}>
                {text}
              </p>
              <a className={`mt-auto text-[11px] font-extrabold ${featured ? 'text-invert-fg' : ''}`} href={href}>
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
  // display специально не входит в общий box: у шага 02 нужен flex, у
  // остальных — grid, а голые grid+flex на одном элементе конфликтуют за
  // display на одном слое каскада Tailwind (кто окажется в сборке позже,
  // тот и победит) — из-за этого столбики схлопывались в одну колонку.
  const box =
    // place-content-center — это именно place-content (align+justify), а не
    // только content-center (align-content без justify-content). Из-за
    // недостающего justify-content трек 03 (доска 2×2 с фикс. шириной)
    // прижимался к левому краю вместо центра.
    'h-[120px] mt-6 mb-[22px] rounded-[18px] border border-line bg-paper place-items-center place-content-center overflow-hidden';
  if (index === '01') {
    return (
      <div
        className={`${box} grid font-display text-[26px] font-semibold text-success`}
        style={{backgroundImage: 'radial-gradient(circle at 50% 50%, var(--color-success-bg) 0 30px, transparent 30px)'}}
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
      <div className={`${box} grid grid-cols-[repeat(2,30px)] grid-rows-[repeat(2,30px)]`}>
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
      className={`${box} grid font-display text-[26px] font-semibold text-accent`}
      style={{backgroundImage: 'radial-gradient(circle at 50% 50%, var(--color-accent-soft) 0 30px, transparent 30px)'}}
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
              <div className="text-[10px] tracking-[.12em] text-subtle">{index}</div>
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
    <section className={`bg-paper ${sectionPad}`}>
      <div className={container}>
        <Reveal className="max-w-[900px] mb-[55px]">
          <span className={`${label} text-ink`}>Почему ChessSchoolDinamik</span>
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
              className={`relative flex flex-col rounded-[22px] border p-6 sm:min-h-[284px] transition duration-200 ${
                dark
                  ? 'bg-invert text-invert-fg border-ink'
                  : 'bg-surface border-line hover:-translate-y-1 hover:shadow-lift'
              }`}
            >
              <span className={`text-[10px] font-bold tracking-[.14em] ${dark ? 'text-invert-muted' : 'text-subtle'}`}>
                {index}
              </span>
              <div
                className={`grid place-items-center w-[46px] h-[46px] mt-[26px] mb-5 rounded-[14px] text-[22px] leading-none ${
                  dark ? 'bg-invert-soft text-accent-on-invert' : 'bg-bg text-ink'
                }`}
              >
                {mark}
              </div>
              <h3 className="font-display text-[21px] leading-[1.05] tracking-[-.04em] mb-2.5">{title}</h3>
              <p className={`text-xs leading-[1.6] ${dark ? 'text-invert-muted' : 'text-muted'}`}>{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Plans({notify}) {
  // Этапы/задания больше не зашиты в код — тянутся из реальной админки
  // (CSD-server/prisma: Stage -> Assignment -> Level) через публичную витрину
  // GET /api/public/stages (только опубликованные, без токена).
  const [stages, setStages] = useState([]);
  const [stageId, setStageId] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [paymentAssignment, setPaymentAssignment] = useState(null);
  // Задание, ради которого попросили войти: после успешного входа покупка
  // продолжается сама, клик не теряется.
  const [pendingAssignment, setPendingAssignment] = useState(null);
  const {status} = useAuthContext();

  function handleBuy(assignment) {
    // 'unverified' — тоже пускаем в модалку оплаты, а не в «войдите»: аккаунт
    // уже есть, просто сервер откажет понятной ошибкой «Подтвердите почту»
    // (PaymentModal её и так показывает как есть, см. её catch).
    if (status === 'authenticated' || status === 'unverified') {
      setPaymentAssignment(assignment);
      return;
    }
    setPendingAssignment(assignment);
  }

  useEffect(() => {
    let cancelled = false;
    fetchPublicStages()
      .then(data => {
        if (cancelled) return;
        setStages(data);
        if (data.length) setStageId(data[0].id);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stage = stages.find(s => s.id === stageId);

  return (
    <section className={`bg-bg ${sectionPad}`} id="plans">
      <div className={container}>
        <Reveal>
          <SectionIntro
            split
            badge={stages.length > 0 && <StageSwitcher stages={stages} value={stageId} onChange={setStageId} />}
            label="Тарифы"
            title="Каждое задание — отдельный вход в тренировку."
            note="Разбор хода за ходом и мгновенная проверка. Оплата — за конкретное задание, без пакетов и подписок."
          />
        </Reveal>
        {stage && stage.assignments.length > 0 && (
          <Reveal delay>
            <AssignmentCarousel notify={notify} assignments={stage.assignments} stageId={stageId} onBuy={handleBuy} />
          </Reveal>
        )}
        {loadFailed && <p className="text-sm text-muted">Не удалось загрузить тарифы — попробуйте обновить страницу.</p>}
      </div>
      <PaymentModal assignment={paymentAssignment} onClose={() => setPaymentAssignment(null)} />
      {pendingAssignment && (
        <AuthModal
          mode="register"
          onClose={() => setPendingAssignment(null)}
          onSuccess={() => {
            setPaymentAssignment(pendingAssignment);
            setPendingAssignment(null);
          }}
        />
      )}
    </section>
  );
}

const REVIEWS = [
  ['АК', 'Анна, мама ученика', 'уровень 05 · 9 лет', '«Нравится, что после ошибки можно вернуться и попробовать другой ход. Ребёнок не просто угадывает ответ — он начинает объяснять, почему ход работает.»'],
  ['МС', 'Михаил, любитель', 'тренируется 4 раза в неделю', '«Для домашней тренировки подходит идеально: открыл, решил несколько задач, посмотрел статистику и понял, где ошибся.»']
];

export function Reviews() {
  return (
    <section className={`bg-paper ${sectionPad}`} id="reviews">
      <div className={`${container} grid gap-[50px] items-start lg:grid-cols-[.85fr_1.15fr] lg:gap-20`}>
        <Reveal>
          <span className={`${label} text-ink`}>Отзывы</span>
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
              className="rounded-[22px] border border-line bg-surface p-[25px] transition duration-200 hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="text-accent text-[11px] tracking-[.14em]">★★★★★</div>
              <blockquote className="font-display text-[19px] sm:text-[23px] leading-[1.25] tracking-[-.04em] mt-[18px] mb-7">
                {text}
              </blockquote>
              <div className="flex items-center gap-[11px]">
                <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-paper text-[10px] font-extrabold">
                  {initials}
                </span>
                <div>
                  <strong className="block text-[11px]">{name}</strong>
                  <small className="block text-[9px] text-muted mt-0.5">{note}</small>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

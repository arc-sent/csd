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
          <SectionIntro label="Для кого" title="Кому подходит школа шахматной динамики." />
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
  const box =
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
            title="Как решать шахматные задачи онлайн: четыре шага."
            note="От оплаты до следующего уровня — всё внутри одного сценария: решаешь тактические задачи прямо в браузере, без установки приложения."
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
            Обучение динамике, которое показывает <em className="not-italic text-accent">процесс</em>, а не
            только ответ.
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

function stageDiscountPercent(stage) {
  const total = stage.assignments.reduce((sum, a) => sum + a.price, 0);
  if (!(stage.price > 0) || !(total > 0) || stage.price >= total) return 0;
  return Math.round(((total - stage.price) / total) * 100);
}

export function Plans({notify}) {
  const [stages, setStages] = useState([]);
  const [stageId, setStageId] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [paymentAssignment, setPaymentAssignment] = useState(null);
  const [paymentStage, setPaymentStage] = useState(null);
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const {status} = useAuthContext();

  function startPurchase(kind, item) {
    if (status === 'authenticated' || status === 'unverified') {
      if (kind === 'stage') setPaymentStage(item);
      else setPaymentAssignment(item);
      return;
    }
    setPendingPurchase({kind, item});
  }

  const handleBuy = assignment => startPurchase('assignment', assignment);
  const handleBuyStage = stage => startPurchase('stage', stage);

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
  const bonusAssignments = stage ? stage.assignments.filter(a => a.bonus) : [];
  const bonusTotal = bonusAssignments.reduce((sum, a) => sum + a.price, 0);

  return (
    <section className={`bg-bg ${sectionPad}`} id="plans">
      <div className={container}>
        <Reveal className="relative z-30">
          <SectionIntro
            split
            badge={
              stages.length > 0 && (
                <div className="mb-3">
                <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                  <StageSwitcher stages={stages} value={stageId} onChange={setStageId} pulse={stages.length > 1} />
                </div>
                </div>
              )
            }
            label="Тарифы"
            title="Наборы шахматных задач по темам и уровням."
            note="Наборы шахматных задач по темам тактики: разбор хода за ходом и мгновенная проверка. Задания продаются поштучно, а весь этап целиком — со скидкой."
          />
        </Reveal>
        {stage && stage.price > 0 && bonusAssignments.length === 0 && (
          <Reveal className="mb-6">
            <button
              type="button"
              onClick={() => handleBuyStage(stage)}
              className="inline-flex items-center justify-center gap-3 font-extrabold min-h-[52px] px-[22px] rounded-[15px] text-sm bg-accent text-on-accent shadow-[0_12px_24px_rgba(255,107,45,.22)] transition duration-200 hover:-translate-y-0.5"
            >
              Купить этап целиком · {stage.price.toLocaleString('ru-RU')} ₽
              {stageDiscountPercent(stage) > 0 && (
                <span className="rounded-full bg-on-accent text-accent px-2 py-[2px] text-[11px]">
                  −{stageDiscountPercent(stage)}%
                </span>
              )}
            </button>
          </Reveal>
        )}
        {bonusAssignments.length > 0 && stage.price > 0 && (
          <Reveal className="mb-6">
            <div className="flex flex-col gap-4 rounded-[22px] border border-accent/40 bg-accent-soft p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-bg text-[26px] leading-none text-ink"
                aria-hidden="true"
              >
                ♛
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-[.14em] text-accent-strong">
                  Бонус при покупке этапа целиком
                </span>
                <p className="mt-1 font-display text-[17px] leading-[1.25] tracking-[-.02em] text-ink sm:text-[19px]">
                  {bonusAssignments.length === 1 ? 'Задание' : 'Задания'}{' '}
                  {bonusAssignments.map((a, i) => (
                    <span key={a.id}>
                      {i > 0 && ', '}
                      «{a.name}»
                    </span>
                  ))}{' '}
                  — в подарок
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  Вместо {bonusTotal.toLocaleString('ru-RU')} ₽ — бесплатно. Отдельно из этого этапа его можно
                  купить только за полную цену.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleBuyStage(stage)}
                className="inline-flex w-full shrink-0 items-center justify-center rounded-xl bg-accent px-5 py-3 text-xs font-extrabold text-on-accent shadow-[0_8px_18px_rgba(255,107,45,.22)] transition duration-200 hover:-translate-y-0.5 sm:w-auto"
              >
                Купить этап целиком · {stage.price.toLocaleString('ru-RU')} ₽
                {stageDiscountPercent(stage) > 0 && (
                  <span className="ml-2 rounded-full bg-on-accent px-2 py-[2px] text-[10px] text-accent">
                    −{stageDiscountPercent(stage)}%
                  </span>
                )}
              </button>
            </div>
          </Reveal>
        )}
        {stage && stage.assignments.length > 0 && (
          <Reveal delay>
            <AssignmentCarousel notify={notify} assignments={stage.assignments} stageId={stageId} onBuy={handleBuy} />
          </Reveal>
        )}
        {loadFailed && <p className="text-sm text-muted">Не удалось загрузить тарифы — попробуйте обновить страницу.</p>}
      </div>
      <PaymentModal assignment={paymentAssignment} onClose={() => setPaymentAssignment(null)} />
      <PaymentModal stage={paymentStage} onClose={() => setPaymentStage(null)} />
      {pendingPurchase && (
        <AuthModal
          mode="register"
          onClose={() => setPendingPurchase(null)}
          onSuccess={() => {
            if (pendingPurchase.kind === 'stage') setPaymentStage(pendingPurchase.item);
            else setPaymentAssignment(pendingPurchase.item);
            setPendingPurchase(null);
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
          <h2 className={heading}>Отзывы учеников и родителей.</h2>
          <p className="text-muted text-sm leading-[1.7] pt-[30px]">
            Что говорят ученики и их родители о занятиях по методике: как меняется игра, появляется ли привычка
            искать тактику в каждой партии и помогают ли разборы ход за ходом быстрее замечать удары, вилки и
            матовые угрозы.
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

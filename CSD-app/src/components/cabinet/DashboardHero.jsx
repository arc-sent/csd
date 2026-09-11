import {label} from '../ui.jsx';
import {plural} from '../../lib/plural.js';

// Вс, Пн, Вт, Ср, Чт, Пт, Сб — по getUTCDay(), тем же, каким на сервере
// считаются дни решений (dateKey из cabinet.service.js).
const WEEKDAY_INITIALS = ['В', 'П', 'В', 'С', 'Ч', 'П', 'С'];
const DAY_MS = 24 * 60 * 60 * 1000;

const cardBase = 'rounded-[22px] p-6 sm:p-7 flex flex-col';

function MiniStat({value, text}) {
  return (
    <div>
      <b className="block font-display text-[20px] tracking-[-.03em] leading-none">{value}</b>
      <span className="block text-[9px] uppercase tracking-[.08em] text-faint mt-2">{text}</span>
    </div>
  );
}

function ContinueCard({continueData, accuracy, onContinue}) {
  if (!continueData) {
    return (
      <div className={`${cardBase} border border-line bg-surface justify-center`}>
        <span className={`${label} text-subtle`}>Всё решено</span>
        <h3 className="font-display text-[24px] tracking-[-.04em] mt-2.5 mb-2.5">
          Купленные задания закончились
        </h3>
        <p className="text-[13px] leading-[1.6] text-muted mb-6">
          Отличная работа. Возьмите следующее задание — прогресс и серия сохранятся.
        </p>
        <a
          href="#plans"
          className="inline-flex self-start items-center gap-1.5 min-h-[46px] px-5 rounded-xl bg-invert text-invert-fg text-xs font-extrabold transition duration-200 hover:-translate-y-0.5"
        >
          Смотреть задания <span>→</span>
        </a>
      </div>
    );
  }

  const percent = Math.round((continueData.solvedCount / continueData.levelsCount) * 100);
  const left = continueData.levelsCount - continueData.solvedCount;

  return (
    <div className={`${cardBase} border border-line bg-surface`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`${label} text-subtle truncate`}>{continueData.stageName || 'Сейчас в работе'}</span>
        <span className="shrink-0 inline-flex items-center rounded-full bg-accent-soft text-accent-strong text-[10px] font-extrabold px-2.5 py-[5px]">
          {percent}%
        </span>
      </div>

      <h3 className="font-display text-[24px] leading-[1.1] tracking-[-.04em] mt-2.5 mb-2">
        {continueData.assignmentName}
      </h3>
      <p className="text-[12px] text-faint">
        Задача {continueData.levelIndex} из {continueData.levelsCount} · {continueData.levelName}
      </p>

      <div className="h-1.5 rounded bg-line overflow-hidden mt-4">
        <i className="block h-full bg-accent transition-[width] duration-[400ms]" style={{width: `${percent}%`}} />
      </div>

      <div className="grid grid-cols-2 gap-4 py-6 mt-auto">
        <MiniStat value={left} text={`${plural(left, ['задача', 'задачи', 'задач'])} осталось`} />
        <MiniStat value={accuracy === null ? '—' : `${accuracy}%`} text="точность" />
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="inline-flex items-center justify-center gap-1.5 min-h-[50px] px-5 rounded-xl bg-invert text-invert-fg text-xs font-extrabold transition duration-200 hover:-translate-y-0.5"
      >
        Продолжить задачу <span>→</span>
      </button>
    </div>
  );
}

function StreakCard({streakDays, longestStreak, weekActivity}) {
  const today = new Date();
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * DAY_MS);
    return {label: WEEKDAY_INITIALS[d.getUTCDay()], active: Boolean(weekActivity[i]), isToday: i === 6};
  });

  return (
    <div className={`${cardBase} relative overflow-hidden bg-invert text-invert-fg`}>
      {/* Декоративная дуга — та же деталь, что и в макете кабинета. */}
      <span className="pointer-events-none absolute -right-14 -top-20 w-[210px] h-[210px] rounded-full border border-invert-fg/10" />

      <div className="flex items-center justify-between gap-3 text-[9px] uppercase tracking-[.12em] text-invert-muted">
        <span>Текущая серия</span>
        <b className="text-invert-fg">
          {streakDays} {plural(streakDays, ['день', 'дня', 'дней'])}
        </b>
      </div>

      <div className="grid place-items-center my-auto py-5">
        <div className="grid place-items-center w-[112px] h-[112px] rounded-full border-[7px] border-invert-fg/15 border-t-accent">
          <div className="text-center">
            <strong className="block font-display text-[40px] leading-none tracking-[-.05em]">{streakDays}</strong>
            <small className="block text-[8px] uppercase tracking-[.1em] text-invert-muted mt-2">дней подряд</small>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <span
            key={i}
            className={`h-8 rounded-[10px] grid place-items-center text-[9px] font-extrabold border ${
              day.isToday
                ? 'bg-accent border-accent text-on-accent'
                : day.active
                  ? 'bg-[#2b3a2d] border-[#3f5943] text-[#9ec5a4]'
                  : 'border-invert-fg/15 text-invert-muted'
            }`}
          >
            {day.label}
          </span>
        ))}
      </div>

      <p className="text-[10px] leading-[1.5] text-invert-muted text-center mt-4">
        {streakDays > 0
          ? 'Ещё одна задача сегодня — и серия продолжится.'
          : 'Решите задачу сегодня, чтобы начать серию.'}
        {longestStreak > streakDays && (
          <>
            {' '}
            Рекорд — {longestStreak} {plural(longestStreak, ['день', 'дня', 'дней'])}.
          </>
        )}
      </p>
    </div>
  );
}

export function DashboardHero({dashboard, hasAssignments, onContinue}) {
  if (!hasAssignments) return null;
  return (
    <div className="grid gap-3.5 lg:grid-cols-[1.25fr_1fr]">
      <ContinueCard continueData={dashboard.continue} accuracy={dashboard.accuracy} onContinue={onContinue} />
      <StreakCard
        streakDays={dashboard.streakDays}
        longestStreak={dashboard.longestStreak}
        weekActivity={dashboard.weekActivity}
      />
    </div>
  );
}

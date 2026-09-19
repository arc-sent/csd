import {Board, BoardFrame} from './Board.jsx';
import {Marquee} from './Marquee.jsx';
import {Reveal} from './Reveal.jsx';
import {Button, container, label} from './ui.jsx';
import {CourseDescription} from './CourseDescription.jsx';
import {LEVEL} from '../data/level.js';

const panelButton =
  'inline-flex items-center justify-center text-center min-h-[34px] px-2 rounded-[11px] text-[10px] font-extrabold';

function TaskCard() {
  return (
    <div
      className="relative w-[min(680px,100%)] bg-panel border border-panel-line rounded-3xl overflow-hidden shadow-card pointer-events-none select-none"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between h-[42px] px-4 border-b border-line">
        <span className="font-display text-sm font-extrabold text-ink">{LEVEL.name}</span>
      </div>

      <div className="grid grid-cols-[1.05fr_.95fr]">
        <div className="flex flex-col justify-center p-[18px] bg-bg">
          <BoardFrame className="[--coord:var(--color-faint)]" coordClassName="text-faint">
            <Board position={LEVEL.position} />
          </BoardFrame>
        </div>

        <div className="flex flex-col justify-center p-[18px]">
          <div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-accent">Ход белых</div>
          <h3 className="font-display text-[23px] leading-[1.05] tracking-[-.04em] mt-[7px] mb-1.5">
            Найди лучший ход
          </h3>
          <p className="text-xs text-muted leading-[1.5] my-3">
            В позиции есть тактическая возможность. Рассчитай вариант до конца.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[10px] text-muted">
            <span>♟ Сложность: средняя</span>
            <span>◷ ~ 2 мин</span>
          </div>

          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-3.5 pb-2">
              <span className="text-[8px] uppercase tracking-[.12em] text-faint">
                Ход по координатам
              </span>
              <span className="text-[13px] text-right min-h-5">—</span>
            </div>
            <div>
              <span className="block mb-1.5 text-[8px] uppercase tracking-[.12em] text-faint">
                Поле решения
              </span>
              <span className="block font-display text-[15px] font-extrabold min-h-[52px]">—</span>
            </div>
          </div>

          <div className="flex items-start gap-3 min-h-[52px] mt-2.5 py-2 px-2.5 rounded-xl border border-line bg-paper">
            <span className="text-xs text-faint">○</span>
            <div>
              <strong className="block text-[11px]">Ход белых</strong>
              <small className="block text-[10px] text-faint mt-0.5">
                Сделай первый ход алгоритма.
              </small>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 mt-2.5">
            <span className={`${panelButton} border border-line bg-fill`}>← Назад</span>
            <span className={`${panelButton} border border-line bg-fill`}>↶ Возврат хода</span>
            <span className={`${panelButton} border border-line bg-fill`}>Вперёд →</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            <span className={`${panelButton} border border-line bg-fill`}>Начальная позиция</span>
            <span className={`${panelButton} bg-invert text-invert-fg`}>Решение</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-[55px] pb-[74px] sm:pt-[76px] sm:pb-[104px]">
      <span
        className="absolute z-0 rounded-full bg-accent-soft blur-[3px] pointer-events-none w-[300px] h-[300px] -right-[150px] -top-[130px] sm:w-[520px] sm:h-[520px] sm:-right-[220px] sm:-top-[180px]"
        aria-hidden="true"
      />

      <div className={`${container} relative z-10 grid items-center gap-[50px] lg:grid-cols-[.92fr_1.08fr] lg:gap-[58px]`}>
        <Reveal className="max-w-[640px]">
          <div className="inline-flex items-center gap-2.5 text-muted">
            <span className="w-[7px] h-[7px] rounded-full bg-accent" />
            <span className={label}>Онлайн-тренажёр по шахматной тактике</span>
          </div>
          <h1 className="font-display text-[52px] sm:text-[clamp(50px,6vw,84px)] leading-[.97] tracking-[-.07em] my-[22px]">
            Начни <em className="not-italic text-accent">видеть</em> комбинации на несколько ходов вперёд.
          </h1>
          <CourseDescription />
          <div className="flex flex-wrap items-center gap-6">
            <Button href="#plans">
              Начать решать <span>↗</span>
            </Button>
            <a className="text-[13px] font-extrabold border-b border-ink pb-[3px]" href="#demo">
              Посмотреть, как это работает <span className="text-accent">↓</span>
            </a>
          </div>
          <div className="flex items-center gap-3.5 mt-[42px]">
            <div className="flex pl-1.5" aria-hidden="true">
              {['А', 'М', 'И', '+'].map((letter, index) => (
                <span
                  key={letter}
                  className={`grid place-items-center w-[30px] h-[30px] -ml-1.5 rounded-full border-2 border-bg text-[10px] font-extrabold ${
                    index === 3 ? 'bg-invert text-invert-fg' : 'bg-line'
                  }`}
                >
                  {letter}
                </span>
              ))}
            </div>
            <div>
              <strong className="block text-sm">2 400+</strong>
              <small className="block text-[11px] text-muted">решённых задач в неделю</small>
            </div>
          </div>
        </Reveal>

        <Reveal delay className="hidden sm:flex relative min-h-[480px] lg:min-h-[580px] items-center justify-center">
          <span className="absolute w-[520px] h-[520px] rounded-full border border-line hidden lg:block" />
          <span className="absolute w-[640px] h-[640px] rounded-full border border-dashed border-line hidden lg:block" />
          <TaskCard />
        </Reveal>
      </div>

      <Marquee />
    </section>
  );
}

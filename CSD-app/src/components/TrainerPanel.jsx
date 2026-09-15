import {Fragment, useEffect, useRef} from 'react';
import {Board, BoardFrame} from './Board.jsx';
import {MoveText} from './MoveText.jsx';
import {Reveal} from './Reveal.jsx';
import {useTrainer} from '../hooks/useTrainer.js';

const btn =
  'inline-flex items-center justify-center text-center rounded-[11px] font-extrabold transition duration-[180ms] disabled:opacity-35 disabled:cursor-not-allowed min-h-10 sm:min-h-[42px] lg:min-h-10 px-1.5 sm:px-3 text-[10px] sm:text-[11px]';
const ghostBtn = `${btn} border border-line bg-fill text-ink enabled:hover:border-line-strong enabled:hover:bg-fill-hover`;
const darkBtn = `${btn} bg-invert text-invert-fg enabled:hover:bg-accent enabled:hover:text-on-accent`;
const fieldLabel = 'block text-[8px] sm:text-[9px] uppercase tracking-[.12em] text-faint';

const feedbackTone = {
  idle: 'border-line bg-panel-deep text-muted',
  success: 'border-success-line bg-success-bg text-success',
  error: 'border-danger-line bg-danger-bg text-danger'
};
const feedbackIcon = {idle: '○', success: '✓', error: '!'};

/**
 * Панель тренажёра: доска, подписи ходов, обратная связь, управление и
 * прогресс. Используется и демо-секцией лендинга, и экраном решения в
 * кабинете — одна реализация на оба места, ноль риска расхождений.
 * Палитра целиком на токенах (--color-panel*), поэтому панель следует теме
 * сайта: светлая карточка в светлой теме, тёмная — в тёмной.
 *
 * ВАЖНО про смену задачи: useTrainer инициализируется через
 * useState(() => initialCore(level)) — ленивый инициализатор не перезапустится
 * при смене пропса level. Вызывающая сторона обязана ремонтировать компонент
 * через key={level.id}, иначе на доске останется предыдущая задача.
 */
export function TrainerPanel({level, notify, title, eyebrow, subtitle, onSolved, onMistake}) {
  const trainer = useTrainer(level, notify, onMistake);
  // Доска разворачивается, когда ученик играет чёрными.
  const flipped = trainer.side === 'b';
  const reportedRef = useRef(false);

  // «Решено» отправляем ровно один раз за монтирование. trainer.solved
  // двигается только настоящими верными ходами: кнопка «Решение» лишь
  // подсвечивает подсказку и уровень не засчитывает.
  useEffect(() => {
    if (!trainer.solved || reportedRef.current) return;
    reportedRef.current = true;
    onSolved?.({usedSolution: trainer.solutionShown});
  }, [trainer.solved, trainer.solutionShown, onSolved]);

  // text-ink на панели обязателен: демо-секция лендинга — тёмная полоса со
  // светлым текстом, и без своего цвета панель наследовала бы его, оставаясь
  // при этом светлой в светлой теме.
  return (
    <Reveal delay className="border border-panel-line rounded-3xl overflow-hidden bg-panel text-ink shadow-card">
      <div className="flex flex-col lg:grid lg:grid-cols-[1.06fr_.7fr]">
        {/* На узких экранах панель «растворяется»: её содержимое
            становится элементами общей колонки и получает свой порядок */}
        <div className="contents lg:col-start-2 lg:flex lg:flex-col lg:px-[30px] lg:py-[34px]">
          <div className="order-1 lg:order-none px-[15px] pt-[13px] sm:px-5 sm:pt-[18px] lg:p-0 text-[9px] uppercase tracking-[.12em] text-muted">
            <span className="font-display text-sm font-extrabold text-ink">{title}</span>
          </div>

          <div className="order-2 lg:order-none px-[15px] pt-1 pb-2 sm:px-5 sm:pt-2 sm:pb-3.5 lg:p-0 lg:pt-12 lg:pb-[30px] border-b border-panel-line">
            <span className="text-[10px] uppercase tracking-[.14em] font-extrabold text-accent">{eyebrow || (flipped ? 'Ход чёрных' : 'Ход белых')}</span>
            <h3 className="font-display text-[17px] sm:text-[28px] leading-[1.12] sm:leading-[1.05] tracking-[-.04em] mt-[3px] sm:my-2.5">
              {subtitle}
            </h3>
            <p className="hidden sm:block text-xs text-muted leading-[1.6] my-3">
              На каждый верный ход соперник отвечает ходом, заданным в алгоритме уровня.
            </p>
          </div>

          {/* Координаты хода и решение — в две колонки, чтобы не тянуть высоту */}
          <div className="order-4 lg:order-none grid grid-cols-2 gap-3 sm:gap-3.5 px-[15px] pt-[9px] sm:px-5 sm:pt-3.5 lg:flex lg:flex-col lg:gap-0 lg:p-0">
            <div className="lg:py-5 lg:text-[11px]">
              <span className={`${fieldLabel} mb-1.5`}>Ход по координатам</span>
              <div
                className={`font-display min-h-5 ${
                  trainer.preview.empty
                    ? 'text-[15px] text-faint lg:text-[14px]'
                    : 'text-[15px] lg:text-[19px]'
                }`}
              >
                {trainer.preview.empty ? (
                  trainer.preview.text
                ) : (
                  <MoveText
                    move={trainer.preview.move}
                    before={trainer.preview.before}
                    beforeFen={trainer.preview.beforeFen}
                    prefix={trainer.preview.prefix}
                  />
                )}
              </div>
            </div>

            <div
              className={`lg:flex lg:items-center lg:justify-between lg:gap-3.5 lg:mb-3.5 lg:px-[13px] lg:py-[11px] lg:rounded-xl lg:border lg:border-dashed ${
                trainer.solutionShown
                  ? 'lg:border-solid lg:border-[rgba(255,107,45,.55)] lg:bg-[rgba(255,107,45,.10)]'
                  : 'lg:border-line'
              }`}
            >
              <span className={`${fieldLabel} mb-1.5 lg:mb-0`}>Поле решения</span>
              <output
                className={`grid justify-start lg:justify-end grid-cols-[max-content_max-content] gap-x-3 lg:gap-x-[18px] gap-y-px min-h-[44px] sm:min-h-[52px] lg:min-h-0 font-display text-xs sm:text-[15px] lg:text-xl font-extrabold ${
                  trainer.solutionShown ? 'text-accent' : ''
                }`}
              >
                {trainer.solutionShown ? (
                  <>
                    <em className="not-italic text-[7px] sm:text-[8px] font-bold uppercase tracking-[.12em] text-faint pb-0.5">
                      ваш ход
                    </em>
                    <em className="not-italic text-[7px] sm:text-[8px] font-bold uppercase tracking-[.12em] text-faint pb-0.5">
                      ответ соперника
                    </em>
                    {trainer.solutionLines.map(line => (
                      <Fragment key={line.index}>
                        <b>
                          <MoveText
                            move={line.playerMove}
                            before={line.playerBefore}
                            beforeFen={line.playerBeforeFen}
                            prefix={line.index + '. '}
                          />
                        </b>
                        <i className="not-italic text-muted">
                          {line.replyMove ? (
                            <MoveText move={line.replyMove} before={line.replyBefore} beforeFen={line.replyBeforeFen} />
                          ) : (
                            '—'
                          )}
                        </i>
                      </Fragment>
                    ))}
                  </>
                ) : (
                  <span>—</span>
                )}
              </output>
            </div>
          </div>

          <div
            className={`order-5 lg:order-none flex gap-3 mx-[15px] mt-[9px] sm:mx-5 sm:mt-3.5 lg:mx-0 lg:mt-0 py-2 px-[11px] sm:p-[13px] rounded-xl border transition duration-200 ${
              feedbackTone[trainer.feedback.state]
            }`}
          >
            <span className="text-sm">{feedbackIcon[trainer.feedback.state]}</span>
            <div className="text-ink">
              <strong className="block text-[11px]">{trainer.feedback.title}</strong>
              <small className="block text-[10px] text-faint mt-0.5">{trainer.feedback.note}</small>
            </div>
          </div>

          <div className="order-6 lg:order-none grid grid-cols-3 lg:grid-cols-[1fr_auto_1fr] gap-2 mx-[15px] mt-[9px] sm:mx-5 sm:mt-3.5 lg:mx-0 lg:mt-3.5">
            <button type="button" className={ghostBtn} disabled={!trainer.canPrev} onClick={trainer.onPrev}>
              ← Назад
            </button>
            <button
              type="button"
              className={`${ghostBtn} ${trainer.wrongPending ? 'border-danger text-danger' : ''}`}
              disabled={!trainer.canUndo}
              onClick={trainer.onUndo}
            >
              ↶ Возврат хода
            </button>
            <button type="button" className={ghostBtn} disabled={!trainer.canNext} onClick={trainer.onNext}>
              Вперёд →
            </button>
          </div>

          <div className="order-7 lg:order-none grid grid-cols-2 gap-2 mx-[15px] mt-1.5 sm:mx-5 sm:mt-2 lg:mx-0 lg:mt-2.5">
            <button type="button" className={ghostBtn} disabled={!trainer.canReset} onClick={trainer.onReset}>
              Начальная позиция
            </button>
            <button type="button" className={darkBtn} disabled={trainer.solved} onClick={trainer.onSolution}>
              Решение
            </button>
          </div>

          <div className="order-8 lg:order-none flex justify-between px-[15px] pt-[9px] sm:px-5 sm:pt-3.5 lg:p-0 lg:pt-7 lg:mt-auto text-[9px] uppercase tracking-[.1em] text-faint">
            <span>Прогресс уровня</span>
            <b className="text-ink">{trainer.progress}%</b>
          </div>
          <div className="order-9 lg:order-none h-1 mx-[15px] mt-1.5 mb-3.5 sm:mx-5 sm:mb-[18px] lg:mx-0 lg:mt-2.5 lg:mb-0 rounded bg-line overflow-hidden">
            <i
              className="block h-full bg-accent transition-[width] duration-[400ms]"
              style={{width: `${trainer.progress}%`}}
            />
          </div>
        </div>

        {/* Доска: по высоте не больше 44vh, но не мельче 240px */}
        <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-1 flex flex-col justify-center p-2.5 sm:p-4 lg:p-6 bg-panel-deep">
          <BoardFrame
            className="w-full mx-auto max-w-[min(100%,max(280px,44vh))] lg:max-w-none"
            coordClassName="text-faint"
            flipped={flipped}
          >
            <Board
              large
              interactive
              flipped={flipped}
              boardRef={trainer.boardRef}
              position={trainer.position}
              selected={trainer.selected}
              targets={trainer.targets}
              movable={trainer.movable}
              lastMove={trainer.lastMove}
              hintFrom={trainer.hintFrom}
              locked={trainer.locked}
              onPointerDown={trainer.onPointerDown}
              onPointerMove={trainer.onPointerMove}
              onPointerUp={trainer.onPointerUp}
              label="Доска задачи"
            />
          </BoardFrame>
        </div>
      </div>
    </Reveal>
  );
}

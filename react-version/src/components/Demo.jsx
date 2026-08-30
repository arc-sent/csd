import {Fragment} from 'react';
import {Board, BoardFrame} from './Board.jsx';
import {Reveal} from './Reveal.jsx';
import {SectionIntro, container, sectionPad} from './ui.jsx';
import {useTrainer} from '../hooks/useTrainer.js';
import {LEVEL} from '../data/level.js';

const btn =
  'inline-flex items-center justify-center text-center rounded-[11px] font-extrabold transition duration-150 disabled:opacity-35 disabled:cursor-not-allowed min-h-10 sm:min-h-[42px] px-1.5 sm:px-3 text-[10px] sm:text-[11px]';
const ghostBtn = `${btn} border border-[#3f423c] text-[#d8d9d2] enabled:hover:border-[#6c6f66]`;
const darkBtn = `${btn} bg-[#f2f0eb] text-[#1a1c19] enabled:hover:bg-accent enabled:hover:text-white`;
const fieldLabel = 'block text-[8px] sm:text-[9px] uppercase tracking-[.12em] text-[#767972]';

const feedbackTone = {
  idle: 'border-[#3a3d37] bg-[#1d1f1c] text-[#9aa39b]',
  success: 'border-[#3b5541] bg-[#1e2820] text-[#68cf7a]',
  error: 'border-[#5c3b3b] bg-[#2a1e1e] text-[#e2705b]'
};
const feedbackIcon = {idle: '○', success: '✓', error: '!'};

export function Demo({notify}) {
  const trainer = useTrainer(LEVEL, notify);

  return (
    <section className={`bg-dark text-white ${sectionPad}`} id="demo">
      <div className={container}>
        <SectionIntro
          split
          label="Интерфейс"
          title="Простой интерфейс. Никаких лишних кнопок."
          note="Доска, задача, обратная связь и управление. Весь фокус остаётся на позиции."
          className="[&_.text-muted]:text-[#95968f] [&_span]:text-[#c0c1ba]"
        />

        <Reveal delay className="border border-panel-line rounded-3xl overflow-hidden bg-panel shadow-[0_25px_65px_rgba(0,0,0,.28)]">
          {/* Декоративная шапка окна: на телефоне только съедала бы высоту */}
          <div className="hidden sm:flex items-center justify-between h-[42px] px-4 border-b border-panel-line text-[9px] text-[#6f7169]">
            <div className="flex gap-[5px]">
              {[0, 1, 2].map(i => (
                <i key={i} className="w-[7px] h-[7px] rounded-full bg-[#555850]" />
              ))}
            </div>
            <div className="tracking-[.14em] text-[8px]">LIVE TRAINING</div>
          </div>

          <div className="flex flex-col lg:grid lg:grid-cols-[1.06fr_.7fr]">
            {/* На узких экранах панель «растворяется»: её содержимое
                становится элементами общей колонки и получает свой порядок */}
            <div className="contents lg:col-start-2 lg:flex lg:flex-col lg:px-[30px] lg:py-[34px]">
              <div className="order-1 lg:order-none px-[15px] pt-[13px] sm:px-5 sm:pt-[18px] lg:p-0">
                <span className="font-display text-sm font-extrabold text-white">{LEVEL.name}</span>
              </div>

              <div className="order-2 lg:order-none px-[15px] pt-1 pb-2.5 sm:px-5 sm:pt-2 sm:pb-3.5 lg:p-0 lg:pt-12 lg:pb-[30px] border-b border-panel-line">
                <span className="text-[10px] uppercase tracking-[.14em] font-extrabold text-[#ff8352]">
                  Ход белых
                </span>
                <h3 className="font-display text-[17px] sm:text-[28px] leading-[1.12] lg:leading-[1.05] tracking-[-.04em] mt-1 lg:my-2.5">
                  Найди тактический ресурс в 2 хода.
                </h3>
                <p className="hidden sm:block text-xs text-[#8f9088] leading-[1.6]">
                  На каждый верный ход соперник отвечает ходом, заданным в алгоритме уровня.
                </p>
              </div>

              {/* Координаты хода и решение — в две колонки, чтобы не тянуть высоту */}
              <div className="order-4 lg:order-none grid grid-cols-2 gap-3 sm:gap-3.5 px-[15px] pt-[9px] sm:px-5 sm:pt-3.5 lg:flex lg:flex-col lg:gap-0 lg:p-0">
                <div className="lg:py-5">
                  <span className={`${fieldLabel} mb-1.5`}>Ход по координатам</span>
                  <div
                    className={`font-display min-h-5 lg:text-[19px] ${
                      trainer.preview.empty ? 'text-[15px] text-[#767972]' : 'text-[15px]'
                    }`}
                  >
                    {trainer.preview.text}
                  </div>
                </div>

                <div
                  className={`lg:flex lg:items-center lg:justify-between lg:gap-3.5 lg:mb-3.5 lg:px-3 lg:py-2.5 lg:rounded-xl lg:border lg:border-dashed ${
                    trainer.solutionShown
                      ? 'lg:border-solid lg:border-[rgba(255,107,45,.55)] lg:bg-[rgba(255,107,45,.10)]'
                      : 'lg:border-[#3f423c]'
                  }`}
                >
                  <span className={`${fieldLabel} mb-1.5 lg:mb-0`}>Поле решения</span>
                  <output
                    className={`grid justify-start lg:justify-end grid-cols-[max-content_max-content] gap-x-3 lg:gap-x-[18px] gap-y-px min-h-[46px] lg:min-h-0 font-display text-xs sm:text-[15px] lg:text-xl font-extrabold ${
                      trainer.solutionShown ? 'text-accent' : ''
                    }`}
                  >
                    {trainer.solutionShown ? (
                      <>
                        <em className="not-italic text-[7px] sm:text-[8px] font-bold uppercase tracking-[.12em] text-[#767972] pb-0.5">
                          ваш ход
                        </em>
                        <em className="not-italic text-[7px] sm:text-[8px] font-bold uppercase tracking-[.12em] text-[#767972] pb-0.5">
                          ответ соперника
                        </em>
                        {trainer.solutionLines.map(line => (
                          <Fragment key={line.own}>
                            <b>{line.own}</b>
                            <i className="not-italic text-[#8f9088]">{line.reply}</i>
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
                className={`order-5 lg:order-none flex gap-3 mx-[15px] mt-[9px] sm:mx-5 sm:mt-3.5 lg:mx-0 lg:mt-0 p-2.5 sm:p-3 rounded-xl border transition ${
                  feedbackTone[trainer.feedback.state]
                }`}
              >
                <span className="text-sm">{feedbackIcon[trainer.feedback.state]}</span>
                <div className="text-white">
                  <strong className="block text-[11px]">{trainer.feedback.title}</strong>
                  <small className="block text-[10px] text-[#8d978f] mt-0.5">
                    {trainer.feedback.note}
                  </small>
                </div>
              </div>

              <div className="order-6 lg:order-none grid grid-cols-3 lg:grid-cols-[1fr_auto_1fr] gap-2 mx-[15px] mt-[9px] sm:mx-5 sm:mt-3.5 lg:mx-0 lg:mt-3.5">
                <button type="button" className={ghostBtn} disabled={!trainer.canPrev} onClick={trainer.onPrev}>
                  ← Назад
                </button>
                <button
                  type="button"
                  className={`${ghostBtn} ${trainer.wrongPending ? 'border-[#e2705b] text-[#e2705b]' : ''}`}
                  disabled={!trainer.canUndo}
                  onClick={trainer.onUndo}
                >
                  ↶ Возврат хода
                </button>
                <button type="button" className={ghostBtn} disabled={!trainer.canNext} onClick={trainer.onNext}>
                  Вперёд →
                </button>
              </div>

              <div className="order-7 lg:order-none grid grid-cols-2 gap-2 mx-[15px] mt-1.5 sm:mx-5 sm:mt-2 lg:mx-0">
                <button type="button" className={ghostBtn} disabled={!trainer.canReset} onClick={trainer.onReset}>
                  Начальная позиция
                </button>
                <button type="button" className={darkBtn} disabled={trainer.solved} onClick={trainer.onSolution}>
                  Решение
                </button>
              </div>

              <div className="order-8 lg:order-none flex justify-between px-[15px] pt-[9px] sm:px-5 sm:pt-3.5 lg:p-0 lg:pt-7 lg:mt-auto text-[9px] uppercase tracking-[.1em] text-[#777b72]">
                <span>Прогресс уровня</span>
                <b className="text-white">{trainer.progress}%</b>
              </div>
              <div className="order-9 lg:order-none h-1 mx-[15px] mt-1.5 mb-3.5 sm:mx-5 sm:mb-[18px] lg:mx-0 lg:mt-2.5 lg:mb-0 rounded bg-[#343731] overflow-hidden">
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
                coordClassName="text-[#9ea196]"
              >
                <Board
                  large
                  interactive
                  boardRef={trainer.boardRef}
                  position={trainer.position}
                  selected={trainer.selected}
                  targets={trainer.targets}
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
      </div>
    </section>
  );
}

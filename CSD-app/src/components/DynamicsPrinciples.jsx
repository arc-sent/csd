import {Fragment} from 'react';
import {Reveal} from './Reveal.jsx';
import {Board, BoardFrame} from './Board.jsx';
import {MoveText} from './MoveText.jsx';
import {SectionIntro, container} from './ui.jsx';
import {positionFromFen} from '../lib/chess.js';
import {MOTIF_EXAMPLES} from '../data/motifExamples.js';
import {WAY_EXAMPLES} from '../data/wayExamples.js';

// Исходный текст методики от 22.09 — три раздела («способа создания
// слабостей»), внутри второго — десять тактических мотивов 2.1-2.10.
// Раздел 2 сам по себе — как остальные (номер, иконка, текст), но при
// раскрытии показывает не пример, а список из 10 мотивов — каждый со своим
// определением и своим примером, тем же способом, что и разделы 1 и 3.
const SECTIONS = [
  {
    code: '1',
    icon: '♞',
    title: 'Активные фигуры',
    text: 'Активные, развитые, взаимодействующие (выполняющие конкретную поставленную задачу) фигуры, контроль центра, создание перевеса в силах на нужном участке доски.'
  },
  {
    code: '2',
    icon: '♜',
    title: 'Угроза слабостям',
    text: 'Создание линий, полей, диагоналей для атаки с применением тактических мотивов — способ использования слабостей.'
  },
  {
    code: '3',
    icon: '♛',
    title: 'Давление, захват',
    text: 'Давление, захват пространства, пунктов, линий, диагоналей, создание матовой сети.'
  }
];

const MOTIFS = [
  {
    code: '2.1',
    icon: '♟',
    title: 'Жертва',
    text: 'Способ с помощью отдачи материала получить оптимальные возможности для атаки, для создания угроз, для использования слабостей противника или для защиты собственных слабостей.'
  },
  {
    code: '2.2',
    icon: '♛',
    title: 'Отвлечение',
    text: 'Способ отвлечь фигуру соперника от защиты важного поля или фигуры.'
  },
  {
    code: '2.3',
    icon: '♞',
    title: 'Завлечение',
    text: 'Способ создания объекта для атаки путём принуждения фигуры или короля соперника занять невыгодное положение.'
  },
  {
    code: '2.4',
    icon: '♜',
    title: 'Устранение защиты',
    text: 'Способ создания слабостей путём отвлечения, размена, устранения фигур соперника, изменения пешечной структуры соперника для ослабления защиты позиции короля или важных пунктов, линий, диагоналей.'
  },
  {
    code: '2.5',
    icon: '♝',
    title: 'Освобождение поля',
    text: 'Отход фигуры с поля для совершения выгодного манёвра другой фигурой через это (или на это) поле.'
  },
  {
    code: '2.6',
    icon: '♗',
    title: 'Связка',
    text: 'Угроза дальнобойной фигурой (слон, ладья, ферзь) королю соперника через любую его фигуру.'
  },
  {
    code: '2.7',
    icon: '♘',
    title: 'Вилка',
    text: 'Одновременное нападение на две фигуры соперника любой фигурой или пешкой.'
  },
  {
    code: '2.8',
    icon: '♚',
    title: 'Незащищённая фигура',
    text: 'Фигура соперника, которую в данный момент никто не защищает, — на неё можно напасть без риска размена.'
  },
  {
    code: '2.9',
    icon: '♖',
    title: 'Рентген',
    text: 'Способ использования дальнобойной фигуры (слон, ладья, ферзь) для нападения или защиты через фигуру любого цвета, стоящую на линии или диагонали в направлении действия дальнобойной фигуры.'
  },
  {
    code: '2.10',
    icon: '♕',
    title: 'Вскрытое (открытое) нападение',
    text: 'Способ, при котором на линии или диагонали действия дальнобойной фигуры стоит любая фигура или пешка того же цвета, которая своим ходом открывает угрозу от дальнобойной фигуры для нападения на поле, фигуру или короля соперника.'
  }
];

const EXAMPLE_BY_MOTIF = Object.fromEntries(MOTIF_EXAMPLES.map(ex => [ex.motif, ex]));
const EXAMPLE_BY_WAY = Object.fromEntries(WAY_EXAMPLES.map(ex => [ex.way, ex]));

function ExamplePanel({example, title}) {
  const flipped = example.turn === 'b';
  return (
    // Тот же приём вёрстки, что у настоящей панели тренажёра (TrainerPanel):
    // тёмная зона под доску слева и светлая зона с текстом справа, только без
    // интерактива — это иллюстрация решения, а не отдельное задание.
    <div className="rounded-2xl border border-panel-line bg-panel overflow-hidden">
      <div className="grid sm:grid-cols-[.95fr_1.05fr]">
        <div className="flex items-center justify-center p-4 sm:p-6 bg-panel-deep">
          <BoardFrame flipped={flipped} coordClassName="text-faint" className="w-full max-w-[300px]">
            <Board large position={example.position} flipped={flipped} label={`Пример на мотив «${title}»`} />
          </BoardFrame>
        </div>
        <div className="flex flex-col justify-center p-5 sm:p-6">
          <span className="text-[10px] uppercase tracking-[.14em] font-extrabold text-accent">
            {flipped ? 'Ход чёрных' : 'Ход белых'}
          </span>
          <p className="text-[13px] text-ink leading-[1.6] mt-2.5">{example.note}</p>
          <div className="mt-4 pt-4 border-t border-panel-line">
            <span className="block text-[9px] uppercase tracking-[.1em] text-faint mb-2">Решение</span>
            <div className="grid grid-cols-[max-content_max-content] gap-x-4 gap-y-1.5 font-display text-[13px] sm:text-sm font-bold">
              {example.steps.map((step, si) => (
                <Fragment key={si}>
                  <b>
                    <MoveText
                      move={step.player}
                      before={positionFromFen(step.player.beforeFen)}
                      beforeFen={step.player.beforeFen}
                      prefix={`${si + 1}. `}
                    />
                  </b>
                  <i className="not-italic text-muted">
                    {step.reply ? (
                      <MoveText move={step.reply} before={positionFromFen(step.reply.beforeFen)} beforeFen={step.reply.beforeFen} />
                    ) : (
                      '—'
                    )}
                  </i>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Один «раздел/мотив» — карточка-аккордеон: номер, иконка, заголовок,
// определение и (если есть) разобранный пример под ним. Используется и для
// трёх верхнеуровневых разделов, и для десяти мотивов внутри раздела 2 — тот
// же вид, только у раздела 2 вместо примера показан вложенный список мотивов
// через children.
function TaskAccordion({code, icon, title, text, example, nested, children, large}) {
  return (
    <details className="group rounded-[16px] border border-line bg-surface open:border-line-strong transition duration-200">
      <summary className="flex items-center gap-3.5 cursor-pointer select-none px-5 py-4 list-none">
        <span className={`shrink-0 text-[11px] font-bold text-subtle ${large ? 'w-7' : 'w-11'}`}>{code}</span>
        <span
          className={`shrink-0 grid place-items-center rounded-[11px] bg-paper leading-none ${
            large ? 'w-11 h-11 text-2xl' : 'w-9 h-9 text-lg'
          }`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className={`font-display tracking-[-.02em] flex-1 ${large ? 'text-lg' : 'text-[15px]'}`}>{title}</span>
        <span className="plus-pulse shrink-0 text-muted transition-transform duration-200 group-open:rotate-45 text-lg leading-none">
          +
        </span>
      </summary>
      <div className="px-5 pb-5">
        <p className={`text-muted leading-[1.6] mb-4 ${nested ? 'text-[13px]' : 'text-sm'}`}>
          {text}
        </p>
        {example && (
          <div className="mb-1">
            <ExamplePanel example={example} title={title} />
          </div>
        )}
        {children}
      </div>
    </details>
  );
}

export function DynamicsPrinciples({backLink}) {
  // Используется только на /metodika (MetodikaPage) — там страница уже
  // начинается со ссылки «На главную», поэтому верхний отступ секции меньше
  // обычного sectionPad, чтобы контент не проваливался вниз экрана.
  // backLink передаётся снаружи (MetodikaPage) и рендерится прямо над
  // подписью «Методика курса» — так «На главную» выглядит частью блока,
  // а не отдельной плашкой над секцией.
  return (
    <section className={`bg-paper pt-6 sm:pt-9 pb-[74px] sm:pb-[104px]`} id="dynamics">
      <div className={container}>
        <Reveal>
          {backLink && <div className="mb-3.5">{backLink}</div>}
          <SectionIntro
            split
            label="Методика курса"
            title="Как устроена шахматная динамика."
            note="Отработке изложенных ниже способов и посвящён курс — задачи подобраны так, чтобы каждый мотив был понят на конкретном примере, а не заучен как термин."
          />
        </Reveal>

        <Reveal delay>
          <blockquote className="max-w-[760px] font-display text-[19px] sm:text-[23px] leading-[1.35] tracking-[-.03em] mb-10 pl-5 border-l-2 border-accent">
            «Шахматы — темповая игра на опережение (на инициативу) в создании и использовании слабостей с целью
            активных действий (атаки) для достижения мата или решающего материального перевеса.»
            <footer className="mt-2.5 text-[11px] font-sans font-bold text-muted not-italic">От авторов курса</footer>
          </blockquote>
        </Reveal>

        <Reveal>
          <p className="max-w-[760px] text-sm text-muted leading-[1.7] mb-10">
            Главный принцип шахматной динамики — оценка слабостей, создание и использование слабостей с помощью
            взаимодействия фигур и пешек. Способы создания слабостей — незащищённые поля, поля, контроль над
            которыми затруднён, ослаблен, поля в лагере соперника, которые можно беспрепятственно занять фигурой,
            или поля, фигуры, на которые можно осуществить нападение с применением тактических мотивов:
          </p>
        </Reveal>

        <div className="grid gap-2.5">
          <Reveal>
            <TaskAccordion large {...SECTIONS[0]} example={EXAMPLE_BY_WAY[SECTIONS[0].code]} />
          </Reveal>

          <Reveal delay>
            <TaskAccordion large {...SECTIONS[1]}>
              <div className="grid gap-2.5">
                {MOTIFS.map((motif, i) => (
                  <Reveal key={motif.code} delay={i % 2 === 1} as="div">
                    <TaskAccordion {...motif} example={EXAMPLE_BY_MOTIF[motif.code]} nested />
                  </Reveal>
                ))}
              </div>
            </TaskAccordion>
          </Reveal>

          <Reveal>
            <TaskAccordion large {...SECTIONS[2]} example={EXAMPLE_BY_WAY[SECTIONS[2].code]} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

import {Reveal} from './Reveal.jsx';
import {Button, SectionIntro, container, sectionPad} from './ui.jsx';

// Короткая версия «Методики курса» для лендинга — полный раздел (цитата,
// 10 тактических мотивов с досками-примерами) живёт на отдельной странице
// /metodika, см. MetodikaPage.jsx. Вынесено туда, потому что материала там
// стало заметно больше картинок и текста, чем помещается в один блок
// лендинга без утяжеления страницы (см. DynamicsPrinciples.jsx — тот же
// набор карточек, просто без раскрывающегося списка мотивов и досок).
const WAYS = [
  ['♞', 'Активные фигуры', 'Контроль центра и перевес в силах на нужном участке доски.'],
  ['♜', 'Угроза слабостям', 'Линии, поля и диагонали для атаки — с помощью тактических мотивов.'],
  ['♛', 'Давление, захват', 'Захват пространства и создание матовой сети вокруг короля.']
];

export function DynamicsTeaser() {
  return (
    <section className={`bg-paper ${sectionPad}`} id="dynamics">
      <div className={container}>
        <Reveal>
          <SectionIntro
            split
            label="Методика курса"
            title="Как устроена шахматная динамика."
            note="Полная методика — 10 тактических мотивов с определениями и разобранными позициями из практики авторов курса."
          />
        </Reveal>

        <Reveal delay>
          <blockquote className="max-w-[760px] font-display text-[19px] sm:text-[23px] leading-[1.35] tracking-[-.03em] mb-8 pl-5 border-l-2 border-accent">
            «Шахматы — темповая игра на опережение (на инициативу) в создании и использовании слабостей с целью
            активных действий (атаки) для достижения мата или решающего материального перевеса.»
            <footer className="mt-2.5 text-[11px] font-sans font-bold text-muted not-italic">От авторов курса</footer>
          </blockquote>
        </Reveal>

        <div className="grid gap-3.5 sm:grid-cols-3 mb-8">
          {WAYS.map(([icon, title, text], i) => (
            <Reveal
              key={title}
              delay={i > 0}
              as="article"
              className="rounded-[22px] border border-line bg-surface p-6"
            >
              <div className="grid place-items-center w-[46px] h-[46px] mb-5 rounded-[14px] bg-bg text-ink text-[22px] leading-none">
                {icon}
              </div>
              <h3 className="font-display text-lg tracking-[-.03em] mb-2">{title}</h3>
              <p className="text-xs text-muted leading-[1.6]">{text}</p>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <Button href="/metodika/">
            Читать методику целиком <span>↗</span>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

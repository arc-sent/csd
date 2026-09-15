import {TrainerPanel} from './TrainerPanel.jsx';
import {SectionIntro, container, sectionPad} from './ui.jsx';
import {LEVEL} from '../data/level.js';

// Демо-секция лендинга: тот же самый тренажёр, что и в кабинете, но на
// показательном уровне из src/data/level.js — здесь он нужен неоплатившим,
// поэтому мок остаётся.
export function Demo({notify}) {
  return (
    <section className={`bg-dark text-on-dark ${sectionPad}`} id="demo">
      <div className={container}>
        <SectionIntro
          split
          label="Интерфейс"
          title="Попробуй тренажёр: демо-задача на интерактивной доске."
          note="Интерактивная шахматная доска, задача, обратная связь и управление. Весь фокус остаётся на позиции."
          className="[&_.text-muted]:text-[#95968f] [&_span]:text-[#c0c1ba]"
        />

        <TrainerPanel
          level={LEVEL}
          notify={notify}
          title={LEVEL.name}
          subtitle="Найди тактический ресурс в 2 хода."
        />
      </div>
    </section>
  );
}

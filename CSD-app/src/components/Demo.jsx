import {useState} from 'react';
import {TrainerPanel} from './TrainerPanel.jsx';
import {SectionIntro, container, sectionPad} from './ui.jsx';
import {KNOWN_GAMES} from '../data/knownGames.js';

const DIFFICULTY = {easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная'};

const TASKS = KNOWN_GAMES.map((game, index) => ({
  id: game.id,
  level: game,
  index: index + 1,
  subtitle: game.opening,
  meta: [DIFFICULTY[game.difficulty] || game.difficulty, game.category].filter(Boolean).join(' · ')
}));

export function Demo({notify}) {
  const [activeId, setActiveId] = useState(TASKS[0].id);
  const [solvedIds, setSolvedIds] = useState(() => new Set());
  const position = TASKS.findIndex(task => task.id === activeId);
  const active = TASKS[position] || TASKS[0];
  const prev = position > 0 ? TASKS[position - 1] : null;
  const next = position < TASKS.length - 1 ? TASKS[position + 1] : null;

  const navBtn =
    'inline-flex items-center justify-center min-h-[46px] px-4 rounded-xl border text-xs font-extrabold transition duration-200 border-[#3a3c37] enabled:hover:border-[#5a5c56] disabled:opacity-35';

  return (
    <section className={`bg-dark text-on-dark ${sectionPad}`} id="demo">
      <div className={container}>
        <SectionIntro
          split
          label="Интерфейс"
          title="Так выглядит решение задач в личном кабинете."
          note="Интерактивная шахматная доска, задача, обратная связь и управление — тот же тренажёр, что открывается после оплаты."
          className="[&_.text-muted]:text-[#95968f] [&_span]:text-[#c0c1ba]"
        />

        <div className="grid gap-2.5 mb-5">
          {TASKS.map(task => (
            <div
              key={task.id}
              onClick={() => setActiveId(task.id)}
              className={`flex items-center gap-4 rounded-[18px] border px-5 py-4 cursor-pointer transition duration-200 hover:-translate-y-0.5 ${
                task.id === active.id
                  ? 'border-accent bg-[rgba(255,107,45,.08)]'
                  : 'border-[#3a3c37] bg-[#1c1d1a] hover:border-[#5a5c56]'
              }`}
            >
              <span className="font-display text-[15px] tracking-[-.03em] text-[#8f9189] w-8 shrink-0">
                {String(task.index).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[16px] leading-[1.2] tracking-[-.02em] truncate">{task.level.name}</h3>
                <p className="text-[11px] text-[#8f9189] mt-0.5 truncate">{task.subtitle}</p>
                {task.meta && <p className="text-[11px] text-[#8f9189] mt-0.5">{task.meta}</p>}
              </div>
              <span
                className={`grid place-items-center w-7 h-7 rounded-full shrink-0 text-[12px] font-extrabold ${
                  solvedIds.has(task.id)
                    ? 'bg-[rgba(255,107,45,.18)] text-accent'
                    : task.id === active.id
                      ? 'border border-accent text-accent'
                      : 'border border-[#3a3c37] text-[#8f9189]'
                }`}
                aria-label={solvedIds.has(task.id) ? 'Решено' : undefined}
              >
                {solvedIds.has(task.id) ? '✓' : task.id === active.id ? '●' : ''}
              </span>
            </div>
          ))}
        </div>

        <TrainerPanel
          key={active.id}
          level={active.level}
          notify={notify}
          title={`Задача ${String(active.index).padStart(2, '0')} · ${active.level.name}`}
          subtitle={active.subtitle}
          onSolved={() => setSolvedIds(prev => (prev.has(active.id) ? prev : new Set(prev).add(active.id)))}
        />

        <div className="grid grid-cols-2 gap-2.5 mt-6">
          <button type="button" className={navBtn} disabled={!prev} onClick={() => prev && setActiveId(prev.id)}>
            ← Предыдущая
          </button>
          <button type="button" className={navBtn} disabled={!next} onClick={() => next && setActiveId(next.id)}>
            Следующая →
          </button>
        </div>
      </div>
    </section>
  );
}

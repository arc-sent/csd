import {SectionIntro} from '../ui.jsx';

const DIFFICULTY = {easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная'};

function LevelRow({level, onOpen}) {
  const clickable = level.supported;
  return (
    <div
      onClick={clickable ? () => onOpen(level) : undefined}
      className={`flex items-center gap-4 rounded-[18px] border border-line bg-surface px-5 py-4 transition duration-200 ${
        clickable
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lift hover:border-line-strong'
          : 'opacity-60'
      }`}
    >
      <span className="font-display text-[15px] tracking-[-.03em] text-subtle w-8 shrink-0">
        {String(level.index).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[16px] leading-[1.2] tracking-[-.02em] truncate">{level.name}</h3>
        {level.description && <p className="text-[11px] text-faint mt-0.5 truncate">{level.description}</p>}
        <p className="text-[11px] text-faint mt-0.5">
          {DIFFICULTY[level.difficulty] || level.difficulty}
          {level.category ? ` · ${level.category}` : ''}
          {!level.supported && level.unsupportedReason ? ` · ${level.unsupportedReason}` : ''}
        </p>
      </div>
      <span
        className={`grid place-items-center w-7 h-7 rounded-full shrink-0 text-[12px] font-extrabold ${
          level.solved ? 'bg-accent-soft text-accent-strong' : 'border border-line text-subtle'
        }`}
        aria-label={level.solved ? 'Решено' : 'Не решено'}
      >
        {level.solved ? '✓' : ''}
      </span>
    </div>
  );
}

export function AssignmentLevels({assignment, levels, onOpenLevel, onBack}) {
  const solved = levels.filter(l => l.solved).length;

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center min-h-[38px] px-4 mb-6 rounded-xl border border-line bg-fill text-xs font-extrabold transition duration-200 hover:border-ink hover:bg-fill-hover"
      >
        ← Ко всем заданиям
      </button>

      <SectionIntro
        label={`Решено ${solved} из ${levels.length}`}
        title={assignment.name}
        note={assignment.description || undefined}
        split
      />

      <div className="grid gap-2.5">
        {levels.map(level => (
          <LevelRow key={level.id} level={level} onOpen={onOpenLevel} />
        ))}
      </div>
    </>
  );
}

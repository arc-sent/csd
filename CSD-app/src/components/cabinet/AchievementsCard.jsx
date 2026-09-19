import {useEffect, useRef} from 'react';
import {label} from '../ui.jsx';

const ICONS = {
  'first-solve': '♟️',
  'assignment-done': '📘',
  'stage-done': '🏁',
  'streak-week': '🔥',
  'streak-month': '🗓️',
  'flawless-10': '💎',
  'accurate-100': '🎯',
  marathon: '⚡'
};

const formatDate = value =>
  new Intl.DateTimeFormat('ru-RU', {day: 'numeric', month: 'long'}).format(new Date(value));

export function AchievementsCard({achievements, onSeen}) {
  const seenSent = useRef(false);
  const hasNew = Boolean(achievements && achievements.some(a => a.isNew));

  useEffect(() => {
    if (!hasNew || seenSent.current) return;
    seenSent.current = true;
    onSeen?.().catch(() => {});
  }, [hasNew, onSeen]);

  if (!achievements || achievements.length === 0) return null;
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <span className={`${label} text-subtle`}>Достижения</span>
          <h2 className="font-display text-[24px] leading-[1.1] tracking-[-.04em] mt-2.5">
            Есть за что себя похвалить.
          </h2>
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full bg-paper border border-line text-[10px] font-extrabold text-faint px-3 py-[7px]">
          {unlockedCount} из {achievements.length}
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {achievements.map(a => (
          <div
            key={a.key}
            className={`relative flex flex-col rounded-[18px] border p-5 ${
              a.unlocked ? 'border-line bg-paper' : 'border-dashed border-line bg-transparent'
            } ${a.isNew ? 'ring-2 ring-accent' : ''}`}
          >
            {a.isNew && (
              <span className="absolute -top-2 right-4 inline-flex items-center rounded-full bg-accent text-on-accent text-[9px] font-extrabold uppercase tracking-[.08em] px-2 py-[3px]">
                Новое
              </span>
            )}

            <div className="flex items-center justify-between gap-3 mb-4">
              <span
                className={`grid place-items-center w-11 h-11 rounded-[14px] text-[19px] ${
                  a.unlocked ? 'bg-invert' : 'bg-paper grayscale opacity-45'
                }`}
              >
                {ICONS[a.key] || '★'}
              </span>
              {a.unlocked ? (
                <span className="inline-flex items-center rounded-full bg-invert text-invert-fg text-[9px] font-extrabold uppercase tracking-[.08em] px-2.5 py-[5px]">
                  ✓ Получено
                </span>
              ) : (
                <span className="text-[11px] font-extrabold text-faint">{a.progress}%</span>
              )}
            </div>

            <strong className="block font-display text-[15px] leading-[1.2] tracking-[-.02em] mb-1.5">
              {a.title}
            </strong>
            <small className="block text-[11px] leading-[1.5] text-faint mb-4">{a.description}</small>

            <div className="mt-auto">
              {a.unlocked && a.unlockedAt && (
                <span className="block text-[10px] text-subtle mb-2">{formatDate(a.unlockedAt)}</span>
              )}
              <div className="h-1 rounded bg-line overflow-hidden">
                <i
                  className={`block h-full transition-[width] duration-[400ms] ${
                    a.unlocked ? 'bg-invert' : 'bg-accent'
                  }`}
                  style={{width: `${a.progress}%`}}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

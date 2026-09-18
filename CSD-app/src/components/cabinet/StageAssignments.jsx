import {Reveal} from '../Reveal.jsx';
import {SectionIntro} from '../ui.jsx';
import {plural} from '../../lib/plural.js';

// Одна высота у купленной карточки и у карточки покупки: в общей сетке ряд
// иначе получается рваным, когда у части заданий нет описания.
const CARD_BASE = 'relative flex flex-col min-h-[268px] rounded-[22px] p-6 transition duration-200';

// Фигура на карточке — чистая декорация: в модели Assignment такого поля нет,
// берём по кругу, чтобы соседние карточки не повторялись (тот же приём, что в
// AssignmentCarousel).
const PIECE_ROTATION = ['wN', 'bQ', 'wB', 'bR', 'bK', 'wR', 'bN', 'wK', 'bB', 'wP', 'wQ', 'bP'];

function statusPill(solved, total) {
  if (total > 0 && solved >= total) return {text: '✓ Завершено', className: 'bg-invert text-invert-fg'};
  if (solved > 0) return {text: 'В процессе', className: 'bg-accent-soft text-accent-strong'};
  return {text: 'Не начато', className: 'bg-paper text-faint border border-line'};
}

function PieceBadge({piece, muted}) {
  return (
    <div className={`grid place-items-center w-11 h-11 rounded-[14px] mb-[18px] ${muted ? 'bg-paper' : 'bg-bg'}`}>
      <img
        src={`${import.meta.env.BASE_URL}pieces/${piece}.png`}
        alt=""
        draggable="false"
        loading="lazy"
        className={`w-7 h-7 object-contain object-bottom select-none [-webkit-user-drag:none] ${muted ? 'opacity-50' : ''}`}
      />
    </div>
  );
}

function OwnedCard({assignment, index, onOpen}) {
  const piece = PIECE_ROTATION[index % PIECE_ROTATION.length];
  const total = assignment.levelsCount;
  const solved = assignment.solvedCount;
  const percent = total > 0 ? Math.round((solved / total) * 100) : 0;
  const pill = statusPill(solved, total);

  return (
    <article
      onClick={() => onOpen(assignment)}
      className={`${CARD_BASE} border border-line bg-surface cursor-pointer hover:-translate-y-1 hover:shadow-lift hover:border-line-strong`}
    >
      <span className="absolute right-5 top-5 text-[10px] text-subtle">
        {String(index + 1).padStart(2, '0')}
      </span>
      <PieceBadge piece={piece} />
      <h3 className="font-display text-[19px] leading-[1.15] tracking-[-.03em] mb-2">{assignment.name}</h3>
      <p className="text-[13px] leading-[1.6] text-muted mb-4">
        {assignment.description || 'Задание курса'}
      </p>

      <div className="mt-auto">
        <div className="flex items-center justify-between text-[11px] text-muted mb-1.5">
          <span>
            решено {solved} из {total}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-[5px] text-[9px] font-extrabold uppercase tracking-[.06em] ${pill.className}`}>
            {pill.text}
          </span>
        </div>
        <div className="h-1 rounded bg-line overflow-hidden">
          <i className="block h-full bg-accent transition-[width] duration-[400ms]" style={{width: `${percent}%`}} />
        </div>
      </div>
    </article>
  );
}

function BuyCard({assignment, index, onBuy}) {
  const piece = PIECE_ROTATION[index % PIECE_ROTATION.length];
  return (
    <article className={`${CARD_BASE} border border-dashed border-line bg-paper hover:border-line-strong`}>
      <span className="absolute right-5 top-5 text-[10px] text-subtle">
        {String(index + 1).padStart(2, '0')}
      </span>
      <PieceBadge piece={piece} muted />
      <h3 className="font-display text-[19px] leading-[1.15] tracking-[-.03em] mb-2">{assignment.name}</h3>
      <p className="text-[13px] leading-[1.6] text-muted mb-4">{assignment.tasksCount} задач</p>

      <div className="mt-auto">
        <div className="flex items-baseline gap-1.5 mb-3">
          <b className="font-display text-[20px] tracking-[-.04em]">{assignment.price.toLocaleString('ru-RU')} ₽</b>
        </div>
        <button
          type="button"
          onClick={() => onBuy(assignment)}
          className="inline-flex w-full items-center justify-center min-h-[42px] px-4 rounded-xl text-xs font-extrabold border border-line-strong bg-fill transition duration-200 hover:border-ink hover:bg-fill-hover"
        >
          Купить
        </button>
      </div>
    </article>
  );
}

function StatChip({value, text}) {
  return (
    <div className="flex-1 min-w-[140px] rounded-2xl border border-line bg-surface px-5 py-4">
      <b className="block font-display text-[22px] tracking-[-.04em] leading-none">{value}</b>
      <span className="block text-[10px] uppercase tracking-[.08em] text-faint mt-2">{text}</span>
    </div>
  );
}

/**
 * Витрина выбранного этапа: купленные задания (с прогрессом) и некупленные
 * (с ценой и кнопкой «Купить») в одной сетке — так докупка следующего
 * задания не отдельный баннер, а естественное продолжение списка.
 */
export function StageAssignments({stageName, assignments, owned, stats, badge, onOpen, onBuy}) {
  const remaining = assignments.filter(a => !owned.has(a.id));
  const remainingTotal = remaining.reduce((sum, a) => sum + a.price, 0);
  const ownedCount = assignments.length - remaining.length;
  const note =
    remaining.length > 0
      ? `Осталось ${remaining.length} ${plural(remaining.length, ['задание', 'задания', 'заданий'])} · ${remainingTotal.toLocaleString('ru-RU')} ₽ — купить можно прямо здесь, кнопкой на карточке.`
      : 'Доступ сохраняется за аккаунтом: заходите с любого устройства, прогресс не потеряется.';

  return (
    <>
      {/* relative z-30: Reveal создаёт собственный слой (opacity/transform), и
          без явного z-index следующие блоки (плитки, сетка карточек — тоже
          Reveal/transform) перекрывали выпадающий список этапов, обрезая его. */}
      <Reveal className="relative z-30">
        <SectionIntro
          badge={badge}
          // Когда есть переключатель, он и работает подписью секции: этап
          // назван на нём, а вторая строка рядом только ломала бы вёрстку на
          // узком экране.
          label={badge ? undefined : stageName || 'Этап'}
          title="Мои задания"
          note={note}
          split
          spacing="mb-7"
        />
      </Reveal>
      {stats && (
        <Reveal>
          <div className="flex flex-wrap gap-2.5 mb-8">
            <StatChip value={stats.totalSolved} text="решено задач" />
            <StatChip value={stats.accuracy === null ? '—' : `${stats.accuracy}%`} text="точность" />
            <StatChip value={`${ownedCount} из ${assignments.length}`} text="заданий открыто" />
          </div>
        </Reveal>
      )}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment, index) => {
          const purchased = owned.get(assignment.id);
          return purchased ? (
            <OwnedCard key={assignment.id} assignment={purchased} index={index} onOpen={onOpen} />
          ) : (
            <BuyCard key={assignment.id} assignment={assignment} index={index} onBuy={onBuy} />
          );
        })}
      </div>
    </>
  );
}

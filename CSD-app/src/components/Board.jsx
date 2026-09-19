import {PIECE_ART, FILES} from '../lib/chess.js';

const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const INDEXES = [0, 1, 2, 3, 4, 5, 6, 7];
const order = flipped => (flipped ? [...INDEXES].reverse() : INDEXES);

function Piece({piece}) {
  const art = PIECE_ART[piece];
  if (!art) return null;
  return (
    <img
      className="piece"
      src={`${import.meta.env.BASE_URL}pieces/${art[0]}.png`}
      alt={art[1]}
      draggable={false}
    />
  );
}

export function Board({
  position,
  flipped = false,
  large = false,
  interactive = false,
  locked = false,
  selected = null,
  targets = [],
  lastMove = null,
  hintFrom = null,
  movable = [],
  boardRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  label
}) {
  const isTarget = (r, c) => targets.some(([tr, tc]) => tr === r && tc === c);
  const isLastMove = (r, c) =>
    lastMove &&
    ((lastMove.from[0] === r && lastMove.from[1] === c) ||
      (lastMove.to[0] === r && lastMove.to[1] === c));

  return (
    <div
      ref={boardRef}
      className={['board', large && 'large', interactive && 'interactive', locked && 'locked']
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {order(flipped).map(r =>
        order(flipped).map(c => {
          const piece = position[r][c];
          const classes = ['square', (r + c) % 2 === 0 ? 'light' : 'dark'];
          if (interactive && !locked && movable.some(([mr, mc]) => mr === r && mc === c)) {
            classes.push('movable');
          }
          if (selected && selected[0] === r && selected[1] === c) classes.push('selected');
          if (isLastMove(r, c)) classes.push('last-move');
          if (isTarget(r, c)) {
            classes.push('target');
            if (piece) classes.push('capture');
          }
          if (hintFrom && hintFrom[0] === r && hintFrom[1] === c) classes.push('hint-from');

          return (
            <div key={`${r}-${c}`} className={classes.join(' ')} data-r={r} data-c={c}>
              <Piece piece={piece} />
            </div>
          );
        })
      )}
    </div>
  );
}

export function BoardFrame({children, className = '', coordClassName = '', flipped = false}) {
  const coord = `grid place-items-center font-display font-bold select-none ${coordClassName}`;
  const ranks = flipped ? [...RANKS].reverse() : RANKS;
  const files = flipped ? FILES.split('').reverse() : FILES.split('');
  return (
    <div
      className={`grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_auto] content-start gap-[6px] sm:gap-[9px] ${className}`}
    >
      <div className={`${coord} grid-rows-8 w-[14px] sm:w-[18px] text-[11px] sm:text-[13px]`} aria-hidden="true">
        {ranks.map(rank => (
          <span key={rank}>{rank}</span>
        ))}
      </div>
      {children}
      <div
        className={`${coord} col-start-2 grid-cols-8 text-[11px] sm:text-[13px]`}
        aria-hidden="true"
      >
        {files.map(file => (
          <span key={file}>{file}</span>
        ))}
      </div>
    </div>
  );
}

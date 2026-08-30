import {PIECE_ART, FILES} from '../lib/chess.js';

const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

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
  large = false,
  interactive = false,
  locked = false,
  selected = null,
  targets = [],
  lastMove = null,
  hintFrom = null,
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
      {position.map((row, r) =>
        row.map((piece, c) => {
          const classes = ['square', (r + c) % 2 === 0 ? 'light' : 'dark'];
          if (interactive && !locked && PIECE_ART[piece] && '♙♖♘♗♕♔'.includes(piece)) {
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

/** Доска с буквенно-цифровыми координатами по краям (ТЗ 4.3). */
export function BoardFrame({children, className = '', coordClassName = ''}) {
  const coord = `grid place-items-center font-display font-bold select-none ${coordClassName}`;
  return (
    <div
      className={`grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_auto] content-start gap-[6px] sm:gap-[9px] ${className}`}
    >
      <div className={`${coord} grid-rows-8 w-[14px] sm:w-[18px] text-[11px] sm:text-[13px]`} aria-hidden="true">
        {RANKS.map(rank => (
          <span key={rank}>{rank}</span>
        ))}
      </div>
      {children}
      <div
        className={`${coord} col-start-2 grid-cols-8 text-[11px] sm:text-[13px]`}
        aria-hidden="true"
      >
        {FILES.split('').map(file => (
          <span key={file}>{file}</span>
        ))}
      </div>
    </div>
  );
}

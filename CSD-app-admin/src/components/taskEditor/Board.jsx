import { PIECE_ART } from '../../lib/pieceArt.js';
import { isWhite } from '../../lib/board.js';

export default function Board({
  position,
  orientation = 'white',
  extraClassName = '',
  squareClassName,
  onSquareClick,
  onSquareDrop,
  onPieceDragStart,
  ariaLabel
}) {
  const cells = [];
  for (let dr = 0; dr < 8; dr++) {
    for (let dc = 0; dc < 8; dc++) {
      const [r, c] = orientation === 'white' ? [dr, dc] : [7 - dr, 7 - dc];
      const piece = position[r][c];
      const art = PIECE_ART[piece];
      const extra = squareClassName ? squareClassName(r, c) : '';
      cells.push(
        <div
          key={r + '-' + c}
          className={'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark') + (extra ? ' ' + extra : '')}
          data-r={r}
          data-c={c}
          onClick={onSquareClick ? () => onSquareClick(r, c) : undefined}
          onDragOver={onSquareDrop ? e => e.preventDefault() : undefined}
          onDrop={onSquareDrop ? e => { e.preventDefault(); onSquareDrop(r, c, e.dataTransfer.getData('text/plain')); } : undefined}
        >
          {art && (
            <img
              className={'piece ' + (isWhite(piece) ? 'white' : 'black')}
              src={import.meta.env.BASE_URL + 'pieces/' + art[0] + '.png'}
              alt={art[1]}
              draggable={Boolean(onPieceDragStart)}
              onDragStart={onPieceDragStart ? e => onPieceDragStart(e, r, c) : undefined}
            />
          )}
        </div>
      );
    }
  }
  return <div className={('board ' + extraClassName).trim()} aria-label={ariaLabel}>{cells}</div>;
}

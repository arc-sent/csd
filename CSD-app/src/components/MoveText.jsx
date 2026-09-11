import {pieceEmoji, squareName} from '../lib/chess.js';

// Подпись хода «эмодзи откуда–куда» — эмодзи рендерится отдельным <span>
// с увеличенным шрифтом (.piece-emoji, index.css), иначе теряется рядом с
// текстом координат. before — позиция ДО хода (после хода клетка "откуда"
// уже пуста, поэтому фигуру ищем по позиции до хода). Аналог MoveLabel.jsx
// из CSD-app-admin.
export function MoveText({move, before, prefix = ''}) {
  if (!move) return null;
  const piece = before ? pieceEmoji(before[move.from[0]][move.from[1]]) : '';
  const arrow = squareName(move.from[0], move.from[1]) + '–' + squareName(move.to[0], move.to[1]);
  return (
    <>
      {prefix}
      {piece && <span className="piece-emoji">{piece}</span>}
      {piece && ' '}
      {arrow}
    </>
  );
}

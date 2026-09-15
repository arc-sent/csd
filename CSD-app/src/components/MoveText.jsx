import {pieceEmoji, sanFor, squareName} from '../lib/chess.js';

// Подпись хода «эмодзи + нотация» — эмодзи рендерится отдельным <span>
// с увеличенным шрифтом (.piece-emoji, index.css), иначе теряется рядом с
// текстом координат. before — позиция ДО хода (после хода клетка "откуда"
// уже пуста, поэтому фигуру ищем по позиции до хода). beforeFen — та же
// позиция, но в FEN: по ней chess.js считает настоящую алгебраическую
// нотацию (x/=/+/#), а не просто "откуда-куда". Без beforeFen (не должно
// происходить в реальных сценариях) — запасной вариант координатной
// стрелкой. Аналог MoveLabel.jsx из CSD-app-admin.
export function MoveText({move, before, beforeFen, prefix = ''}) {
  if (!move) return null;
  const piece = before ? pieceEmoji(before[move.from[0]][move.from[1]]) : '';
  const san = beforeFen ? sanFor(beforeFen, move) : null;
  const arrow = san || squareName(move.from[0], move.from[1]) + '–' + squareName(move.to[0], move.to[1]);
  return (
    <>
      {prefix}
      {piece && <span className="piece-emoji">{piece}</span>}
      {piece && ' '}
      {arrow}
    </>
  );
}

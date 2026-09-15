import { moveLabelParts } from '../../lib/solutionNotation.js';

// Подпись хода «эмодзи откуда → куда» — эмодзи рендерится отдельным <span>
// с увеличенным шрифтом (.piece-emoji, index.css), иначе он теряется рядом
// с текстом клеток.
export default function MoveLabel({ move, before, beforeFen }) {
  const { piece, arrow } = moveLabelParts(move, before, beforeFen);
  if (!piece) return arrow;
  return <><span className="piece-emoji">{piece}</span> {arrow}</>;
}

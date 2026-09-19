import {pieceEmoji, sanFor, squareName} from '../lib/chess.js';

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

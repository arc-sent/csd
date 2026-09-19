import { moveLabelParts } from '../../lib/solutionNotation.js';

export default function MoveLabel({ move, before, beforeFen }) {
  const { piece, arrow } = moveLabelParts(move, before, beforeFen);
  if (!piece) return arrow;
  return <><span className="piece-emoji">{piece}</span> {arrow}</>;
}

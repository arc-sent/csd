const WHITE_PIECES = '♙♖♘♗♕♔';
const BLACK_PIECES = '♟♜♞♝♛♚';

const isSquare = value =>
  Array.isArray(value) && value.length === 2 && value.every(n => Number.isInteger(n) && n >= 0 && n <= 7);

const isMove = move => Boolean(move) && isSquare(move.from) && isSquare(move.to);

function isValidPosition(position) {
  return (
    Array.isArray(position) &&
    position.length === 8 &&
    position.every(
      row =>
        Array.isArray(row) &&
        row.length === 8 &&
        row.every(cell => cell === '' || WHITE_PIECES.includes(cell) || BLACK_PIECES.includes(cell))
    )
  );
}

function isValidSteps(steps) {
  return (
    Array.isArray(steps) &&
    steps.length > 0 &&
    steps.every(step => step && isMove(step.player) && (step.reply == null || isMove(step.reply)))
  );
}

export function toTrainerLevel(apiLevel) {
  if (!apiLevel || !isValidPosition(apiLevel.position) || !isValidSteps(apiLevel.steps)) return null;
  return {
    ...apiLevel,
    hint: '—',
    progress: [0, 100],
    solvedNote: apiLevel.description || 'Задача решена.'
  };
}

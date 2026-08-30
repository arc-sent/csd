export const FILES = 'abcdefgh';
const WHITE_PIECES = '♙♖♘♗♕♔';

export const isWhite = piece => Boolean(piece) && WHITE_PIECES.includes(piece);
export const squareName = (r, c) => FILES[c] + (8 - r);
export const clone = position => position.map(row => row.slice());
export const moveText = move =>
  squareName(move.from[0], move.from[1]) + '–' + squareName(move.to[0], move.to[1]);

export function applyMove(position, move) {
  const next = clone(position);
  next[move.to[0]][move.to[1]] = next[move.from[0]][move.from[1]];
  next[move.from[0]][move.from[1]] = '';
  return next;
}

// Спрайты фигур: символ позиции -> файл картинки и подпись для screen reader.
export const PIECE_ART = {
  '♙': ['wP', 'белая пешка'],
  '♖': ['wR', 'белая ладья'],
  '♘': ['wN', 'белый конь'],
  '♗': ['wB', 'белый слон'],
  '♕': ['wQ', 'белый ферзь'],
  '♔': ['wK', 'белый король'],
  '♟': ['bP', 'чёрная пешка'],
  '♜': ['bR', 'чёрная ладья'],
  '♞': ['bN', 'чёрный конь'],
  '♝': ['bB', 'чёрный слон'],
  '♛': ['bQ', 'чёрный ферзь'],
  '♚': ['bK', 'чёрный король']
};

// Ходы фигур: базовые правила без рокировки, взятия на проходе и превращения.
const SLIDES = {
  '♖': [[1, 0], [-1, 0], [0, 1], [0, -1]],
  '♗': [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  '♕': [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
};
const KNIGHT_STEPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_STEPS = SLIDES['♕'];
const onBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function legalMoves(position, r, c) {
  const piece = position[r][c];
  if (!piece || !isWhite(piece)) return [];
  const moves = [];
  const free = (rr, cc) => onBoard(rr, cc) && !position[rr][cc];
  const enemy = (rr, cc) => onBoard(rr, cc) && position[rr][cc] && !isWhite(position[rr][cc]);
  const add = (rr, cc) => {
    if (onBoard(rr, cc) && !(position[rr][cc] && isWhite(position[rr][cc]))) moves.push([rr, cc]);
  };

  if (piece === '♙') {
    if (free(r - 1, c)) {
      moves.push([r - 1, c]);
      if (r === 6 && free(r - 2, c)) moves.push([r - 2, c]);
    }
    [c - 1, c + 1].forEach(cc => {
      if (enemy(r - 1, cc)) moves.push([r - 1, cc]);
    });
  } else if (piece === '♘') {
    KNIGHT_STEPS.forEach(([dr, dc]) => add(r + dr, c + dc));
  } else if (piece === '♔') {
    KING_STEPS.forEach(([dr, dc]) => add(r + dr, c + dc));
  } else if (SLIDES[piece]) {
    SLIDES[piece].forEach(([dr, dc]) => {
      let rr = r + dr;
      let cc = c + dc;
      while (onBoard(rr, cc)) {
        if (position[rr][cc]) {
          if (!isWhite(position[rr][cc])) moves.push([rr, cc]);
          break;
        }
        moves.push([rr, cc]);
        rr += dr;
        cc += dc;
      }
    });
  }
  return moves;
}

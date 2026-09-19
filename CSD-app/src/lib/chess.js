import {Chess} from 'chess.js';

export const FILES = 'abcdefgh';
const WHITE_PIECES = '♙♖♘♗♕♔';

export const isWhite = piece => Boolean(piece) && WHITE_PIECES.includes(piece);
export const squareName = (r, c) => FILES[c] + (8 - r);
export const clone = position => position.map(row => row.slice());

export const pieceEmoji = piece => (piece ? piece + '️' : '');

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

const PIECE_TO_FEN = {
  '♙': 'P', '♖': 'R', '♘': 'N', '♗': 'B', '♕': 'Q', '♔': 'K',
  '♟': 'p', '♜': 'r', '♞': 'n', '♝': 'b', '♛': 'q', '♚': 'k'
};
const FEN_TO_PIECE = Object.fromEntries(Object.entries(PIECE_TO_FEN).map(([glyph, fen]) => [fen, glyph]));

const parseSquare = square => [8 - Number(square[1]), FILES.indexOf(square[0])];

function placementToFen(position) {
  return position
    .map(row => {
      let out = '';
      let empty = 0;
      row.forEach(cell => {
        if (!cell) {
          empty += 1;
          return;
        }
        if (empty) {
          out += empty;
          empty = 0;
        }
        out += PIECE_TO_FEN[cell] || '';
      });
      return out + (empty || '');
    })
    .join('/');
}

function castlingToFen(castling) {
  if (!castling) return '-';
  const out =
    (castling.wOO ? 'K' : '') +
    (castling.wOOO ? 'Q' : '') +
    (castling.bOO ? 'k' : '') +
    (castling.bOOO ? 'q' : '');
  return out || '-';
}

export function toFen(level) {
  return [
    placementToFen(level.position),
    level.turn === 'b' ? 'b' : 'w',
    castlingToFen(level.castling),
    level.enPassant || '-',
    String(level.halfmoveClock == null ? 0 : level.halfmoveClock),
    String(level.fullmoveNumber == null ? 1 : level.fullmoveNumber)
  ].join(' ');
}

export function positionFromFen(fen) {
  return fen
    .split(' ')[0]
    .split('/')
    .map(rowFen => {
      const row = [];
      rowFen.split('').forEach(ch => {
        if (/\d/.test(ch)) {
          for (let i = 0; i < Number(ch); i++) row.push('');
        } else {
          row.push(FEN_TO_PIECE[ch] || '');
        }
      });
      return row;
    });
}

export const sideToMove = fen => (fen.split(' ')[1] === 'b' ? 'b' : 'w');

export function legalMoves(fen, r, c) {
  const chess = new Chess(fen);
  const moves = chess.moves({square: squareName(r, c), verbose: true});
  const seen = new Set();
  return moves
    .filter(move => (seen.has(move.to) ? false : seen.add(move.to)))
    .map(move => parseSquare(move.to));
}

export function movableSquares(fen) {
  const chess = new Chess(fen);
  const froms = new Set(chess.moves({verbose: true}).map(move => move.from));
  return [...froms].map(parseSquare);
}

export function applyMove(fen, move) {
  const chess = new Chess(fen);
  try {
    chess.move({
      from: squareName(move.from[0], move.from[1]),
      to: squareName(move.to[0], move.to[1]),
      promotion: move.promotion || 'q'
    });
  } catch (err) {
    return null;
  }
  return chess.fen();
}

export function sanFor(fen, move) {
  const chess = new Chess(fen);
  try {
    const result = chess.move({
      from: squareName(move.from[0], move.from[1]),
      to: squareName(move.to[0], move.to[1]),
      promotion: move.promotion || 'q'
    });
    return result ? result.san : null;
  } catch (err) {
    return null;
  }
}

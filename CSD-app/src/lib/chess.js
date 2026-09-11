import {Chess} from 'chess.js';

// Шахматные правила для тренажёра. Раньше здесь был самописный движок, который
// умел ходить только белыми и не знал ни рокировки, ни взятия на проходе, ни
// превращения, ни шаха со связками. Теперь это тонкая обёртка над chess.js —
// той же библиотекой, что уже используют сервер и админка.
//
// Позиция снаружи по-прежнему остаётся массивом 8×8 юникод-глифов ([0] — 8-я
// горизонталь, [*][0] — вертикаль a): на нём завязаны отрисовка доски, подписи
// ходов и адаптер уровня. Внутри же источником правды служит FEN — он несёт то,
// чего массив выразить не может: чья очередь хода, права на рокировку и поле
// взятия на проходе.
//
// Важный побочный эффект перехода: chess.js разрешает ходить только стороне,
// чей ход. Проверка «своя ли это фигура» получается бесплатно, поэтому никаких
// isWhite-гейтов в тренажёре больше нет — и задачи за чёрных работают сами.

export const FILES = 'abcdefgh';
const WHITE_PIECES = '♙♖♘♗♕♔';

export const isWhite = piece => Boolean(piece) && WHITE_PIECES.includes(piece);
export const squareName = (r, c) => FILES[c] + (8 - r);
export const clone = position => position.map(row => row.slice());

// Эмодзи фигуры для подписей хода (сама фигура и есть юникод-эмодзи — позиция
// и так хранит фигуры этими символами). U+FE0F просит систему нарисовать
// символ именно цветной эмодзи-картинкой, а не чёрно-белым текстовым глифом
// (см. тот же приём в CSD-app-admin/src/lib/board.js).
export const pieceEmoji = piece => (piece ? piece + '️' : '');

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

// Те же таблицы, что в shared/chess-rules.js. Импортировать сам shared нельзя:
// это UMD-модуль, и Rollup в production-бандле принимает его обёртку за
// CommonJS (причина подробно описана в CSD-app-admin/src/lib/chessRules.js).
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

/** FEN уровня: позиция плюс всё, чего массив 8×8 не выражает. */
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

/** Массив 8×8 для отрисовки. Тренажёр хранит FEN, а доска рисует глифы. */
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

/** 'w' | 'b' — чья очередь хода в этой позиции. */
export const sideToMove = fen => (fen.split(' ')[1] === 'b' ? 'b' : 'w');

/**
 * Куда может пойти фигура с клетки. Пустой список означает и «чужая фигура», и
 * «связана», и «ход подставляет короля» — chess.js учитывает всё это сам.
 */
export function legalMoves(fen, r, c) {
  const chess = new Chess(fen);
  const moves = chess.moves({square: squareName(r, c), verbose: true});
  // Превращение даёт четыре хода на одну и ту же клетку — для подсветки нужна
  // одна точка, поэтому цели схлопываются по имени клетки.
  const seen = new Set();
  return moves
    .filter(move => (seen.has(move.to) ? false : seen.add(move.to)))
    .map(move => parseSquare(move.to));
}

/**
 * Клетки, с которых вообще есть ход — для курсора «можно взять». Один проход
 * по всем ходам позиции вместо 64 отдельных запросов по клеткам.
 */
export function movableSquares(fen) {
  const chess = new Chess(fen);
  const froms = new Set(chess.moves({verbose: true}).map(move => move.from));
  return [...froms].map(parseSquare);
}

/**
 * Применяет ход и возвращает новый FEN либо null, если ход нелегален.
 * Рокировка, взятие на проходе и превращение отрабатываются самим движком.
 */
export function applyMove(fen, move) {
  const chess = new Chess(fen);
  try {
    chess.move({
      from: squareName(move.from[0], move.from[1]),
      to: squareName(move.to[0], move.to[1]),
      // Без явного превращения ход пешки на последнюю горизонталь просто не
      // пройдёт; ферзь — общепринятый выбор по умолчанию.
      promotion: move.promotion || 'q'
    });
  } catch (err) {
    return null;
  }
  return chess.fen();
}

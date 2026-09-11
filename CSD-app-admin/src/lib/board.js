// Чистые утилиты доски — порт нужного среза admins/js/board-common.js
// (сами правила/легальность — в chessRules.js, это только представление).
export const FILES = 'abcdefgh';
export const WHITE_PIECES = '♙♖♘♗♕♔';
export const PALETTE = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];

// Эмодзи фигуры для подписей и записи ходов (сама фигура и есть юникод-
// эмодзи — позиция и так хранит фигуры этими символами), включая пешку —
// в отличие от буквенной нотации (там у пешки буквы нет), эмодзи показываем
// для всех фигур без исключения. U+FE0F (variation selector-16) на конце
// просит систему нарисовать символ именно цветной эмодзи-картинкой, а не
// чёрно-белым текстовым глифом — шахматные символы по умолчанию текстовые,
// без него на многих платформах выглядят как обычные тонкие буквы.
export const pieceEmoji = piece => piece ? piece + '️' : '';

export const isWhite = piece => Boolean(piece) && WHITE_PIECES.includes(piece);
export const squareName = (r, c) => FILES[c] + (8 - r);
export const parseSquareName = name => {
  const c = FILES.indexOf(name[0]);
  const r = 8 - Number(name[1]);
  return [r, c];
};
export const clone = position => position.map(row => row.slice());
export const emptyBoard = () => Array.from({ length: 8 }, () => Array(8).fill(''));

export function standardPosition() {
  const back = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'];
  const pos = emptyBoard();
  pos[0] = back.slice();
  pos[1] = Array(8).fill('♟');
  pos[6] = Array(8).fill('♙');
  pos[7] = ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'];
  return pos;
}

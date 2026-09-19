export const FILES = 'abcdefgh';
export const WHITE_PIECES = '♙♖♘♗♕♔';
export const PALETTE = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];

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

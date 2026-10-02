import { PIECE_ART } from '../lib/pieceArt.js';

export default function MiniBoard({ position, flipped = false }) {
  const squares = [];
  for (let dr = 0; dr < 8; dr++) {
    for (let dc = 0; dc < 8; dc++) {
      const [r, c] = flipped ? [7 - dr, 7 - dc] : [dr, dc];
      const piece = position[r][c];
      const art = PIECE_ART[piece];
      squares.push(
        <span key={r + '-' + c} className={(r + c) % 2 === 0 ? 'light' : 'dark'}>
          {art && <img src={import.meta.env.BASE_URL + 'pieces/' + art[0] + '.png'} alt="" />}
        </span>
      );
    }
  }
  return <div className="mini-preview-board">{squares}</div>;
}

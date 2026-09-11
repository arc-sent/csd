import { PIECE_ART } from '../lib/pieceArt.js';

// Порт miniBoardHTML() из admins/js/levels.js — мини-превью 8x8 для карточки задачи.
export default function MiniBoard({ position }) {
  const squares = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
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

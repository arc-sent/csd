import { PALETTE } from '../../lib/board.js';
import { PIECE_ART } from '../../lib/pieceArt.js';

export default function Palette({ selected, onSelect }) {
  return (
    <div className="palette">
      {PALETTE.map(piece => {
        const art = PIECE_ART[piece];
        return (
          <button
            key={piece}
            type="button"
            className={'palette-piece' + (selected === piece ? ' active' : '')}
            onClick={() => onSelect(selected === piece ? null : piece)}
            draggable
            onDragStart={e => {
              e.dataTransfer.setData('text/plain', 'palette:' + piece);
              e.dataTransfer.effectAllowed = 'copy';
            }}
          >
            <img src={import.meta.env.BASE_URL + 'pieces/' + art[0] + '.png'} alt={art[1]} draggable={false} />
          </button>
        );
      })}
      <button
        type="button"
        className={'palette-piece palette-eraser' + (selected === 'eraser' ? ' active' : '')}
        title="Ластик — убрать фигуру"
        onClick={() => onSelect(selected === 'eraser' ? null : 'eraser')}
      >
        ✕
      </button>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import Board from './Board.jsx';
import { chessRules } from '../../lib/chessRules.js';
import { advanceFen } from '../../lib/solutionNotation.js';
import MoveLabel from './MoveLabel.jsx';

export default function PreviewPanel({ draft }) {
  const frames = useMemo(() => {
    const result = [{ position: draft.position, fen: chessRules.toFen(draft), move: null, kind: 'start' }];
    draft.steps.forEach(step => {
      const before = result[result.length - 1];
      const afterPlayer = chessRules.applyMove(before.position, step.player);
      const afterPlayerFen = advanceFen(before.fen, step.player);
      result.push({ position: afterPlayer, fen: afterPlayerFen, move: step.player, kind: 'player' });
      if (step.reply) {
        const afterReply = chessRules.applyMove(afterPlayer, step.reply);
        const afterReplyFen = advanceFen(afterPlayerFen, step.reply);
        result.push({ position: afterReply, fen: afterReplyFen, move: step.reply, kind: 'reply' });
      }
    });
    return result;
  }, [draft.position, draft.turn, draft.castling, draft.enPassant, draft.steps]);

  const [cursor, setCursor] = useState(0);
  useEffect(() => {
    setCursor(c => Math.min(c, frames.length - 1));
  }, [frames.length]);

  const frame = frames[cursor];
  const beforeFrame = frames[cursor - 1];
  const label = frame.kind === 'start'
    ? 'Начальная позиция'
    : <>{frame.kind === 'player' ? 'Ученик: ' : 'Ответ: '}<MoveLabel move={frame.move} before={beforeFrame && beforeFrame.position} beforeFen={beforeFrame && beforeFrame.fen} /></>;

  return (
    <div className="preview-panel">
      <span className="field-label">Предпросмотр решения</span>
      <div className="board-frame preview-board-frame">
        <Board
          position={frame.position}
          squareClassName={(r, c) => {
            if (!frame.move) return '';
            const isFrom = frame.move.from[0] === r && frame.move.from[1] === c;
            const isTo = frame.move.to[0] === r && frame.move.to[1] === c;
            return isFrom || isTo ? 'last-move' : '';
          }}
          ariaLabel="Доска предпросмотра"
        />
      </div>
      <p className="preview-label">{label}</p>
      <div className="panel-actions nav">
        <button type="button" className="panel-button ghost" disabled={cursor === 0} onClick={() => setCursor(c => Math.max(0, c - 1))}>← Пред. ход</button>
        <button type="button" className="panel-button ghost" onClick={() => setCursor(0)}>Сбросить</button>
        <button type="button" className="panel-button ghost" disabled={cursor === frames.length - 1} onClick={() => setCursor(c => Math.min(frames.length - 1, c + 1))}>След. ход →</button>
      </div>
      <button type="button" className="panel-button dark preview-solution-btn" onClick={() => setCursor(frames.length - 1)}>Показать решение целиком</button>
    </div>
  );
}

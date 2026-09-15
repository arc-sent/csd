import { PIECE_ART } from '../../lib/pieceArt.js';
import { DIFFICULTY_LABEL } from '../../lib/format.js';
import { chessRules } from '../../lib/chessRules.js';
import { fenChainFor } from '../../lib/solutionNotation.js';
import MoveLabel from './MoveLabel.jsx';
import ResultField from './ResultField.jsx';

// Порт renderReview() из admins/js/admin.js.
export default function ReviewView({ draft, dispatch, onEdit, onSaveDraft, onPublish }) {
  const castlingText = [];
  if (draft.castling.wOO) castlingText.push('Белые O-O');
  if (draft.castling.wOOO) castlingText.push('Белые O-O-O');
  if (draft.castling.bOO) castlingText.push('Чёрные O-O');
  if (draft.castling.bOOO) castlingText.push('Чёрные O-O-O');

  const stepFens = fenChainFor(draft);

  // Позиции-массивы (та же цепочка, что и в StepsList.jsx) — по ним MoveLabel
  // берёт эмодзи фигуры, а не только текст хода.
  const stepPositions = { beforePlayer: [], beforeReply: [] };
  {
    let pos = draft.position;
    draft.steps.forEach(step => {
      stepPositions.beforePlayer.push(pos);
      const afterPlayer = chessRules.applyMove(pos, step.player);
      stepPositions.beforeReply.push(afterPlayer);
      pos = step.reply ? chessRules.applyMove(afterPlayer, step.reply) : afterPlayer;
    });
  }

  const squares = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = draft.position[r][c];
      const art = PIECE_ART[piece];
      squares.push(
        <span key={r + '-' + c} className={(r + c) % 2 === 0 ? 'light' : 'dark'}>
          {art && <img src={import.meta.env.BASE_URL + 'pieces/' + art[0] + '.png'} alt="" />}
        </span>
      );
    }
  }

  return (
    <div className="container review-layout">
      <div className="section-intro-admin">
        <span className="section-label">Шаг 3</span>
        <h2>Финальная проверка</h2>
        <p>Убедитесь, что позиция, решение и параметры уровня заданы верно, прежде чем публиковать задачу.</p>
      </div>

      <div id="review-body">
        <div className="review-grid">
          <div className="review-board-col">
            <div className="mini-preview-board large">{squares}</div>
          </div>
          <div className="review-info-col">
            <h3>{draft.name || 'Без названия'}</h3>
            <p className="review-desc">{draft.description || 'Без описания'}</p>
            <div className="review-tags">
              <span className="status-pill">{DIFFICULTY_LABEL[draft.difficulty] || draft.difficulty}</span>
              {draft.category && <span className="status-pill">{draft.category}</span>}
              <span className="status-pill">{draft.turn === 'b' ? 'Ход чёрных' : 'Ход белых'}</span>
            </div>
            <div className="review-fact"><span>Рокировка</span><b>{castlingText.length ? castlingText.join(', ') : 'Недоступна'}</b></div>
            <div className="review-fact"><span>Количество ходов в решении</span><b>{draft.steps.length}</b></div>
            <div className="review-fact review-fact-result">
              <span>Результат / оценка</span>
              <span>
                <ResultField draft={draft} dispatch={dispatch} />
              </span>
            </div>
          </div>
        </div>
        <div className="review-steps">
          <h4>Последовательность решения</h4>
          {draft.steps.length ? draft.steps.map((step, i) => (
            <div className="review-step-row" key={i}>
              <span className="step-index">{String(i + 1).padStart(2, '0')}</span>
              <span><em>Ученик</em> <MoveLabel move={step.player} before={stepPositions.beforePlayer[i]} beforeFen={stepFens.beforePlayerFen[i]} /></span>
              <span><em>Ответ</em> {step.reply ? <MoveLabel move={step.reply} before={stepPositions.beforeReply[i]} beforeFen={stepFens.beforeReplyFen[i]} /> : '—'}</span>
            </div>
          )) : <p className="review-desc">Решение не задано.</p>}
        </div>
      </div>

      <div className="panel-actions review-actions">
        <button type="button" className="panel-button ghost" onClick={onEdit}>Редактировать</button>
        <button type="button" className="panel-button ghost" onClick={onSaveDraft}>Сохранить как черновик</button>
        <button type="button" className="panel-button dark" onClick={onPublish}>Опубликовать</button>
      </div>
    </div>
  );
}

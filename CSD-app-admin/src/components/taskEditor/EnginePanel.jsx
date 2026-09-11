import { useState } from 'react';
import { request, ApiError } from '../../lib/api.js';
import { handleApiError } from '../../lib/authError.js';
import { chessRules } from '../../lib/chessRules.js';
import MoveLabel from './MoveLabel.jsx';

// Порт admins/js/engine.js — «Рассчитать лучшее решение»: показывает вариант
// движка как черновик, ничего не применяет автоматически.
function scoreText(score, turn) {
  if (!score) return '—';
  const side = turn === 'b' ? 'чёрных' : 'белых';
  if (score.type === 'mate') {
    const n = Math.abs(score.value);
    return score.value > 0 ? `мат в ${n} в пользу ${side}` : `мат в ${n} против ${side}`;
  }
  const pawns = (score.value / 100).toFixed(2);
  const sign = score.value > 0 ? '+' : '';
  return `${sign}${pawns} (в пользу ${score.value >= 0 ? side : (turn === 'b' ? 'белых' : 'чёрных')})`;
}

export default function EnginePanel({ draft, hasSteps, onAccept, notify }) {
  const [depth, setDepth] = useState(14);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [errorText, setErrorText] = useState('');

  async function analyze() {
    if (running) return;
    setRunning(true);
    setErrorText('');
    setResult(null);
    try {
      const data = await request('/engine/analyze', {
        method: 'POST',
        body: JSON.stringify({
          position: draft.position,
          turn: draft.turn,
          castling: draft.castling,
          enPassant: draft.enPassant || null,
          halfmoveClock: draft.halfmoveClock || 0,
          fullmoveNumber: draft.fullmoveNumber || 1,
          depth
        })
      });
      setResult(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleApiError(err, notify);
      } else {
        const details = err.details && err.details.errors ? ' ' + err.details.errors.join(' ') : '';
        setErrorText((err.message || 'Не удалось получить ответ движка') + details);
      }
    } finally {
      setRunning(false);
    }
  }

  function accept() {
    if (!result || !result.steps.length) return;
    if (hasSteps && !confirm('Заменить уже созданное решение вариантом движка?')) return;
    onAccept(result.steps);
    setResult(null);
    notify('Вариант движка добавлен в решение.');
  }

  let runningPosition = draft.position;
  const stepRows = result ? result.steps.map((step, i) => {
    const beforePlayer = runningPosition;
    const beforeReply = chessRules.applyMove(beforePlayer, step.player);
    runningPosition = step.reply ? chessRules.applyMove(beforeReply, step.reply) : beforeReply;
    return (
      <div className="engine-step" key={i}>
        <span className="step-index">{String(i + 1).padStart(2, '0')}</span>
        <span><em>Ученик</em> <MoveLabel move={step.player} before={beforePlayer} /></span>
        <span><em>Ответ</em> {step.reply ? <MoveLabel move={step.reply} before={beforeReply} /> : '—'}</span>
      </div>
    );
  }) : null;

  const isMate = result && result.score && result.score.type === 'mate';

  return (
    <div className="engine-panel">
      <span className="field-label">Помощь движка</span>
      <p className="hint-text engine-hint">Движок рассчитывает наилучший алгоритм решения этой задачи — ищет мат. Если мата нет, показывает выигрышное положение для одной из сторон.</p>
      <div className="engine-controls">
        <label className="field-label" htmlFor="engine-depth">Глубина расчёта</label>
        <input type="range" id="engine-depth" min={6} max={20} value={depth} className="engine-range"
          onChange={e => setDepth(Number(e.target.value))} />
        <output>{depth}</output>
      </div>
      <button type="button" className="panel-button dark engine-run-btn" disabled={running} onClick={analyze}>
        {running ? 'Движок считает…' : 'Рассчитать лучшее решение'}
      </button>

      {running && (
        <div className="engine-result"><p className="hint-text">Движок считает позицию…</p></div>
      )}
      {!running && errorText && (
        <div className="engine-result engine-error"><p>{errorText}</p></div>
      )}
      {!running && !errorText && result && (
        <div className="engine-result">
          <div className="engine-summary"><span>Оценка</span><b>{scoreText(result.score, draft.turn)}</b></div>
          <div className="engine-summary"><span>Глубина</span><b>{result.depth != null ? result.depth : '—'}</b></div>
          {!isMate && (
            <div className="engine-warnings engine-no-mate">
              <p>⚠ Мат в этой позиции не форсирован — движок нашёл лучший ход, но не мат.
                Если задача должна заканчиваться матом, поправьте позицию (меньше места для отступления
                королю соперника) и рассчитайте заново.</p>
            </div>
          )}
          <div className="engine-steps">{stepRows && stepRows.length ? stepRows : <p className="hint-text">Движок не предложил ходов.</p>}</div>
          {result.warnings && result.warnings.length > 0 && (
            <div className="engine-warnings">
              {result.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
            </div>
          )}
          <div className="panel-actions engine-actions">
            <button type="button" className="panel-button ghost" onClick={() => setResult(null)}>Отклонить</button>
            <button type="button" className="panel-button dark" onClick={accept}>Принять как решение</button>
          </div>
        </div>
      )}
    </div>
  );
}

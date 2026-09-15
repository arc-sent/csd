import { useEffect, useMemo, useRef, useState } from 'react';
import { chessRules } from '../../lib/chessRules.js';
import { moveToUciOrEmpty, tokensToSteps, fenChainFor } from '../../lib/solutionNotation.js';
import MoveLabel from './MoveLabel.jsx';

// Порт renderStepsList()+«Всё решение» (renderFullAlgoInput/applyFullAlgoInput)
// из admins/js/solution-builder.js.
export default function StepsList({ draft, dispatch, onEdit, onDelete, notify }) {
  // Позиция ДО каждого шага (для player) и ДО ответа (после хода ученика) —
  // нужно, чтобы подписать, какая фигура ходит.
  const stepPositions = useMemo(() => {
    const beforePlayer = [];
    const beforeReply = [];
    let pos = draft.position;
    draft.steps.forEach(step => {
      beforePlayer.push(pos);
      const afterPlayer = chessRules.applyMove(pos, step.player);
      beforeReply.push(afterPlayer);
      pos = step.reply ? chessRules.applyMove(afterPlayer, step.reply) : afterPlayer;
    });
    return { beforePlayer, beforeReply };
  }, [draft.position, draft.steps]);

  // Та же цепочка, но в FEN — по ней MoveLabel считает настоящую нотацию
  // (+/#/x/=/O-O), а не просто "откуда → куда".
  const stepFens = useMemo(
    () => fenChainFor(draft),
    [draft.position, draft.turn, draft.castling, draft.enPassant, draft.steps]
  );

  const fullAlgoString = useMemo(() => {
    const tokens = [];
    let pos = draft.position;
    draft.steps.forEach(step => {
      tokens.push(moveToUciOrEmpty(step.player, pos));
      pos = chessRules.applyMove(pos, step.player);
      if (step.reply) {
        tokens.push(moveToUciOrEmpty(step.reply, pos));
        pos = chessRules.applyMove(pos, step.reply);
      }
    });
    return tokens.join(' ');
  }, [draft.position, draft.steps]);

  const [fullAlgoText, setFullAlgoText] = useState(fullAlgoString);
  const [fullAlgoFocused, setFullAlgoFocused] = useState(false);
  const [fullAlgoError, setFullAlgoError] = useState('');
  const fullAlgoValueAtFocus = useRef('');

  useEffect(() => {
    if (!fullAlgoFocused) setFullAlgoText(fullAlgoString);
  }, [fullAlgoString, fullAlgoFocused]);

  function applyFullAlgoInput() {
    const raw = fullAlgoText.trim();
    if (!raw) {
      if (draft.steps.length && !confirm('Очистить весь список ходов решения?')) {
        setFullAlgoText(fullAlgoString);
        return;
      }
      dispatch({ type: 'REPLACE_STEPS', steps: [] });
    } else {
      const tokens = raw.split(/\s+/).filter(Boolean);
      const result = tokensToSteps(tokens);
      if (result.error) { setFullAlgoError(result.error); return; }
      if (draft.steps.length && !confirm('Заменить весь текущий список ходов решения введённым текстом?')) {
        setFullAlgoText(fullAlgoString);
        return;
      }
      dispatch({ type: 'REPLACE_STEPS', steps: result.steps });
    }
    setFullAlgoError('');
    notify('Решение обновлено из текста.');
  }

  async function copyFullAlgo() {
    if (!fullAlgoText) { notify('Нечего копировать — решение ещё пустое.'); return; }
    try {
      await navigator.clipboard.writeText(fullAlgoText);
      notify('Скопировано: ' + fullAlgoText);
    } catch (err) {
      notify('Скопируйте выделенный текст вручную (Ctrl+C).');
    }
  }

  function handleDelete(index) {
    if (!confirm('Удалить этот ход из решения?')) return;
    onDelete(index);
    notify('Ход удалён.');
  }

  return (
    <div className="steps-panel">
      <span className="field-label">Ходы решения (<span>{draft.steps.length}</span>)</span>
      <div className="steps-list">
        {draft.steps.map((step, index) => (
          <div key={index}>
            <div className="step-card">
              <div className="step-card-head">
                <span className="step-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="step-card-actions">
                  <button type="button" className="panel-button ghost" onClick={() => onEdit(index)}>Редактировать</button>
                  <button type="button" className="panel-button ghost" onClick={() => handleDelete(index)}>Удалить</button>
                </div>
              </div>
              <div className="step-card-body">
                <div className="step-move"><em>Ученик</em><b><MoveLabel move={step.player} before={stepPositions.beforePlayer[index]} beforeFen={stepFens.beforePlayerFen[index]} /></b></div>
                <div className="step-move"><em>Ответ</em><b>{step.reply ? <MoveLabel move={step.reply} before={stepPositions.beforeReply[index]} beforeFen={stepFens.beforeReplyFen[index]} /> : '—'}</b></div>
              </div>
            </div>
            {index < draft.steps.length - 1 && <div className="step-arrow">↓</div>}
          </div>
        ))}
      </div>

      <span className="field-label full-algo-label">Всё решение</span>
      <div className="algo-row">
        <input
          type="text" className="admin-input algo-input" spellCheck={false} placeholder="Пока нет ни одного хода"
          value={fullAlgoText}
          onFocus={() => { setFullAlgoFocused(true); fullAlgoValueAtFocus.current = fullAlgoText; }}
          onBlur={() => { setFullAlgoFocused(false); if (fullAlgoText !== fullAlgoValueAtFocus.current) applyFullAlgoInput(); }}
          onChange={e => { setFullAlgoText(e.target.value); setFullAlgoError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
        />
        <button type="button" className="panel-button ghost" onClick={copyFullAlgo}>Копировать</button>
      </div>
      <p className="hint-text algo-hint">
        Все ходы решения одной строкой — обновляется автоматически (в том числе после принятия варианта
        движка) и доступна для правки: вставьте свою строку ходов, чтобы заменить весь список сразу.
      </p>
      {fullAlgoError && <p className="feedback error algo-error show">{fullAlgoError}</p>}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import Board from './Board.jsx';
import StepsList from './StepsList.jsx';
import PreviewPanel from './PreviewPanel.jsx';
import EnginePanel from './EnginePanel.jsx';
import { FILES, squareName, parseSquareName } from '../../lib/board.js';
import { chessRules } from '../../lib/chessRules.js';
import { moveToUciOrEmpty, parseUciToken, tokensToSteps, copyMove, fenBeforeIndex, advanceFen } from '../../lib/solutionNotation.js';
import MoveLabel from './MoveLabel.jsx';
import ResultField from './ResultField.jsx';

const SQUARE_OPTIONS = FILES.split('').flatMap(f => [8, 7, 6, 5, 4, 3, 2, 1].map(n => f + n));

function positionBeforeIndex(draft, index) {
  let pos = draft.position;
  for (let i = 0; i < index; i++) {
    pos = chessRules.applyMove(pos, draft.steps[i].player);
    if (draft.steps[i].reply) pos = chessRules.applyMove(pos, draft.steps[i].reply);
  }
  return pos;
}

// Порт admins/js/solution-builder.js — конструктор решения: клики по доске,
// ручной выбор клеток, текстовый ввод одного хода/целого решения.
export default function SolutionBuilderView({ draft, dispatch, onBack, onNext, onSaveDraft, onPublish, notify }) {
  const [temp, setTemp] = useState({ player: { from: null, to: null }, reply: { from: null, to: null } });
  const [skipReply, setSkipReply] = useState(false);
  // Не поле уровня, а решение админа прямо здесь: не идти на шаг «Проверка»,
  // а сохранить/опубликовать сразу с этого экрана. Локальный чекбокс, не
  // draft.* — включается заново на каждое открытие редактора, а не хранится
  // на сервере (это про то, как хочется работать сейчас, а не свойство уровня).
  const [skipReview, setSkipReview] = useState(false);
  const [pendingField, setPendingField] = useState('player.from');
  const [editingIndex, setEditingIndex] = useState(-1);
  const [algoText, setAlgoText] = useState('');
  const [algoError, setAlgoError] = useState('');
  const [algoFocused, setAlgoFocused] = useState(false);
  const algoValueAtFocus = useRef('');

  const buildPosition = positionBeforeIndex(draft, editingIndex === -1 ? draft.steps.length : editingIndex);
  const beforeReplyPosition = temp.player.from && temp.player.to ? chessRules.applyMove(buildPosition, temp.player) : buildPosition;
  // Те же позиции, но в FEN — для настоящей нотации (+/#/x/=/O-O) в MoveLabel.
  const buildFen = fenBeforeIndex(draft, editingIndex === -1 ? draft.steps.length : editingIndex);
  const beforeReplyFen = temp.player.from && temp.player.to ? advanceFen(buildFen, temp.player) : buildFen;

  // Строка вида "e7e5 Кg1f3" для поля "Алгоритм хода" — источник и приёмник
  // одновременно, как и в оригинале (algoStringFromTemp).
  function algoStringFromTemp() {
    const player = moveToUciOrEmpty(temp.player, buildPosition);
    const reply = skipReply ? '' : moveToUciOrEmpty(temp.reply, beforeReplyPosition);
    return [player, reply].filter(Boolean).join(' ');
  }

  // Пересобираем текст поля из temp при любом изменении хода НЕ текстом
  // (клики по доске, ручные select) — пока поле не в фокусе, чтобы не
  // перебивать то, что админ печатает.
  useEffect(() => {
    if (!algoFocused) setAlgoText(algoStringFromTemp());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temp, skipReply, algoFocused]);

  function resetTemp() {
    setTemp({ player: { from: null, to: null }, reply: { from: null, to: null } });
    setPendingField('player.from');
    setEditingIndex(-1);
  }

  function setField(field, coords) {
    const [group, key] = field.split('.');
    setTemp(prev => ({ ...prev, [group]: { ...prev[group], [key]: coords } }));
  }

  function advancePendingField() {
    const order = skipReply ? ['player.from', 'player.to'] : ['player.from', 'player.to', 'reply.from', 'reply.to'];
    const idx = order.indexOf(pendingField);
    setPendingField(order[Math.min(idx + 1, order.length - 1)]);
  }

  function handleBoardClick(r, c) {
    setField(pendingField, [r, c]);
    advancePendingField();
  }

  function applyAlgoInput(text = algoText) {
    const raw = text.trim();
    if (!raw) {
      resetTemp();
      setSkipReply(false);
      setAlgoError('');
      return;
    }
    const tokens = raw.split(/\s+/).filter(Boolean);

    if (tokens.length > 2) {
      const result = tokensToSteps(tokens);
      if (result.error) { setAlgoError(result.error); return; }
      if (draft.steps.length && !confirm('Заменить весь текущий список ходов решения введённым текстом?')) return;
      dispatch({ type: 'REPLACE_STEPS', steps: result.steps });
      resetTemp();
      setSkipReply(false);
      setAlgoError('');
      setAlgoText('');
      notify('Решение целиком добавлено из текста (' + result.steps.length + ' шаг(ов)).');
      return;
    }

    const playerMove = parseUciToken(tokens[0]);
    if (!playerMove) { setAlgoError('Не могу разобрать «' + tokens[0] + '». Формат хода: e7e5 (откуда+куда).'); return; }
    let replyMove = null;
    if (tokens[1]) {
      replyMove = parseUciToken(tokens[1]);
      if (!replyMove) { setAlgoError('Не могу разобрать ответ «' + tokens[1] + '». Формат хода: g1f3.'); return; }
    }
    setTemp({ player: playerMove, reply: replyMove || { from: null, to: null } });
    setSkipReply(!replyMove);
    setPendingField('player.from');
    setAlgoError('');
  }

  async function pasteAlgo() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) { notify('В буфере обмена пусто.'); return; }
      setAlgoText(text);
      applyAlgoInput(text);
    } catch (err) {
      notify('Не удалось прочитать буфер обмена — вставьте вручную (Ctrl+V) и нажмите Enter.');
    }
  }

  function handleAddStep() {
    const step = {
      player: copyMove(temp.player),
      reply: skipReply ? null : copyMove(temp.reply)
    };
    dispatch({ type: 'ADD_STEP', index: editingIndex === -1 ? draft.steps.length : editingIndex, step });
    resetTemp();
    setSkipReply(false);
    notify('Ход добавлен в решение.');
  }

  function handleEditStep(index) {
    const step = draft.steps[index];
    setTemp({
      player: copyMove(step.player) || { from: null, to: null },
      reply: step.reply ? copyMove(step.reply) : { from: null, to: null }
    });
    setSkipReply(!step.reply);
    setEditingIndex(index);
    dispatch({ type: 'REMOVE_STEP', index });
    setPendingField('player.from');
    setAlgoError('');
    notify('Шаг открыт для редактирования.');
  }

  function handleDeleteStep(index) {
    dispatch({ type: 'REMOVE_STEP', index });
    setEditingIndex(prev => {
      if (prev === index) { resetTemp(); return -1; }
      if (prev > index) return prev - 1;
      return prev;
    });
  }

  function handleAcceptEngine(steps) {
    dispatch({ type: 'REPLACE_STEPS', steps: steps.map(s => ({ player: copyMove(s.player), reply: copyMove(s.reply) })) });
    resetTemp();
    setSkipReply(false);
  }

  function handleToReview() {
    if (!draft.steps.length) { notify('Добавьте хотя бы один ход в решение.'); return; }
    onNext('review');
  }

  const ready = temp.player.from && temp.player.to && (skipReply || (temp.reply.from && temp.reply.to));

  return (
    <div className="container editor-layout">
      <div className="editor-main">
        <div className="section-intro-admin">
          <span className="section-label">Шаг 2</span>
          <h2>Конструктор решения</h2>
          <p>Кликните клетку «откуда», затем «куда» — ход появится ниже. Порядок: ход ученика, затем обязательный ответ системы.</p>
        </div>

        <div className="board-frame editor-board-frame">
          <Board
            position={buildPosition}
            extraClassName="large interactive"
            squareClassName={(r, c) => {
              const classes = [];
              if (temp.player.from && temp.player.from[0] === r && temp.player.from[1] === c) classes.push('sel-player-from');
              if (temp.player.to && temp.player.to[0] === r && temp.player.to[1] === c) classes.push('sel-player-to');
              if (temp.reply.from && temp.reply.from[0] === r && temp.reply.from[1] === c) classes.push('sel-reply-from');
              if (temp.reply.to && temp.reply.to[0] === r && temp.reply.to[1] === c) classes.push('sel-reply-to');
              return classes.join(' ');
            }}
            onSquareClick={handleBoardClick}
            ariaLabel="Доска конструктора решения"
          />
        </div>

        <div className="current-step-box">
          <div className="current-step-preview">
            <div className="temp-move-row"><span>Ученик</span><b><MoveLabel move={temp.player} before={buildPosition} beforeFen={buildFen} /></b></div>
            <div className="temp-move-row"><span>Ответ</span><b>{skipReply ? 'нет (финальный ход)' : <MoveLabel move={temp.reply} before={beforeReplyPosition} beforeFen={beforeReplyFen} />}</b></div>
          </div>
          <label className="toggle-field">
            <input type="checkbox" checked={skipReply} onChange={e => { setSkipReply(e.target.checked); if (e.target.checked) setTemp(prev => ({ ...prev, reply: { from: null, to: null } })); }} />
            Финальный ход — без ответа системы (мат/конец решения)
          </label>

          <div className="manual-coords-grid">
            {[
              { label: 'Ученик: откуда', field: 'player.from', value: temp.player.from },
              { label: 'Ученик: куда', field: 'player.to', value: temp.player.to },
              { label: 'Ответ: откуда', field: 'reply.from', value: temp.reply.from },
              { label: 'Ответ: куда', field: 'reply.to', value: temp.reply.to }
            ].map(({ label, field, value }) => (
              <div key={field}>
                <span className="field-label">{label}</span>
                <select className="admin-input" value={value ? squareName(value[0], value[1]) : ''}
                  onChange={e => setField(field, e.target.value ? parseSquareName(e.target.value) : null)}>
                  <option value="">—</option>
                  {SQUARE_OPTIONS.map(sq => <option key={sq} value={sq}>{sq}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="panel-actions">
            <button type="button" className="panel-button ghost" onClick={() => { resetTemp(); setSkipReply(false); setAlgoError(''); }}>Сбросить текущий ход</button>
            <button type="button" className="panel-button dark" disabled={!ready} onClick={handleAddStep}>Добавить ход +</button>
          </div>
        </div>

        <div className="algo-box">
          <span className="field-label">Алгоритм хода</span>
          <div className="algo-row">
            <input
              id="algo-input-field" type="text" className="admin-input algo-input" spellCheck={false} placeholder="e7e5 Кg1f3"
              value={algoText}
              onFocus={() => { setAlgoFocused(true); algoValueAtFocus.current = algoText; }}
              onBlur={() => { setAlgoFocused(false); if (algoText !== algoValueAtFocus.current) applyAlgoInput(); }}
              onChange={e => { setAlgoText(e.target.value); setAlgoError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
            />
            <button type="button" className="panel-button ghost" onClick={pasteAlgo}>Вставить</button>
          </div>
          <p className="hint-text algo-hint">
            Координаты хода одной строкой: <code>откуда-куда</code> ученика, затем через пробел —
            <code>откуда-куда</code> ответа системы. Перед координатами можно (необязательно) указать
            фигуру — эмодзи (<code>♔</code> король, <code>♕</code> ферзь, <code>♘</code> конь, <code>♖</code> ладья,
            <code>♗</code> слон, <code>♙</code> пешка) или букву для не-пешек (<code>Кр</code>/<code>Ф</code>/<code>К</code>/<code>Л</code>/<code>С</code>) —
            обе формы равнозначны. Например <code>e7e5 ♘g1f3</code>. Финальный ход
            без ответа — просто одна пара: <code>d1d8</code>. Можно скопировать отсюда или вставить свой
            вариант — поле обновит доску и остальные поля само. Можно вставить сюда и <b>решение целиком</b>
            (много ходов подряд) — тогда сразу создастся весь список шагов справа.
          </p>
          {algoError && <p className="feedback error algo-error show">{algoError}</p>}
        </div>
      </div>

      <aside className="editor-side">
        <EnginePanel draft={draft} hasSteps={draft.steps.length > 0} onAccept={handleAcceptEngine} notify={notify} />
        <StepsList draft={draft} dispatch={dispatch} onEdit={handleEditStep} onDelete={handleDeleteStep} notify={notify} />
        <PreviewPanel draft={draft} />

        {/* Результат/оценку можно задать вручную прямо здесь, не дожидаясь
            шага «Проверка» — там то же самое поле, то же состояние draft.result. */}
        <div className="result-panel">
          <span className="field-label">Результат / оценка</span>
          <ResultField draft={draft} dispatch={dispatch} />
        </div>

        <label className="toggle-field">
          <input type="checkbox" checked={skipReview} onChange={e => setSkipReview(e.target.checked)} />
          Пропустить шаг «Проверка» для этого уровня — сохранять/публиковать прямо отсюда
        </label>

        <div className="panel-actions editor-actions">
          <button type="button" className="panel-button ghost" onClick={onBack}>← К позиции</button>
          {skipReview ? (
            <>
              <button type="button" className="panel-button ghost" onClick={onSaveDraft}>Сохранить как черновик</button>
              <button type="button" className="panel-button dark" onClick={onPublish}>Опубликовать</button>
            </>
          ) : (
            <button type="button" className="panel-button dark" onClick={handleToReview}>К проверке →</button>
          )}
        </div>
      </aside>
    </div>
  );
}

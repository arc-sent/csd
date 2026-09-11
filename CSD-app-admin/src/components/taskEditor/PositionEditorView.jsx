import { useEffect, useMemo, useRef, useState } from 'react';
import Board from './Board.jsx';
import Palette from './Palette.jsx';
import { emptyBoard, standardPosition, FILES } from '../../lib/board.js';
import { chessRules } from '../../lib/chessRules.js';

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Лёгкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'hard', label: 'Сложная' }
];
const CATEGORY_SUGGESTIONS = ['Тактика', 'Мат', 'Дебют', 'Миттельшпиль', 'Эндшпиль'];

// Лёгкая структурная проверка FEN (8 горизонталей, ровно 8 клеток в каждой,
// известные буквы фигур) — порт parseFenSafe() из admins/js/position-editor.js.
function parseFenSafe(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { error: 'Введите FEN-строку.' };
  const placement = trimmed.split(/\s+/)[0];
  const rows = placement.split('/');
  if (rows.length !== 8) return { error: 'В FEN должно быть 8 горизонталей, разделённых «/».' };
  for (const row of rows) {
    let count = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) count += Number(ch);
      else if (chessRules.FEN_TO_PIECE[ch]) count += 1;
      else return { error: 'Неизвестный символ «' + ch + '» в FEN.' };
    }
    if (count !== 8) return { error: 'Горизонталь «' + row + '» должна описывать ровно 8 клеток.' };
  }
  return { level: chessRules.fromFen(trimmed) };
}

export default function PositionEditorView({ draft, dispatch, onCancel, onNext, notify }) {
  const [orientation, setOrientation] = useState('white');
  const [showCoords, setShowCoords] = useState(true);
  const [selectedPaletteType, setSelectedPaletteType] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [fenText, setFenText] = useState('');
  const [fenError, setFenError] = useState('');
  const [fenFocused, setFenFocused] = useState(false);
  const fenValueAtFocus = useRef('');
  const descriptionRef = useRef(null);
  const [validation, setValidation] = useState('');
  const validationRef = useRef(null);

  // Авто-высота "Описания" — растёт под текст вместо фиксированных 3 строк
  // с ручным resize-уголком (как в старой админке). Пересчитываем и при
  // programmatic-смене (загрузка существующего уровня), и на каждый ввод.
  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [draft.description]);

  // Живая FEN-синхронизация — показывает текущую позицию, пока поле не в
  // фокусе (иначе перебивало бы то, что админ печатает).
  useEffect(() => {
    if (fenFocused) return;
    setFenText(chessRules.toFen(draft));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.position, draft.turn, draft.castling, draft.enPassant, draft.halfmoveClock, draft.fullmoveNumber, fenFocused]);

  // Рокировка живо блокируется тем, что реально возможно на доске — и,
  // в отличие от оригинала (где это откладывалось до Done), сразу поправляет
  // draft.castling, если король/ладья уже не на исходной клетке.
  const possibleCastling = useMemo(
    () => chessRules.sanitizeCastling(draft.position, { wOO: true, wOOO: true, bOO: true, bOOO: true }).castling,
    [draft.position]
  );
  useEffect(() => {
    const corrected = {
      wOO: draft.castling.wOO && possibleCastling.wOO,
      wOOO: draft.castling.wOOO && possibleCastling.wOOO,
      bOO: draft.castling.bOO && possibleCastling.bOO,
      bOOO: draft.castling.bOOO && possibleCastling.bOOO
    };
    if (Object.keys(corrected).some(k => corrected[k] !== draft.castling[k])) {
      dispatch({ type: 'SET_CASTLING', castling: corrected });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [possibleCastling]);

  // Список клеток взятия на проходе — только реально возможные для текущей
  // расстановки/очереди хода; если сохранённое значение больше не подходит,
  // сбрасывается.
  const enPassantTargets = useMemo(
    () => chessRules.enPassantTargets(draft.position, draft.turn),
    [draft.position, draft.turn]
  );
  useEffect(() => {
    if (draft.enPassant && !enPassantTargets.includes(draft.enPassant)) {
      dispatch({ type: 'SET_EN_PASSANT', enPassant: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enPassantTargets]);

  useEffect(() => {
    if (validation) validationRef.current?.scrollIntoView({ block: 'center' });
  }, [validation]);

  function placePiece(r, c, piece) {
    const position = draft.position.map(row => row.slice());
    position[r][c] = piece || '';
    dispatch({ type: 'SET_POSITION', position });
  }

  function movePiece(fromR, fromC, toR, toC) {
    if (fromR === toR && fromC === toC) return;
    const position = draft.position.map(row => row.slice());
    position[toR][toC] = position[fromR][fromC];
    position[fromR][fromC] = '';
    dispatch({ type: 'SET_POSITION', position });
  }

  function handleSquareClick(r, c) {
    if (selectedPaletteType === 'eraser') { placePiece(r, c, ''); return; }
    if (selectedPaletteType) { placePiece(r, c, selectedPaletteType); return; }
    const piece = draft.position[r][c];
    if (selectedSquare) {
      const [sr, sc] = selectedSquare;
      if (sr === r && sc === c) { setSelectedSquare(null); return; }
      movePiece(sr, sc, r, c);
      setSelectedSquare(null);
      return;
    }
    if (piece) setSelectedSquare([r, c]);
  }

  function handleSquareDrop(r, c, data) {
    if (data.startsWith('palette:')) placePiece(r, c, data.slice(8));
    else if (data.startsWith('board:')) {
      const [, sr, sc] = data.split(':').map(Number);
      movePiece(sr, sc, r, c);
    }
  }

  function handlePieceDragStart(e, r, c) {
    e.dataTransfer.setData('text/plain', `board:${r}:${c}`);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleFlip() {
    const next = orientation === 'white' ? 'black' : 'white';
    setOrientation(next);
    setSelectedSquare(null);
    // Сторона, развёрнутая к админу (внизу доски), — это та, что ходит
    // первой: доска повёрнута к белым (обычный вид) — ход белых; повёрнута
    // к чёрным — ход чёрных.
    dispatch({ type: 'SET_TURN', turn: next === 'white' ? 'w' : 'b' });
  }

  function handleClear() {
    if (!confirm('Полностью очистить доску?')) return;
    dispatch({ type: 'SET_POSITION', position: emptyBoard() });
    setSelectedSquare(null);
    notify('Позиция очищена.');
  }

  function handleStandard() {
    if (!confirm('Заменить текущую расстановку стандартной начальной позицией?')) return;
    dispatch({ type: 'SET_POSITION', position: standardPosition() });
    dispatch({ type: 'SET_CASTLING', castling: { wOO: true, wOOO: true, bOO: true, bOOO: true } });
    dispatch({ type: 'SET_TURN', turn: 'w' });
    setSelectedSquare(null);
    notify('Установлена стандартная начальная позиция.');
  }

  function applyFenInput() {
    const result = parseFenSafe(fenText);
    if (result.error) { setFenError(result.error); return; }
    dispatch({ type: 'APPLY_FEN_RESULT', result: result.level });
    setSelectedSquare(null);
    setFenError('');
    setValidation('');
    notify('Позиция расставлена по FEN.');
  }

  function handleDone() {
    if (!draft.name) {
      setValidation('Укажите название уровня.');
      return;
    }
    const check = chessRules.validatePosition(draft);
    if (!check.valid) {
      setValidation(check.errors.join(' '));
      return;
    }
    if (check.droppedCastling.length) {
      dispatch({ type: 'SET_CASTLING', castling: check.castling });
      notify('Рокировка недоступна при такой расстановке: ' + check.droppedCastling.join(', '));
    }
    setValidation('');
    onNext('solution');
  }

  const ranks = orientation === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === 'white' ? FILES.split('') : FILES.split('').reverse();

  return (
    <div className="container editor-layout">
      <div className="editor-main">
        <div className="section-intro-admin">
          <span className="section-label">Шаг 1</span>
          <h2>Редактор позиции</h2>
          <p>Расставьте фигуры на доске, задайте очередь хода и права на рокировку.</p>
        </div>

        <div className="board-frame editor-board-frame">
          <div className="board-ranks" aria-hidden="true">{ranks.map(n => <span key={n}>{n}</span>)}</div>
          <Board
            position={draft.position}
            orientation={orientation}
            extraClassName={'large interactive editable' + (showCoords ? '' : ' coords-off')}
            squareClassName={(r, c) => selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c ? 'selected' : ''}
            onSquareClick={handleSquareClick}
            onSquareDrop={handleSquareDrop}
            onPieceDragStart={handlePieceDragStart}
            ariaLabel="Доска редактора позиции"
          />
          <div className="board-files" aria-hidden="true">{files.map(f => <span key={f}>{f}</span>)}</div>
        </div>

        <div className="palette-wrap">
          <span className="field-label">Палитра фигур</span>
          <Palette selected={selectedPaletteType} onSelect={p => { setSelectedPaletteType(p); setSelectedSquare(null); }} />
          <p className="hint-text">Кликните фигуру и затем клетку, чтобы поставить её, либо перетащите фигуру на доску. Повторный клик по фигуре на доске выделяет её для переноса.</p>
        </div>

        <div className="board-toolbar">
          <label className="toggle-field"><input type="checkbox" checked={showCoords} onChange={e => setShowCoords(e.target.checked)} /> Показывать координаты</label>
          <button type="button" className="panel-button ghost" onClick={handleFlip}>⇅ Flip</button>
          <button type="button" className="panel-button ghost" onClick={handleClear}>Clear</button>
          <button type="button" className="panel-button ghost" onClick={handleStandard}>Начальная позиция</button>
        </div>

        <div className="algo-box">
          <span className="field-label">Позиция по алгоритму (FEN)</span>
          <div className="algo-row">
            <input
              type="text" className="admin-input algo-input" spellCheck={false}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              value={fenText}
              onFocus={() => { setFenFocused(true); fenValueAtFocus.current = fenText; }}
              onBlur={() => { setFenFocused(false); if (fenText !== fenValueAtFocus.current) applyFenInput(); }}
              onChange={e => { setFenText(e.target.value); setFenError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
            />
            <button type="button" className="panel-button ghost" onClick={applyFenInput}>Применить</button>
          </div>
          <p className="hint-text algo-hint">
            Стандартная запись позиции (FEN) одной строкой: расстановка фигур, чей ход, права на рокировку,
            клетка взятия на проходе. Поле всегда показывает текущую позицию с доски — вставьте свою строку
            и нажмите «Применить» (или Enter), чтобы расставить фигуры по ней.
          </p>
          {fenError && <p className="feedback error algo-error show">{fenError}</p>}
        </div>
      </div>

      <aside className="editor-side">
        <details className="admin-accordion" open>
          <summary>Информация об уровне</summary>
          <div className="accordion-body">
            <label className="field-label" htmlFor="level-name">Название</label>
            <input type="text" id="level-name" className="admin-input" placeholder="Например: Мат в два хода"
              value={draft.name} onChange={e => { dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value }); setValidation(''); }} />
            <label className="field-label" htmlFor="level-description">Описание</label>
            <textarea id="level-description" ref={descriptionRef} className="admin-input" rows={3} style={{ resize: 'none', overflow: 'hidden' }}
              placeholder="Краткое описание задачи для ученика"
              value={draft.description} onChange={e => dispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value })} />
            <label className="field-label" htmlFor="level-difficulty">Сложность</label>
            <select id="level-difficulty" className="admin-input" value={draft.difficulty}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'difficulty', value: e.target.value })}>
              {DIFFICULTY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <label className="field-label" htmlFor="level-category">Категория</label>
            <input type="text" id="level-category" className="admin-input" list="category-suggestions" placeholder="Например: Мат, Тактика, Эндшпиль"
              value={draft.category} onChange={e => dispatch({ type: 'SET_FIELD', field: 'category', value: e.target.value })} />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c}></option>)}
            </datalist>
          </div>
        </details>

        <details className="admin-accordion" open>
          <summary>Параметры позиции</summary>
          <div className="accordion-body">
            <span className="field-label">Turn — кто ходит первым</span>
            <div className="segmented" role="radiogroup" aria-label="Очередь хода">
              <label className="segmented-option">
                <input type="radio" name="turn" checked={draft.turn !== 'b'} onChange={() => dispatch({ type: 'SET_TURN', turn: 'w' })} /> White
              </label>
              <label className="segmented-option">
                <input type="radio" name="turn" checked={draft.turn === 'b'} onChange={() => dispatch({ type: 'SET_TURN', turn: 'b' })} /> Black
              </label>
            </div>

            <span className="field-label">Рокировка — белые</span>
            <div className="checkbox-row">
              <label className={'toggle-field' + (possibleCastling.wOO ? '' : ' disabled')}>
                <input type="checkbox" checked={draft.castling.wOO} disabled={!possibleCastling.wOO}
                  onChange={e => dispatch({ type: 'SET_CASTLING', castling: { ...draft.castling, wOO: e.target.checked } })} /> O-O
              </label>
              <label className={'toggle-field' + (possibleCastling.wOOO ? '' : ' disabled')}>
                <input type="checkbox" checked={draft.castling.wOOO} disabled={!possibleCastling.wOOO}
                  onChange={e => dispatch({ type: 'SET_CASTLING', castling: { ...draft.castling, wOOO: e.target.checked } })} /> O-O-O
              </label>
            </div>
            <span className="field-label">Рокировка — чёрные</span>
            <div className="checkbox-row">
              <label className={'toggle-field' + (possibleCastling.bOO ? '' : ' disabled')}>
                <input type="checkbox" checked={draft.castling.bOO} disabled={!possibleCastling.bOO}
                  onChange={e => dispatch({ type: 'SET_CASTLING', castling: { ...draft.castling, bOO: e.target.checked } })} /> O-O
              </label>
              <label className={'toggle-field' + (possibleCastling.bOOO ? '' : ' disabled')}>
                <input type="checkbox" checked={draft.castling.bOOO} disabled={!possibleCastling.bOOO}
                  onChange={e => dispatch({ type: 'SET_CASTLING', castling: { ...draft.castling, bOOO: e.target.checked } })} /> O-O-O
              </label>
            </div>

            <span className="field-label">Взятие на проходе</span>
            <select className="admin-input" value={draft.enPassant || ''}
              onChange={e => dispatch({ type: 'SET_EN_PASSANT', enPassant: e.target.value || null })}>
              <option value="">Нет</option>
              {enPassantTargets.map(sq => <option key={sq} value={sq}>{sq}</option>)}
            </select>
            <p className="hint-text" style={{ marginTop: '-8px' }}>Доступно только сразу после того, как пешка соперника прошла через это поле на два хода.</p>
          </div>
        </details>

        {validation && <p ref={validationRef} className="feedback error validation-msg show">{validation}</p>}

        <div className="panel-actions editor-actions">
          <button type="button" className="panel-button ghost" onClick={() => { notify('Изменения отменены.'); onCancel(); }}>← К задачам</button>
          <button type="button" className="panel-button dark" onClick={handleDone}>Done →</button>
        </div>
      </aside>
    </div>
  );
}

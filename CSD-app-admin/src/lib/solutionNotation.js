// Текстовая нотация ходов конструктора решения — порт соответствующих
// функций из admins/js/solution-builder.js.
import { squareName, parseSquareName, pieceEmoji } from './board.js';
import { chessRules } from './chessRules.js';

export function squareLabel(coords) {
  return coords ? squareName(coords[0], coords[1]) : '—';
}

// Настоящая алгебраическая нотация (SAN) — "Kf3", "exd5", "O-O", "e8=Q",
// шах "+"/мат "#" chess.js расставляет сам, вручную дублировать эту логику
// незачем. fen — позиция ДО хода (после хода клетка "откуда" уже пуста).
// window.Chess — та же библиотека, что грузит index.html для chessRules.js
// (см. комментарий там); null, если ход не проходит (не должно случаться на
// уже провалидированных ходах решения).
export function sanFor(fen, move) {
  if (!move || !move.from || !move.to || !fen) return null;
  try {
    const chess = new window.Chess(fen);
    const result = chess.move({
      from: squareName(move.from[0], move.from[1]),
      to: squareName(move.to[0], move.to[1]),
      promotion: move.promotion || 'q'
    });
    return result ? result.san : null;
  } catch (err) {
    return null;
  }
}

// Проводит ход по FEN дальше, тем же chess.js, что и sanFor — рокировка,
// взятие на проходе и очередь хода учитываются сами, в отличие от
// chessRules.applyMove (тот двигает только фигуры на доске). Возвращает fen
// как есть, если ход почему-то не проходит (не должно случаться на уже
// провалидированных ходах решения) — во что бы то ни стало не ронять цепочку.
export function advanceFen(fen, move) {
  if (!move || !move.from || !move.to || !fen) return fen;
  try {
    const chess = new window.Chess(fen);
    chess.move({
      from: squareName(move.from[0], move.from[1]),
      to: squareName(move.to[0], move.to[1]),
      promotion: move.promotion || 'q'
    });
    return chess.fen();
  } catch (err) {
    return fen;
  }
}

// FEN до хода ученика/до ответа для всего списка шагов решения — аналог
// stepPositions (позиции-массивы) в StepsList.jsx, но в FEN, чтобы sanFor мог
// посчитать настоящую нотацию для каждого шага разом. finalFen — позиция
// ПОСЛЕ последнего шага целиком (ответ, если есть, иначе ход ученика) — по
// ней ReviewView.jsx предлагает результат партии (см. resultFor ниже).
export function fenChainFor(draft) {
  const beforePlayerFen = [];
  const beforeReplyFen = [];
  let fen = chessRules.toFen(draft);
  draft.steps.forEach(step => {
    beforePlayerFen.push(fen);
    const afterPlayerFen = advanceFen(fen, step.player);
    beforeReplyFen.push(afterPlayerFen);
    fen = step.reply ? advanceFen(afterPlayerFen, step.reply) : afterPlayerFen;
  });
  return { beforePlayerFen, beforeReplyFen, finalFen: fen };
}

// Результат партии по финальной позиции решения — мат считает chess.js, сам
// текст (1-0/0-1/½-½) собираем по тому, чей был ход (мат — у того, кто
// СЕЙЧАС должен ходить, но не может: значит, ходил и поставил мат соперник).
// null, если партия матом/патом/недостатком материала не завершается — это
// нормально для тактической задачи ("выигрывает пешку", "приводит к ничьей
// связкой" и т.п.), просто нечего предложить автоматически. ReviewView.jsx
// показывает это как подсказку, а не как обязательное значение — админ
// всегда может выбрать результат вручную (в т.ч. когда мата нет).
export function resultFor(fen) {
  if (!fen) return null;
  try {
    const chess = new window.Chess(fen);
    if (chess.isCheckmate()) return chess.turn() === 'w' ? '0-1' : '1-0';
    if (chess.isDraw()) return '1/2-1/2';
    return null;
  } catch (err) {
    return null;
  }
}

// FEN ПЕРЕД шагом с данным индексом — для «текущего», ещё не добавленного в
// draft.steps хода в конструкторе решения (аналог positionBeforeIndex в
// SolutionBuilderView.jsx).
export function fenBeforeIndex(draft, index) {
  let fen = chessRules.toFen(draft);
  for (let i = 0; i < index; i++) {
    fen = advanceFen(fen, draft.steps[i].player);
    if (draft.steps[i].reply) fen = advanceFen(fen, draft.steps[i].reply);
  }
  return fen;
}

// Подпись «Фигура откуда → куда» — before это позиция ДО хода (после хода
// клетка "откуда" уже пуста, поэтому фигуру ищем на позиции до хода).
// beforeFen — та же позиция в FEN, по ней считается настоящая нотация
// (см. sanFor); без неё — запасной вариант координатной стрелкой. Работает
// и для ещё не завершённого хода (from/to может быть null). Возвращает части
// отдельно (а не готовую строку), чтобы эмодзи фигуры можно было отрендерить
// крупнее стрелки/клеток — маленький эмодзи почти не видно.
export function moveLabelParts(move, before, beforeFen) {
  const san = sanFor(beforeFen, move);
  const arrow = san || squareLabel(move && move.from) + ' → ' + squareLabel(move && move.to);
  if (!move || !move.from || !move.to || !before) return { piece: '', arrow };
  const piece = pieceEmoji(before[move.from[0]][move.from[1]]);
  return { piece, arrow };
}

// Координатная запись хода вида "e7e5"/"♘g1f3" (эмодзи фигуры спереди —
// только для чтения человеком, сама запись/разбор от него не зависит).
export function moveToUciOrEmpty(move, beforePosition) {
  if (!move || !move.from || !move.to) return '';
  const prefix = beforePosition ? pieceEmoji(beforePosition[move.from[0]][move.from[1]]) : '';
  return prefix + squareName(move.from[0], move.from[1]) + squareName(move.to[0], move.to[1]) + (move.promotion || '');
}

// Разбор одного хода: "e7e5", "a7a8q" (превращение), опционально с эмодзи
// или буквой фигуры спереди ("♘g1f3", "Кg1f3") — при разборе префикс
// просто отбрасывается, обе формы равнозначны (буквы — для ручного набора
// с клавиатуры, эмодзи — то, что реально копируется/вставляется из полей).
export function parseUciToken(token) {
  const withoutPiece = token.trim().replace(/^(Кр|Ф|К|Л|С|[♔♚♕♛♖♜♗♝♘♞♙♟]️?)/i, '');
  const m = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/i.exec(withoutPiece);
  if (!m) return null;
  return {
    from: parseSquareName(m[1].toLowerCase()),
    to: parseSquareName(m[2].toLowerCase()),
    ...(m[3] ? { promotion: m[3].toLowerCase() } : {})
  };
}

// Разбирает строку токенов на пары (ученик, ответ) — нечётный «хвост» —
// последний шаг без ответа.
export function tokensToSteps(tokens) {
  const steps = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const player = parseUciToken(tokens[i]);
    if (!player) return { error: 'Не могу разобрать «' + tokens[i] + '». Формат хода: e7e5.' };
    let reply = null;
    if (tokens[i + 1]) {
      reply = parseUciToken(tokens[i + 1]);
      if (!reply) return { error: 'Не могу разобрать «' + tokens[i + 1] + '». Формат хода: g1f3.' };
    }
    steps.push({ player, reply });
  }
  return { steps };
}

export function copyMove(move) {
  if (!move || !move.from || !move.to) return null;
  return { from: move.from.slice(), to: move.to.slice(), ...(move.promotion ? { promotion: move.promotion } : {}) };
}

// Текстовая нотация ходов конструктора решения — порт соответствующих
// функций из admins/js/solution-builder.js.
import { squareName, parseSquareName, pieceEmoji } from './board.js';

export function squareLabel(coords) {
  return coords ? squareName(coords[0], coords[1]) : '—';
}

// Подпись «Фигура откуда → куда» — before это позиция ДО хода (после хода
// клетка "откуда" уже пуста, поэтому фигуру ищем на позиции до хода).
// Работает и для ещё не завершённого хода (from/to может быть null).
// Возвращает части отдельно (а не готовую строку), чтобы эмодзи фигуры можно
// было отрендерить крупнее стрелки/клеток — маленький эмодзи почти не видно.
export function moveLabelParts(move, before) {
  const arrow = squareLabel(move && move.from) + ' → ' + squareLabel(move && move.to);
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

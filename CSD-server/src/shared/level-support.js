// Задача считается играбельной, только если её решение реально проигрывается
// по правилам шахмат. Живёт в shared, а не в account, потому что нужна
// в двух независимых местах: кабинету ученика (бейдж «недоступно», счётчики
// «решено X из N») и админке — блокировать публикацию задачи, которую физически
// нельзя решить, вместо того чтобы ученик наткнулся на неё первым.
//
// Раньше здесь были эвристики («за чёрных нельзя», «рокировка не поддержана»):
// тренажёр был на самописном движке, который умел только белых. Теперь тренажёр
// на chess.js, и вместо угадывания сценарий просто прогоняется через ту же
// библиотеку — это и строже (ловит любой нелегальный ход, а не три известных
// случая), и честнее по причинам отказа.
const { Chess } = require('chess.js');
const chessRules = require('./chess-rules');

const WHITE_PIECES = '♙♖♘♗♕♔';
const BLACK_PIECES = '♟♜♞♝♛♚';

function isValidPosition(position) {
  if (!Array.isArray(position) || position.length !== 8) return false;
  return position.every(
    row =>
      Array.isArray(row) &&
      row.length === 8 &&
      row.every(cell => cell === '' || WHITE_PIECES.includes(cell) || BLACK_PIECES.includes(cell))
  );
}

const isSquare = value =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every(n => Number.isInteger(n) && n >= 0 && n <= 7);

const isMove = move => Boolean(move) && isSquare(move.from) && isSquare(move.to);

function isValidSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return false;
  return steps.every(step => step && isMove(step.player) && (step.reply == null || isMove(step.reply)));
}

// Ход из сценария в формате chess.js. promotion опционален: он есть в схеме
// шага (levels.validation.js), но авторы его часто не указывают — тогда
// подставляем ферзя, как и тренажёр.
function toEngineMove(move) {
  return {
    from: chessRules.squareName(move.from),
    to: chessRules.squareName(move.to),
    promotion: move.promotion || 'q'
  };
}

/**
 * Проигрывает решение по правилам. Возвращает причину отказа или null.
 *
 * Отдельно различается самый частый дефект реальных данных: очередь хода в
 * позиции не совпадает со стороной, которая делает первый ход решения (в базе
 * есть задачи, где решение начинается за чёрных, а turn остался дефолтным 'w').
 * Раньше такие задачи попадали в общую корзину «за чёрных не поддерживается».
 */
function replaySolution(level) {
  let chess;
  try {
    chess = new Chess(chessRules.toFen(level));
  } catch (err) {
    return 'Позиция задачи нелегальна';
  }

  const firstFrom = level.steps[0].player.from;
  const firstPiece = level.position[firstFrom[0]][firstFrom[1]];
  const firstIsWhite = WHITE_PIECES.includes(firstPiece);
  if (firstPiece === '' || firstIsWhite !== (chess.turn() === 'w')) {
    return 'Очередь хода в задаче не совпадает с решением';
  }

  for (const step of level.steps) {
    for (const move of [step.player, step.reply]) {
      if (!move) continue;
      try {
        // chess.js бросает на нелегальном ходе, а не возвращает null.
        chess.move(toEngineMove(move));
      } catch (err) {
        return 'Решение содержит невозможный ход';
      }
    }
  }
  return null;
}

function checkTrainerSupport(level) {
  if (!isValidPosition(level.position)) {
    return { supported: false, reason: 'Позиция задачи повреждена' };
  }
  if (!isValidSteps(level.steps)) {
    return { supported: false, reason: 'Алгоритм решения не задан' };
  }
  const reason = replaySolution(level);
  if (reason) return { supported: false, reason };
  return { supported: true, reason: null };
}

module.exports = { checkTrainerSupport };

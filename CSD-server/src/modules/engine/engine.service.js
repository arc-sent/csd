const { Chess } = require('chess.js');
const chessRules = require('../../shared/chess-rules');
const { AppError } = require('../../shared/errors');
const { createEnginePool } = require('./stockfish.pool');

// Потолки задаёт сервер, а не клиент: иначе запросом с depth=99 можно
// занять единственный процесс движка на часы и заблокировать очередь.
const MAX_DEPTH = Number(process.env.STOCKFISH_MAX_DEPTH || 20);
const MAX_MOVETIME = Number(process.env.STOCKFISH_MAX_MOVETIME || 15000);
const DEFAULT_DEPTH = Number(process.env.STOCKFISH_DEFAULT_DEPTH || 14);

let pool = createEnginePool({
  path: process.env.STOCKFISH_PATH,
  // Необязательные аргументы запуска (например, если движок вызывается через
  // скрипт-обёртку): STOCKFISH_ARGS="--threads 2"
  args: (process.env.STOCKFISH_ARGS || '').split(' ').filter(Boolean)
});

// Подмена пула — для тестов, где движок заменяется фейковым UCI-процессом.
function setPool(nextPool) {
  const previous = pool;
  pool = nextPool;
  return previous;
}

/**
 * Разбирает главный вариант движка на шаги решения.
 *
 * Ходы в PV идут подряд и чередуются по сторонам, начиная с той, чей ход в
 * позиции — она и есть «ученик». Значит чётные ходы PV (0,2,4...) — ходы
 * ученика, нечётные (1,3,5...) — ответы системы. Последний шаг может остаться
 * без ответа (мат или обрыв варианта) — тогда reply = null.
 */
function pvToSteps(fen, pv) {
  const chess = new Chess(fen);
  const moves = [];
  const warnings = [];

  for (const uci of pv) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    let move;
    try {
      move = chess.move({ from, to, promotion });
    } catch (err) {
      // Дальше вариант не воспроизводится — обрываем на том, что уже разобрали.
      break;
    }
    if (!move) break;

    // Рокировку и взятие на проходе applyMove (shared/chess-rules.js) теперь
    // распознаёт сама по форме хода — предупреждать не о чем. Превращение
    // передаём как есть: applyMove превратит пешку, если фигура указана.
    moves.push({
      from: chessRules.parseSquare(from),
      to: chessRules.parseSquare(to),
      ...(promotion ? { promotion } : {})
    });
  }

  const steps = [];
  for (let i = 0; i < moves.length; i += 2) {
    steps.push({
      player: moves[i],
      reply: moves[i + 1] || null
    });
  }
  return { steps, warnings };
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

/**
 * Считает лучший вариант для позиции уровня и отдаёт его как черновик шагов.
 * Ничего не сохраняет — решение принимает админ на фронте.
 */
async function analyzeLevel(payload) {
  // Отдавать движку заведомо нелегальную позицию бессмысленно: он либо
  // откажется её принять, либо посчитает мусор.
  const check = chessRules.validatePosition(payload);
  if (!check.valid) {
    throw new AppError(400, 'Позиция не является легальной', { errors: check.errors });
  }

  const fen = check.fen;
  const movetime = payload.movetime != null
    ? clampNumber(payload.movetime, 50, MAX_MOVETIME, null)
    : null;
  const depth = movetime ? null : clampNumber(payload.depth, 1, MAX_DEPTH, DEFAULT_DEPTH);
  const timeout = movetime ? movetime + 5000 : MAX_MOVETIME + 5000;

  const result = await pool.analyze({ fen, depth, movetime, timeout });

  if (!result.bestMove) {
    // Мат или пат — считать нечего, и это не ошибка сервера.
    throw new AppError(422, 'В этой позиции нет ходов — вероятно, мат или пат.');
  }

  const { steps, warnings } = pvToSteps(fen, result.pv);

  return {
    fen,
    bestMove: result.bestMove,
    // Оценка — от лица стороны, которая ходит (так устроен UCI).
    score: result.score,
    depth: result.depth,
    pv: result.pv,
    steps,
    warnings
  };
}

module.exports = {
  analyzeLevel,
  pvToSteps,
  setPool,
  // Геттер, а не сам объект: пул может быть заменён (тесты) — server.js
  // должен гасить актуальный.
  getPool: () => pool,
  MAX_DEPTH,
  MAX_MOVETIME
};

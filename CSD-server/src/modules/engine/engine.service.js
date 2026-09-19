const { Chess } = require('chess.js');
const chessRules = require('../../shared/chess-rules');
const { AppError } = require('../../shared/errors');
const { createEnginePool } = require('./stockfish.pool');

const MAX_DEPTH = Number(process.env.STOCKFISH_MAX_DEPTH || 20);
const MAX_MOVETIME = Number(process.env.STOCKFISH_MAX_MOVETIME || 15000);
const DEFAULT_DEPTH = Number(process.env.STOCKFISH_DEFAULT_DEPTH || 14);

let pool = createEnginePool({
  path: process.env.STOCKFISH_PATH,
  args: (process.env.STOCKFISH_ARGS || '').split(' ').filter(Boolean)
});

function setPool(nextPool) {
  const previous = pool;
  pool = nextPool;
  return previous;
}

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
      break;
    }
    if (!move) break;

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

async function analyzeLevel(payload) {
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
    throw new AppError(422, 'В этой позиции нет ходов — вероятно, мат или пат.');
  }

  const { steps, warnings } = pvToSteps(fen, result.pv);

  return {
    fen,
    bestMove: result.bestMove,
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
  getPool: () => pool,
  MAX_DEPTH,
  MAX_MOVETIME
};

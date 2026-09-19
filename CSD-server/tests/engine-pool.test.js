const path = require('path');
const { createEnginePool } = require('../src/modules/engine/stockfish.pool');

const FAKE_ENGINE = path.join(__dirname, 'fixtures', 'fake-uci-engine.js');
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function poolWith(env) {
  return createEnginePool({
    path: process.execPath,
    args: [FAKE_ENGINE],
    env: env || {},
    initTimeout: 5000
  });
}

describe('пул движка', () => {
  it('поднимает движок и возвращает разобранный результат анализа', async () => {
    const pool = poolWith({ FAKE_PV: 'e2e4 e7e5 g1f3' });
    try {
      const res = await pool.analyze({ fen: START_FEN, depth: 5, timeout: 5000 });
      expect(res.bestMove).toBe('e2e4');
      expect(res.ponder).toBe('e7e5');
      expect(res.pv).toEqual(['e2e4', 'e7e5', 'g1f3']);
      expect(res.score).toEqual({ type: 'cp', value: 34 });
      expect(res.depth).toBe(12);
    } finally {
      pool.shutdown();
    }
  });

  it('переиспользует один процесс между запросами', async () => {
    const pool = poolWith({ FAKE_PV: 'd2d4 d7d5' });
    try {
      const first = await pool.analyze({ fen: START_FEN, depth: 5, timeout: 5000 });
      expect(first.bestMove).toBe('d2d4');
      expect(pool.isRunning()).toBe(true);
      const second = await pool.analyze({ fen: START_FEN, depth: 5, timeout: 5000 });
      expect(second.bestMove).toBe('d2d4');
    } finally {
      pool.shutdown();
    }
  });

  it('выполняет параллельные запросы строго по очереди, не смешивая вывод', async () => {
    const pool = poolWith({ FAKE_PV: 'e2e4 e7e5', FAKE_DELAY: '60' });
    try {
      const results = await Promise.all([
        pool.analyze({ fen: START_FEN, depth: 5, timeout: 5000 }),
        pool.analyze({ fen: START_FEN, depth: 5, timeout: 5000 }),
        pool.analyze({ fen: START_FEN, depth: 5, timeout: 5000 })
      ]);
      results.forEach(res => {
        expect(res.bestMove).toBe('e2e4');
        expect(res.pv).toEqual(['e2e4', 'e7e5']);
      });
    } finally {
      pool.shutdown();
    }
  });

  it('отдаёт bestMove = null, когда ходов нет (мат/пат)', async () => {
    const pool = poolWith({ FAKE_MODE: 'nomove' });
    try {
      const res = await pool.analyze({ fen: START_FEN, depth: 5, timeout: 5000 });
      expect(res.bestMove).toBeNull();
      expect(res.pv).toEqual([]);
    } finally {
      pool.shutdown();
    }
  });

  it('обрывается по таймауту, если движок завис, и освобождает очередь', async () => {
    const pool = poolWith({ FAKE_MODE: 'hang' });
    try {
      await expect(
        pool.analyze({ fen: START_FEN, depth: 5, timeout: 300 })
      ).rejects.toMatchObject({ statusCode: 504 });

      expect(pool.isRunning()).toBe(false);
    } finally {
      pool.shutdown();
    }
  }, 15000);

  it('возвращает понятную ошибку, если путь к движку не задан', async () => {
    const pool = createEnginePool({ path: '' });
    await expect(pool.analyze({ fen: START_FEN, depth: 5, timeout: 1000 }))
      .rejects.toMatchObject({ statusCode: 503 });
    pool.shutdown();
  });

  it('возвращает понятную ошибку, если бинарник не найден', async () => {
    const pool = createEnginePool({ path: 'definitely-not-a-real-engine-binary', initTimeout: 2000 });
    await expect(pool.analyze({ fen: START_FEN, depth: 5, timeout: 2000 }))
      .rejects.toMatchObject({ statusCode: 503 });
    pool.shutdown();
  }, 10000);
});

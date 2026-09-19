require('dotenv').config();
const path = require('path');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');
const engineService = require('../src/modules/engine/engine.service');
const { createEnginePool } = require('../src/modules/engine/stockfish.pool');

const FAKE_ENGINE = path.join(__dirname, 'fixtures', 'fake-uci-engine.js');
const TEST_EMAIL = 'test-engine-module@chesslab.local';
const TEST_PASSWORD = 'super-secret-123';

function emptyBoard() {
  return Array.from({ length: 8 }, () => Array(8).fill(''));
}

function startPosition() {
  const back = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'];
  const position = emptyBoard();
  position[0] = back.slice();
  position[1] = Array(8).fill('♟');
  position[6] = Array(8).fill('♙');
  position[7] = ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'];
  return position;
}

function analyzePayload(overrides = {}) {
  return {
    position: startPosition(),
    turn: 'w',
    castling: { wOO: true, wOOO: true, bOO: true, bOOO: true },
    depth: 5,
    ...overrides
  };
}

describe('Engine API', () => {
  let app;
  let token;
  let fakePool;
  let originalPool;

  beforeAll(async () => {
    app = createApp();
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await prisma.adminUser.upsert({
      where: { email: TEST_EMAIL },
      update: { passwordHash },
      create: { email: TEST_EMAIL, passwordHash }
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    token = loginRes.body.token;

    fakePool = createEnginePool({
      path: process.execPath,
      args: [FAKE_ENGINE],
      env: { FAKE_PV: 'e2e4 e7e5 g1f3' }
    });
    originalPool = engineService.setPool(fakePool);
  });

  afterAll(async () => {
    fakePool.shutdown();
    engineService.setPool(originalPool);
    await prisma.adminUser.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  it('не пускает без токена', async () => {
    const res = await request(app).post('/api/engine/analyze').send(analyzePayload());
    expect(res.status).toBe(401);
  });

  it('отклоняет некорректное тело запроса', async () => {
    const res = await request(app)
      .post('/api/engine/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ position: [['']], castling: {} });
    expect(res.status).toBe(400);
  });

  it('отклоняет нелегальную позицию до обращения к движку', async () => {
    const position = emptyBoard();
    position[7][4] = '♔';
    position[0][4] = '♚';
    position[6][4] = '♕';
    const res = await request(app)
      .post('/api/engine/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send(analyzePayload({
        position,
        castling: { wOO: false, wOOO: false, bOO: false, bOOO: false }
      }));
    expect(res.status).toBe(400);
    expect(res.body.details.errors.join(' ')).toContain('Чёрный король под шахом');
  });

  it('возвращает лучший ход, оценку и готовый черновик шагов', async () => {
    const res = await request(app)
      .post('/api/engine/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send(analyzePayload());

    expect(res.status).toBe(200);
    expect(res.body.bestMove).toBe('e2e4');
    expect(res.body.score).toEqual({ type: 'cp', value: 34 });
    expect(res.body.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

    expect(res.body.steps).toHaveLength(2);
    expect(res.body.steps[0]).toEqual({
      player: { from: [6, 4], to: [4, 4] },
      reply: { from: [1, 4], to: [3, 4] }
    });
    expect(res.body.steps[1].player).toEqual({ from: [7, 6], to: [5, 5] });
    expect(res.body.steps[1].reply).toBeNull();
    expect(res.body.warnings).toEqual([]);
  });

  it('отвечает 422, если в позиции нет ходов (мат или пат)', async () => {
    const noMovePool = createEnginePool({
      path: process.execPath,
      args: [FAKE_ENGINE],
      env: { FAKE_MODE: 'nomove' }
    });
    const previous = engineService.setPool(noMovePool);
    try {
      const res = await request(app)
        .post('/api/engine/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(analyzePayload());
      expect(res.status).toBe(422);
    } finally {
      noMovePool.shutdown();
      engineService.setPool(previous);
    }
  });

  it('отвечает 503, если путь к движку не настроен', async () => {
    const brokenPool = createEnginePool({ path: '' });
    const previous = engineService.setPool(brokenPool);
    try {
      const res = await request(app)
        .post('/api/engine/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(analyzePayload());
      expect(res.status).toBe(503);
      expect(res.body.error).toContain('STOCKFISH_PATH');
    } finally {
      brokenPool.shutdown();
      engineService.setPool(previous);
    }
  });
});

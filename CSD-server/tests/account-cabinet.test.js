require('dotenv').config();
const request = require('supertest');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

const U1_EMAIL = 'test-cabinet-u1@chesslab.local';
const U2_EMAIL = 'test-cabinet-u2@chesslab.local';
const PASSWORD = 'super-secret-123';

const validPosition = () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(''));
  board[0][6] = '♚';
  board[4][3] = '♕';
  board[7][6] = '♔';
  return board;
};
const validSteps = [{ player: { from: [4, 3], to: [0, 3] }, reply: null }];
const castling = { wOO: false, wOOO: false, bOO: false, bOOO: false };

describe('Account: личный кабинет', () => {
  let app;
  let stageId;
  let assignmentA;
  let assignmentB;
  let levelIds = [];
  let unsupportedLevelId;
  let blackSolutionLevelId;
  let blackPlayableLevelId;
  let brokenLevelId;
  let u1;
  let u2;

  const auth = user => ({ Authorization: `Bearer ${user.token}` });

  beforeAll(async () => {
    app = createApp();

    const stage = await prisma.stage.create({ data: { name: 'Этап кабинета', status: 'published' } });
    stageId = stage.id;
    assignmentA = (await prisma.assignment.create({
      data: { stageId, name: 'Задание A', price: 1000, status: 'published' }
    })).id;
    assignmentB = (await prisma.assignment.create({
      data: { stageId, name: 'Задание B', price: 1000, status: 'published' }
    })).id;

    for (let i = 1; i <= 3; i++) {
      const level = await prisma.level.create({
        data: {
          name: `Задача ${i}`,
          assignmentId: assignmentA,
          status: 'published',
          position: validPosition(),
          castling,
          steps: validSteps,
          createdAt: new Date(Date.UTC(2026, 0, i))
        }
      });
      levelIds.push(level.id);
    }
    await prisma.level.create({
      data: {
        name: 'Черновик',
        assignmentId: assignmentA,
        status: 'draft',
        position: validPosition(),
        castling,
        steps: validSteps
      }
    });
    unsupportedLevelId = (await prisma.level.create({
      data: {
        name: 'За чёрных',
        assignmentId: assignmentA,
        status: 'published',
        position: validPosition(),
        turn: 'b',
        castling,
        steps: validSteps,
        createdAt: new Date(Date.UTC(2026, 0, 4))
      }
    })).id;
    blackSolutionLevelId = (await prisma.level.create({
      data: {
        name: 'Решение за чёрных',
        assignmentId: assignmentA,
        status: 'published',
        position: (() => {
          const board = validPosition();
          board[3][3] = '♞';
          return board;
        })(),
        turn: 'w',
        castling,
        steps: [{ player: { from: [3, 3], to: [1, 4] }, reply: null }],
        createdAt: new Date(Date.UTC(2026, 0, 6))
      }
    })).id;
    blackPlayableLevelId = (await prisma.level.create({
      data: {
        name: 'За чёрных: ферзь',
        assignmentId: assignmentA,
        status: 'published',
        position: (() => {
          const board = Array.from({ length: 8 }, () => Array(8).fill(''));
          board[0][6] = '♚';
          board[3][3] = '♛';
          board[7][6] = '♔';
          return board;
        })(),
        turn: 'b',
        castling,
        steps: [{ player: { from: [3, 3], to: [7, 3] }, reply: null }],
        createdAt: new Date(Date.UTC(2026, 0, 7))
      }
    })).id;
    brokenLevelId = (await prisma.level.create({
      data: {
        name: 'Битая позиция',
        assignmentId: assignmentA,
        status: 'published',
        position: [],
        castling,
        steps: validSteps,
        createdAt: new Date(Date.UTC(2026, 0, 5))
      }
    })).id;

    await prisma.level.create({
      data: {
        name: 'Задача из B',
        assignmentId: assignmentB,
        status: 'published',
        position: validPosition(),
        castling,
        steps: validSteps
      }
    });

    await prisma.user.deleteMany({ where: { email: { in: [U1_EMAIL, U2_EMAIL] } } });
    const r1 = await request(app).post('/api/account/register').send({ email: U1_EMAIL, password: PASSWORD });
    const r2 = await request(app).post('/api/account/register').send({ email: U2_EMAIL, password: PASSWORD });
    u1 = { id: r1.body.user.id, token: r1.body.token };
    u2 = { id: r2.body.user.id, token: r2.body.token };
    await prisma.user.updateMany({ where: { id: { in: [u1.id, u2.id] } }, data: { emailVerifiedAt: new Date() } });

    await prisma.payment.create({
      data: { yookassaId: 'cab-a-u1', assignmentId: assignmentA, userId: u1.id, email: U1_EMAIL, amount: 1000, status: 'succeeded' }
    });
    await prisma.payment.create({
      data: { yookassaId: 'cab-b-u2', assignmentId: assignmentB, userId: u2.id, email: U2_EMAIL, amount: 1000, status: 'succeeded' }
    });
    await prisma.payment.create({
      data: { yookassaId: 'cab-b-u1-pending', assignmentId: assignmentB, userId: u1.id, email: U1_EMAIL, amount: 1000, status: 'pending' }
    });
  });

  afterAll(async () => {
    await prisma.levelProgress.deleteMany({ where: { userId: { in: [u1.id, u2.id] } } });
    await prisma.payment.deleteMany({ where: { userId: { in: [u1.id, u2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [u1.id, u2.id] } } });
    await prisma.level.deleteMany({ where: { assignmentId: { in: [assignmentA, assignmentB] } } });
    await prisma.assignment.deleteMany({ where: { id: { in: [assignmentA, assignmentB] } } });
    await prisma.stage.deleteMany({ where: { id: stageId } });
    await prisma.$disconnect();
  });

  describe('GET /api/account/assignments', () => {
    it('401 без токена', async () => {
      expect((await request(app).get('/api/account/assignments')).status).toBe(401);
    });

    it('показывает только купленное и считает только опубликованные задачи', async () => {
      const res = await request(app).get('/api/account/assignments').set(auth(u1));
      expect(res.status).toBe(200);
      expect(res.body.assignments).toHaveLength(1);
      expect(res.body.assignments[0]).toMatchObject({
        id: assignmentA,
        name: 'Задание A',
        levelsCount: 7,
        solvedCount: 0
      });
    });
  });

  describe('GET /api/account/assignments/:id/levels', () => {
    it('не отдаёт чужое задание', async () => {
      const res = await request(app).get(`/api/account/assignments/${assignmentB}/levels`).set(auth(u1));
      expect(res.status).toBe(403);
    });

    it('неоплаченный платёж доступа не даёт', async () => {
      const res = await request(app).get(`/api/account/assignments/${assignmentB}/levels`).set(auth(u1));
      expect(res.status).toBe(403);
    });

    it('нумерует задачи по порядку создания и прячет черновики', async () => {
      const res = await request(app).get(`/api/account/assignments/${assignmentA}/levels`).set(auth(u1));
      expect(res.status).toBe(200);
      expect(res.body.levels.map(l => l.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(res.body.levels.map(l => l.name)).toEqual([
        'Задача 1', 'Задача 2', 'Задача 3', 'За чёрных', 'Битая позиция', 'Решение за чёрных', 'За чёрных: ферзь'
      ]);
    });

    it('не отдаёт решения задач', async () => {
      const res = await request(app).get(`/api/account/assignments/${assignmentA}/levels`).set(auth(u1));
      expect(JSON.stringify(res.body)).not.toContain('steps');
      expect(JSON.stringify(res.body)).not.toContain('position');
    });

    it('помечает задачи, которые тренажёр не отыграет', async () => {
      const res = await request(app).get(`/api/account/assignments/${assignmentA}/levels`).set(auth(u1));
      const byId = Object.fromEntries(res.body.levels.map(l => [l.id, l]));
      expect(byId[unsupportedLevelId].supported).toBe(false);
      expect(byId[unsupportedLevelId].unsupportedReason).toContain('Очередь хода');
      expect(byId[brokenLevelId].supported).toBe(false);
      expect(byId[levelIds[0]].supported).toBe(true);
    });

    it('ловит задачу, где решение начинается ходом чёрных, хотя turn=w', async () => {
      const res = await request(app).get(`/api/account/assignments/${assignmentA}/levels`).set(auth(u1));
      const level = res.body.levels.find(l => l.id === blackSolutionLevelId);
      expect(level.supported).toBe(false);
      expect(level.unsupportedReason).toContain('Очередь хода');
    });

    it('задача за чёрных, где очередь хода совпадает с решением, поддерживается', async () => {
      const res = await request(app).get(`/api/account/assignments/${assignmentA}/levels`).set(auth(u1));
      const level = res.body.levels.find(l => l.id === blackPlayableLevelId);
      expect(level.supported).toBe(true);
      expect(level.unsupportedReason).toBeNull();
    });
  });

  describe('GET /api/account/levels/:id', () => {
    it('отдаёт решение только владельцу задания', async () => {
      const mine = await request(app).get(`/api/account/levels/${levelIds[0]}`).set(auth(u1));
      expect(mine.status).toBe(200);
      expect(mine.body.level.steps).toHaveLength(1);

      const foreign = await request(app).get(`/api/account/levels/${levelIds[0]}`).set(auth(u2));
      expect(foreign.status).toBe(403);
    });

    it('404 на несуществующую задачу', async () => {
      const res = await request(app).get('/api/account/levels/does-not-exist').set(auth(u1));
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/account/levels/:id/progress', () => {
    it('записывает решение и обновляет счётчик в кабинете', async () => {
      const res = await request(app)
        .post(`/api/account/levels/${levelIds[0]}/progress`)
        .set(auth(u1))
        .send({ event: 'solved', usedSolution: false });

      expect(res.status).toBe(200);
      expect(res.body.progress.solved).toBe(true);

      const cabinet = await request(app).get('/api/account/assignments').set(auth(u1));
      expect(cabinet.body.assignments[0].solvedCount).toBe(1);
    });

    it('идемпотентен: повтор не создаёт дубль и не сдвигает дату первого решения', async () => {
      const first = await prisma.levelProgress.findUnique({
        where: { userId_levelId: { userId: u1.id, levelId: levelIds[0] } }
      });

      const res = await request(app)
        .post(`/api/account/levels/${levelIds[0]}/progress`)
        .set(auth(u1))
        .send({ event: 'solved', usedSolution: true });
      expect(res.status).toBe(200);

      const rows = await prisma.levelProgress.findMany({ where: { userId: u1.id, levelId: levelIds[0] } });
      expect(rows).toHaveLength(1);
      expect(rows[0].solvedAt.getTime()).toBe(first.solvedAt.getTime());
      expect(rows[0].usedSolution).toBe(true);
    });

    it('нельзя записать прогресс по чужому заданию', async () => {
      const res = await request(app)
        .post(`/api/account/levels/${levelIds[1]}/progress`)
        .set(auth(u2))
        .send({ event: 'solved' });
      expect(res.status).toBe(403);
    });

    it('отклоняет неизвестное событие', async () => {
      const res = await request(app)
        .post(`/api/account/levels/${levelIds[1]}/progress`)
        .set(auth(u1))
        .send({ event: 'unsolved' });
      expect(res.status).toBe(400);
    });
  });
});

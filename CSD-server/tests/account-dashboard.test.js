require('dotenv').config();
const request = require('supertest');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

const PASSWORD = 'super-secret-123';
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = n => new Date(Date.now() - n * DAY_MS);

// Валидная позиция: белый ферзь d4, белый король g1, чёрный король g8.
const validPosition = () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(''));
  board[0][6] = '♚';
  board[4][3] = '♕';
  board[7][6] = '♔';
  return board;
};
const validSteps = [{ player: { from: [4, 3], to: [0, 3] }, reply: null }];
const castling = { wOO: false, wOOO: false, bOO: false, bOOO: false };

const auth = user => ({ Authorization: `Bearer ${user.token}` });

async function registerUser(app, email) {
  const res = await request(app).post('/api/account/register').send({ email, password: PASSWORD });
  // Дашборд и кабинет теперь требуют подтверждённую почту — эти тесты не про
  // само подтверждение (см. email-verification.test.js), поэтому подтверждаем
  // сразу в обход письма/кода.
  await prisma.user.update({ where: { id: res.body.user.id }, data: { emailVerifiedAt: new Date() } });
  return { id: res.body.user.id, token: res.body.token };
}

async function buyAssignment(userId, assignmentId, email) {
  await prisma.payment.create({
    data: {
      yookassaId: `dash-${assignmentId}-${userId}`,
      assignmentId,
      userId,
      email,
      amount: 1000,
      status: 'succeeded'
    }
  });
}

// createdAt задаётся явно (по образцу account-cabinet.test.js): порядок
// задач в кабинете идёт по createdAt, а параллельные prisma.create() не
// гарантируют, что реальные метки времени совпадут с порядком в массиве.
async function makeLevel(assignmentId, name, createdAt) {
  return prisma.level.create({
    data: { name, assignmentId, status: 'published', position: validPosition(), castling, steps: validSteps, createdAt }
  });
}

async function solve(userId, levelId, { solvedAt, usedSolution = false, mistakes = 0 }) {
  await prisma.levelProgress.create({
    data: { userId, levelId, solved: true, solvedAt, usedSolution, mistakes }
  });
}

describe('Account: дашборд кабинета — GET /api/account/dashboard', () => {
  let app;
  let stageId;

  beforeAll(async () => {
    app = createApp();
    stageId = (await prisma.stage.create({ data: { name: 'Этап дашборда', status: 'published' } })).id;
  });

  afterAll(async () => {
    await prisma.stage.deleteMany({ where: { id: stageId } });
    await prisma.$disconnect();
  });

  it('401 без токена', async () => {
    expect((await request(app).get('/api/account/dashboard')).status).toBe(401);
  });

  it('нулевой дашборд, если ничего не куплено', async () => {
    const user = await registerUser(app, 'dash-empty@chesslab.local');
    const res = await request(app).get('/api/account/dashboard').set(auth(user));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      streakDays: 0,
      totalSolved: 0,
      accuracy: null,
      continue: null,
      weekActivity: Array(7).fill(false)
    });
    expect(res.body.achievements.every(a => !a.unlocked)).toBe(true);
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  describe('основной сценарий: точность, серия, «продолжить»', () => {
    let user;
    let assignmentA;
    let assignmentB;
    let a1, a2, a3, b1, b2, b3;

    beforeAll(async () => {
      user = await registerUser(app, 'dash-main@chesslab.local');

      assignmentA = (await prisma.assignment.create({
        data: { stageId, name: 'Дашборд: задание A', price: 1000, status: 'published' }
      })).id;
      assignmentB = (await prisma.assignment.create({
        data: { stageId, name: 'Дашборд: задание B', price: 1000, status: 'published' }
      })).id;

      [a1, a2, a3] = await Promise.all([
        makeLevel(assignmentA, 'A1', new Date(Date.UTC(2026, 0, 1))),
        makeLevel(assignmentA, 'A2', new Date(Date.UTC(2026, 0, 2))),
        makeLevel(assignmentA, 'A3', new Date(Date.UTC(2026, 0, 3)))
      ]);
      [b1, b2, b3] = await Promise.all([
        makeLevel(assignmentB, 'B1', new Date(Date.UTC(2026, 0, 1))),
        makeLevel(assignmentB, 'B2', new Date(Date.UTC(2026, 0, 2))),
        makeLevel(assignmentB, 'B3', new Date(Date.UTC(2026, 0, 3)))
      ]);

      await buyAssignment(user.id, assignmentA, 'dash-main@chesslab.local');
      await buyAssignment(user.id, assignmentB, 'dash-main@chesslab.local');

      // A: решено 3 дня назад и вчера (последнее решение в A — вчера).
      // usedSolution:true на одном решении — проверяет расчёт точности.
      await solve(user.id, a1.id, { solvedAt: daysAgo(3), usedSolution: false });
      await solve(user.id, a2.id, { solvedAt: daysAgo(1), usedSolution: true });

      // B: решено позавчера — старее, чем последнее решение в A.
      await solve(user.id, b1.id, { solvedAt: daysAgo(2), usedSolution: false });
    });

    afterAll(async () => {
      await prisma.levelProgress.deleteMany({ where: { userId: user.id } });
      await prisma.payment.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.level.deleteMany({ where: { assignmentId: { in: [assignmentA, assignmentB] } } });
      await prisma.assignment.deleteMany({ where: { id: { in: [assignmentA, assignmentB] } } });
    });

    it('считает totalSolved и accuracy по usedSolution', async () => {
      const res = await request(app).get('/api/account/dashboard').set(auth(user));
      expect(res.status).toBe(200);
      expect(res.body.totalSolved).toBe(3);
      // 2 решения без подсказки из 3 → 67%.
      expect(res.body.accuracy).toBe(67);
    });

    it('серия — 3 дня подряд (позавчера/вчера/3 дня назад), сегодня не решали', async () => {
      const res = await request(app).get('/api/account/dashboard').set(auth(user));
      expect(res.body.streakDays).toBe(3);
    });

    it('weekActivity отмечает верные дни за последнюю неделю', async () => {
      const res = await request(app).get('/api/account/dashboard').set(auth(user));
      const week = res.body.weekActivity;
      expect(week).toHaveLength(7);
      // Индекс 6 — сегодня, 5 — вчера, 4 — позавчера, 3 — 3 дня назад.
      expect(week[6]).toBe(false);
      expect(week[5]).toBe(true);
      expect(week[4]).toBe(true);
      expect(week[3]).toBe(true);
      expect(week[2]).toBe(false);
    });

    it('«продолжить» ведёт в задание, где решали последним (A), на первую нерешённую задачу', async () => {
      const res = await request(app).get('/api/account/dashboard').set(auth(user));
      expect(res.body.continue).toMatchObject({
        assignmentId: assignmentA,
        levelId: a3.id,
        levelIndex: 3,
        solvedCount: 2,
        levelsCount: 3
      });
    });

    it('достижения ещё не разблокированы, но прогресс посчитан', async () => {
      const res = await request(app).get('/api/account/dashboard').set(auth(user));
      const byId = Object.fromEntries(res.body.achievements.map(a => [a.key, a]));
      expect(byId['streak-week'].unlocked).toBe(false);
      expect(byId['streak-week'].progress).toBe(43); // round(3/7*100)
      expect(byId['accurate-100'].unlocked).toBe(false);
      expect(byId['marathon'].unlocked).toBe(false);
    });

    it('когда все купленные задания решены — continue: null', async () => {
      await solve(user.id, a3.id, { solvedAt: daysAgo(0) });
      await solve(user.id, b2.id, { solvedAt: daysAgo(0) });
      await solve(user.id, b3.id, { solvedAt: daysAgo(0) });

      const res = await request(app).get('/api/account/dashboard').set(auth(user));
      expect(res.body.continue).toBeNull();
    });
  });

  describe('пороги достижений: серия 7 дней и марафон', () => {
    let user;
    let assignmentId;

    beforeAll(async () => {
      user = await registerUser(app, 'dash-thresholds@chesslab.local');
      assignmentId = (await prisma.assignment.create({
        data: { stageId, name: 'Дашборд: пороги', price: 1000, status: 'published' }
      })).id;
      await buyAssignment(user.id, assignmentId, 'dash-thresholds@chesslab.local');

      // Серия ровно 7 дней: по одной решённой задаче в день, включая сегодня.
      const streakLevels = await Promise.all(
        Array.from({ length: 7 }, (_, i) => makeLevel(assignmentId, `Серия ${i}`))
      );
      await Promise.all(streakLevels.map((level, i) => solve(user.id, level.id, { solvedAt: daysAgo(6 - i) })));

      // Марафон: 30 решений в один и тот же день (сегодня же, чтобы не сбить серию).
      const marathonLevels = await Promise.all(
        Array.from({ length: 30 }, (_, i) => makeLevel(assignmentId, `Марафон ${i}`))
      );
      await Promise.all(marathonLevels.map(level => solve(user.id, level.id, { solvedAt: daysAgo(0) })));
    });

    afterAll(async () => {
      await prisma.levelProgress.deleteMany({ where: { userId: user.id } });
      await prisma.payment.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.level.deleteMany({ where: { assignmentId } });
      await prisma.assignment.deleteMany({ where: { id: assignmentId } });
    });

    it('разблокирует «Серия 7 дней» и «Марафон»', async () => {
      const res = await request(app).get('/api/account/dashboard').set(auth(user));
      expect(res.status).toBe(200);
      expect(res.body.streakDays).toBe(7);
      const byId = Object.fromEntries(res.body.achievements.map(a => [a.key, a]));
      expect(byId['streak-week'].unlocked).toBe(true);
      expect(byId['streak-week'].progress).toBe(100);
      expect(byId['marathon'].unlocked).toBe(true);
    });

    it('сохраняет достижения в БД с датой и не дублирует их при повторных запросах', async () => {
      await request(app).get('/api/account/dashboard').set(auth(user));
      await request(app).get('/api/account/dashboard').set(auth(user));

      const rows = await prisma.userAchievement.findMany({ where: { userId: user.id, key: 'marathon' } });
      expect(rows).toHaveLength(1);
      expect(rows[0].unlockedAt).toBeInstanceOf(Date);
    });

    it('«новое достижение» подсвечивается один раз — до отметки о показе', async () => {
      const before = await request(app).get('/api/account/dashboard').set(auth(user));
      expect(before.body.achievements.find(a => a.key === 'marathon').isNew).toBe(true);

      const seen = await request(app).post('/api/account/achievements/seen').set(auth(user));
      expect(seen.status).toBe(204);

      const after = await request(app).get('/api/account/dashboard').set(auth(user));
      const marathon = after.body.achievements.find(a => a.key === 'marathon');
      expect(marathon.isNew).toBe(false);
      expect(marathon.unlocked).toBe(true);
      expect(marathon.unlockedAt).not.toBeNull();
    });
  });

  describe('ошибочные ходы и точность', () => {
    let user;
    let assignmentId;
    let levels;

    beforeAll(async () => {
      user = await registerUser(app, 'dash-mistakes@chesslab.local');
      assignmentId = (await prisma.assignment.create({
        data: { stageId, name: 'Дашборд: ошибки', price: 1000, status: 'published' }
      })).id;
      await buyAssignment(user.id, assignmentId, 'dash-mistakes@chesslab.local');
      levels = await Promise.all([
        makeLevel(assignmentId, 'Ошибки 1', new Date(Date.UTC(2026, 0, 1))),
        makeLevel(assignmentId, 'Ошибки 2', new Date(Date.UTC(2026, 0, 2)))
      ]);
    });

    afterAll(async () => {
      await prisma.levelProgress.deleteMany({ where: { userId: user.id } });
      await prisma.payment.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.level.deleteMany({ where: { assignmentId } });
      await prisma.assignment.deleteMany({ where: { id: assignmentId } });
    });

    it('копит ошибки по задаче через POST /progress {event:"mistake"}', async () => {
      for (let i = 0; i < 2; i++) {
        const res = await request(app)
          .post(`/api/account/levels/${levels[0].id}/progress`)
          .set(auth(user))
          .send({ event: 'mistake' });
        expect(res.status).toBe(200);
      }
      const row = await prisma.levelProgress.findUnique({
        where: { userId_levelId: { userId: user.id, levelId: levels[0].id } }
      });
      expect(row.mistakes).toBe(2);
      // Ошибка сама по себе не засчитывает задачу решённой.
      expect(row.solved).toBe(false);
    });

    it('задача с ошибкой не попадает в «чисто решённые», и точность падает', async () => {
      await request(app)
        .post(`/api/account/levels/${levels[0].id}/progress`)
        .set(auth(user))
        .send({ event: 'solved' });
      await request(app)
        .post(`/api/account/levels/${levels[1].id}/progress`)
        .set(auth(user))
        .send({ event: 'solved' });

      const res = await request(app).get('/api/account/dashboard').set(auth(user));
      expect(res.body.totalSolved).toBe(2);
      expect(res.body.cleanSolved).toBe(1); // вторая решена без ошибок
      expect(res.body.totalMistakes).toBe(2);
      expect(res.body.accuracy).toBe(50);
    });

    it('отклоняет неизвестное событие', async () => {
      const res = await request(app)
        .post(`/api/account/levels/${levels[0].id}/progress`)
        .set(auth(user))
        .send({ event: 'unsolved' });
      expect(res.status).toBe(400);
    });
  });

  describe('часовой пояс и рекорд серии', () => {
    let user;
    let assignmentId;

    beforeAll(async () => {
      user = await registerUser(app, 'dash-timezone@chesslab.local');
      assignmentId = (await prisma.assignment.create({
        data: { stageId, name: 'Дашборд: пояс', price: 1000, status: 'published' }
      })).id;
      await buyAssignment(user.id, assignmentId, 'dash-timezone@chesslab.local');
    });

    afterAll(async () => {
      await prisma.levelProgress.deleteMany({ where: { userId: user.id } });
      await prisma.payment.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
      await prisma.level.deleteMany({ where: { assignmentId } });
      await prisma.assignment.deleteMany({ where: { id: assignmentId } });
    });

    it('считает рекорд серии, даже когда текущая серия уже оборвалась', async () => {
      // Четыре дня подряд далеко в прошлом (рекорд) и один день вчера (текущая).
      const levels = await Promise.all(
        Array.from({ length: 5 }, (_, i) => makeLevel(assignmentId, `Рекорд ${i}`))
      );
      const offsets = [20, 19, 18, 17, 1];
      await Promise.all(levels.map((level, i) => solve(user.id, level.id, { solvedAt: daysAgo(offsets[i]) })));

      const res = await request(app).get('/api/account/dashboard').set(auth(user));
      expect(res.body.streakDays).toBe(1);
      expect(res.body.longestStreak).toBe(4);
    });

    it('один и тот же момент времени попадает в разные дни в разных поясах', async () => {
      // 22:30 UTC — это уже следующий день в Москве (+3), но ещё текущий в UTC.
      const level = await makeLevel(assignmentId, 'Полночь');
      const lateUtc = new Date();
      lateUtc.setUTCDate(lateUtc.getUTCDate() - 3);
      lateUtc.setUTCHours(22, 30, 0, 0);
      await solve(user.id, level.id, { solvedAt: lateUtc });

      const dayIn = tz =>
        new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(lateUtc);
      expect(dayIn('UTC')).not.toBe(dayIn('Europe/Moscow'));

      const utcRes = await request(app).get('/api/account/dashboard').set(auth(user));
      const utcWeek = utcRes.body.weekActivity;

      const put = await request(app)
        .put('/api/account/timezone')
        .set(auth(user))
        .send({ timeZone: 'Europe/Moscow' });
      expect(put.status).toBe(204);

      const mskRes = await request(app).get('/api/account/dashboard').set(auth(user));
      // День решения сдвинулся, значит и картина недели другая.
      expect(mskRes.body.weekActivity).not.toEqual(utcWeek);
    });

    it('отклоняет несуществующий часовой пояс', async () => {
      const res = await request(app)
        .put('/api/account/timezone')
        .set(auth(user))
        .send({ timeZone: 'Mars/Olympus' });
      expect(res.status).toBe(400);
    });
  });
});

require('dotenv').config();
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

const TEST_EMAIL = 'test-levels-module@chesslab.local';
const TEST_PASSWORD = 'super-secret-123';

function emptyBoard() {
  return Array.from({ length: 8 }, () => Array(8).fill(''));
}

function samplePayload(overrides = {}) {
  const position = emptyBoard();
  position[7][4] = '♔';
  position[0][4] = '♚';
  return {
    name: 'Тестовый уровень',
    description: 'Описание',
    difficulty: 'medium',
    category: 'Мат',
    position,
    turn: 'w',
    castling: { wOO: true, wOOO: true, bOO: true, bOOO: true },
    steps: [{ player: { from: [7, 4], to: [7, 5] }, reply: null }],
    ...overrides
  };
}

describe('Levels module', () => {
  let app;
  let token;
  const createdIds = [];

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
  });

  afterAll(async () => {
    await prisma.level.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.adminUser.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  it('не пускает без токена ни на один маршрут уровней', async () => {
    const list = await request(app).get('/api/levels');
    const create = await request(app).post('/api/levels').send(samplePayload());
    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
  });

  it('отклоняет создание с некорректной позицией (не 8x8)', async () => {
    const bad = samplePayload({ position: [[''], ['']] });
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(bad);
    expect(res.status).toBe(400);
  });

  it('создаёт уровень со статусом draft по умолчанию', async () => {
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload());
    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.status).toBe('draft');
    expect(res.body.steps).toHaveLength(1);
    createdIds.push(res.body.id);
  });

  it('сохраняет и возвращает solvedNote — объяснение после решения', async () => {
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ solvedNote: 'Конь идёт на f6, открывая вилку.' }));
    expect(res.status).toBe(201);
    expect(res.body.solvedNote).toBe('Конь идёт на f6, открывая вилку.');

    const getRes = await request(app)
      .get(`/api/levels/${res.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.solvedNote).toBe('Конь идёт на f6, открывая вилку.');

    createdIds.push(res.body.id);
  });

  it('по умолчанию сохраняет solvedNote пустой строкой, если не передан', async () => {
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload());
    expect(res.status).toBe(201);
    expect(res.body.solvedNote).toBe('');
    createdIds.push(res.body.id);
  });

  it('отдаёт список, включающий созданный уровень', async () => {
    const res = await request(app).get('/api/levels').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.some(l => l.id === createdIds[0])).toBe(true);
  });

  it('отдаёт 404 для несуществующего id', async () => {
    const res = await request(app)
      .get('/api/levels/does-not-exist')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('обновляет уровень целиком через PUT', async () => {
    const res = await request(app)
      .put(`/api/levels/${createdIds[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ name: 'Обновлённое название' }));
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Обновлённое название');
  });

  it('переключает статус через PATCH /:id/status', async () => {
    const res = await request(app)
      .patch(`/api/levels/${createdIds[0]}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
    expect(res.body.playability).toEqual({ supported: true, reason: null });
  });

  it('отклоняет некорректный статус', async () => {
    const res = await request(app)
      .patch(`/api/levels/${createdIds[0]}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'not-a-real-status' });
    expect(res.status).toBe(400);
  });

  it('отклоняет нелегальную позицию — шах стороне, которая не ходит', async () => {
    const position = emptyBoard();
    position[7][4] = '♔';
    position[0][4] = '♚';
    position[6][4] = '♕';
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ position, turn: 'w' }));
    expect(res.status).toBe(400);
    expect(res.body.details.errors.join(' ')).toContain('Чёрный король под шахом');
  });

  it('отклоняет позицию без короля даже при валидной структуре 8x8', async () => {
    const position = emptyBoard();
    position[7][4] = '♔';
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ position }));
    expect(res.status).toBe(400);
    expect(res.body.details.errors.join(' ')).toContain('нет чёрного короля');
  });

  it('сохраняет права на рокировку очищенными от невозможных', async () => {
    const position = emptyBoard();
    position[7][4] = '♔';
    position[7][7] = '♖';
    position[0][4] = '♚';
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({
        position,
        castling: { wOO: true, wOOO: true, bOO: true, bOOO: true }
      }));
    expect(res.status).toBe(201);
    expect(res.body.castling).toEqual({ wOO: true, wOOO: false, bOO: false, bOOO: false });
    createdIds.push(res.body.id);
  });

  it('сохраняет фигуру превращения в ходе решения, а не срезает её', async () => {
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({
        steps: [{ player: { from: [1, 0], to: [0, 0], promotion: 'q' }, reply: null }]
      }));
    expect(res.status).toBe(201);
    expect(res.body.steps[0].player.promotion).toBe('q');

    const get = await request(app)
      .get(`/api/levels/${res.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.body.steps[0].player.promotion).toBe('q');
    createdIds.push(res.body.id);
  });

  it('принимает и сохраняет легальную клетку взятия на проходе', async () => {
    const position = emptyBoard();
    position[7][4] = '♔';
    position[0][4] = '♚';
    position[3][4] = '♟';
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ position, castling: { wOO: false, wOOO: false, bOO: false, bOOO: false }, enPassant: 'e6' }));
    expect(res.status).toBe(201);
    expect(res.body.enPassant).toBe('e6');
    createdIds.push(res.body.id);
  });

  it('отклоняет невозможную клетку взятия на проходе', async () => {
    const position = emptyBoard();
    position[7][4] = '♔';
    position[0][4] = '♚';
    position[3][4] = '♟';
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ position, enPassant: 'd6' }));
    expect(res.status).toBe(400);
    expect(res.body.details.errors.join(' ')).toContain('d6 невозможна');
  });

  it('отклоняет клетку взятия на проходе не на 3-й/6-й горизонтали ещё на этапе валидации формы', async () => {
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ enPassant: 'e4' }));
    expect(res.status).toBe(400);
  });

  it('по умолчанию сохраняет halfmoveClock=0 и fullmoveNumber=1', async () => {
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload());
    expect(res.status).toBe(201);
    expect(res.body.halfmoveClock).toBe(0);
    expect(res.body.fullmoveNumber).toBe(1);
    createdIds.push(res.body.id);
  });

  it('сохраняет assignmentId и фильтрует список по нему', async () => {
    const stage = await request(app)
      .post('/api/stages')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Этап для фильтра задач' });
    const assignment = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${token}`)
      .send({ stageId: stage.body.id, name: 'Задание для фильтра задач' });

    const withAssignment = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ assignmentId: assignment.body.id }));
    expect(withAssignment.status).toBe(201);
    expect(withAssignment.body.assignmentId).toBe(assignment.body.id);
    createdIds.push(withAssignment.body.id);

    const withoutAssignment = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload());
    createdIds.push(withoutAssignment.body.id);

    const filtered = await request(app)
      .get(`/api/levels?assignmentId=${assignment.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.every(l => l.assignmentId === assignment.body.id)).toBe(true);
    expect(filtered.body.some(l => l.id === withAssignment.body.id)).toBe(true);
    expect(filtered.body.some(l => l.id === withoutAssignment.body.id)).toBe(false);

    await prisma.assignment.delete({ where: { id: assignment.body.id } });
    await prisma.stage.delete({ where: { id: stage.body.id } });
  });

  it('создаёт черновик без решения и честно показывает playability.supported=false', async () => {
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ steps: [] }));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
    expect(res.body.playability).toEqual({ supported: false, reason: 'Алгоритм решения не задан' });
    createdIds.push(res.body.id);
  });

  it('не даёт опубликовать задачу через PATCH /:id/status, если очередь хода не совпадает с решением', async () => {
    const position = emptyBoard();
    position[7][4] = '♔';
    position[0][4] = '♚';
    const bad = samplePayload({
      position,
      turn: 'w',
      steps: [{ player: { from: [0, 4], to: [0, 5] }, reply: null }]
    });

    const created = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(bad);
    expect(created.status).toBe(201);
    expect(created.body.playability).toEqual({
      supported: false,
      reason: 'Очередь хода в задаче не совпадает с решением'
    });
    createdIds.push(created.body.id);

    const publish = await request(app)
      .patch(`/api/levels/${created.body.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });
    expect(publish.status).toBe(400);
    expect(publish.body.error).toContain('Очередь хода в задаче не совпадает с решением');

    const check = await request(app)
      .get(`/api/levels/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(check.body.status).toBe('draft');
  });

  it('не даёт создать уровень сразу со статусом published, если решение нелегально', async () => {
    const position = emptyBoard();
    position[7][4] = '♔';
    position[0][4] = '♚';
    const res = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({
        position,
        status: 'published',
        steps: [{ player: { from: [0, 4], to: [0, 5] }, reply: null }]
      }));
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Нельзя опубликовать');
  });

  it('не даёт опубликовать через PUT, если решение нелегально', async () => {
    const created = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ steps: [] }));
    expect(created.status).toBe(201);
    createdIds.push(created.body.id);

    const position = emptyBoard();
    position[7][4] = '♔';
    position[0][4] = '♚';
    const update = await request(app)
      .put(`/api/levels/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({
        position,
        status: 'published',
        steps: [{ player: { from: [0, 4], to: [0, 5] }, reply: null }]
      }));
    expect(update.status).toBe(400);
    expect(update.body.error).toContain('Нельзя опубликовать');

    const check = await request(app)
      .get(`/api/levels/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(check.body.status).toBe('draft');
  });

  it('удаляет уровень и после этого отдаёт 404', async () => {
    const id = createdIds.shift();
    const del = await request(app)
      .delete(`/api/levels/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const get = await request(app)
      .get(`/api/levels/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });
});

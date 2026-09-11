require('dotenv').config();
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

const TEST_EMAIL = 'test-stages-module@chesslab.local';
const TEST_PASSWORD = 'super-secret-123';

function samplePayload(overrides = {}) {
  return {
    name: 'Тестовый этап',
    description: 'Описание этапа',
    ...overrides
  };
}

describe('Stages module', () => {
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
    await prisma.stage.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.adminUser.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  it('не пускает без токена ни на один маршрут этапов', async () => {
    const list = await request(app).get('/api/stages');
    const create = await request(app).post('/api/stages').send(samplePayload());
    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
  });

  it('отклоняет создание без названия', async () => {
    const res = await request(app)
      .post('/api/stages')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ name: '' }));
    expect(res.status).toBe(400);
  });

  it('создаёт этап со статусом draft по умолчанию', async () => {
    const res = await request(app)
      .post('/api/stages')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload());
    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.status).toBe('draft');
    createdIds.push(res.body.id);
  });

  it('отдаёт список, включающий созданный этап, со счётчиком заданий', async () => {
    const res = await request(app).get('/api/stages').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const created = res.body.find(s => s.id === createdIds[0]);
    expect(created).toBeDefined();
    expect(created._count.assignments).toBe(0);
  });

  it('отдаёт 404 для несуществующего id', async () => {
    const res = await request(app)
      .get('/api/stages/does-not-exist')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('обновляет этап целиком через PUT', async () => {
    const res = await request(app)
      .put(`/api/stages/${createdIds[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ name: 'Обновлённое название этапа' }));
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Обновлённое название этапа');
  });

  it('переключает статус через PATCH /:id/status', async () => {
    const res = await request(app)
      .patch(`/api/stages/${createdIds[0]}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
  });

  it('отклоняет некорректный статус', async () => {
    const res = await request(app)
      .patch(`/api/stages/${createdIds[0]}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'not-a-real-status' });
    expect(res.status).toBe(400);
  });

  it('каскадно удаляет задания и задачи вместе с этапом', async () => {
    const stage = await request(app)
      .post('/api/stages')
      .set('Authorization', `Bearer ${token}`)
      .send(samplePayload({ name: 'Этап для каскада' }));

    const assignment = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${token}`)
      .send({ stageId: stage.body.id, name: 'Задание для каскада' });

    const position = Array.from({ length: 8 }, () => Array(8).fill(''));
    position[7][4] = '♔';
    position[0][4] = '♚';
    const level = await request(app)
      .post('/api/levels')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Задача для каскада',
        position,
        castling: { wOO: false, wOOO: false, bOO: false, bOOO: false },
        assignmentId: assignment.body.id
      });
    expect(level.status).toBe(201);

    const del = await request(app)
      .delete(`/api/stages/${stage.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const getStage = await request(app)
      .get(`/api/stages/${stage.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getStage.status).toBe(404);

    const getAssignment = await request(app)
      .get(`/api/assignments/${assignment.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getAssignment.status).toBe(404);

    const getLevel = await request(app)
      .get(`/api/levels/${level.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getLevel.status).toBe(404);
  });

  it('удаляет этап и после этого отдаёт 404', async () => {
    const id = createdIds.shift();
    const del = await request(app)
      .delete(`/api/stages/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const get = await request(app)
      .get(`/api/stages/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });
});

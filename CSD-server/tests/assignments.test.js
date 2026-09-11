require('dotenv').config();
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

const TEST_EMAIL = 'test-assignments-module@chesslab.local';
const TEST_PASSWORD = 'super-secret-123';

describe('Assignments module', () => {
  let app;
  let token;
  let stageId;
  let otherStageId;
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

    const stage = await request(app)
      .post('/api/stages')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Этап для заданий' });
    stageId = stage.body.id;

    const otherStage = await request(app)
      .post('/api/stages')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Другой этап' });
    otherStageId = otherStage.body.id;
  });

  afterAll(async () => {
    await prisma.assignment.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.stage.deleteMany({ where: { id: { in: [stageId, otherStageId] } } });
    await prisma.adminUser.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  it('не пускает без токена', async () => {
    const list = await request(app).get('/api/assignments');
    expect(list.status).toBe(401);
  });

  it('отклоняет создание без stageId', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Без этапа' });
    expect(res.status).toBe(400);
  });

  it('создаёт задание со статусом draft и ценой 0 по умолчанию', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${token}`)
      .send({ stageId, name: 'Тестовое задание' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
    expect(res.body.stageId).toBe(stageId);
    expect(res.body.price).toBe(0);
    createdIds.push(res.body.id);
  });

  it('позволяет задать и изменить цену задания', async () => {
    const created = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${token}`)
      .send({ stageId, name: 'Задание с ценой', price: 1200 });
    expect(created.status).toBe(201);
    expect(created.body.price).toBe(1200);
    createdIds.push(created.body.id);

    const updated = await request(app)
      .put(`/api/assignments/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stageId, name: 'Задание с ценой', price: 1500 });
    expect(updated.status).toBe(200);
    expect(updated.body.price).toBe(1500);
  });

  it('отклоняет отрицательную цену задания', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${token}`)
      .send({ stageId, name: 'Задание с плохой ценой', price: -50 });
    expect(res.status).toBe(400);
  });

  it('фильтрует список по stageId', async () => {
    const other = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${token}`)
      .send({ stageId: otherStageId, name: 'Задание другого этапа' });
    createdIds.push(other.body.id);

    const res = await request(app)
      .get(`/api/assignments?stageId=${stageId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.every(a => a.stageId === stageId)).toBe(true);
    expect(res.body.some(a => a.id === createdIds[0])).toBe(true);
    expect(res.body.some(a => a.id === other.body.id)).toBe(false);
  });

  it('отдаёт 404 для несуществующего id', async () => {
    const res = await request(app)
      .get('/api/assignments/does-not-exist')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('обновляет задание целиком через PUT', async () => {
    const res = await request(app)
      .put(`/api/assignments/${createdIds[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stageId, name: 'Обновлённое задание' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Обновлённое задание');
  });

  it('переключает статус через PATCH /:id/status', async () => {
    const res = await request(app)
      .patch(`/api/assignments/${createdIds[0]}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
  });

  it('отклоняет некорректный статус', async () => {
    const res = await request(app)
      .patch(`/api/assignments/${createdIds[0]}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'not-a-real-status' });
    expect(res.status).toBe(400);
  });

  it('удаляет задание и после этого отдаёт 404', async () => {
    const id = createdIds.shift();
    const del = await request(app)
      .delete(`/api/assignments/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const get = await request(app)
      .get(`/api/assignments/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });
});

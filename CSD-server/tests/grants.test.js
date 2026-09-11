require('dotenv').config();
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

const ADMIN_EMAIL = 'test-grants-admin@chesslab.local';
const PASSWORD = 'super-secret-123';
const USER_EMAIL = 'test-grants-user@chesslab.local';
const BUYER_EMAIL = 'test-grants-buyer@chesslab.local';

describe('Ручная выдача доступа', () => {
  let app;
  let token;
  let stageId;
  let assignmentId;
  let userId;
  let userToken;
  let buyerId;

  beforeAll(async () => {
    app = createApp();

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    await prisma.adminUser.upsert({
      where: { email: ADMIN_EMAIL },
      update: { passwordHash },
      create: { email: ADMIN_EMAIL, passwordHash }
    });
    const login = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD });
    token = login.body.token;

    const stage = await prisma.stage.create({ data: { name: 'Этап для выдачи', status: 'published' } });
    stageId = stage.id;
    const assignment = await prisma.assignment.create({
      data: { stageId, name: 'Задание для выдачи', price: 900, status: 'published' }
    });
    assignmentId = assignment.id;

    await prisma.user.deleteMany({ where: { email: { in: [USER_EMAIL, BUYER_EMAIL] } } });
    const registered = await request(app)
      .post('/api/account/register')
      .send({ email: USER_EMAIL, password: PASSWORD });
    userId = registered.body.user.id;
    userToken = registered.body.token;

    const buyer = await request(app)
      .post('/api/account/register')
      .send({ email: BUYER_EMAIL, password: PASSWORD });
    buyerId = buyer.body.user.id;
    await prisma.payment.create({
      data: {
        yookassaId: 'grants-test-paid',
        assignmentId,
        userId: buyerId,
        email: BUYER_EMAIL,
        amount: 900,
        status: 'succeeded'
      }
    });
  });

  afterAll(async () => {
    await prisma.grant.deleteMany({ where: { assignmentId } });
    await prisma.payment.deleteMany({ where: { assignmentId } });
    await prisma.user.deleteMany({ where: { email: { in: [USER_EMAIL, BUYER_EMAIL] } } });
    await prisma.assignment.deleteMany({ where: { id: assignmentId } });
    await prisma.stage.deleteMany({ where: { id: stageId } });
    await prisma.adminUser.deleteMany({ where: { email: ADMIN_EMAIL } });
    await prisma.$disconnect();
  });

  const grant = (id, body) =>
    request(app).post(`/api/users/${id}/grants`).set('Authorization', `Bearer ${token}`).send(body);
  const myAssignments = t =>
    request(app).get('/api/account/assignments').set('Authorization', `Bearer ${t}`);

  it('не пускает к аккаунтам без токена админа', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401);
    expect(
      (await request(app).get('/api/users').set('Authorization', `Bearer ${userToken}`)).status
    ).toBe(401);
  });

  it('находит аккаунт по подстроке почты и не отдаёт хеш пароля', async () => {
    const res = await request(app)
      .get('/api/users?q=test-grants-user')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.map(u => u.id)).toContain(userId);
    expect(res.body[0].passwordHash).toBeUndefined();
  });

  it('до выдачи задания в кабинете нет', async () => {
    const res = await myAssignments(userToken);
    expect(res.body.assignments.map(a => a.id)).not.toContain(assignmentId);
  });

  it('выдаёт доступ, и задание появляется в кабинете', async () => {
    const res = await grant(userId, { assignmentId, note: 'тренеру для показа' });
    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(String));

    const cabinet = await myAssignments(userToken);
    expect(cabinet.body.assignments.map(a => a.id)).toContain(assignmentId);
  });

  it('показывает в карточке аккаунта источник доступа', async () => {
    const res = await request(app).get(`/api/users/${userId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const access = res.body.access.find(a => a.assignment.id === assignmentId);
    expect(access.source).toBe('grant');
    expect(access.grant.note).toBe('тренеру для показа');
  });

  it('отклоняет повторную выдачу того же задания', async () => {
    const res = await grant(userId, { assignmentId });
    expect(res.status).toBe(409);
  });

  it('отзыв выдачи закрывает доступ', async () => {
    const card = await request(app).get(`/api/users/${userId}`).set('Authorization', `Bearer ${token}`);
    const grantId = card.body.access.find(a => a.assignment.id === assignmentId).grant.id;

    const res = await request(app)
      .delete(`/api/users/${userId}/grants/${grantId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);

    const cabinet = await myAssignments(userToken);
    expect(cabinet.body.assignments.map(a => a.id)).not.toContain(assignmentId);
  });

  it('у купившего доступ отзыв выдачи ничего не отбирает', async () => {
    // Покупателю задание ещё и выдали руками — источником всё равно считается
    // оплата, и отзыв выдачи не должен закрыть оплаченный доступ.
    const created = await grant(buyerId, { assignmentId });
    expect(created.status).toBe(409);

    const forced = await prisma.grant.create({ data: { userId: buyerId, assignmentId } });
    const res = await request(app)
      .delete(`/api/users/${buyerId}/grants/${forced.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);

    const card = await request(app).get(`/api/users/${buyerId}`).set('Authorization', `Bearer ${token}`);
    const access = card.body.access.find(a => a.assignment.id === assignmentId);
    expect(access.source).toBe('payment');
  });

  it('отдаёт 404 на несуществующий аккаунт и на несуществующее задание', async () => {
    expect((await grant('no-such-user', { assignmentId })).status).toBe(404);
    expect((await grant(userId, { assignmentId: 'no-such-assignment' })).status).toBe(404);
  });

  it('отклоняет выдачу без задания', async () => {
    const res = await grant(userId, {});
    expect(res.status).toBe(400);
  });

  it('не даёт отозвать чужую выдачу', async () => {
    const other = await prisma.grant.create({ data: { userId: buyerId, assignmentId } });
    const res = await request(app)
      .delete(`/api/users/${userId}/grants/${other.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

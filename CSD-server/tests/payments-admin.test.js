require('dotenv').config();
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');
const { syncPendingPayments } = require('../src/modules/payments/payments.sync');

const ADMIN_EMAIL = 'test-payments-admin@chesslab.local';
const ADMIN_PASSWORD = 'super-secret-123';
const BUYER_EMAIL = 'test-payments-admin-buyer@chesslab.local';
const OTHER_EMAIL = 'test-payments-admin-other@chesslab.local';

describe('Payments admin', () => {
  let app;
  let token;
  let buyerToken;
  let stageId;
  let assignmentId;
  let buyerId;
  const originalShopId = process.env.YOOKASSA_SHOP_ID;
  const originalSecretKey = process.env.YOOKASSA_SECRET_KEY;

  beforeAll(async () => {
    app = createApp();

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.adminUser.upsert({
      where: { email: ADMIN_EMAIL },
      update: { passwordHash },
      create: { email: ADMIN_EMAIL, passwordHash }
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    token = login.body.token;

    const stage = await prisma.stage.create({ data: { name: 'Этап для журнала платежей' } });
    stageId = stage.id;
    const assignment = await prisma.assignment.create({
      data: { stageId, name: 'Задание для журнала', price: 500 }
    });
    assignmentId = assignment.id;

    await prisma.user.deleteMany({ where: { email: { in: [BUYER_EMAIL, OTHER_EMAIL] } } });
    const register = await request(app)
      .post('/api/account/register')
      .send({ email: BUYER_EMAIL, password: ADMIN_PASSWORD });
    buyerToken = register.body.token;
    buyerId = register.body.user.id;

    await prisma.payment.create({
      data: {
        yookassaId: 'admin-list-succeeded',
        assignmentId,
        userId: buyerId,
        email: BUYER_EMAIL,
        amount: 500,
        status: 'succeeded'
      }
    });
    await prisma.payment.create({
      data: {
        yookassaId: 'admin-list-pending',
        assignmentId,
        userId: null,
        email: OTHER_EMAIL,
        amount: 500,
        status: 'pending'
      }
    });
  });

  afterEach(() => {
    if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore();
    process.env.YOOKASSA_SHOP_ID = originalShopId;
    process.env.YOOKASSA_SECRET_KEY = originalSecretKey;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { assignmentId } });
    await prisma.user.deleteMany({ where: { email: { in: [BUYER_EMAIL, OTHER_EMAIL] } } });
    await prisma.assignment.deleteMany({ where: { id: assignmentId } });
    await prisma.stage.deleteMany({ where: { id: stageId } });
    await prisma.adminUser.deleteMany({ where: { email: ADMIN_EMAIL } });
    await prisma.$disconnect();
  });

  const asAdmin = url => request(app).get(url).set('Authorization', `Bearer ${token}`);

  it('не пускает в журнал без токена', async () => {
    const res = await request(app).get('/api/payments');
    expect(res.status).toBe(401);
  });

  it('не пускает в журнал по токену покупателя', async () => {
    const res = await request(app).get('/api/payments').set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(401);
  });

  it('отдаёт платежи с почтой аккаунта и названием задания', async () => {
    const res = await asAdmin('/api/payments');
    expect(res.status).toBe(200);
    const payment = res.body.find(p => p.yookassaId === 'admin-list-succeeded');
    expect(payment.assignment.name).toBe('Задание для журнала');
    expect(payment.user.email).toBe(BUYER_EMAIL);
    // passwordHash аккаунта не должен просочиться даже вложенно.
    expect(payment.user.passwordHash).toBeUndefined();
  });

  it('фильтрует по статусу', async () => {
    const res = await asAdmin(`/api/payments?status=pending&assignmentId=${assignmentId}`);
    expect(res.status).toBe(200);
    expect(res.body.map(p => p.yookassaId)).toEqual(['admin-list-pending']);
  });

  it('фильтрует по подстроке почты', async () => {
    const res = await asAdmin(`/api/payments?q=admin-buyer&assignmentId=${assignmentId}`);
    expect(res.status).toBe(200);
    expect(res.body.map(p => p.yookassaId)).toEqual(['admin-list-succeeded']);
  });

  it('обновляет статус платежа по ответу ЮKassa', async () => {
    process.env.YOOKASSA_SHOP_ID = 'test-shop';
    process.env.YOOKASSA_SECRET_KEY = 'test-secret';
    const pending = await prisma.payment.findUnique({ where: { yookassaId: 'admin-list-pending' } });
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'admin-list-pending', status: 'canceled' })
    });

    const res = await request(app)
      .post(`/api/payments/${pending.id}/refresh`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('canceled');
    const saved = await prisma.payment.findUnique({ where: { id: pending.id } });
    expect(saved.status).toBe('canceled');
    await prisma.payment.update({ where: { id: pending.id }, data: { status: 'pending' } });
  });

  it('отдаёт 404 на обновление несуществующего платежа', async () => {
    const res = await request(app)
      .post('/api/payments/does-not-exist/refresh')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('фоновый синхронизатор сам переводит pending в актуальный статус без вебхука', async () => {
    process.env.YOOKASSA_SHOP_ID = 'test-shop';
    process.env.YOOKASSA_SECRET_KEY = 'test-secret';
    jest.spyOn(global, 'fetch').mockImplementation(async url => ({
      ok: true,
      json: async () => ({ id: String(url).split('/').pop(), status: 'succeeded' })
    }));

    // Синхронизатор ходит по всем незавершённым платежам базы, а тесты гоняют
    // по той же базе, что и разработка. Запоминаем чужие pending-платежи и
    // возвращаем их статус, чтобы прогон тестов не «оплачивал» чужие записи.
    const before = await prisma.payment.findMany({
      where: { status: 'pending' },
      select: { id: true }
    });

    try {
      const result = await syncPendingPayments();
      expect(result.changed).toBeGreaterThanOrEqual(1);
      const saved = await prisma.payment.findUnique({ where: { yookassaId: 'admin-list-pending' } });
      expect(saved.status).toBe('succeeded');
    } finally {
      await prisma.payment.updateMany({
        where: { id: { in: before.map(p => p.id) } },
        data: { status: 'pending' }
      });
    }
  });
});

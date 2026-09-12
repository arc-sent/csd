require('dotenv').config();
const request = require('supertest');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

const TEST_EMAIL = 'test-payments-module@chesslab.local';
const TEST_PASSWORD = 'super-secret-123';

describe('Payments module', () => {
  let app;
  let stageId;
  let assignmentId;
  let freeAssignmentId;
  let userId;
  let token;
  const originalShopId = process.env.YOOKASSA_SHOP_ID;
  const originalSecretKey = process.env.YOOKASSA_SECRET_KEY;

  beforeAll(async () => {
    app = createApp();
    const stage = await prisma.stage.create({ data: { name: 'Этап для оплаты' } });
    stageId = stage.id;
    const assignment = await prisma.assignment.create({
      data: { stageId, name: 'Задание для оплаты', price: 1200 }
    });
    assignmentId = assignment.id;
    const freeAssignment = await prisma.assignment.create({
      data: { stageId, name: 'Бесплатное задание' } // price по умолчанию 0
    });
    freeAssignmentId = freeAssignment.id;

    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    const registerRes = await request(app)
      .post('/api/account/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    token = registerRes.body.token;
    userId = registerRes.body.user.id;
    // Покупка теперь требует подтверждённую почту (чек уходит на неё) — эти
    // тесты не про само подтверждение (см. email-verification.test.js).
    await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  });

  afterEach(async () => {
    if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore();
    process.env.YOOKASSA_SHOP_ID = originalShopId;
    process.env.YOOKASSA_SECRET_KEY = originalSecretKey;
    await prisma.payment.deleteMany({ where: { assignmentId } });
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.assignment.deleteMany({ where: { id: { in: [assignmentId, freeAssignmentId] } } });
    await prisma.stage.deleteMany({ where: { id: stageId } });
    await prisma.$disconnect();
  });

  const createPayment = body =>
    request(app).post('/api/payments/create').set('Authorization', `Bearer ${token}`).send(body);

  describe('POST /api/payments/create', () => {
    it('требует авторизацию покупателя', async () => {
      const res = await request(app).post('/api/payments/create').send({ assignmentId });
      expect(res.status).toBe(401);
    });

    it('отклоняет запрос без assignmentId', async () => {
      const res = await createPayment({});
      expect(res.status).toBe(400);
    });

    it('отдаёт 404, если задание не найдено', async () => {
      process.env.YOOKASSA_SHOP_ID = 'test-shop';
      process.env.YOOKASSA_SECRET_KEY = 'test-secret';
      const res = await createPayment({ assignmentId: 'does-not-exist' });
      expect(res.status).toBe(404);
    });

    it('отдаёт понятную ошибку, если у задания цена 0 (бесплатное)', async () => {
      process.env.YOOKASSA_SHOP_ID = 'test-shop';
      process.env.YOOKASSA_SECRET_KEY = 'test-secret';
      const res = await createPayment({ assignmentId: freeAssignmentId });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('цена');
    });

    it('отдаёт понятную ошибку, если ЮKassa не настроена', async () => {
      delete process.env.YOOKASSA_SHOP_ID;
      delete process.env.YOOKASSA_SECRET_KEY;
      const res = await createPayment({ assignmentId });
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('YOOKASSA_SHOP_ID');
    });

    it('создаёт платёж, берёт почту для чека из аккаунта и привязывает платёж к пользователю', async () => {
      process.env.YOOKASSA_SHOP_ID = 'test-shop';
      process.env.YOOKASSA_SECRET_KEY = 'test-secret';

      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'payment-123',
          status: 'pending',
          confirmation: { confirmation_url: 'https://yoomoney.ru/checkout/payments/v2/contract?orderId=payment-123' }
        })
      });

      const res = await createPayment({ assignmentId });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 'payment-123',
        status: 'pending',
        confirmationUrl: 'https://yoomoney.ru/checkout/payments/v2/contract?orderId=payment-123'
      });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.yookassa.ru/v3/payments');
      expect(options.headers.Authorization).toBe(
        'Basic ' + Buffer.from('test-shop:test-secret').toString('base64')
      );
      const body = JSON.parse(options.body);
      expect(body.amount).toEqual({ value: '1200.00', currency: 'RUB' });
      // Почта чека — из аккаунта, а не из тела запроса.
      expect(body.receipt.customer).toEqual({ email: TEST_EMAIL });
      expect(body.metadata).toEqual({ assignmentId, userId, email: TEST_EMAIL });

      const saved = await prisma.payment.findUnique({ where: { yookassaId: 'payment-123' } });
      expect(saved).toMatchObject({ assignmentId, userId, email: TEST_EMAIL, status: 'pending' });
    });

    it('не даёт купить уже купленное задание и не ходит в ЮKassa', async () => {
      process.env.YOOKASSA_SHOP_ID = 'test-shop';
      process.env.YOOKASSA_SECRET_KEY = 'test-secret';
      await prisma.payment.create({
        data: { yookassaId: 'payment-owned', assignmentId, userId, email: TEST_EMAIL, amount: 1200, status: 'succeeded' }
      });

      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });
      const res = await createPayment({ assignmentId });

      expect(res.status).toBe(409);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('отдаёт 502 с деталями и не сохраняет запись, если ЮKassa вернула ошибку', async () => {
      process.env.YOOKASSA_SHOP_ID = 'test-shop';
      process.env.YOOKASSA_SECRET_KEY = 'test-secret';

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        json: async () => ({ type: 'error', code: 'invalid_credentials' })
      });

      const res = await createPayment({ assignmentId });

      expect(res.status).toBe(502);
      expect(res.body.details).toEqual({ type: 'error', code: 'invalid_credentials' });
      expect(await prisma.payment.count({ where: { assignmentId } })).toBe(0);
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('отклоняет уведомление без id платежа', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({ event: 'payment.succeeded', object: {} });
      expect(res.status).toBe(400);
    });

    it('не доверяет статусу из тела запроса — перепроверяет платёж своим запросом к ЮKassa', async () => {
      process.env.YOOKASSA_SHOP_ID = 'test-shop';
      process.env.YOOKASSA_SECRET_KEY = 'test-secret';
      await prisma.payment.create({
        data: { yookassaId: 'payment-456', assignmentId, userId, email: TEST_EMAIL, amount: 1200, status: 'pending' }
      });

      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'payment-456', status: 'succeeded' })
      });

      const res = await request(app)
        .post('/api/payments/webhook')
        // Статус в теле заведомо поддельный — сервис обязан его игнорировать.
        .send({ event: 'payment.succeeded', object: { id: 'payment-456', status: 'canceled' } });

      expect(res.status).toBe(200);
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.yookassa.ru/v3/payments/payment-456');
      const saved = await prisma.payment.findUnique({ where: { yookassaId: 'payment-456' } });
      expect(saved.status).toBe('succeeded');
    });

    it('идемпотентен: повторный вебхук не выдаёт доступ дважды', async () => {
      process.env.YOOKASSA_SHOP_ID = 'test-shop';
      process.env.YOOKASSA_SECRET_KEY = 'test-secret';
      await prisma.payment.create({
        data: { yookassaId: 'payment-789', assignmentId, userId, email: TEST_EMAIL, amount: 1200, status: 'pending' }
      });
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'payment-789', status: 'succeeded' })
      });

      const send = () =>
        request(app)
          .post('/api/payments/webhook')
          .send({ event: 'payment.succeeded', object: { id: 'payment-789' } });

      expect((await send()).status).toBe(200);
      expect((await send()).status).toBe(200);

      // Задание в кабинете должно появиться ровно один раз.
      const cabinet = await request(app)
        .get('/api/account/assignments')
        .set('Authorization', `Bearer ${token}`);
      expect(cabinet.body.assignments.filter(a => a.id === assignmentId)).toHaveLength(1);
    });

    it('не откатывает уже выданный доступ «старым» уведомлением', async () => {
      process.env.YOOKASSA_SHOP_ID = 'test-shop';
      process.env.YOOKASSA_SECRET_KEY = 'test-secret';
      await prisma.payment.create({
        data: { yookassaId: 'payment-old', assignmentId, userId, email: TEST_EMAIL, amount: 1200, status: 'succeeded' }
      });
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'payment-old', status: 'pending' })
      });

      const res = await request(app)
        .post('/api/payments/webhook')
        .send({ event: 'payment.waiting_for_capture', object: { id: 'payment-old' } });

      expect(res.status).toBe(200);
      const saved = await prisma.payment.findUnique({ where: { yookassaId: 'payment-old' } });
      expect(saved.status).toBe('succeeded');
    });

    it('отвечает 200 на вебхук по неизвестному платежу', async () => {
      process.env.YOOKASSA_SHOP_ID = 'test-shop';
      process.env.YOOKASSA_SECRET_KEY = 'test-secret';
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'payment-unknown', status: 'succeeded' })
      });

      const res = await request(app)
        .post('/api/payments/webhook')
        .send({ event: 'payment.succeeded', object: { id: 'payment-unknown' } });

      expect(res.status).toBe(200);
    });

    it('отдаёт 502, если не удалось проверить платёж в ЮKassa', async () => {
      process.env.YOOKASSA_SHOP_ID = 'test-shop';
      process.env.YOOKASSA_SECRET_KEY = 'test-secret';
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        json: async () => ({ type: 'error', code: 'not_found' })
      });

      const res = await request(app)
        .post('/api/payments/webhook')
        .send({ event: 'payment.succeeded', object: { id: 'payment-does-not-exist' } });

      expect(res.status).toBe(502);
    });
  });
});

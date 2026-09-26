require('dotenv').config();
const request = require('supertest');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

const BUYER = 'test-bonus-buyer@chesslab.local';
const SINGLE = 'test-bonus-single@chesslab.local';
const PASSWORD = 'super-secret-123';

describe('Бонусное задание при покупке этапа целиком (моки ЮKassa)', () => {
  let app;
  let stageId;
  let regularA;
  let regularB;
  let bonus;
  const users = {};
  const originalShopId = process.env.YOOKASSA_SHOP_ID;
  const originalSecretKey = process.env.YOOKASSA_SECRET_KEY;

  async function registerVerified(email) {
    await prisma.user.deleteMany({ where: { email } });
    const res = await request(app).post('/api/account/register').send({ email, password: PASSWORD });
    await prisma.user.update({ where: { id: res.body.user.id }, data: { emailVerifiedAt: new Date() } });
    return { id: res.body.user.id, token: res.body.token };
  }

  async function makeAssignment(name, isBonus) {
    const a = await prisma.assignment.create({
      data: { stageId, name, price: 1200, bonus: isBonus, status: 'published' }
    });
    await prisma.level.create({
      data: { name: 'Задача', assignmentId: a.id, status: 'published', position: [], castling: {}, steps: [] }
    });
    return a.id;
  }

  beforeAll(async () => {
    app = createApp();
    process.env.YOOKASSA_SHOP_ID = 'test-shop';
    process.env.YOOKASSA_SECRET_KEY = 'test-secret';
    const stage = await prisma.stage.create({ data: { name: 'Этап с бонусом', status: 'published', price: 2400 } });
    stageId = stage.id;
    regularA = await makeAssignment('Обычное 1', false);
    regularB = await makeAssignment('Обычное 2', false);
    bonus = await makeAssignment('Бонус (тактика)', true);
    users.buyer = await registerVerified(BUYER);
    users.single = await registerVerified(SINGLE);
  });

  afterAll(async () => {
    if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore();
    process.env.YOOKASSA_SHOP_ID = originalShopId;
    process.env.YOOKASSA_SECRET_KEY = originalSecretKey;
    const ids = [users.buyer && users.buyer.id, users.single && users.single.id].filter(Boolean);
    await prisma.payment.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.level.deleteMany({ where: { assignment: { stageId } } });
    await prisma.assignment.deleteMany({ where: { stageId } });
    await prisma.stage.deleteMany({ where: { id: stageId } });
    await prisma.$disconnect();
  });

  const pay = async (user, body, yookassaId) => {
    const create = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: yookassaId, status: 'pending', confirmation: { confirmation_url: 'https://pay.test/' + yookassaId } })
    });
    const res = await request(app).post('/api/payments/create').set('Authorization', `Bearer ${user.token}`).send(body);
    const sentAmount = JSON.parse(create.mock.calls[0][1].body).amount.value;
    create.mockRestore();

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: yookassaId, status: 'succeeded' })
    });
    const hook = await request(app)
      .post('/api/payments/webhook')
      .send({ event: 'payment.succeeded', object: { id: yookassaId } });
    global.fetch.mockRestore();
    return { res, hook, sentAmount };
  };

  const ownedNames = async user => {
    const res = await request(app).get('/api/account/assignments').set('Authorization', `Bearer ${user.token}`);
    return res.body.assignments.map(a => a.name).sort();
  };

  it('покупка этапа целиком: платится 2400 ₽, а доступ открывается ко всем трём заданиям, включая бонусное', async () => {
    const { res, hook, sentAmount } = await pay(users.buyer, { stageId }, 'bonus-stage-1');
    expect(res.status).toBe(201);
    expect(hook.status).toBe(200);
    expect(Number(sentAmount)).toBe(2400);

    expect(await ownedNames(users.buyer)).toEqual(['Бонус (тактика)', 'Обычное 1', 'Обычное 2']);
  });

  it('контроль: покупка одного обычного задания бонус не открывает', async () => {
    const { res, hook, sentAmount } = await pay(users.single, { assignmentId: regularA }, 'bonus-single-1');
    expect(res.status).toBe(201);
    expect(hook.status).toBe(200);
    expect(Number(sentAmount)).toBe(1200);

    expect(await ownedNames(users.single)).toEqual(['Обычное 1']);
  });
});

require('dotenv').config();
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

const ADMIN_EMAIL = 'test-token-scope-admin@chesslab.local';
const USER_EMAIL = 'test-token-scope-user@chesslab.local';
const PASSWORD = 'super-secret-123';

describe('Разделение админских и пользовательских токенов', () => {
  let app;
  let adminToken;
  let userToken;
  let userId;

  beforeAll(async () => {
    app = createApp();

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    await prisma.adminUser.upsert({
      where: { email: ADMIN_EMAIL },
      update: { passwordHash },
      create: { email: ADMIN_EMAIL, passwordHash }
    });
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });
    adminToken = adminLogin.body.token;

    await prisma.user.deleteMany({ where: { email: USER_EMAIL } });
    const register = await request(app)
      .post('/api/account/register')
      .send({ email: USER_EMAIL, password: PASSWORD });
    userToken = register.body.token;
    userId = register.body.user.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.adminUser.deleteMany({ where: { email: ADMIN_EMAIL } });
    await prisma.$disconnect();
  });

  const ADMIN_ROUTES = [
    ['get', '/api/stages'],
    ['get', '/api/assignments'],
    ['get', '/api/levels'],
    ['get', '/api/auth/me']
  ];
  const USER_ROUTES = [
    ['get', '/api/account/me'],
    ['get', '/api/account/assignments']
  ];

  it('админский токен содержит type=admin, пользовательский — type=user', () => {
    expect(jwt.decode(adminToken).type).toBe('admin');
    expect(jwt.decode(userToken).type).toBe('user');
  });

  it.each(ADMIN_ROUTES)('пользовательский токен не пускают в админский %s %s', async (method, path) => {
    const res = await request(app)[method](path).set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(401);
  });

  it.each(USER_ROUTES)('админский токен не пускают в кабинет %s %s', async (method, path) => {
    const res = await request(app)[method](path).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(401);
  });

  it('пользовательский токен не пускают в движок', async () => {
    const res = await request(app)
      .post('/api/engine/analyze')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(res.status).toBe(401);
  });

  it('токен с верной подписью, но без claim type отвергается везде', async () => {
    const legacyToken = jwt.sign({ sub: 'legacy', email: 'legacy@chesslab.local' }, process.env.JWT_SECRET);

    const admin = await request(app).get('/api/stages').set('Authorization', `Bearer ${legacyToken}`);
    expect(admin.status).toBe(401);

    const user = await request(app).get('/api/account/me').set('Authorization', `Bearer ${legacyToken}`);
    expect(user.status).toBe(401);
  });

  it('админский токен по-прежнему работает в админке (нет регрессии)', async () => {
    const res = await request(app).get('/api/stages').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

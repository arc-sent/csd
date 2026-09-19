require('dotenv').config();
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

const TEST_EMAIL = 'test-auth-module@chesslab.local';
const TEST_PASSWORD = 'super-secret-123';

describe('Auth module', () => {
  let app;

  beforeAll(async () => {
    app = createApp();
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await prisma.adminUser.upsert({
      where: { email: TEST_EMAIL },
      update: { passwordHash },
      create: { email: TEST_EMAIL, passwordHash }
    });
  });

  afterAll(async () => {
    await prisma.adminUser.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  it('отклоняет вход с неверным паролем', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('отклоняет вход с несуществующим email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@chesslab.local', password: TEST_PASSWORD });
    expect(res.status).toBe(401);
  });

  it('отклоняет вход с некорректным телом запроса (400, не 500)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('пускает с верным паролем и выдаёт JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.admin.email).toBe(TEST_EMAIL);
    expect(res.body.admin.passwordHash).toBeUndefined();
    expect(require('jsonwebtoken').decode(res.body.token).type).toBe('admin');
  });

  it('не пускает на /me без токена', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('не пускает на /me с испорченным токеном', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer garbage.token.value');
    expect(res.status).toBe(401);
  });

  it('пускает на /me с валидным токеном из /login', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe(TEST_EMAIL);
  });
});

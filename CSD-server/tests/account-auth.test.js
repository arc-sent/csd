require('dotenv').config();
const request = require('supertest');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

const EMAIL = 'test-account-auth@chesslab.local';
const PASSWORD = 'super-secret-123';

describe('Account: регистрация и вход', () => {
  let app;

  beforeAll(async () => {
    app = createApp();
    await prisma.user.deleteMany({ where: { email: { contains: 'test-account-auth' } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'test-account-auth' } } });
    await prisma.$disconnect();
  });

  it('регистрирует пользователя, нормализует email и не возвращает хеш пароля', async () => {
    const res = await request(app)
      .post('/api/account/register')
      // Регистр и пробелы должны схлопнуться в zod-схеме до сервиса.
      .send({ email: `  ${EMAIL.toUpperCase()}  `, password: PASSWORD, name: 'Тест' });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe(EMAIL);
    expect(res.body.user.name).toBe('Тест');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('не даёт зарегистрировать тот же email в другом регистре', async () => {
    const res = await request(app)
      .post('/api/account/register')
      .send({ email: EMAIL.toUpperCase(), password: PASSWORD });
    expect(res.status).toBe(409);
  });

  it('отклоняет короткий пароль', async () => {
    const res = await request(app)
      .post('/api/account/register')
      .send({ email: 'test-account-auth-weak@chesslab.local', password: '1234567' });
    expect(res.status).toBe(400);
  });

  it('отклоняет некорректный email', async () => {
    const res = await request(app)
      .post('/api/account/register')
      .send({ email: 'не-почта', password: PASSWORD });
    expect(res.status).toBe(400);
  });

  it('пускает по правильному паролю', async () => {
    const res = await request(app).post('/api/account/login').send({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(EMAIL);
    expect(typeof res.body.token).toBe('string');
  });

  // Один и тот же ответ на «нет такого аккаунта» и «неверный пароль» —
  // иначе по разнице ответов можно перебирать существующие email.
  it('на неверный пароль и на несуществующий email отвечает одинаково', async () => {
    const wrongPassword = await request(app)
      .post('/api/account/login')
      .send({ email: EMAIL, password: 'совсем-другой-пароль' });
    const noSuchUser = await request(app)
      .post('/api/account/login')
      .send({ email: 'test-account-auth-ghost@chesslab.local', password: PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(noSuchUser.status).toBe(401);
    expect(wrongPassword.body.error).toBe(noSuchUser.body.error);
  });

  it('аккаунт без пароля (будущий OAuth) нельзя пройти обычным входом', async () => {
    const oauthEmail = 'test-account-auth-oauth@chesslab.local';
    await prisma.user.create({ data: { email: oauthEmail } }); // passwordHash = null
    const res = await request(app).post('/api/account/login').send({ email: oauthEmail, password: PASSWORD });
    expect(res.status).toBe(401);
  });

  describe('GET /api/account/me', () => {
    it('401 без токена', async () => {
      const res = await request(app).get('/api/account/me');
      expect(res.status).toBe(401);
    });

    it('401 с мусорным токеном', async () => {
      const res = await request(app).get('/api/account/me').set('Authorization', 'Bearer not-a-token');
      expect(res.status).toBe(401);
    });

    it('возвращает текущего пользователя по валидному токену', async () => {
      const login = await request(app).post('/api/account/login').send({ email: EMAIL, password: PASSWORD });
      const res = await request(app)
        .get('/api/account/me')
        .set('Authorization', `Bearer ${login.body.token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(EMAIL);
    });
  });
});

require('dotenv').config();
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

// SMTP не настроен в тестовом окружении (см. tests/jest.setup.js) —
// shared/mailer.js печатает код в консоль вместо отправки письма.
function captureCode(logSpy) {
  const call = logSpy.mock.calls.find(args => String(args[0]).includes('[dev] Письмо для'));
  const match = call && String(call[0]).match(/Код для подтверждения email: (\d{6})/);
  return match ? match[1] : null;
}

describe('Auth module: смена пароля и email админа', () => {
  let app;
  const emails = [
    'test-auth-account@chesslab.local',
    'test-auth-account-taken@chesslab.local',
    'test-auth-account-new@chesslab.local',
    'test-auth-account-cooldown@chesslab.local',
    'test-auth-account-cooldown-new@chesslab.local',
    'test-auth-account-lockout@chesslab.local',
    'test-auth-account-lockout-new@chesslab.local'
  ];
  const PASSWORD = 'super-secret-123';

  async function loginAs(email) {
    const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
    return res.body.token;
  }

  beforeAll(async () => {
    app = createApp();
    await prisma.adminUser.deleteMany({ where: { email: { in: emails } } });
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    for (const email of emails) {
      // "-new"-адреса — это ЦЕЛИ смены почты в тестах, не отдельные аккаунты.
      if (email.endsWith('-new@chesslab.local')) continue;
      await prisma.adminUser.create({ data: { email, passwordHash } });
    }
  });

  afterAll(async () => {
    await prisma.adminUser.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  describe('PUT /auth/password', () => {
    it('без токена — 401', async () => {
      const res = await request(app).put('/api/auth/password').send({ newPassword: 'brand-new-password-123' });
      expect(res.status).toBe(401);
    });

    it('меняет пароль сразу, без кода — старый пароль перестаёт работать, новый начинает', async () => {
      const token = await loginAs(emails[0]);
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ newPassword: 'brand-new-password-123' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });

      const oldLogin = await request(app).post('/api/auth/login').send({ email: emails[0], password: PASSWORD });
      expect(oldLogin.status).toBe(401);

      const newLogin = await request(app).post('/api/auth/login').send({ email: emails[0], password: 'brand-new-password-123' });
      expect(newLogin.status).toBe(200);
    });
  });

  describe('POST /auth/email/request + /auth/email/verify', () => {
    it('оба маршрута требуют токен', async () => {
      const req = await request(app).post('/api/auth/email/request').send({ newEmail: 'x@chesslab.local' });
      const verify = await request(app).post('/api/auth/email/verify').send({ code: '123456' });
      expect(req.status).toBe(401);
      expect(verify.status).toBe(401);
    });

    it('отклоняет запрос смены на уже занятый email', async () => {
      const token = await loginAs(emails[1]);
      // emails[0] — реально существующий аккаунт (см. beforeAll), в отличие
      // от emails[2], который специально не создан («-new»-адрес — цель
      // смены, а не отдельный аккаунт) — с несуществующим email 409 не
      // сработал бы, а запрос тихо создал бы настоящую строку смены почты.
      const res = await request(app)
        .post('/api/auth/email/request')
        .set('Authorization', `Bearer ${token}`)
        .send({ newEmail: emails[0] });
      expect(res.status).toBe(409);
    });

    it('отклоняет запрос смены на тот же email', async () => {
      const token = await loginAs(emails[1]);
      const res = await request(app)
        .post('/api/auth/email/request')
        .set('Authorization', `Bearer ${token}`)
        .send({ newEmail: emails[1] });
      expect(res.status).toBe(400);
    });

    it('верный код заменяет email — вход по старому email больше не работает, по новому работает', async () => {
      const token = await loginAs(emails[1]);
      const newEmail = 'test-auth-account-verified@chesslab.local';

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const reqRes = await request(app)
        .post('/api/auth/email/request')
        .set('Authorization', `Bearer ${token}`)
        .send({ newEmail });
      const code = captureCode(logSpy);
      logSpy.mockRestore();
      expect(reqRes.status).toBe(200);
      expect(reqRes.body).toEqual({ sent: true });
      expect(code).toMatch(/^\d{6}$/);

      const verifyRes = await request(app)
        .post('/api/auth/email/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.admin.email).toBe(newEmail);

      const oldLogin = await request(app).post('/api/auth/login').send({ email: emails[1], password: PASSWORD });
      expect(oldLogin.status).toBe(401);

      const newLogin = await request(app).post('/api/auth/login').send({ email: newEmail, password: PASSWORD });
      expect(newLogin.status).toBe(200);

      await prisma.adminUser.deleteMany({ where: { email: newEmail } });
    });

    it('неверный код отклоняется общей ошибкой, email не меняется', async () => {
      const token = await loginAs(emails[3]);
      await request(app)
        .post('/api/auth/email/request')
        .set('Authorization', `Bearer ${token}`)
        .send({ newEmail: 'test-auth-account-cooldown-target@chesslab.local' });

      const res = await request(app)
        .post('/api/auth/email/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '000000' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Неверный или истёкший код');

      const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(me.body.admin.email).toBe(emails[3]);
    });

    it('resend раньше 60 секунд отдаёт retryAfterSeconds, не шлёт письмо повторно', async () => {
      const token = await loginAs(emails[3]);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const res = await request(app)
        .post('/api/auth/email/request')
        .set('Authorization', `Bearer ${token}`)
        .send({ newEmail: 'test-auth-account-cooldown-target@chesslab.local' });
      const sentAgain = captureCode(logSpy);
      logSpy.mockRestore();

      expect(res.status).toBe(200);
      expect(res.body.sent).toBe(false);
      expect(res.body.retryAfterSeconds).toBeGreaterThan(0);
      expect(res.body.retryAfterSeconds).toBeLessThanOrEqual(60);
      expect(sentAgain).toBeNull();
    });

    it('после 5 неверных попыток код перестаёт приниматься даже правильным вводом', async () => {
      const token = await loginAs(emails[5]);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await request(app)
        .post('/api/auth/email/request')
        .set('Authorization', `Bearer ${token}`)
        .send({ newEmail: 'test-auth-account-lockout-target@chesslab.local' });
      const code = captureCode(logSpy);
      logSpy.mockRestore();

      const attempt = () =>
        request(app)
          .post('/api/auth/email/verify')
          .set('Authorization', `Bearer ${token}`)
          .send({ code: '000000' });

      for (let i = 0; i < 5; i++) {
        const wrong = await attempt();
        expect(wrong.status).toBe(400);
      }

      const res = await request(app)
        .post('/api/auth/email/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Неверный или истёкший код');
    });
  });
});

require('dotenv').config();
const request = require('supertest');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

// SMTP не настроен в тестовом окружении — shared/mailer.js в этом случае
// печатает код в консоль вместо отправки письма (см. mailer.js). Тесты
// перехватывают console.log, чтобы узнать код так же, как в реальности его
// узнал бы пользователь из письма.
function captureCode(logSpy) {
  const call = logSpy.mock.calls.find(args => String(args[0]).includes('[dev] Письмо для'));
  const match = call && String(call[0]).match(/Код для подтверждения email: (\d{6})/);
  return match ? match[1] : null;
}

async function registerAndCaptureCode(app, email, password = 'super-secret-123') {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const res = await request(app).post('/api/account/register').send({ email, password });
  const code = captureCode(logSpy);
  logSpy.mockRestore();
  return { res, code };
}

describe('Email verification', () => {
  let app;
  const emails = [
    'test-email-verification@chesslab.local',
    'test-email-verification-cooldown@chesslab.local',
    'test-email-verification-lockout@chesslab.local',
    'test-email-verification-gate@chesslab.local'
  ];

  beforeAll(async () => {
    app = createApp();
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  it('регистрация создаёт код и печатает его в лог (SMTP не настроен)', async () => {
    const { res, code } = await registerAndCaptureCode(app, emails[0]);
    expect(res.status).toBe(201);
    expect(res.body.user.emailVerified).toBe(false);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('оба маршрута требуют токен', async () => {
    const verify = await request(app).post('/api/email-verification/verify').send({ code: '123456' });
    const resend = await request(app).post('/api/email-verification/resend');
    expect(verify.status).toBe(401);
    expect(resend.status).toBe(401);
  });

  it('отклоняет код не из 6 цифр валидацией формы', async () => {
    const login = await request(app).post('/api/account/login').send({ email: emails[0], password: 'super-secret-123' });
    const res = await request(app)
      .post('/api/email-verification/verify')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ code: '12a456' });
    expect(res.status).toBe(400);
  });

  it('неверный код отклоняется общей ошибкой', async () => {
    const login = await request(app).post('/api/account/login').send({ email: emails[0], password: 'super-secret-123' });
    const res = await request(app)
      .post('/api/email-verification/verify')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Неверный или истёкший код');
  });

  it('верный код подтверждает почту, повторный вызов идемпотентен', async () => {
    const { res: registerRes, code } = await registerAndCaptureCode(app, emails[0].replace('@', '-verify@'));
    const token = registerRes.body.token;

    const ok = await request(app)
      .post('/api/email-verification/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ code });
    expect(ok.status).toBe(200);
    expect(ok.body.user.emailVerified).toBe(true);

    // Повторный вызов тем же (уже использованным) кодом — не ошибка, а
    // идемпотентный успех: строка EmailVerification уже удалена, но
    // пользователь и так подтверждён.
    const again = await request(app)
      .post('/api/email-verification/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ code });
    expect(again.status).toBe(200);
    expect(again.body.user.emailVerified).toBe(true);

    await prisma.user.deleteMany({ where: { email: emails[0].replace('@', '-verify@') } });
  });

  it('resend для уже подтверждённого — alreadyVerified, без нового письма', async () => {
    const { res: registerRes, code } = await registerAndCaptureCode(app, emails[0].replace('@', '-resend-verified@'));
    const token = registerRes.body.token;
    await request(app)
      .post('/api/email-verification/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ code });

    const res = await request(app)
      .post('/api/email-verification/resend')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.alreadyVerified).toBe(true);

    await prisma.user.deleteMany({ where: { email: emails[0].replace('@', '-resend-verified@') } });
  });

  it('resend раньше 60 секунд после регистрации отдаёт retryAfterSeconds, не шлёт письмо повторно', async () => {
    const { res: registerRes } = await registerAndCaptureCode(app, emails[1]);
    const token = registerRes.body.token;

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const res = await request(app)
      .post('/api/email-verification/resend')
      .set('Authorization', `Bearer ${token}`);
    const sentAgain = captureCode(logSpy);
    logSpy.mockRestore();

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(false);
    expect(res.body.retryAfterSeconds).toBeGreaterThan(0);
    expect(res.body.retryAfterSeconds).toBeLessThanOrEqual(60);
    // Новое письмо не печаталось — кулдаун реально не даёт отправить повторно.
    expect(sentAgain).toBeNull();
  });

  it('после 5 неверных попыток код перестаёт приниматься даже правильным вводом', async () => {
    const { res: registerRes, code } = await registerAndCaptureCode(app, emails[2]);
    const token = registerRes.body.token;
    const attempt = () =>
      request(app)
        .post('/api/email-verification/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '000000' });

    for (let i = 0; i < 5; i++) {
      const wrong = await attempt();
      expect(wrong.status).toBe(400);
    }

    // Шестая попытка — уже правильным кодом, но лимит попыток исчерпан.
    const res = await request(app)
      .post('/api/email-verification/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ code });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Неверный или истёкший код');
  });

  describe('Обязательное подтверждение (requireVerifiedEmail)', () => {
    // Один пользователь на все три теста — так код из регистрации остаётся
    // валиден до теста «после подтверждения» (у resend есть 60-секундный
    // кулдаун, повторная регистрация/resend в отдельном тесте его бы задели).
    let token;
    let code;

    beforeAll(async () => {
      const { res, code: registrationCode } = await registerAndCaptureCode(app, emails[3]);
      token = res.body.token;
      code = registrationCode;
    });

    it('/me работает без подтверждения — иначе фронту нечем узнать статус', async () => {
      const res = await request(app).get('/api/account/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.emailVerified).toBe(false);
    });

    it('кабинет и таймзона отклоняются с кодом EMAIL_NOT_VERIFIED до подтверждения', async () => {
      const assignments = await request(app)
        .get('/api/account/assignments')
        .set('Authorization', `Bearer ${token}`);
      expect(assignments.status).toBe(403);
      expect(assignments.body.details).toEqual({ code: 'EMAIL_NOT_VERIFIED' });

      const dashboard = await request(app)
        .get('/api/account/dashboard')
        .set('Authorization', `Bearer ${token}`);
      expect(dashboard.status).toBe(403);

      const timezone = await request(app)
        .put('/api/account/timezone')
        .set('Authorization', `Bearer ${token}`)
        .send({ timeZone: 'Europe/Moscow' });
      expect(timezone.status).toBe(403);
    });

    it('покупка тоже отклоняется до подтверждения', async () => {
      // Задание с ценой не заводим — 403 от requireVerifiedEmail наступает
      // раньше, чем сервис вообще посмотрит на assignmentId.
      const res = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${token}`)
        .send({ assignmentId: 'does-not-matter' });
      expect(res.status).toBe(403);
      expect(res.body.details).toEqual({ code: 'EMAIL_NOT_VERIFIED' });
    });

    it('после подтверждения те же маршруты открываются', async () => {
      const verify = await request(app)
        .post('/api/email-verification/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code });
      expect(verify.status).toBe(200);

      const assignments = await request(app)
        .get('/api/account/assignments')
        .set('Authorization', `Bearer ${token}`);
      expect(assignments.status).toBe(200);
    });
  });
});

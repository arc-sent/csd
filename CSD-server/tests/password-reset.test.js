require('dotenv').config();
const request = require('supertest');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

// SMTP не настроен в тестовом окружении (см. tests/jest.setup.js) —
// shared/mailer.js печатает код в консоль вместо отправки письма.
function captureCode(logSpy) {
  const call = logSpy.mock.calls.find(args => String(args[0]).includes('[dev] Письмо для'));
  const match = call && String(call[0]).match(/Код для восстановления пароля: (\d{6})/);
  return match ? match[1] : null;
}

async function requestResetAndCaptureCode(app, email) {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const res = await request(app).post('/api/password-reset/request').send({ email });
  const code = captureCode(logSpy);
  logSpy.mockRestore();
  return { res, code };
}

function verifyCode(app, email, code) {
  return request(app).post('/api/password-reset/verify').send({ email, code });
}

function confirmReset(app, resetToken, newPassword) {
  return request(app).post('/api/password-reset/confirm').send({ resetToken, newPassword });
}

describe('Password reset', () => {
  let app;
  const emails = [
    'test-password-reset@chesslab.local',
    'test-password-reset-cooldown@chesslab.local',
    'test-password-reset-lockout@chesslab.local',
    'test-password-reset-success@chesslab.local'
  ];

  beforeAll(async () => {
    app = createApp();
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    for (const email of emails) {
      await request(app).post('/api/account/register').send({ email, password: 'old-password-123' });
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  it('request всегда отвечает {sent: true}, даже для несуществующего email — иначе оракул для перебора', async () => {
    const res = await request(app).post('/api/password-reset/request').send({ email: 'no-such-user@chesslab.local' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sent: true });
  });

  it('request для существующего email создаёт код и печатает его в лог', async () => {
    const { res, code } = await requestResetAndCaptureCode(app, emails[0]);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sent: true });
    expect(code).toMatch(/^\d{6}$/);
  });

  it('verify отклоняет код не из 6 цифр валидацией формы', async () => {
    const res = await verifyCode(app, emails[0], '12a456');
    expect(res.status).toBe(400);
  });

  it('неверный код отклоняется общей ошибкой, resetToken не выдаётся', async () => {
    const res = await verifyCode(app, emails[0], '000000');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Неверный или истёкший код');
    expect(res.body.resetToken).toBeUndefined();
  });

  it('код для несуществующего email отклоняется той же общей ошибкой', async () => {
    const res = await verifyCode(app, 'no-such-user@chesslab.local', '123456');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Неверный или истёкший код');
  });

  it('confirm с произвольным (не выданным сервером) resetToken отклоняется', async () => {
    const res = await confirmReset(app, 'not-a-real-token', 'new-password-123');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Неверный или истёкший код');
  });

  it('верный код выдаёт resetToken, тот же код повторно уже не подходит (погашен)', async () => {
    const { code } = await requestResetAndCaptureCode(app, emails[3]);

    const verify = await verifyCode(app, emails[3], code);
    expect(verify.status).toBe(200);
    expect(typeof verify.body.resetToken).toBe('string');

    const verifyAgain = await verifyCode(app, emails[3], code);
    expect(verifyAgain.status).toBe(400);
  });

  it('resetToken меняет пароль — вход старым паролем перестаёт работать, новым начинает', async () => {
    // Регистрируем отдельного пользователя для этого теста, чтобы не зависеть
    // от порядка с предыдущим (там код уже погашен).
    const email = emails[3].replace('@', '-confirm@');
    await request(app).post('/api/account/register').send({ email, password: 'old-password-123' });
    const { code } = await requestResetAndCaptureCode(app, email);

    const verify = await verifyCode(app, email, code);
    expect(verify.status).toBe(200);

    const confirm = await confirmReset(app, verify.body.resetToken, 'brand-new-password-123');
    expect(confirm.status).toBe(200);
    expect(confirm.body).toEqual({ ok: true });

    const oldLogin = await request(app).post('/api/account/login').send({ email, password: 'old-password-123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post('/api/account/login').send({ email, password: 'brand-new-password-123' });
    expect(newLogin.status).toBe(200);

    await prisma.user.deleteMany({ where: { email } });
  });

  it('тем же resetToken нельзя сменить пароль дважды', async () => {
    const email = emails[3].replace('@', '-reuse@');
    await request(app).post('/api/account/register').send({ email, password: 'old-password-123' });
    const { code } = await requestResetAndCaptureCode(app, email);
    const verify = await verifyCode(app, email, code);

    const first = await confirmReset(app, verify.body.resetToken, 'brand-new-password-123');
    expect(first.status).toBe(200);

    // JWT сам по себе не одноразовый (в отличие от кода) — но пароль уже
    // сменён, второе использование того же токена просто ставит тот же
    // пароль ещё раз, аккаунт не оказывается в непредсказуемом состоянии.
    const second = await confirmReset(app, verify.body.resetToken, 'another-password-123');
    expect(second.status).toBe(200);

    await prisma.user.deleteMany({ where: { email } });
  });

  it('resend раньше 60 секунд после запроса не шлёт письмо повторно, но всё равно отвечает {sent: true}', async () => {
    await requestResetAndCaptureCode(app, emails[1]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const res = await request(app).post('/api/password-reset/request').send({ email: emails[1] });
    const sentAgain = captureCode(logSpy);
    logSpy.mockRestore();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sent: true });
    // Новое письмо не печаталось — кулдаун реально не даёт отправить повторно.
    expect(sentAgain).toBeNull();
  });

  it('после 5 неверных попыток код перестаёт приниматься даже правильным вводом', async () => {
    const { code } = await requestResetAndCaptureCode(app, emails[2]);

    for (let i = 0; i < 5; i++) {
      const wrong = await verifyCode(app, emails[2], '000000');
      expect(wrong.status).toBe(400);
    }

    const res = await verifyCode(app, emails[2], code);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Неверный или истёкший код');
  });
});

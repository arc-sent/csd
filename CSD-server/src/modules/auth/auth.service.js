const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const { getJwtSecret, signToken, verifyToken } = require('../../shared/jwt');
const mailer = require('../../shared/mailer');

// Тот же шаблон и тот же жизненный цикл кода, что у email-verification на
// сайте (см. modules/email-verification/email-verification.service.js) —
// отдельный шаблон под смену почты админа заводить незачем, письмо и так
// про подтверждение почты.
const CODE_EMAIL_TEMPLATE = fs.readFileSync(
  path.join(__dirname, '../../shared/email-templates/verification-code.html'),
  'utf8'
);
// Шаблон для восстановления пароля — тот же, что и на сайте
// (modules/password-reset/password-reset.service.js).
const RESET_EMAIL_TEMPLATE = fs.readFileSync(
  path.join(__dirname, '../../shared/email-templates/password-reset-code.html'),
  'utf8'
);
const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const BAD_CODE_MESSAGE = 'Неверный или истёкший код';
// Токен смены пароля после верного кода — свой claim type, ОТДЕЛЬНЫЙ от
// 'password-reset' на сайте (там sub — id покупателя, здесь — id админа;
// секрет общий, значит типы обязаны различаться, тот же принцип, что и у
// 'admin'/'user' в login()).
const RESET_TOKEN_TYPE = 'admin-password-reset';
const RESET_TOKEN_TTL = '10m';

async function login(email, password) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) {
    throw new AppError(401, 'Неверный email или пароль');
  }
  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatches) {
    throw new AppError(401, 'Неверный email или пароль');
  }
  // type: 'admin' — обязателен, по нему authGuard отличает админский токен от
  // пользовательского (секрет у них общий, см. shared/jwt.js).
  const token = signToken(
    { sub: admin.id, email: admin.email, type: 'admin' },
    process.env.JWT_EXPIRES_IN || '12h'
  );
  return { token, admin: { id: admin.id, email: admin.email } };
}

async function getById(id) {
  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin) {
    throw new AppError(401, 'Пользователь не найден');
  }
  return { id: admin.id, email: admin.email };
}

// Пароль меняется сразу, без кода на почту — по требованию: «классический
// пароль» админа не нуждается в дополнительном подтверждении, в отличие от
// смены самого email (см. requestEmailChange/verifyEmailChange ниже).
// Старый хеш нигде не сохраняется — update просто перезаписывает поле.
async function changePassword(adminId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.adminUser.update({ where: { id: adminId }, data: { passwordHash } });
}

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function emailBody(code) {
  return (
    `Здравствуйте!\n\n` +
    `Код для подтверждения email: ${code}\n\n` +
    `Код действует 15 минут. Если вы не запрашивали смену почты в админ-панели ChessSchoolDinamik, ` +
    `просто проигнорируйте это письмо.`
  );
}

function emailHtml(code) {
  return CODE_EMAIL_TEMPLATE.replace(/{{CODE}}/g, code);
}

// Смена email, в отличие от пароля, требует подтверждения кодом — та же
// проверка, что при регистрации на сайте (см. email-verification.service.js):
// код шлётся на НОВЫЙ адрес (не на старый), потому что мы доказываем
// владение именно им, а не то, что запрос пришёл от владельца аккаунта —
// это уже гарантирует authGuard.
async function requestEmailChange(adminId, newEmail) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError(401, 'Пользователь не найден');
  if (admin.email === newEmail) {
    throw new AppError(400, 'Это и есть текущий email');
  }
  const taken = await prisma.adminUser.findUnique({ where: { email: newEmail } });
  if (taken) throw new AppError(409, 'Этот email уже используется другим аккаунтом');

  const existing = await prisma.adminEmailChange.findUnique({ where: { adminId } });
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt.getTime())) / 1000);
    return { sent: false, retryAfterSeconds };
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

  await prisma.adminEmailChange.upsert({
    where: { adminId },
    update: { newEmail, codeHash, expiresAt, attempts: 0, lastSentAt: now },
    create: { adminId, newEmail, codeHash, expiresAt, attempts: 0, lastSentAt: now }
  });

  await mailer.sendMail({
    to: newEmail,
    subject: 'Код подтверждения — ChessSchoolDinamik',
    text: emailBody(code),
    html: emailHtml(code)
  });

  return { sent: true };
}

// Подтверждает код и тут же заменяет email в БД — старое значение нигде не
// хранится, update перезаписывает поле (по тому же принципу, что и пароль).
async function verifyEmailChange(adminId, code) {
  const change = await prisma.adminEmailChange.findUnique({ where: { adminId } });
  if (!change || change.attempts >= MAX_ATTEMPTS || change.expiresAt < new Date()) {
    throw new AppError(400, BAD_CODE_MESSAGE);
  }

  const matches = await bcrypt.compare(code, change.codeHash);
  if (!matches) {
    await prisma.adminEmailChange.update({
      where: { adminId },
      data: { attempts: change.attempts + 1 }
    });
    throw new AppError(400, BAD_CODE_MESSAGE);
  }

  // Гонка с параллельной регистрацией того же email закрыта уникальным
  // индексом на AdminUser.email — update просто упадёт с P2002, и это
  // корректный исход (тот же email больше не свободен).
  let admin;
  try {
    [admin] = await prisma.$transaction([
      prisma.adminUser.update({ where: { id: adminId }, data: { email: change.newEmail } }),
      prisma.adminEmailChange.delete({ where: { adminId } })
    ]);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new AppError(409, 'Этот email уже используется другим аккаунтом');
    }
    throw err;
  }

  return { id: admin.id, email: admin.email };
}

function resetEmailBody(code) {
  return (
    `Здравствуйте!\n\n` +
    `Код для восстановления пароля: ${code}\n\n` +
    `Код действует 15 минут. Если вы не запрашивали восстановление пароля, ` +
    `просто проигнорируйте это письмо.`
  );
}

function resetEmailHtml(code) {
  return RESET_EMAIL_TEMPLATE.replace(/{{CODE}}/g, code);
}

// Восстановление пароля ДО входа — публичный, неаутентифицированный путь (в
// отличие от changePassword/requestEmailChange, которые требуют authGuard).
// Поэтому ответ всегда {sent: true} вне зависимости от того, существует ли
// такой email — иначе это оракул для перебора админских адресов (тот же
// принцип, что у login() и у password-reset.service.js на сайте). Код летит
// на ТЕКУЩИЙ email (это же и есть восстановление доступа к нему), а не на
// новый, как в requestEmailChange.
async function requestPasswordReset(email) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) return { sent: true };

  const existing = await prisma.adminPasswordReset.findUnique({ where: { adminId: admin.id } });
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return { sent: true };
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

  await prisma.adminPasswordReset.upsert({
    where: { adminId: admin.id },
    update: { codeHash, expiresAt, attempts: 0, lastSentAt: now },
    create: { adminId: admin.id, codeHash, expiresAt, attempts: 0, lastSentAt: now }
  });

  await mailer.sendMail({
    to: admin.email,
    subject: 'Восстановление пароля — ChessSchoolDinamik',
    text: resetEmailBody(code),
    html: resetEmailHtml(code)
  });

  return { sent: true };
}

// Проверяет код и сразу гасит его (строка удаляется) — дальше работает
// resetToken, повторно предъявить тот же код нельзя. Тоже по email, а не по
// adminId — админ ещё не аутентифицирован.
async function verifyPasswordResetCode(email, code) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) throw new AppError(400, BAD_CODE_MESSAGE);

  const reset = await prisma.adminPasswordReset.findUnique({ where: { adminId: admin.id } });
  if (!reset || reset.attempts >= MAX_ATTEMPTS || reset.expiresAt < new Date()) {
    throw new AppError(400, BAD_CODE_MESSAGE);
  }

  const matches = await bcrypt.compare(code, reset.codeHash);
  if (!matches) {
    await prisma.adminPasswordReset.update({
      where: { adminId: admin.id },
      data: { attempts: reset.attempts + 1 }
    });
    throw new AppError(400, BAD_CODE_MESSAGE);
  }

  await prisma.adminPasswordReset.delete({ where: { adminId: admin.id } });
  return signToken({ sub: admin.id, type: RESET_TOKEN_TYPE }, RESET_TOKEN_TTL);
}

// resetToken, а не email+code — код уже проверен и погашен в
// verifyPasswordResetCode, предъявить его повторно нельзя.
async function confirmPasswordReset(resetToken, newPassword) {
  let payload;
  try {
    payload = verifyToken(resetToken);
  } catch (err) {
    throw new AppError(400, BAD_CODE_MESSAGE);
  }
  if (payload.type !== RESET_TOKEN_TYPE) throw new AppError(400, BAD_CODE_MESSAGE);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.adminUser.update({ where: { id: payload.sub }, data: { passwordHash } });
}

module.exports = {
  login,
  getById,
  getJwtSecret,
  changePassword,
  requestEmailChange,
  verifyEmailChange,
  requestPasswordReset,
  verifyPasswordResetCode,
  confirmPasswordReset
};

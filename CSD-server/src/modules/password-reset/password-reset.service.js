const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const mailer = require('../../shared/mailer');
const { signToken, verifyToken } = require('../../shared/jwt');

// Токен смены пароля — короткоживущий JWT с тем же секретом, что и токены
// админа/покупателя (claim type их отличает — см. shared/jwt.js), а не
// отдельная запись в БД: он живёт считаные минуты и проверяется ровно один
// раз, заводить под это ещё одну таблицу незачем.
const RESET_TOKEN_TTL = '10m';
const RESET_TOKEN_TYPE = 'password-reset';

const CODE_EMAIL_TEMPLATE = fs.readFileSync(
  path.join(__dirname, '../../shared/email-templates/password-reset-code.html'),
  'utf8'
);

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

// Один и тот же ответ на неверный/просроченный/отсутствующий код — та же
// логика, что в email-verification.service.js: разные тексты дают
// подсказку атакующему, а пользователю всё равно нечего делать, кроме как
// запросить код заново.
const BAD_CODE_MESSAGE = 'Неверный или истёкший код';

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function emailBody(code) {
  return (
    `Здравствуйте!\n\n` +
    `Код для восстановления пароля: ${code}\n\n` +
    `Код действует 15 минут. Если вы не запрашивали восстановление пароля, ` +
    `просто проигнорируйте это письмо.`
  );
}

function emailHtml(code) {
  return CODE_EMAIL_TEMPLATE.replace(/{{CODE}}/g, code);
}

async function createAndSendCode(userId, email) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

  await prisma.passwordReset.upsert({
    where: { userId },
    update: { codeHash, expiresAt, attempts: 0, lastSentAt: now },
    create: { userId, codeHash, expiresAt, attempts: 0, lastSentAt: now }
  });

  await mailer.sendMail({
    to: email,
    subject: 'Восстановление пароля — ChessSchoolDinamik',
    text: emailBody(code),
    html: emailHtml(code)
  });
}

// Публичный, неаутентифицированный эндпоинт — принимает email напрямую (в
// отличие от email-verification, где запрос идёт от уже выданного JWT).
// Поэтому ответ всегда одинаковый вне зависимости от того, существует ли
// аккаунт и не истёк ли ещё cooldown с прошлой отправки — иначе это оракул
// для перебора зарегистрированных email (тот же принцип, что и в
// account.service.login()).
async function requestReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { sent: true };

  const existing = await prisma.passwordReset.findUnique({ where: { userId: user.id } });
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    // Реального письма не будет, но ответ не должен отличаться от «отправлено».
    return { sent: true };
  }

  await createAndSendCode(user.id, user.email);
  return { sent: true };
}

// Тоже по email, а не по userId — пользователь ещё не аутентифицирован (в
// этом и смысл восстановления пароля). Код проверяется здесь один раз и сразу
// гасится (строка удаляется) — дальше пользователь работает с resetToken, а
// не может подобрать новый пароль к тому же коду повторно.
async function verifyResetCode(email, code) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(400, BAD_CODE_MESSAGE);

  const reset = await prisma.passwordReset.findUnique({ where: { userId: user.id } });
  if (!reset || reset.attempts >= MAX_ATTEMPTS || reset.expiresAt < new Date()) {
    throw new AppError(400, BAD_CODE_MESSAGE);
  }

  const matches = await bcrypt.compare(code, reset.codeHash);
  if (!matches) {
    await prisma.passwordReset.update({
      where: { userId: user.id },
      data: { attempts: reset.attempts + 1 }
    });
    throw new AppError(400, BAD_CODE_MESSAGE);
  }

  await prisma.passwordReset.delete({ where: { userId: user.id } });
  return signToken({ sub: user.id, type: RESET_TOKEN_TYPE }, RESET_TOKEN_TTL);
}

// resetToken, а не email+code: код уже проверен и погашен в verifyResetCode,
// повторно предъявить его нельзя, поэтому у смены пароля свой отдельный,
// одноразовый по факту использования секрет.
async function confirmReset(resetToken, newPassword) {
  let payload;
  try {
    payload = verifyToken(resetToken);
  } catch (err) {
    throw new AppError(400, BAD_CODE_MESSAGE);
  }
  if (payload.type !== RESET_TOKEN_TYPE) throw new AppError(400, BAD_CODE_MESSAGE);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: payload.sub }, data: { passwordHash } });
}

module.exports = { requestReset, verifyResetCode, confirmReset };

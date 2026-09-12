const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const mailer = require('../../shared/mailer');

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

// Один и тот же текст на неверный/просроченный/отсутствующий код и на
// исчерпанные попытки — по той же логике, что и account.service.login():
// разные тексты ничего не дают пользователю, который всё равно может только
// запросить код заново, а вот подсказку атакующему («код именно просрочен»,
// «именно неверный») дают.
const BAD_CODE_MESSAGE = 'Неверный или истёкший код';

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function emailBody(code) {
  return (
    `Здравствуйте!\n\n` +
    `Код для подтверждения email: ${code}\n\n` +
    `Код действует 15 минут. Если вы не регистрировались на ChessSchoolDinamik, ` +
    `просто проигнорируйте это письмо.`
  );
}

// Генерирует код, хеширует, upsert'ит строку (одна активная запись на
// пользователя — resend полностью её перезаписывает, история не нужна) и
// отправляет письмо. Вызывается и при регистрации, и при resend — оба места
// хотят одно и то же: новый код взамен старого.
async function createAndSendCode(userId, email) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

  await prisma.emailVerification.upsert({
    where: { userId },
    update: { codeHash, expiresAt, attempts: 0, lastSentAt: now },
    create: { userId, codeHash, expiresAt, attempts: 0, lastSentAt: now }
  });

  await mailer.sendMail({
    to: email,
    subject: 'Код подтверждения — ChessSchoolDinamik',
    text: emailBody(code)
  });
}

async function verifyCode(userId, code) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
  if (!user) throw new AppError(404, 'Пользователь не найден');
  // Идемпотентно: повторный вызов после успеха не должен быть ошибкой —
  // фронту не нужно отдельно помнить, что уже подтверждено.
  if (user.emailVerifiedAt) return;

  const verification = await prisma.emailVerification.findUnique({ where: { userId } });
  if (!verification || verification.attempts >= MAX_ATTEMPTS || verification.expiresAt < new Date()) {
    throw new AppError(400, BAD_CODE_MESSAGE);
  }

  const matches = await bcrypt.compare(code, verification.codeHash);
  if (!matches) {
    await prisma.emailVerification.update({
      where: { userId },
      data: { attempts: verification.attempts + 1 }
    });
    throw new AppError(400, BAD_CODE_MESSAGE);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerification.delete({ where: { userId } })
  ]);
}

async function resendCode(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerifiedAt: true } });
  if (!user) throw new AppError(404, 'Пользователь не найден');
  if (user.emailVerifiedAt) return { alreadyVerified: true };

  const verification = await prisma.emailVerification.findUnique({ where: { userId } });
  if (verification) {
    const elapsed = Date.now() - verification.lastSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      return { sent: false, retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000) };
    }
  }

  await createAndSendCode(userId, user.email);
  return { sent: true };
}

module.exports = { createAndSendCode, verifyCode, resendCode };

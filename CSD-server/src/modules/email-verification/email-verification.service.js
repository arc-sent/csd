const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const mailer = require('../../shared/mailer');

const CODE_EMAIL_TEMPLATE = fs.readFileSync(
  path.join(__dirname, '../../shared/email-templates/verification-code.html'),
  'utf8'
);

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

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

function emailHtml(code) {
  return CODE_EMAIL_TEMPLATE.replace(/{{CODE}}/g, code);
}

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
    text: emailBody(code),
    html: emailHtml(code)
  });
}

async function verifyCode(userId, code) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
  if (!user) throw new AppError(404, 'Пользователь не найден');
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

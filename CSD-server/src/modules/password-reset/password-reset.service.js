const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const mailer = require('../../shared/mailer');
const { signToken, verifyToken } = require('../../shared/jwt');

const RESET_TOKEN_TTL = '10m';
const RESET_TOKEN_TYPE = 'password-reset';

const CODE_EMAIL_TEMPLATE = fs.readFileSync(
  path.join(__dirname, '../../shared/email-templates/password-reset-code.html'),
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

async function requestReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { sent: true };

  const existing = await prisma.passwordReset.findUnique({ where: { userId: user.id } });
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return { sent: true };
  }

  await createAndSendCode(user.id, user.email);
  return { sent: true };
}

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

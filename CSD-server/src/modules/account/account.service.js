const bcrypt = require('bcryptjs');
const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const { signToken } = require('../../shared/jwt');
const emailVerification = require('../email-verification/email-verification.service');

// Покупателя не нужно разлогинивать каждые 12 часов, как админа. Общий с
// админом секрет безопасен именно благодаря claim'у type (см. shared/jwt.js).
const USER_TOKEN_TTL = () => process.env.USER_JWT_EXPIRES_IN || '30d';

// emailVerified — производное от emailVerifiedAt (см. schema.prisma), а не
// отдельное поле в БД: фронту нужен только факт, а не момент подтверждения.
// Мягкий режим — это поле нигде не проверяется как гейт, только для бейджа.
const publicUser = user => ({ id: user.id, email: user.email, name: user.name, emailVerified: Boolean(user.emailVerifiedAt) });

function issueToken(user) {
  return signToken({ sub: user.id, email: user.email, type: 'user' }, USER_TOKEN_TTL());
}

async function register({ email, password, name }) {
  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await prisma.user.create({ data: { email, passwordHash, name: name || null } });
  } catch (err) {
    // P2002 — нарушение уникальности email. Ловим ошибку, а не проверяем
    // findUnique заранее: предварительная проверка — это гонка.
    if (err.code === 'P2002') {
      throw new AppError(409, 'Пользователь с таким email уже зарегистрирован');
    }
    throw err;
  }

  // Мягкий режим: аккаунт уже создан и токен уже выдан ниже вне зависимости
  // от исхода отправки — сама отправка (и её ошибки) не должна мешать
  // регистрации. mailer.sendMail уже не бросает исключений при сбое SMTP, но
  // подстраховываемся и здесь на случай ошибки в самой генерации кода.
  try {
    await emailVerification.createAndSendCode(user.id, user.email);
  } catch (err) {
    console.warn('Не удалось создать код подтверждения email при регистрации:', err.message);
  }

  return { token: issueToken(user), user: publicUser(user) };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Один и тот же ответ на три разных случая (нет аккаунта / аккаунт без
  // пароля / неверный пароль) — иначе это оракул для перебора аккаунтов.
  const passwordMatches = user && user.passwordHash
    ? await bcrypt.compare(password, user.passwordHash)
    : false;
  if (!passwordMatches) {
    throw new AppError(401, 'Неверный email или пароль');
  }
  return { token: issueToken(user), user: publicUser(user) };
}

async function getById(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(401, 'Пользователь не найден');
  return publicUser(user);
}

module.exports = { register, login, getById };

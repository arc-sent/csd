const bcrypt = require('bcryptjs');
const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const { signToken } = require('../../shared/jwt');

// Покупателя не нужно разлогинивать каждые 12 часов, как админа. Общий с
// админом секрет безопасен именно благодаря claim'у type (см. shared/jwt.js).
const USER_TOKEN_TTL = () => process.env.USER_JWT_EXPIRES_IN || '30d';

const publicUser = user => ({ id: user.id, email: user.email, name: user.name });

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

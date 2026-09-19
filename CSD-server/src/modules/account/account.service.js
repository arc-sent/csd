const bcrypt = require('bcryptjs');
const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const { signToken } = require('../../shared/jwt');
const emailVerification = require('../email-verification/email-verification.service');

const USER_TOKEN_TTL = () => process.env.USER_JWT_EXPIRES_IN || '30d';

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
    if (err.code === 'P2002') {
      throw new AppError(409, 'Пользователь с таким email уже зарегистрирован');
    }
    throw err;
  }

  try {
    await emailVerification.createAndSendCode(user.id, user.email);
  } catch (err) {
    console.warn('Не удалось создать код подтверждения email при регистрации:', err.message);
  }

  return { token: issueToken(user), user: publicUser(user) };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
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

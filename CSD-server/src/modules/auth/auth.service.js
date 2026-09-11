const bcrypt = require('bcryptjs');
const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const { getJwtSecret, signToken } = require('../../shared/jwt');

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

module.exports = { login, getById, getJwtSecret };

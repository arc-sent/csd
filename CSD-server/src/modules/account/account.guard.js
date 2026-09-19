const { makeGuard } = require('../../shared/guard');
const { AppError } = require('../../shared/errors');
const prisma = require('../../shared/prisma');

const userGuard = makeGuard('user', 'user');

async function requireVerifiedEmail(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { emailVerifiedAt: true }
    });
    if (!user) throw new AppError(401, 'Пользователь не найден');
    if (!user.emailVerifiedAt) {
      throw new AppError(403, 'Подтвердите почту, чтобы продолжить', { code: 'EMAIL_NOT_VERIFIED' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { userGuard, requireVerifiedEmail };

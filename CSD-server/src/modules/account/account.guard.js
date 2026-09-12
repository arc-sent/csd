const { makeGuard } = require('../../shared/guard');
const { AppError } = require('../../shared/errors');
const prisma = require('../../shared/prisma');

// Пропускает только токен ПОКУПАТЕЛЯ (type: 'user'). Админский токен сюда не
// проходит — это не формальность: у обоих один секрет, и без проверки типа
// границы между админкой и кабинетом просто не было бы.
// req.user.sub — id из таблицы users.
const userGuard = makeGuard('user', 'user');

// Обязательное подтверждение почты: ставится ВТОРЫМ middleware, после
// userGuard, а не встраивается в него — /email-verification/verify и
// /resend тоже идут через userGuard (иначе неподтверждённый пользователь не
// смог бы дойти даже до ввода кода), но не через этот гвард.
//
// Статус читается из БД заново, а не из JWT: claim'ы токена не обновляются
// сами при подтверждении почты, а перевыпускать токен на каждое подтверждение
// незачем — свежий SELECT дешевле.
//
// code: 'EMAIL_NOT_VERIFIED' в details — фронт различает эту причину отказа
// от любой другой 403 (например, «Задание не куплено» в entitlements) и
// ведёт на экран ввода кода, а не показывает голую ошибку.
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

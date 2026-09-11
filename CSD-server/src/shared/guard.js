const { AppError } = require('./errors');
const { verifyToken } = require('./jwt');

// Фабрика guard'ов: пропускает только валидный Bearer-токен, у которого claim
// `type` совпадает с ожидаемым. Токен БЕЗ claim'а отвергается — принимать его
// как админский значило бы оставить старую дыру открытой на весь срок жизни
// токена (см. shared/jwt.js).
//
// Текст ошибки при неверном типе — тот же, что при битой подписи: иначе это
// подсказка атакующему «токен валиден, но не тот тип».
function makeGuard(expectedType, reqField) {
  return function guard(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(new AppError(401, 'Требуется авторизация'));
    }
    try {
      const payload = verifyToken(token);
      if (!payload || payload.type !== expectedType) {
        return next(new AppError(401, 'Недействительный или истёкший токен'));
      }
      req[reqField] = payload;
      next();
    } catch (err) {
      next(new AppError(401, 'Недействительный или истёкший токен'));
    }
  };
}

module.exports = { makeGuard };

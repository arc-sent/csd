const { AppError } = require('./errors');
const { verifyToken } = require('./jwt');

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

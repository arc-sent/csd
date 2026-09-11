const { AppError } = require('../shared/errors');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }
  console.error(err);
  return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}

module.exports = { errorHandler };

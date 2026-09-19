const { AppError } = require('../shared/errors');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError(400, 'Некорректные данные запроса', result.error.flatten()));
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };

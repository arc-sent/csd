const jwt = require('jsonwebtoken');

// Общая работа с JWT для обоих субъектов — админа (модуль auth) и покупателя
// (модуль account). Вынесено сюда, чтобы account не зависел от auth.service.
//
// ВАЖНО: секрет у обоих один, поэтому в payload обязателен claim `type`
// ('admin' | 'user'), а guard'ы обязаны его проверять. Без этого токен
// покупателя проходил бы админский authGuard и открывал весь админский CRUD.
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET не задан в окружении');
  return secret;
}

function signToken(payload, expiresIn) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = { getJwtSecret, signToken, verifyToken };

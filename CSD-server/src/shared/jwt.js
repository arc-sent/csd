const jwt = require('jsonwebtoken');

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

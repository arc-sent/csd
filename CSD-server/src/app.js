require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const stagesRoutes = require('./modules/stages/stages.routes');
const assignmentsRoutes = require('./modules/assignments/assignments.routes');
const levelsRoutes = require('./modules/levels/levels.routes');
const engineRoutes = require('./modules/engine/engine.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const publicRoutes = require('./modules/public/public.routes');
const accountRoutes = require('./modules/account/account.routes');
const usersRoutes = require('./modules/users/users.routes');
const emailVerificationRoutes = require('./modules/email-verification/email-verification.routes');
const { errorHandler } = require('./middlewares/error-handler');

function createApp() {
  const app = express();

  // В деве статический сервер админки может подниматься на разных портах
  // (см. .claude/launch.json) — разрешаем любой localhost, чтобы не гнаться
  // за портом руками; в проде ALLOWED_ORIGIN должен быть указан явно.
  //
  // Сайту и админке всегда нужны РАЗНЫЕ origin'ы (разные порты/поддомены), а
  // при этом оба должны попадать в CORS одновременно — поэтому ALLOWED_ORIGIN
  // может перечислять несколько адресов через запятую
  // ("http://ip:5188,http://ip:5189"), а не только один.
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error('Origin не разрешён CORS-политикой'));
    }
  }));
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/stages', stagesRoutes);
  app.use('/api/assignments', assignmentsRoutes);
  app.use('/api/levels', levelsRoutes);
  app.use('/api/engine', engineRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/account', accountRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/email-verification', emailVerificationRoutes);

  app.use((req, res) => res.status(404).json({ error: 'Маршрут не найден' }));
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

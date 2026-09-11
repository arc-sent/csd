const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { authGuard } = require('../auth/auth.guard');
const { analyzeSchema } = require('./engine.validation');
const { analyzeHandler } = require('./engine.controller');

const router = Router();

// Анализ заметно тяжелее обычного CRUD, поэтому закрыт той же авторизацией —
// иначе открытый эндпоинт легко превратить в вектор DoS.
router.use(authGuard);
router.post('/analyze', validate(analyzeSchema), analyzeHandler);

module.exports = router;

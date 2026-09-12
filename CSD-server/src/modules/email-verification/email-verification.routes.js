const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { userGuard } = require('../account/account.guard');
const { verifyCodeSchema } = require('./email-verification.validation');
const controller = require('./email-verification.controller');

const router = Router();

// Оба маршрута — от JWT покупателя, а не по email: пользователь уже
// авторизован (получил токен при регистрации), это не публичная проверка
// «существует ли такой email» и не новый оракул для перебора аккаунтов.
router.post('/verify', userGuard, validate(verifyCodeSchema), controller.verifyHandler);
router.post('/resend', userGuard, controller.resendHandler);

module.exports = router;

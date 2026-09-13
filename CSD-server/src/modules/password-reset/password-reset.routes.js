const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { requestResetSchema, verifyResetSchema, confirmResetSchema } = require('./password-reset.validation');
const controller = require('./password-reset.controller');

const router = Router();

// Все три маршрута публичные (без userGuard) — пользователь ещё не может
// войти, в этом и смысл восстановления пароля. requestHandler всегда отвечает
// {sent: true} вне зависимости от того, существует ли email — см.
// password-reset.service.js. verify гасит код и выдаёт resetToken; confirm
// меняет пароль по этому токену, а не по коду повторно.
router.post('/request', validate(requestResetSchema), controller.requestHandler);
router.post('/verify', validate(verifyResetSchema), controller.verifyHandler);
router.post('/confirm', validate(confirmResetSchema), controller.confirmHandler);

module.exports = router;

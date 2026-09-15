const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const {
  loginSchema,
  changePasswordSchema,
  requestEmailChangeSchema,
  verifyEmailChangeSchema,
  requestPasswordResetSchema,
  verifyPasswordResetSchema,
  confirmPasswordResetSchema
} = require('./auth.validation');
const {
  loginHandler,
  meHandler,
  changePasswordHandler,
  requestEmailChangeHandler,
  verifyEmailChangeHandler,
  requestPasswordResetHandler,
  verifyPasswordResetHandler,
  confirmPasswordResetHandler
} = require('./auth.controller');
const { authGuard } = require('./auth.guard');

const router = Router();

router.post('/login', validate(loginSchema), loginHandler);
router.get('/me', authGuard, meHandler);

// Смена собственных учётных данных админа. Пароль меняется сразу, без кода
// (см. auth.service.js.changePassword); email — с подтверждением кодом на
// НОВЫЙ адрес, той же проверкой, что и email-verification на сайте.
router.put('/password', authGuard, validate(changePasswordSchema), changePasswordHandler);
router.post('/email/request', authGuard, validate(requestEmailChangeSchema), requestEmailChangeHandler);
router.post('/email/verify', authGuard, validate(verifyEmailChangeSchema), verifyEmailChangeHandler);

// Восстановление пароля ДО входа — без authGuard (админ ещё не
// аутентифицирован), та же трёхшаговая схема, что и password-reset на
// сайте: запрос кода → проверка кода (выдаёт resetToken) → смена пароля по
// resetToken. requestPasswordResetHandler всегда отвечает {sent: true} —
// см. auth.service.js.
router.post('/password-reset/request', validate(requestPasswordResetSchema), requestPasswordResetHandler);
router.post('/password-reset/verify', validate(verifyPasswordResetSchema), verifyPasswordResetHandler);
router.post('/password-reset/confirm', validate(confirmPasswordResetSchema), confirmPasswordResetHandler);

module.exports = router;

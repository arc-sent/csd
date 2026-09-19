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

router.put('/password', authGuard, validate(changePasswordSchema), changePasswordHandler);
router.post('/email/request', authGuard, validate(requestEmailChangeSchema), requestEmailChangeHandler);
router.post('/email/verify', authGuard, validate(verifyEmailChangeSchema), verifyEmailChangeHandler);

router.post('/password-reset/request', validate(requestPasswordResetSchema), requestPasswordResetHandler);
router.post('/password-reset/verify', validate(verifyPasswordResetSchema), verifyPasswordResetHandler);
router.post('/password-reset/confirm', validate(confirmPasswordResetSchema), confirmPasswordResetHandler);

module.exports = router;

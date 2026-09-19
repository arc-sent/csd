const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { userGuard } = require('../account/account.guard');
const { verifyCodeSchema } = require('./email-verification.validation');
const controller = require('./email-verification.controller');

const router = Router();

router.post('/verify', userGuard, validate(verifyCodeSchema), controller.verifyHandler);
router.post('/resend', userGuard, controller.resendHandler);

module.exports = router;

const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { userGuard, requireVerifiedEmail } = require('../account/account.guard');
const { authGuard } = require('../auth/auth.guard');
const { createPaymentSchema } = require('./payments.validation');
const controller = require('./payments.controller');

const router = Router();

router.post('/create', userGuard, requireVerifiedEmail, validate(createPaymentSchema), controller.createHandler);
router.post('/webhook', controller.webhookHandler);

router.get('/', authGuard, controller.listHandler);
router.post('/:id/refresh', authGuard, controller.refreshHandler);

module.exports = router;

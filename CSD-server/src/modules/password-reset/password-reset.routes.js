const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { requestResetSchema, verifyResetSchema, confirmResetSchema } = require('./password-reset.validation');
const controller = require('./password-reset.controller');

const router = Router();

router.post('/request', validate(requestResetSchema), controller.requestHandler);
router.post('/verify', validate(verifyResetSchema), controller.verifyHandler);
router.post('/confirm', validate(confirmResetSchema), controller.confirmHandler);

module.exports = router;

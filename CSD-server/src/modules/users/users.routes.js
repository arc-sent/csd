const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { authGuard } = require('../auth/auth.guard');
const { grantBodySchema } = require('./users.validation');
const controller = require('./users.controller');

const router = Router();

// Аккаунты покупателей видит только админ — гвард на весь роутер.
router.use(authGuard);

router.get('/', controller.listHandler);
router.get('/:id', controller.getHandler);
router.post('/:id/grants', validate(grantBodySchema), controller.grantHandler);
router.delete('/:id/grants/:grantId', controller.revokeHandler);

module.exports = router;

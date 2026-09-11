const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { authGuard } = require('../auth/auth.guard');
const { levelBodySchema, statusBodySchema } = require('./levels.validation');
const controller = require('./levels.controller');

const router = Router();

// Вся админка закрыта авторизацией — уровни правит только вошедший админ.
router.use(authGuard);

router.get('/', controller.listHandler);
router.get('/:id', controller.getHandler);
router.post('/', validate(levelBodySchema), controller.createHandler);
router.put('/:id', validate(levelBodySchema), controller.updateHandler);
router.patch('/:id/status', validate(statusBodySchema), controller.updateStatusHandler);
router.delete('/:id', controller.removeHandler);

module.exports = router;

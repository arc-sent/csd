const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { authGuard } = require('../auth/auth.guard');
const { stageBodySchema, statusBodySchema } = require('./stages.validation');
const controller = require('./stages.controller');

const router = Router();

router.use(authGuard);

router.get('/', controller.listHandler);
router.get('/:id', controller.getHandler);
router.post('/', validate(stageBodySchema), controller.createHandler);
router.put('/:id', validate(stageBodySchema), controller.updateHandler);
router.patch('/:id/status', validate(statusBodySchema), controller.updateStatusHandler);
router.delete('/:id', controller.removeHandler);

module.exports = router;

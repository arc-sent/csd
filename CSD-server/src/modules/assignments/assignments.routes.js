const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { authGuard } = require('../auth/auth.guard');
const { assignmentBodySchema, statusBodySchema } = require('./assignments.validation');
const controller = require('./assignments.controller');

const router = Router();

router.use(authGuard);

router.get('/', controller.listHandler);
router.get('/:id', controller.getHandler);
router.post('/', validate(assignmentBodySchema), controller.createHandler);
router.put('/:id', validate(assignmentBodySchema), controller.updateHandler);
router.patch('/:id/status', validate(statusBodySchema), controller.updateStatusHandler);
router.delete('/:id', controller.removeHandler);

module.exports = router;

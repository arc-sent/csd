const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { loginSchema } = require('./auth.validation');
const { loginHandler, meHandler } = require('./auth.controller');
const { authGuard } = require('./auth.guard');

const router = Router();

router.post('/login', validate(loginSchema), loginHandler);
router.get('/me', authGuard, meHandler);

module.exports = router;

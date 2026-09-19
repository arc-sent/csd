const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { userGuard, requireVerifiedEmail } = require('./account.guard');
const { registerSchema, loginSchema, progressSchema, timeZoneSchema } = require('./account.validation');
const controller = require('./account.controller');

const router = Router();

router.post('/register', validate(registerSchema), controller.registerHandler);
router.post('/login', validate(loginSchema), controller.loginHandler);

router.get('/me', userGuard, controller.meHandler);
router.get('/assignments', userGuard, requireVerifiedEmail, controller.myAssignmentsHandler);
router.get('/dashboard', userGuard, requireVerifiedEmail, controller.dashboardHandler);
router.get('/assignments/:id/levels', userGuard, requireVerifiedEmail, controller.assignmentLevelsHandler);
router.get('/levels/:id', userGuard, requireVerifiedEmail, controller.levelHandler);
router.post('/levels/:id/progress', userGuard, requireVerifiedEmail, validate(progressSchema), controller.progressHandler);
router.put('/timezone', userGuard, requireVerifiedEmail, validate(timeZoneSchema), controller.timeZoneHandler);
router.post('/achievements/seen', userGuard, requireVerifiedEmail, controller.achievementsSeenHandler);

module.exports = router;

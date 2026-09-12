const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { userGuard, requireVerifiedEmail } = require('./account.guard');
const { registerSchema, loginSchema, progressSchema, timeZoneSchema } = require('./account.validation');
const controller = require('./account.controller');

const router = Router();

// Личный кабинет покупателя. Модуль намеренно НЕ импортирует authGuard из
// модуля auth — админ и покупатель это разные субъекты с разными guard'ами,
// и физическое разделение файлов не даёт их случайно перепутать.
router.post('/register', validate(registerSchema), controller.registerHandler);
router.post('/login', validate(loginSchema), controller.loginHandler);

// /me — без requireVerifiedEmail: это единственный способ фронта узнать
// текущего пользователя (включая сам emailVerified) и решить, показывать ли
// экран подтверждения — гейтить его же самого нечем.
router.get('/me', userGuard, controller.meHandler);
router.get('/assignments', userGuard, requireVerifiedEmail, controller.myAssignmentsHandler);
router.get('/dashboard', userGuard, requireVerifiedEmail, controller.dashboardHandler);
router.get('/assignments/:id/levels', userGuard, requireVerifiedEmail, controller.assignmentLevelsHandler);
router.get('/levels/:id', userGuard, requireVerifiedEmail, controller.levelHandler);
router.post('/levels/:id/progress', userGuard, requireVerifiedEmail, validate(progressSchema), controller.progressHandler);
router.put('/timezone', userGuard, requireVerifiedEmail, validate(timeZoneSchema), controller.timeZoneHandler);
router.post('/achievements/seen', userGuard, requireVerifiedEmail, controller.achievementsSeenHandler);

module.exports = router;

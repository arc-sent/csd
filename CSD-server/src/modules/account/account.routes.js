const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { userGuard } = require('./account.guard');
const { registerSchema, loginSchema, progressSchema, timeZoneSchema } = require('./account.validation');
const controller = require('./account.controller');

const router = Router();

// Личный кабинет покупателя. Модуль намеренно НЕ импортирует authGuard из
// модуля auth — админ и покупатель это разные субъекты с разными guard'ами,
// и физическое разделение файлов не даёт их случайно перепутать.
router.post('/register', validate(registerSchema), controller.registerHandler);
router.post('/login', validate(loginSchema), controller.loginHandler);

router.get('/me', userGuard, controller.meHandler);
router.get('/assignments', userGuard, controller.myAssignmentsHandler);
router.get('/dashboard', userGuard, controller.dashboardHandler);
router.get('/assignments/:id/levels', userGuard, controller.assignmentLevelsHandler);
router.get('/levels/:id', userGuard, controller.levelHandler);
router.post('/levels/:id/progress', userGuard, validate(progressSchema), controller.progressHandler);
router.put('/timezone', userGuard, validate(timeZoneSchema), controller.timeZoneHandler);
router.post('/achievements/seen', userGuard, controller.achievementsSeenHandler);

module.exports = router;

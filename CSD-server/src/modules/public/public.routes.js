const { Router } = require('express');
const controller = require('./public.controller');

const router = Router();

// Без authGuard — это витрина для лендинга (тарифы), а не админка.
// Отдаёт только опубликованные этапы/задания, см. public.service.js.
router.get('/stages', controller.listStagesHandler);

module.exports = router;

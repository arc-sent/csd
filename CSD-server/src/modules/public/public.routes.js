const { Router } = require('express');
const controller = require('./public.controller');

const router = Router();

router.get('/stages', controller.listStagesHandler);

module.exports = router;

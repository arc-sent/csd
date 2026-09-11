const { Router } = require('express');
const { validate } = require('../../middlewares/validate');
const { userGuard } = require('../account/account.guard');
const { authGuard } = require('../auth/auth.guard');
const { createPaymentSchema } = require('./payments.validation');
const controller = require('./payments.controller');

const router = Router();

// Покупка только из-под аккаунта покупателя (userGuard, не authGuard) —
// платёж сразу привязывается к userId, из аккаунта же берётся почта для чека.
router.post('/create', userGuard, validate(createPaymentSchema), controller.createHandler);
// Без guard'а — сюда стучится сама ЮKassa, а не наш фронтенд.
// Подлинность уведомления не проверяется по телу запроса (см. handleWebhook).
router.post('/webhook', controller.webhookHandler);

// Журнал платежей в админке. Гвард висит на маршрутах, а не на роутере
// (router.use) — иначе он накрыл бы и вебхук, к которому ЮKassa приходит без
// какого-либо нашего токена.
router.get('/', authGuard, controller.listHandler);
router.post('/:id/refresh', authGuard, controller.refreshHandler);

module.exports = router;

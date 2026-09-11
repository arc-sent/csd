const paymentsService = require('./payments.service');

async function createHandler(req, res, next) {
  try {
    const payment = await paymentsService.createPayment({
      assignmentId: req.body.assignmentId,
      userId: req.user.sub
    });
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
}

async function webhookHandler(req, res, next) {
  try {
    await paymentsService.handleWebhook(req.body);
    // ЮKassa ретраит вебхук, если не получит 200 — подтверждаем приём сразу
    // после того, как сами всё проверили и обновили запись.
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}

// Админский журнал платежей. Фильтры приходят строкой запроса, пустые
// значения отбрасываем — validate() в проекте разбирает только тело.
async function listHandler(req, res, next) {
  try {
    const { q, status, assignmentId } = req.query;
    res.json(await paymentsService.listPayments({
      q: q ? String(q).trim() : undefined,
      status: status ? String(status) : undefined,
      assignmentId: assignmentId ? String(assignmentId) : undefined
    }));
  } catch (err) {
    next(err);
  }
}

async function refreshHandler(req, res, next) {
  try {
    res.json(await paymentsService.refreshPayment(req.params.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { createHandler, webhookHandler, listHandler, refreshHandler };

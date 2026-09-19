const paymentsService = require('./payments.service');

async function createHandler(req, res, next) {
  try {
    const payment = await paymentsService.createPayment({
      assignmentId: req.body.assignmentId,
      stageId: req.body.stageId,
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
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}

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

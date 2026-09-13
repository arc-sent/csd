const service = require('./password-reset.service');

async function requestHandler(req, res, next) {
  try {
    res.json(await service.requestReset(req.body.email));
  } catch (err) {
    next(err);
  }
}

async function verifyHandler(req, res, next) {
  try {
    const resetToken = await service.verifyResetCode(req.body.email, req.body.code);
    res.json({ resetToken });
  } catch (err) {
    next(err);
  }
}

async function confirmHandler(req, res, next) {
  try {
    const { resetToken, newPassword } = req.body;
    await service.confirmReset(resetToken, newPassword);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { requestHandler, verifyHandler, confirmHandler };

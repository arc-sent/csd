const service = require('./email-verification.service');
const accountService = require('../account/account.service');

async function verifyHandler(req, res, next) {
  try {
    await service.verifyCode(req.user.sub, req.body.code);
    const user = await accountService.getById(req.user.sub);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function resendHandler(req, res, next) {
  try {
    res.json(await service.resendCode(req.user.sub));
  } catch (err) {
    next(err);
  }
}

module.exports = { verifyHandler, resendHandler };

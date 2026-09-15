const authService = require('./auth.service');

async function loginHandler(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function meHandler(req, res, next) {
  try {
    const admin = await authService.getById(req.admin.sub);
    res.json({ admin });
  } catch (err) {
    next(err);
  }
}

async function changePasswordHandler(req, res, next) {
  try {
    await authService.changePassword(req.admin.sub, req.body.newPassword);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function requestEmailChangeHandler(req, res, next) {
  try {
    res.json(await authService.requestEmailChange(req.admin.sub, req.body.newEmail));
  } catch (err) {
    next(err);
  }
}

async function verifyEmailChangeHandler(req, res, next) {
  try {
    const admin = await authService.verifyEmailChange(req.admin.sub, req.body.code);
    res.json({ admin });
  } catch (err) {
    next(err);
  }
}

async function requestPasswordResetHandler(req, res, next) {
  try {
    res.json(await authService.requestPasswordReset(req.body.email));
  } catch (err) {
    next(err);
  }
}

async function verifyPasswordResetHandler(req, res, next) {
  try {
    const resetToken = await authService.verifyPasswordResetCode(req.body.email, req.body.code);
    res.json({ resetToken });
  } catch (err) {
    next(err);
  }
}

async function confirmPasswordResetHandler(req, res, next) {
  try {
    await authService.confirmPasswordReset(req.body.resetToken, req.body.newPassword);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  loginHandler,
  meHandler,
  changePasswordHandler,
  requestEmailChangeHandler,
  verifyEmailChangeHandler,
  requestPasswordResetHandler,
  verifyPasswordResetHandler,
  confirmPasswordResetHandler
};

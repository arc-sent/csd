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

module.exports = { loginHandler, meHandler };

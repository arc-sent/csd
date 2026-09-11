const usersService = require('./users.service');

async function listHandler(req, res, next) {
  try {
    const { q } = req.query;
    res.json(await usersService.list({ q: q ? String(q).trim() : undefined }));
  } catch (err) {
    next(err);
  }
}

async function getHandler(req, res, next) {
  try {
    res.json(await usersService.getById(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function grantHandler(req, res, next) {
  try {
    // req.admin.sub кладёт authGuard — фиксируем, кто выдал доступ.
    const grant = await usersService.grantAssignment(req.params.id, req.body, req.admin.sub);
    res.status(201).json(grant);
  } catch (err) {
    next(err);
  }
}

async function revokeHandler(req, res, next) {
  try {
    await usersService.revokeGrant(req.params.id, req.params.grantId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listHandler, getHandler, grantHandler, revokeHandler };

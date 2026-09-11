const assignmentsService = require('./assignments.service');

async function listHandler(req, res, next) {
  try {
    res.json(await assignmentsService.list({ stageId: req.query.stageId }));
  } catch (err) {
    next(err);
  }
}

async function getHandler(req, res, next) {
  try {
    res.json(await assignmentsService.getById(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function createHandler(req, res, next) {
  try {
    res.status(201).json(await assignmentsService.create(req.body));
  } catch (err) {
    next(err);
  }
}

async function updateHandler(req, res, next) {
  try {
    res.json(await assignmentsService.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function updateStatusHandler(req, res, next) {
  try {
    res.json(await assignmentsService.updateStatus(req.params.id, req.body.status));
  } catch (err) {
    next(err);
  }
}

async function removeHandler(req, res, next) {
  try {
    await assignmentsService.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listHandler,
  getHandler,
  createHandler,
  updateHandler,
  updateStatusHandler,
  removeHandler
};

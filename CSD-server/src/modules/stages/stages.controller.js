const stagesService = require('./stages.service');

async function listHandler(req, res, next) {
  try {
    res.json(await stagesService.list());
  } catch (err) {
    next(err);
  }
}

async function getHandler(req, res, next) {
  try {
    res.json(await stagesService.getById(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function createHandler(req, res, next) {
  try {
    res.status(201).json(await stagesService.create(req.body));
  } catch (err) {
    next(err);
  }
}

async function updateHandler(req, res, next) {
  try {
    res.json(await stagesService.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function updateStatusHandler(req, res, next) {
  try {
    res.json(await stagesService.updateStatus(req.params.id, req.body.status));
  } catch (err) {
    next(err);
  }
}

async function removeHandler(req, res, next) {
  try {
    await stagesService.remove(req.params.id);
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

const publicService = require('./public.service');

async function listStagesHandler(req, res, next) {
  try {
    res.json(await publicService.listStages());
  } catch (err) {
    next(err);
  }
}

module.exports = { listStagesHandler };

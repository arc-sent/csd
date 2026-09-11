const engineService = require('./engine.service');

async function analyzeHandler(req, res, next) {
  try {
    res.json(await engineService.analyzeLevel(req.body));
  } catch (err) {
    next(err);
  }
}

module.exports = { analyzeHandler };

const accountService = require('./account.service');
const cabinetService = require('./cabinet.service');

async function registerHandler(req, res, next) {
  try {
    res.status(201).json(await accountService.register(req.body));
  } catch (err) {
    next(err);
  }
}

async function loginHandler(req, res, next) {
  try {
    res.json(await accountService.login(req.body.email, req.body.password));
  } catch (err) {
    next(err);
  }
}

async function meHandler(req, res, next) {
  try {
    res.json({ user: await accountService.getById(req.user.sub) });
  } catch (err) {
    next(err);
  }
}

async function myAssignmentsHandler(req, res, next) {
  try {
    res.json({ assignments: await cabinetService.listMyAssignments(req.user.sub) });
  } catch (err) {
    next(err);
  }
}

async function dashboardHandler(req, res, next) {
  try {
    res.json(await cabinetService.getDashboard(req.user.sub));
  } catch (err) {
    next(err);
  }
}

async function assignmentLevelsHandler(req, res, next) {
  try {
    res.json(await cabinetService.listAssignmentLevels(req.user.sub, req.params.id));
  } catch (err) {
    next(err);
  }
}

async function levelHandler(req, res, next) {
  try {
    res.json(await cabinetService.getLevelForUser(req.user.sub, req.params.id));
  } catch (err) {
    next(err);
  }
}

async function progressHandler(req, res, next) {
  try {
    const progress =
      req.body.event === 'mistake'
        ? await cabinetService.markMistake(req.user.sub, req.params.id)
        : await cabinetService.markSolved(req.user.sub, req.params.id, {
            usedSolution: req.body.usedSolution
          });
    res.json({ progress });
  } catch (err) {
    next(err);
  }
}

async function timeZoneHandler(req, res, next) {
  try {
    await cabinetService.setTimeZone(req.user.sub, req.body.timeZone);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function achievementsSeenHandler(req, res, next) {
  try {
    await cabinetService.markAchievementsSeen(req.user.sub);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerHandler,
  loginHandler,
  meHandler,
  myAssignmentsHandler,
  dashboardHandler,
  assignmentLevelsHandler,
  levelHandler,
  progressHandler,
  timeZoneHandler,
  achievementsSeenHandler
};

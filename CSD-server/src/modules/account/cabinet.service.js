const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const entitlements = require('./entitlements.service');
const { checkTrainerSupport } = require('../../shared/level-support');
const { syncAchievements, buildAchievements } = require('./achievements');

const PUBLISHED = { status: 'published' };

const LEVEL_ORDER = { createdAt: 'asc' };

function dayKeyFactory(timeZone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return date => fmt.format(new Date(date));
}

function shiftDayKey(key, deltaDays) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

async function listMyAssignments(userId) {
  const owned = await entitlements.listOwnedAssignments(userId);
  if (owned.length === 0) return [];

  const ids = owned.map(o => o.assignmentId);
  const assignments = await prisma.assignment.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      description: true,
      stage: { select: { id: true, name: true } },
      _count: { select: { levels: { where: PUBLISHED } } }
    }
  });

  const solved = await prisma.levelProgress.findMany({
    where: { userId, solved: true, level: { assignmentId: { in: ids }, ...PUBLISHED } },
    select: { level: { select: { assignmentId: true } } }
  });
  const solvedByAssignment = new Map();
  solved.forEach(({ level }) => {
    solvedByAssignment.set(level.assignmentId, (solvedByAssignment.get(level.assignmentId) || 0) + 1);
  });

  const acquiredAt = new Map(owned.map(o => [o.assignmentId, o.acquiredAt]));
  return assignments
    .map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      stage: a.stage,
      levelsCount: a._count.levels,
      solvedCount: solvedByAssignment.get(a.id) || 0,
      acquiredAt: acquiredAt.get(a.id)
    }))
    .sort((a, b) => new Date(b.acquiredAt) - new Date(a.acquiredAt));
}

async function listAssignmentLevels(userId, assignmentId) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, name: true, description: true }
  });
  if (!assignment) throw new AppError(404, 'Задание не найдено');
  await entitlements.assertOwnsAssignment(userId, assignmentId);

  const levels = await prisma.level.findMany({
    where: { assignmentId, ...PUBLISHED },
    orderBy: LEVEL_ORDER,
    select: {
      id: true,
      name: true,
      description: true,
      solvedNote: true,
      difficulty: true,
      category: true,
      position: true,
      turn: true,
      castling: true,
      enPassant: true,
      halfmoveClock: true,
      fullmoveNumber: true,
      steps: true
    }
  });

  const progress = await prisma.levelProgress.findMany({
    where: { userId, levelId: { in: levels.map(l => l.id) } },
    select: { levelId: true, solved: true, solvedAt: true }
  });
  const progressByLevel = new Map(progress.map(p => [p.levelId, p]));

  return {
    assignment,
    levels: levels.map((level, index) => {
      const support = checkTrainerSupport(level);
      const own = progressByLevel.get(level.id);
      return {
        id: level.id,
        index: index + 1,
        name: level.name,
        description: level.description,
        difficulty: level.difficulty,
        category: level.category,
        solved: Boolean(own && own.solved),
        solvedAt: (own && own.solvedAt) || null,
        supported: support.supported,
        unsupportedReason: support.reason
      };
    })
  };
}

async function getLevelForUser(userId, levelId) {
  const level = await prisma.level.findUnique({ where: { id: levelId } });
  if (!level || level.status !== 'published' || !level.assignmentId) {
    throw new AppError(404, 'Задача не найдена');
  }
  await entitlements.assertOwnsAssignment(userId, level.assignmentId);

  const support = checkTrainerSupport(level);
  const own = await prisma.levelProgress.findUnique({
    where: { userId_levelId: { userId, levelId } },
    select: { solved: true, solvedAt: true, usedSolution: true }
  });

  return {
    level: {
      id: level.id,
      assignmentId: level.assignmentId,
      name: level.name,
      description: level.description,
      solvedNote: level.solvedNote,
      difficulty: level.difficulty,
      category: level.category,
      position: level.position,
      turn: level.turn,
      castling: level.castling,
      enPassant: level.enPassant,
      halfmoveClock: level.halfmoveClock,
      fullmoveNumber: level.fullmoveNumber,
      steps: level.steps,
      result: level.result
    },
    progress: own || null,
    supported: support.supported,
    unsupportedReason: support.reason
  };
}

async function markSolved(userId, levelId, { usedSolution = false } = {}) {
  const level = await prisma.level.findUnique({
    where: { id: levelId },
    select: { id: true, status: true, assignmentId: true }
  });
  if (!level || level.status !== 'published' || !level.assignmentId) {
    throw new AppError(404, 'Задача не найдена');
  }
  await entitlements.assertOwnsAssignment(userId, level.assignmentId);

  const existing = await prisma.levelProgress.findUnique({
    where: { userId_levelId: { userId, levelId } }
  });

  const progress = await prisma.levelProgress.upsert({
    where: { userId_levelId: { userId, levelId } },
    create: { userId, levelId, solved: true, solvedAt: new Date(), usedSolution },
    update: {
      solved: true,
      solvedAt: (existing && existing.solvedAt) || new Date(),
      usedSolution: Boolean((existing && existing.usedSolution) || usedSolution)
    },
    select: { solved: true, solvedAt: true, usedSolution: true, mistakes: true }
  });

  await syncAchievements(userId, await buildStats(userId));
  return progress;
}

async function markMistake(userId, levelId) {
  const level = await prisma.level.findUnique({
    where: { id: levelId },
    select: { id: true, status: true, assignmentId: true }
  });
  if (!level || level.status !== 'published' || !level.assignmentId) {
    throw new AppError(404, 'Задача не найдена');
  }
  await entitlements.assertOwnsAssignment(userId, level.assignmentId);

  return prisma.levelProgress.upsert({
    where: { userId_levelId: { userId, levelId } },
    create: { userId, levelId, mistakes: 1 },
    update: { mistakes: { increment: 1 } },
    select: { solved: true, solvedAt: true, usedSolution: true, mistakes: true }
  });
}

async function markAchievementsSeen(userId) {
  await prisma.userAchievement.updateMany({
    where: { userId, seenAt: null },
    data: { seenAt: new Date() }
  });
}

async function setTimeZone(userId, timeZone) {
  await prisma.user.update({ where: { id: userId }, data: { timeZone } });
}

const EMPTY_STATS = {
  totalSolved: 0,
  cleanSolved: 0,
  totalMistakes: 0,
  accuracy: null,
  maxPerDay: 0,
  streakDays: 0,
  longestStreak: 0,
  longestCleanRun: 0,
  completedAssignments: 0,
  completedStages: 0,
  bestAssignmentPercent: 0,
  bestStagePercent: 0,
  weekActivity: Array(7).fill(false),
  lastSolvedByAssignment: new Map(),
  assignments: []
};

async function buildStats(userId) {
  const owned = await entitlements.listOwnedAssignments(userId);
  if (owned.length === 0) return { ...EMPTY_STATS };

  const [user, solvedRows, assignments] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } }),
    prisma.levelProgress.findMany({
      where: {
        userId,
        solved: true,
        level: { assignmentId: { in: owned.map(o => o.assignmentId) }, ...PUBLISHED }
      },
      orderBy: { solvedAt: 'asc' },
      select: {
        solvedAt: true,
        usedSolution: true,
        mistakes: true,
        level: { select: { assignmentId: true } }
      }
    }),
    listMyAssignments(userId)
  ]);

  const dayKey = dayKeyFactory(user && user.timeZone);

  const totalSolved = solvedRows.length;
  const isClean = row => row.mistakes === 0 && !row.usedSolution;
  const cleanSolved = solvedRows.filter(isClean).length;
  const totalMistakes = solvedRows.reduce((sum, row) => sum + row.mistakes, 0);
  const accuracy = totalSolved > 0 ? Math.round((100 * cleanSolved) / totalSolved) : null;

  let longestCleanRun = 0;
  let currentCleanRun = 0;
  solvedRows.forEach(row => {
    currentCleanRun = isClean(row) ? currentCleanRun + 1 : 0;
    if (currentCleanRun > longestCleanRun) longestCleanRun = currentCleanRun;
  });

  const perDay = new Map();
  const lastSolvedByAssignment = new Map();
  solvedRows.forEach(row => {
    const key = dayKey(row.solvedAt);
    perDay.set(key, (perDay.get(key) || 0) + 1);
    const assignmentId = row.level.assignmentId;
    const time = new Date(row.solvedAt).getTime();
    if (!lastSolvedByAssignment.has(assignmentId) || lastSolvedByAssignment.get(assignmentId) < time) {
      lastSolvedByAssignment.set(assignmentId, time);
    }
  });
  const maxPerDay = perDay.size ? Math.max(...perDay.values()) : 0;

  const todayKey = dayKey(new Date());
  let streakDays = 0;
  let cursor = perDay.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1);
  while (perDay.has(cursor)) {
    streakDays += 1;
    cursor = shiftDayKey(cursor, -1);
  }

  const days = [...perDay.keys()].sort();
  let longestStreak = 0;
  let run = 0;
  days.forEach((key, i) => {
    run = i > 0 && shiftDayKey(days[i - 1], 1) === key ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
  });

  const weekActivity = [];
  for (let i = 6; i >= 0; i--) weekActivity.push(perDay.has(shiftDayKey(todayKey, -i)));

  const withLevels = assignments.filter(a => a.levelsCount > 0);
  const completedAssignments = withLevels.filter(a => a.solvedCount >= a.levelsCount).length;
  const bestAssignmentPercent = withLevels.reduce(
    (best, a) => Math.max(best, (a.solvedCount / a.levelsCount) * 100),
    0
  );

  const stages = new Map();
  withLevels.forEach(a => {
    const stageId = (a.stage && a.stage.id) || 'none';
    const acc = stages.get(stageId) || { solved: 0, total: 0 };
    acc.solved += a.solvedCount;
    acc.total += a.levelsCount;
    stages.set(stageId, acc);
  });
  const stageList = [...stages.values()];
  const completedStages = stageList.filter(s => s.solved >= s.total).length;
  const bestStagePercent = stageList.reduce((best, s) => Math.max(best, (s.solved / s.total) * 100), 0);

  return {
    totalSolved,
    cleanSolved,
    totalMistakes,
    accuracy,
    maxPerDay,
    streakDays,
    longestStreak,
    longestCleanRun,
    completedAssignments,
    completedStages,
    bestAssignmentPercent,
    bestStagePercent,
    weekActivity,
    lastSolvedByAssignment,
    assignments
  };
}

async function getDashboard(userId) {
  const stats = await buildStats(userId);

  await syncAchievements(userId, stats);
  const unlockedRows = await prisma.userAchievement.findMany({
    where: { userId },
    select: { key: true, unlockedAt: true, seenAt: true }
  });

  const incomplete = stats.assignments.filter(a => a.solvedCount < a.levelsCount);
  let continueData = null;
  if (incomplete.length > 0) {
    const target = incomplete
      .slice()
      .sort(
        (a, b) =>
          (stats.lastSolvedByAssignment.get(b.id) || 0) - (stats.lastSolvedByAssignment.get(a.id) || 0)
      )[0];
    const { levels } = await listAssignmentLevels(userId, target.id);
    const nextLevel = levels.find(l => !l.solved);
    if (nextLevel) {
      continueData = {
        assignmentId: target.id,
        assignmentName: target.name,
        stageName: (target.stage && target.stage.name) || '',
        levelId: nextLevel.id,
        levelIndex: nextLevel.index,
        levelName: nextLevel.name,
        solvedCount: target.solvedCount,
        levelsCount: target.levelsCount
      };
    }
  }

  return {
    streakDays: stats.streakDays,
    longestStreak: stats.longestStreak,
    weekActivity: stats.weekActivity,
    totalSolved: stats.totalSolved,
    cleanSolved: stats.cleanSolved,
    totalMistakes: stats.totalMistakes,
    accuracy: stats.accuracy,
    achievements: buildAchievements(stats, unlockedRows),
    continue: continueData
  };
}

module.exports = {
  listMyAssignments,
  listAssignmentLevels,
  getLevelForUser,
  markSolved,
  markMistake,
  markAchievementsSeen,
  setTimeZone,
  getDashboard
};

const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const entitlements = require('./entitlements.service');
const { checkTrainerSupport } = require('../../shared/level-support');
const { syncAchievements, buildAchievements } = require('./achievements');

// Покупателю видны только опубликованные задачи — так же, как tasksCount в
// public.service.js. Если считать по-разному, витрина и кабинет разойдутся в
// числах («решено 36 из 35»).
const PUBLISHED = { status: 'published' };

// У Level нет колонки порядка, а levels.service.js сортирует по updatedAt —
// «Задача 1…35» перетасовывалась бы при каждой правке в админке. Для кабинета
// порядок фиксируем по createdAt, как в public.service.js.
const LEVEL_ORDER = { createdAt: 'asc' };

// День решения считается в часовом поясе пользователя (User.timeZone), иначе
// решивший в 01:00 по Москве попадал бы во вчерашний UTC-день и терял серию.
// en-CA выбран не случайно: этот локаль форматирует дату как YYYY-MM-DD, то
// есть сразу готовым ключом.
function dayKeyFactory(timeZone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return date => fmt.format(new Date(date));
}

// Сдвиг по календарю выполняется над самой строкой даты, а не вычитанием суток
// из момента времени: в дни перехода на летнее время сутки длятся 23 или 25
// часов, и арифметика по миллисекундам пропустила бы или продублировала день.
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

  // select перечисляется явно, и position/steps ниже используются ТОЛЬКО для
  // проверки совместимости с тренажёром — в ответ они не попадают: steps это
  // решение задачи, и отдаёт его один-единственный эндпоинт getLevelForUser.
  const levels = await prisma.level.findMany({
    where: { assignmentId, ...PUBLISHED },
    orderBy: LEVEL_ORDER,
    select: {
      id: true,
      name: true,
      description: true,
      difficulty: true,
      category: true,
      position: true,
      turn: true,
      // castling/enPassant/счётчики нужны, чтобы собрать корректный FEN для
      // проверки решения: без прав на рокировку легальная рокировка в сценарии
      // была бы отвергнута. В ответ они не попадают — см. map ниже.
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

// Единственное место во всём API, где steps (решение) уходит не админу — и
// оно закрыто проверкой оплаты.
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

  // upsert по @@unique([userId, levelId]) — повторная отправка не создаёт
  // дубль. solvedAt намеренно не перезаписывается: клиент шлёт отметку при
  // каждом перерешивании, а первое решение — исторический факт.
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

  // Достижения проверяются сразу после решения — тогда unlockedAt совпадает с
  // реальным моментом разблокировки, а не с ближайшим открытием кабинета.
  await syncAchievements(userId, await buildStats(userId));
  return progress;
}

/**
 * Неверный ход ученика. Счётчик копится и после решения задачи: её можно
 * перерешивать, и ошибки во второй попытке — такой же факт, как в первой.
 * Права проверяются тем же способом, что и при отметке решения.
 */
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

/** Гасит подсветку «новое достижение» — вызывается кабинетом после показа. */
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

/**
 * Единая сводка по пользователю: из неё считаются и цифры кабинета, и правила
 * достижений. Вынесена отдельно, потому что нужна в двух местах — при отметке
 * решения (там проверяются достижения) и при открытии кабинета.
 */
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
  // «Чисто» — решено без единой ошибки и без подсказки. Отсюда же точность:
  // раньше в ней учитывалась только подсказка, потому что ошибочные ходы на
  // сервер вообще не доходили.
  const isClean = row => row.mistakes === 0 && !row.usedSolution;
  const cleanSolved = solvedRows.filter(isClean).length;
  const totalMistakes = solvedRows.reduce((sum, row) => sum + row.mistakes, 0);
  const accuracy = totalSolved > 0 ? Math.round((100 * cleanSolved) / totalSolved) : null;

  // Самая длинная серия задач подряд без ошибок (порядок — по времени решения).
  let longestCleanRun = 0;
  let currentCleanRun = 0;
  solvedRows.forEach(row => {
    currentCleanRun = isClean(row) ? currentCleanRun + 1 : 0;
    if (currentCleanRun > longestCleanRun) longestCleanRun = currentCleanRun;
  });

  // Решения по дням (для серии и «Марафона») и последняя дата решения по
  // каждому заданию — чтобы «Продолжить» вёл туда, где ученик был последним.
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
  // Серия не обрывается, если сегодня ещё не решали, — отсчёт идёт от вчера.
  let cursor = perDay.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1);
  while (perDay.has(cursor)) {
    streakDays += 1;
    cursor = shiftDayKey(cursor, -1);
  }

  // Рекорд серии не хранится в БД: он выводится из тех же дней одним проходом,
  // а отдельное поле пришлось бы поддерживать в согласии с историей.
  const days = [...perDay.keys()].sort();
  let longestStreak = 0;
  let run = 0;
  days.forEach((key, i) => {
    run = i > 0 && shiftDayKey(days[i - 1], 1) === key ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
  });

  const weekActivity = [];
  for (let i = 6; i >= 0; i--) weekActivity.push(perDay.has(shiftDayKey(todayKey, -i)));

  // Прогресс по заданиям и этапам — для достижений «Задание закрыто» и
  // «Этап пройден». Этап считается по купленным заданиям: непроданное задание
  // не должно мешать закрыть этап.
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

// Сводка для верхнего уровня кабинета: «продолжить с того места, где
// остановился», серия дней подряд, статистика и достижения.
async function getDashboard(userId) {
  const stats = await buildStats(userId);

  // Достижения синхронизируются и на чтении: у тех, кто накопил историю до
  // появления таблицы, они иначе ждали бы следующего решённого уровня.
  await syncAchievements(userId, stats);
  const unlockedRows = await prisma.userAchievement.findMany({
    where: { userId },
    select: { key: true, unlockedAt: true, seenAt: true }
  });

  // «Продолжить»: среди незавершённых доступных заданий — то, где решали
  // последним; если ещё не решали ничего — самое недавно полученное
  // (listMyAssignments уже сортирует по acquiredAt desc).
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

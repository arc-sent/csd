const prisma = require('../../shared/prisma');

const ACHIEVEMENTS = [
  {
    key: 'first-solve',
    title: 'Первая задача',
    description: 'Решить свою первую задачу',
    unlocked: s => s.totalSolved >= 1,
    progress: s => (s.totalSolved >= 1 ? 100 : 0)
  },
  {
    key: 'assignment-done',
    title: 'Задание закрыто',
    description: 'Решить все задачи одного задания',
    unlocked: s => s.completedAssignments >= 1,
    progress: s => Math.min(100, Math.round(s.bestAssignmentPercent))
  },
  {
    key: 'stage-done',
    title: 'Этап пройден',
    description: 'Закрыть все купленные задания одного этапа',
    unlocked: s => s.completedStages >= 1,
    progress: s => Math.min(100, Math.round(s.bestStagePercent))
  },
  {
    key: 'streak-week',
    title: 'Серия 7 дней',
    description: '7 тренировок подряд',
    unlocked: s => s.longestStreak >= 7,
    progress: s => Math.min(100, Math.round((s.longestStreak / 7) * 100))
  },
  {
    key: 'streak-month',
    title: 'Месяц без пропусков',
    description: '30 тренировок подряд',
    unlocked: s => s.longestStreak >= 30,
    progress: s => Math.min(100, Math.round((s.longestStreak / 30) * 100))
  },
  {
    key: 'flawless-10',
    title: 'Без единой ошибки',
    description: '10 задач подряд решены без ошибок и подсказок',
    unlocked: s => s.longestCleanRun >= 10,
    progress: s => Math.min(100, Math.round((s.longestCleanRun / 10) * 100))
  },
  {
    key: 'accurate-100',
    title: 'Точный расчёт',
    description: '100 задач с точностью выше 80%',
    unlocked: s => s.totalSolved >= 100 && s.accuracy >= 80,
    progress: s => Math.min(100, Math.round(Math.min(s.totalSolved / 100, s.accuracy / 80) * 100))
  },
  {
    key: 'marathon',
    title: 'Марафон',
    description: 'Решить 30 задач за один день',
    unlocked: s => s.maxPerDay >= 30,
    progress: s => Math.min(100, Math.round((s.maxPerDay / 30) * 100))
  }
];

async function syncAchievements(userId, stats) {
  const earned = ACHIEVEMENTS.filter(a => a.unlocked(stats)).map(a => a.key);
  if (earned.length === 0) return;

  const existing = await prisma.userAchievement.findMany({
    where: { userId, key: { in: earned } },
    select: { key: true }
  });
  const known = new Set(existing.map(row => row.key));
  const missing = earned.filter(key => !known.has(key));
  if (missing.length === 0) return;

  await prisma.userAchievement.createMany({
    data: missing.map(key => ({ userId, key })),
    skipDuplicates: true
  });
}

function buildAchievements(stats, unlockedRows) {
  const byKey = new Map(unlockedRows.map(row => [row.key, row]));
  return ACHIEVEMENTS.map(def => {
    const row = byKey.get(def.key);
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      unlocked: Boolean(row),
      unlockedAt: row ? row.unlockedAt : null,
      isNew: Boolean(row && !row.seenAt),
      progress: row ? 100 : Math.max(0, Math.min(100, def.progress(stats)))
    };
  });
}

module.exports = { ACHIEVEMENTS, syncAchievements, buildAchievements };

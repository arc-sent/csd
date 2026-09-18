const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const entitlements = require('../account/entitlements.service');

// Список аккаунтов покупателей для админки и ручная выдача им доступа к
// заданиям. Своя таблица прав — Grant, право по оплате остаётся у платежей
// (см. account/entitlements.service.js).

const LIST_LIMIT = 200;

// Поля перечисляются явно и всегда: в User есть passwordHash, и просто отдать
// модель наружу нельзя.
const USER_CARD = {
  id: true,
  email: true,
  name: true,
  createdAt: true
};

async function list({ q } = {}) {
  const where = q ? { email: { contains: q, mode: 'insensitive' } } : {};
  return prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    select: {
      ...USER_CARD,
      _count: { select: { payments: true, grants: true } }
    }
  });
}

async function getById(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: USER_CARD });
  if (!user) throw new AppError(404, 'Аккаунт не найден');

  // Доступы считает entitlements — второй реализации правила «есть ли право»
  // быть не должно.
  const owned = await entitlements.listOwnedAssignments(id);
  const assignments = owned.length
    ? await prisma.assignment.findMany({
        where: { id: { in: owned.map(o => o.assignmentId) } },
        select: { id: true, name: true, price: true, stage: { select: { id: true, name: true } } }
      })
    : [];
  const byId = new Map(assignments.map(a => [a.id, a]));

  // id активной выдачи нужен интерфейсу для кнопки «Отозвать».
  const grants = await prisma.grant.findMany({
    where: { userId: id, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, assignmentId: true, note: true, createdAt: true }
  });
  const grantByAssignment = new Map(grants.map(g => [g.assignmentId, g]));

  return {
    ...user,
    access: owned
      .filter(o => byId.has(o.assignmentId))
      .map(o => ({
        assignment: byId.get(o.assignmentId),
        acquiredAt: o.acquiredAt,
        source: o.source,
        // Есть и у купленного задания, если его когда-то ещё и выдали руками:
        // отзыв такой выдачи доступ не отберёт, и это должно быть видно.
        grant: grantByAssignment.get(o.assignmentId) || null
      }))
  };
}

async function grantAssignment(userId, { assignmentId, note }, adminId) {
  const [user, assignment] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.assignment.findUnique({ where: { id: assignmentId }, select: { id: true } })
  ]);
  if (!user) throw new AppError(404, 'Аккаунт не найден');
  if (!assignment) throw new AppError(404, 'Задание не найдено');

  if (await entitlements.ownsAssignment(userId, assignmentId)) {
    throw new AppError(409, 'У аккаунта уже есть доступ к этому заданию');
  }

  return prisma.grant.create({
    data: { userId, assignmentId, note: note || null, grantedById: adminId || null },
    select: { id: true, assignmentId: true, note: true, createdAt: true }
  });
}

// Выдача этапа целиком — по выдаче на каждое опубликованное задание этапа,
// которого у аккаунта ещё нет (купленные и уже выданные пропускаются). Отдельной
// «выдачи этапа» в модели нет намеренно: доступ остаётся поштучным, каждое
// задание можно отозвать отдельно, а проверка права (entitlements) не
// усложняется. Задания, опубликованные в этап позже, автоматически не
// добавляются — их можно выдать повторной выдачей этапа.
async function grantStage(userId, { stageId, note }, adminId) {
  const [user, stage] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.stage.findUnique({
      where: { id: stageId },
      select: { name: true, assignments: { where: { status: 'published' }, select: { id: true } } }
    })
  ]);
  if (!user) throw new AppError(404, 'Аккаунт не найден');
  if (!stage) throw new AppError(404, 'Этап не найден');
  if (stage.assignments.length === 0) throw new AppError(400, 'В этапе нет опубликованных заданий');

  const owned = await Promise.all(stage.assignments.map(a => entitlements.ownsAssignment(userId, a.id)));
  const missing = stage.assignments.filter((_, i) => !owned[i]);
  if (missing.length === 0) throw new AppError(409, 'У аккаунта уже есть доступ ко всем заданиям этапа');

  const stageNote = `Этап «${stage.name}»` + (note ? ` — ${note}` : '');
  await prisma.grant.createMany({
    data: missing.map(a => ({ userId, assignmentId: a.id, note: stageNote, grantedById: adminId || null }))
  });
  return { granted: missing.length, skipped: stage.assignments.length - missing.length };
}

// Отзыв — проставление revokedAt, а не удаление строки: история выдач должна
// сохраняться. Купленный доступ отзыв выдачи не трогает — он идёт от платежа.
async function revokeGrant(userId, grantId) {
  const grant = await prisma.grant.findUnique({
    where: { id: grantId },
    select: { id: true, userId: true, revokedAt: true }
  });
  if (!grant || grant.userId !== userId) throw new AppError(404, 'Выдача не найдена');
  if (grant.revokedAt) return;
  await prisma.grant.update({ where: { id: grantId }, data: { revokedAt: new Date() } });
}

module.exports = { list, getById, grantAssignment, grantStage, revokeGrant };

const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');

// ЕДИНСТВЕННОЕ место, где решается «есть ли у пользователя доступ к заданию».
// Источников права три:
//   1. Оплата задания — успешный платёж и есть доступ, отдельной записи о
//      праве не заводится (двойная запись это как раз способ получить
//      оплатившего клиента без доступа). Возврат средств меняет статус
//      платежа, и доступ пропадает сам.
//   2. Оплата этапа целиком (Payment.stageId) — тот же принцип, но даёт
//      доступ сразу ко всем опубликованным заданиям этапа, включая те, что
//      admin опубликует позже (проверка идёт по stageId задания, а не по
//      списку id на момент покупки).
//   3. Ручная выдача из админки (модель Grant) — «подарить» задание тренеру
//      или ученику без оплаты. Активной считается выдача с revokedAt: null.
//
// Обе функции ниже — вся поверхность проверки прав: кабинет, дашборд,
// достижения и запрет повторной покупки ходят только сюда.

// Активные выдачи пользователя. Отдельно от платежей, потому что нужны и сами
// по себе — в карточке аккаунта в админке.
function activeGrants(where) {
  return prisma.grant.findMany({
    where: { ...where, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { assignmentId: true, createdAt: true }
  });
}

// stageId succeeded-платежей пользователя — переиспользуется и списком
// (listOwnedAssignments), и точечной проверкой (ownsAssignment).
function paidStageIds(userId) {
  return prisma.payment.findMany({
    where: { userId, status: 'succeeded', stageId: { not: null } },
    distinct: ['stageId'],
    select: { stageId: true, createdAt: true }
  });
}

async function listOwnedAssignments(userId) {
  const [payments, grants, stagePayments] = await Promise.all([
    prisma.payment.findMany({
      where: { userId, status: 'succeeded', assignmentId: { not: null } },
      // distinct — повторная покупка того же задания не должна дублировать его
      // в кабинете; сами строки платежей при этом сохраняются для бухгалтерии.
      distinct: ['assignmentId'],
      orderBy: { createdAt: 'desc' },
      select: { assignmentId: true, createdAt: true }
    }),
    activeGrants({ userId }),
    paidStageIds(userId)
  ]);

  // Задания купленных этапов — все опубликованные задания этих stageId, а не
  // список на момент покупки: этап мог пополниться новыми заданиями позже.
  const stageAssignments = stagePayments.length
    ? await prisma.assignment.findMany({
        where: { stageId: { in: stagePayments.map(p => p.stageId) }, status: 'published' },
        select: { id: true, stageId: true }
      })
    : [];
  const stagePaidAt = new Map(stagePayments.map(p => [p.stageId, p.createdAt]));

  // Приоритет источника: прямая оплата задания > оплата этапа > ручная
  // выдача — отзыв выдачи не должен выглядеть так, будто он отбирает
  // оплаченный (напрямую или через этап) доступ.
  const byAssignment = new Map();
  payments.forEach(p => {
    byAssignment.set(p.assignmentId, {
      assignmentId: p.assignmentId,
      acquiredAt: p.createdAt,
      source: 'payment'
    });
  });
  stageAssignments.forEach(a => {
    if (byAssignment.has(a.id)) return;
    byAssignment.set(a.id, {
      assignmentId: a.id,
      acquiredAt: stagePaidAt.get(a.stageId),
      source: 'stage'
    });
  });
  grants.forEach(g => {
    if (byAssignment.has(g.assignmentId)) return;
    byAssignment.set(g.assignmentId, {
      assignmentId: g.assignmentId,
      acquiredAt: g.createdAt,
      source: 'grant'
    });
  });

  return [...byAssignment.values()].sort((a, b) => new Date(b.acquiredAt) - new Date(a.acquiredAt));
}

async function ownsAssignment(userId, assignmentId) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { stageId: true }
  });
  if (!assignment) return false;

  const [payment, stagePayment, grant] = await Promise.all([
    prisma.payment.findFirst({
      where: { userId, assignmentId, status: 'succeeded' },
      select: { id: true }
    }),
    prisma.payment.findFirst({
      where: { userId, stageId: assignment.stageId, status: 'succeeded' },
      select: { id: true }
    }),
    prisma.grant.findFirst({
      where: { userId, assignmentId, revokedAt: null },
      select: { id: true }
    })
  ]);
  return Boolean(payment || stagePayment || grant);
}

async function ownsStage(userId, stageId) {
  const payment = await prisma.payment.findFirst({
    where: { userId, stageId, status: 'succeeded' },
    select: { id: true }
  });
  return Boolean(payment);
}

async function assertOwnsAssignment(userId, assignmentId) {
  if (!(await ownsAssignment(userId, assignmentId))) {
    throw new AppError(403, 'Задание не куплено');
  }
}

module.exports = { listOwnedAssignments, ownsAssignment, ownsStage, assertOwnsAssignment };

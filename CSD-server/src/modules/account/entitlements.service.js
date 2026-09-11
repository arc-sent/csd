const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');

// ЕДИНСТВЕННОЕ место, где решается «есть ли у пользователя доступ к заданию».
// Источников права два:
//   1. Оплата — успешный платёж и есть доступ, отдельной записи о праве не
//      заводится (двойная запись это как раз способ получить оплатившего
//      клиента без доступа). Возврат средств меняет статус платежа, и доступ
//      пропадает сам.
//   2. Ручная выдача из админки (модель Grant) — «подарить» задание тренеру
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

async function listOwnedAssignments(userId) {
  const [payments, grants] = await Promise.all([
    prisma.payment.findMany({
      where: { userId, status: 'succeeded', assignmentId: { not: null } },
      // distinct — повторная покупка того же задания не должна дублировать его
      // в кабинете; сами строки платежей при этом сохраняются для бухгалтерии.
      distinct: ['assignmentId'],
      orderBy: { createdAt: 'desc' },
      select: { assignmentId: true, createdAt: true }
    }),
    activeGrants({ userId })
  ]);

  // Оплата приоритетнее выдачи: если задание и куплено, и выдано вручную,
  // источником считается покупка — отзыв выдачи не должен выглядеть так,
  // будто он отбирает оплаченный доступ.
  const byAssignment = new Map();
  payments.forEach(p => {
    byAssignment.set(p.assignmentId, {
      assignmentId: p.assignmentId,
      acquiredAt: p.createdAt,
      source: 'payment'
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
  const [payment, grant] = await Promise.all([
    prisma.payment.findFirst({
      where: { userId, assignmentId, status: 'succeeded' },
      select: { id: true }
    }),
    prisma.grant.findFirst({
      where: { userId, assignmentId, revokedAt: null },
      select: { id: true }
    })
  ]);
  return Boolean(payment || grant);
}

async function assertOwnsAssignment(userId, assignmentId) {
  if (!(await ownsAssignment(userId, assignmentId))) {
    throw new AppError(403, 'Задание не куплено');
  }
}

module.exports = { listOwnedAssignments, ownsAssignment, assertOwnsAssignment };

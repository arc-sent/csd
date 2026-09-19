const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');

function activeGrants(where) {
  return prisma.grant.findMany({
    where: { ...where, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { assignmentId: true, createdAt: true }
  });
}

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
      distinct: ['assignmentId'],
      orderBy: { createdAt: 'desc' },
      select: { assignmentId: true, createdAt: true }
    }),
    activeGrants({ userId }),
    paidStageIds(userId)
  ]);

  const stageAssignments = stagePayments.length
    ? await prisma.assignment.findMany({
        where: { stageId: { in: stagePayments.map(p => p.stageId) }, status: 'published' },
        select: { id: true, stageId: true }
      })
    : [];
  const stagePaidAt = new Map(stagePayments.map(p => [p.stageId, p.createdAt]));

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

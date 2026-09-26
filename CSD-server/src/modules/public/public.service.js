const prisma = require('../../shared/prisma');

async function listStages() {
  const stages = await prisma.stage.findMany({
    where: { status: 'published' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      price: true,
      assignments: {
        where: { status: 'published' },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          price: true,
          bonus: true,
          _count: { select: { levels: { where: { status: 'published' } } } }
        }
      }
    }
  });

  return stages.map(stage => ({
    id: stage.id,
    name: stage.name,
    price: stage.price,
    assignments: stage.assignments.map(assignment => ({
      id: assignment.id,
      name: assignment.name,
      price: assignment.price,
      bonus: assignment.bonus,
      tasksCount: assignment._count.levels
    }))
  }));
}

module.exports = { listStages };

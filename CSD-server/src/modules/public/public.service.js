const prisma = require('../../shared/prisma');

// Публичные данные для тарифов на лендинге: только опубликованные этапы и
// задания (черновики/архив админ ещё не готов показывать ученикам), и только
// поля, нужные витрине — без description/статусов/дат, это не админский CRUD.
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
          _count: { select: { levels: { where: { status: 'published' } } } }
        }
      }
    }
  });

  return stages.map(stage => ({
    id: stage.id,
    name: stage.name,
    // 0 — покупка этапом целиком выключена, витрина сама решает не
    // показывать кнопку «Купить этап целиком» (см. Plans.jsx/StagePurchase).
    price: stage.price,
    assignments: stage.assignments.map(assignment => ({
      id: assignment.id,
      name: assignment.name,
      price: assignment.price,
      tasksCount: assignment._count.levels
    }))
  }));
}

module.exports = { listStages };

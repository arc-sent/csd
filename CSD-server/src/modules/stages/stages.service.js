const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');

// assignmentsTotal — сумма цен опубликованных заданий этапа: «полная»
// стоимость, относительно которой админка и витрина считают скидку за покупку
// этапа целиком. Считается на сервере, чтобы у админки и лендинга правило
// «что входит в полную цену» было одно (только published, как и на витрине).
const WITH_TOTALS = {
  _count: { select: { assignments: true } },
  assignments: { where: { status: 'published' }, select: { price: true } }
};

function withTotal({ assignments, ...stage }) {
  return { ...stage, assignmentsTotal: assignments.reduce((sum, a) => sum + a.price, 0) };
}

async function list() {
  const stages = await prisma.stage.findMany({
    orderBy: { updatedAt: 'desc' },
    include: WITH_TOTALS
  });
  return stages.map(withTotal);
}

async function getById(id) {
  const stage = await prisma.stage.findUnique({
    where: { id },
    include: WITH_TOTALS
  });
  if (!stage) throw new AppError(404, 'Этап не найден');
  return withTotal(stage);
}

async function create(data) {
  return prisma.stage.create({ data: { ...data, status: data.status || 'draft' } });
}

async function update(id, data) {
  await getById(id); // 404, если такого этапа нет
  return prisma.stage.update({ where: { id }, data });
}

async function updateStatus(id, status) {
  await getById(id);
  return prisma.stage.update({ where: { id }, data: { status } });
}

async function remove(id) {
  await getById(id);
  await prisma.stage.delete({ where: { id } }); // каскадно удалит задания и их задачи
}

module.exports = { list, getById, create, update, updateStatus, remove };

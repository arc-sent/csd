const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');

async function list() {
  return prisma.stage.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { assignments: true } } }
  });
}

async function getById(id) {
  const stage = await prisma.stage.findUnique({
    where: { id },
    include: { _count: { select: { assignments: true } } }
  });
  if (!stage) throw new AppError(404, 'Этап не найден');
  return stage;
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

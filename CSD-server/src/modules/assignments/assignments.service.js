const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');

async function list({ stageId } = {}) {
  return prisma.assignment.findMany({
    where: stageId ? { stageId } : undefined,
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { levels: true } } }
  });
}

async function getById(id) {
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { _count: { select: { levels: true } } }
  });
  if (!assignment) throw new AppError(404, 'Задание не найдено');
  return assignment;
}

async function create(data) {
  return prisma.assignment.create({ data: { ...data, status: data.status || 'draft' } });
}

async function update(id, data) {
  await getById(id); // 404, если такого задания нет
  return prisma.assignment.update({ where: { id }, data });
}

async function updateStatus(id, status) {
  await getById(id);
  return prisma.assignment.update({ where: { id }, data: { status } });
}

async function remove(id) {
  await getById(id);
  await prisma.assignment.delete({ where: { id } }); // каскадно удалит задачи
}

module.exports = { list, getById, create, update, updateStatus, remove };

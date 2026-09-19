const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const chessRules = require('../../shared/chess-rules');
const { checkTrainerSupport } = require('../../shared/level-support');

function assertLegalAndNormalize(data) {
  const result = chessRules.validatePosition(data);
  if (!result.valid) {
    throw new AppError(400, 'Позиция не является легальной', { errors: result.errors });
  }
  return { ...data, castling: result.castling };
}

function assertPublishable(level) {
  const support = checkTrainerSupport(level);
  if (!support.supported) {
    throw new AppError(400, 'Нельзя опубликовать: ' + support.reason);
  }
}

function attachPlayability(level) {
  return { ...level, playability: checkTrainerSupport(level) };
}

async function list({ assignmentId } = {}) {
  const levels = await prisma.level.findMany({
    where: assignmentId ? { assignmentId } : undefined,
    orderBy: { updatedAt: 'desc' }
  });
  return levels.map(attachPlayability);
}

async function findLevel(id) {
  const level = await prisma.level.findUnique({ where: { id } });
  if (!level) throw new AppError(404, 'Уровень не найден');
  return level;
}

async function getById(id) {
  return attachPlayability(await findLevel(id));
}

async function create(data) {
  const normalized = assertLegalAndNormalize(data);
  const status = normalized.status || 'draft';
  if (status === 'published') assertPublishable(normalized);
  const level = await prisma.level.create({ data: { ...normalized, status } });
  return attachPlayability(level);
}

async function update(id, data) {
  const existing = await findLevel(id);
  const normalized = assertLegalAndNormalize(data);
  const status = data.status !== undefined ? data.status : existing.status;
  if (status === 'published') assertPublishable(normalized);
  const level = await prisma.level.update({ where: { id }, data: normalized });
  return attachPlayability(level);
}

async function updateStatus(id, status) {
  const existing = await findLevel(id);
  if (status === 'published') assertPublishable(existing);
  const level = await prisma.level.update({ where: { id }, data: { status } });
  return attachPlayability(level);
}

async function remove(id) {
  await findLevel(id);
  await prisma.level.delete({ where: { id } });
}

module.exports = { list, getById, create, update, updateStatus, remove };

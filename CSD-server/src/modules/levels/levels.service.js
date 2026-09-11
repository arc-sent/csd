const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const chessRules = require('../../shared/chess-rules');
const { checkTrainerSupport } = require('../../shared/level-support');

// Фронт проверяет легальность сразу (мгновенная подсказка админу), но сервер
// обязан перепроверить — клиент можно обойти запросом напрямую.
// Права на рокировку сохраняем уже очищенными от невозможных.
function assertLegalAndNormalize(data) {
  const result = chessRules.validatePosition(data);
  if (!result.valid) {
    throw new AppError(400, 'Позиция не является легальной', { errors: result.errors });
  }
  return { ...data, castling: result.castling };
}

// Легальность позиции (assertLegalAndNormalize) — отдельная и более слабая
// проверка, чем играбельность: она не смотрит на решение вообще. Задача может
// быть легальной шахматной позицией и при этом нерешаемой — например, если
// очередь хода не совпадает с тем, чьей фигурой сделан первый ход алгоритма
// (частый дефект при ручном вводе). Раньше это ловил только кабинет ученика
// в момент открытия задачи (account/cabinet.service.js), когда её уже
// опубликовали. Публикация нерешаемой задачи блокируется здесь же, той же
// проверкой, что и в кабинете (shared/level-support.js) — одна причина
// отказа, а не два разных текста в двух местах.
function assertPublishable(level) {
  const support = checkTrainerSupport(level);
  if (!support.supported) {
    throw new AppError(400, 'Нельзя опубликовать: ' + support.reason);
  }
}

// Играбельность — не блокирующая проверка для черновиков (у только что
// начатой задачи ещё может не быть решения — это нормально), поэтому в
// списки и карточку она попадает информационно, отдельным полем, а не как
// причина отказа.
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

// Сырой фетч без playability — для внутренних нужд (404-проверка, данные
// «как сейчас» для assertPublishable в updateStatus). getById ниже — то, что
// видит контроллер, с прикреплённой играбельностью.
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
  const existing = await findLevel(id); // 404, если такого уровня нет
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

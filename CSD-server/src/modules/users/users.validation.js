const { z } = require('zod');

// Ровно одно из assignmentId/stageId: выдаётся либо одно задание, либо сразу
// все задания этапа (см. users.service.js grantStage).
const grantBodySchema = z
  .object({
    assignmentId: z.string().min(1).optional(),
    stageId: z.string().min(1).optional(),
    // Зачем выдали — видно в карточке аккаунта. Пустую строку приводим к
    // отсутствию заметки, чтобы в базе не заводились '' наравне с null.
    note: z.string().trim().max(500).optional().transform(v => v || undefined)
  })
  .refine(data => Boolean(data.assignmentId) !== Boolean(data.stageId), {
    message: 'Выберите задание или этап'
  });

module.exports = { grantBodySchema };

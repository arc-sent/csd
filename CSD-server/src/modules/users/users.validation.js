const { z } = require('zod');

const grantBodySchema = z.object({
  assignmentId: z.string().min(1, 'Выберите задание'),
  // Зачем выдали — видно в карточке аккаунта. Пустую строку приводим к
  // отсутствию заметки, чтобы в базе не заводились '' наравне с null.
  note: z.string().trim().max(500).optional().transform(v => v || undefined)
});

module.exports = { grantBodySchema };

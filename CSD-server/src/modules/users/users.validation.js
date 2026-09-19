const { z } = require('zod');

const grantBodySchema = z
  .object({
    assignmentId: z.string().min(1).optional(),
    stageId: z.string().min(1).optional(),
    note: z.string().trim().max(500).optional().transform(v => v || undefined)
  })
  .refine(data => Boolean(data.assignmentId) !== Boolean(data.stageId), {
    message: 'Выберите задание или этап'
  });

module.exports = { grantBodySchema };

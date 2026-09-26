const { z } = require('zod');

const assignmentBodySchema = z.object({
  stageId: z.string().min(1, 'Этап обязателен'),
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional().default(''),
  price: z.number().min(0, 'Цена не может быть отрицательной').optional().default(0),
  bonus: z.boolean().optional().default(false),
  status: z.enum(['draft', 'published', 'archived']).optional()
});

const statusBodySchema = z.object({
  status: z.enum(['draft', 'published', 'archived'])
});

module.exports = { assignmentBodySchema, statusBodySchema };

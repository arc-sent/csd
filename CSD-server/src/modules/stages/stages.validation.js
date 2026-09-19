const { z } = require('zod');

const stageBodySchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional().default(''),
  price: z.number().min(0, 'Цена не может быть отрицательной').optional().default(0),
  status: z.enum(['draft', 'published', 'archived']).optional()
});

const statusBodySchema = z.object({
  status: z.enum(['draft', 'published', 'archived'])
});

module.exports = { stageBodySchema, statusBodySchema };

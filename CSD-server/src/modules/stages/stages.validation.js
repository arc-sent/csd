const { z } = require('zod');

const stageBodySchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional().default(''),
  status: z.enum(['draft', 'published', 'archived']).optional()
});

const statusBodySchema = z.object({
  status: z.enum(['draft', 'published', 'archived'])
});

module.exports = { stageBodySchema, statusBodySchema };

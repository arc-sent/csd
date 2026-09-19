const { z } = require('zod');

const createPaymentSchema = z
  .object({
    assignmentId: z.string().min(1).optional(),
    stageId: z.string().min(1).optional()
  })
  .refine(data => Boolean(data.assignmentId) !== Boolean(data.stageId), {
    message: 'Укажите либо assignmentId, либо stageId — ровно одно из двух'
  });

module.exports = { createPaymentSchema };

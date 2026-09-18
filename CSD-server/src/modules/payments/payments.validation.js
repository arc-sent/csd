const { z } = require('zod');

// email намеренно НЕ принимается от клиента: почта для чека берётся из
// аккаунта покупателя (см. payments.service.createPayment). Оставить поле
// «необязательным, но игнорируемым» опасно — выглядело бы так, будто чек
// можно отправить на произвольный адрес.
//
// Ровно одно из assignmentId/stageId — платёж либо за одно задание, либо за
// этап целиком (см. payments.service.js). refine — потому что z.union даёт
// невнятную ошибку «не подошёл ни один вариант» вместо понятной причины.
const createPaymentSchema = z
  .object({
    assignmentId: z.string().min(1).optional(),
    stageId: z.string().min(1).optional()
  })
  .refine(data => Boolean(data.assignmentId) !== Boolean(data.stageId), {
    message: 'Укажите либо assignmentId, либо stageId — ровно одно из двух'
  });

module.exports = { createPaymentSchema };

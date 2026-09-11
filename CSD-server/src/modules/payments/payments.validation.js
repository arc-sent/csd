const { z } = require('zod');

// email намеренно НЕ принимается от клиента: почта для чека берётся из
// аккаунта покупателя (см. payments.service.createPayment). Оставить поле
// «необязательным, но игнорируемым» опасно — выглядело бы так, будто чек
// можно отправить на произвольный адрес.
const createPaymentSchema = z.object({
  assignmentId: z.string().min(1, 'assignmentId обязателен')
});

module.exports = { createPaymentSchema };

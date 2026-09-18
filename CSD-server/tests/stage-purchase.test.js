const { createPaymentSchema } = require('../src/modules/payments/payments.validation');
const { grantBodySchema } = require('../src/modules/users/users.validation');

// Ровно одно из assignmentId/stageId — иначе платёж (или выдача) был бы либо
// за «ничего», либо неоднозначным.
describe('Покупка и выдача этапа: валидация тела запроса', () => {
  test.each([
    ['платёж за задание', createPaymentSchema, { assignmentId: 'a' }, true],
    ['платёж за этап', createPaymentSchema, { stageId: 's' }, true],
    ['платёж без цели', createPaymentSchema, {}, false],
    ['платёж сразу за задание и этап', createPaymentSchema, { assignmentId: 'a', stageId: 's' }, false],
    ['выдача задания', grantBodySchema, { assignmentId: 'a' }, true],
    ['выдача этапа', grantBodySchema, { stageId: 's', note: 'подарок' }, true],
    ['выдача без цели', grantBodySchema, {}, false],
    ['выдача сразу задания и этапа', grantBodySchema, { assignmentId: 'a', stageId: 's' }, false]
  ])('%s', (_name, schema, body, ok) => {
    expect(schema.safeParse(body).success).toBe(ok);
  });
});

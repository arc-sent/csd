const { z } = require('zod');

const verifyCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Код должен состоять из 6 цифр')
});

module.exports = { verifyCodeSchema };

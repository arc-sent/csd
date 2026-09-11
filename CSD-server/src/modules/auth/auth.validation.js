const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Пароль обязателен')
});

module.exports = { loginSchema };
